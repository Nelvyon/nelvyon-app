"""El gancho de contexto esta instalado y fija las variables de verdad.

EL FALLO QUE ESTO IMPIDE
------------------------
`core.contexto_rls.registrar()` se enganchaba a `session_maker.class_`, que en
una `async_sessionmaker` es `AsyncSession`. Esa clase NO tiene el evento
`after_begin` —los eventos de ORM viven en la `Session` sincrona que envuelve—,
asi que la llamada lanzaba

    InvalidRequestError: No such event 'after_begin' for target AsyncSession

y quien la invocaba capturaba la excepcion para no impedir el arranque. Resultado:
el gancho no se instalaba NUNCA, y el unico rastro era una linea de WARNING sin
causa.

Mientras el rol de conexion conservo BYPASSRLS no cambiaba nada, porque el
contexto no decidia. Al retirarselo en produccion, cada consulta autenticada paso
a evaluarse sin contexto: las politicas devolvian cero filas, sin excepcion y sin
error. Datos legitimos invisibles — el peor modo de fallo de todos, y el que
motivo el rollback.

POR QUE NINGUNA PRUEBA ANTERIOR LO VIO
--------------------------------------
Las 209 pruebas de la campania RLS fijaban el contexto ejecutando `set_config`
ellas mismas, que es lo que hace la aplicacion DESPUES de que el gancho funcione.
Comprobaban que las politicas deciden bien dado un contexto; ninguna comprobaba
que el contexto llegue a fijarse. Entre «la politica funciona» y «la aplicacion
fija el contexto» habia un hueco por el que cabia justo este fallo.

Esta bateria cubre ese hueco por los dos lados: que el listener quede registrado,
y que una transaccion real de SQLAlchemy salga con las dos variables puestas.
"""
from __future__ import annotations

import os

import pytest
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.contexto_rls import (
    clase_de_sesion_sincrona,
    listener_instalado,
    registrar,
    sentencias_de_contexto,
)

DSN = os.environ.get("NELVYON_PG_CERT_DSN")


def _dsn_async() -> str:
    """DSN para el motor asincrono.

    `localhost` se fuerza a 127.0.0.1: en Windows el bucle de eventos intenta
    primero ::1 y el contenedor solo escucha en IPv4, asi que la conexion se
    rechaza antes de llegar a PostgreSQL.
    """
    dsn = (DSN or "").replace("postgresql://", "postgresql+asyncpg://")
    return dsn.replace("@localhost:", "@127.0.0.1:")


# ═══════════════════════════════════════════════════════════════════════════
# 1. El gancho se instala (esto solo ya habria evitado el incidente)
# ═══════════════════════════════════════════════════════════════════════════


def test_la_clase_objetivo_no_es_la_asincrona():
    """`AsyncSession` no tiene eventos de ORM. Apuntar ahi era el error."""
    maker = async_sessionmaker(class_=AsyncSession)
    objetivo = clase_de_sesion_sincrona(maker)
    assert objetivo is not AsyncSession, (
        "se sigue apuntando a AsyncSession: `after_begin` no existe ahi y el "
        "gancho no se instalara"
    )
    assert hasattr(objetivo, "__mapper_args__") or objetivo.__name__ == "Session", (
        f"objetivo inesperado: {objetivo!r}"
    )


def test_registrar_no_lanza_sobre_una_sessionmaker_asincrona():
    """EL CASO EXACTO QUE FALLABA.

    Antes esto lanzaba `InvalidRequestError`. Como el llamador capturaba la
    excepcion, en produccion solo se veia un WARNING.
    """
    maker = async_sessionmaker(class_=AsyncSession)
    registrar(maker)  # si vuelve a lanzar, esta prueba lo dice sin ambiguedad


def test_el_listener_queda_registrado():
    """Control positivo: que `registrar()` no lance no basta; el listener tiene
    que estar de verdad enganchado a la clase."""
    maker = async_sessionmaker(class_=AsyncSession)
    objetivo = clase_de_sesion_sincrona(maker)
    registrar(maker)
    puesto = listener_instalado(objetivo)
    assert puesto is not None, "no se instalo ningun listener de after_begin"
    assert event.contains(objetivo, "after_begin", puesto), (
        "el listener consta como instalado pero SQLAlchemy no lo tiene"
    )


def test_registrar_dos_veces_no_duplica_el_gancho():
    """El evento vive en una clase global: dos llamadas dejarian el contexto
    fijandose dos veces por transaccion."""
    maker = async_sessionmaker(class_=AsyncSession)
    registrar(maker)
    assert registrar(maker) is None, "la segunda llamada instalo otro listener"


# ═══════════════════════════════════════════════════════════════════════════
# 2. Las sentencias son las que las politicas leen
# ═══════════════════════════════════════════════════════════════════════════


def test_se_fijan_las_dos_variables_que_usan_las_politicas():
    """`app.tenant_id` lo leen 53 politicas; `request.jwt.claim.sub`, 606. Fijar
    solo una deja la otra mitad denegando."""
    sentencias = sentencias_de_contexto(7, "11111111-2222-3333-4444-555555555555")
    sql = " ".join(s for s, _ in sentencias)
    assert "app.tenant_id" in sql
    assert "request.jwt.claim.sub" in sql
    assert sql.count("set_config") == 2


def test_el_ambito_es_de_transaccion_y_no_de_conexion():
    """El tercer argumento `true` es lo que impide que el contexto sobreviva al
    commit y se lo encuentre la peticion siguiente del pool, de otro inquilino."""
    for sql, _ in sentencias_de_contexto(7, "abc"):
        assert sql.rstrip().endswith("true)"), f"ambito equivocado en: {sql}"


def test_sin_identidad_no_se_fija_nada():
    """Control negativo: sin contexto no se inventa uno."""
    assert sentencias_de_contexto(None, None) == []


# ═══════════════════════════════════════════════════════════════════════════
# 3. Extremo a extremo contra PostgreSQL: la transaccion sale con contexto
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_una_transaccion_real_sale_con_el_contexto_puesto():
    """LA PRUEBA QUE FALTABA.

    No comprueba politicas ni permisos: comprueba que al abrir una transaccion
    por el camino normal de la aplicacion, PostgreSQL ve las dos variables. Si el
    gancho no esta instalado, `current_setting` devuelve vacio y esto se pone
    rojo — que es justo lo que no ocurrio antes del incidente.
    """
    from core.tenant_context import contexto_de_inquilino

    SUJETO = "11111111-2222-3333-4444-555555555555"
    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
    registrar(maker)

    try:
        with contexto_de_inquilino(7, SUJETO):
            async with maker() as sesion:
                await sesion.execute(text("SELECT 1"))  # fuerza el begin

                inquilino = (await sesion.execute(
                    text("SELECT current_setting('app.tenant_id', true)"))).scalar()
                sujeto = (await sesion.execute(
                    text("SELECT current_setting('request.jwt.claim.sub', true)"))).scalar()

                assert inquilino == "7", (
                    f"app.tenant_id llego como {inquilino!r}: el gancho no fijo el "
                    f"inquilino, y con RLS activo las politicas devuelven cero filas"
                )
                assert sujeto == SUJETO, (
                    f"request.jwt.claim.sub llego como {sujeto!r}: 606 politicas lo leen"
                )

                # Tras un commit, la transaccion siguiente tambien lo recibe: ese
                # es el motivo de enganchar en `after_begin` y no al abrir sesion.
                await sesion.commit()
                tras_commit = (await sesion.execute(
                    text("SELECT current_setting('app.tenant_id', true)"))).scalar()
                assert tras_commit == "7", (
                    "la transaccion posterior al commit nacio sin contexto"
                )
    finally:
        await motor.dispose()


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_sin_el_listener_la_transaccion_sale_vacia():
    """Control negativo, y reproduccion del fallo original.

    Se RETIRA el listener y se repite la misma transaccion: el contexto ya no
    llega. Eso es exactamente lo que pasaba en produccion, y prueba que el test
    positivo mide el gancho y no otra cosa.

    Hay que retirarlo explicitamente porque el evento vive en la `Session`
    sincrona, que es global al proceso: no basta con no llamar a `registrar()`.
    """
    from core.tenant_context import contexto_de_inquilino

    maker = async_sessionmaker(class_=AsyncSession)
    objetivo = clase_de_sesion_sincrona(maker)
    registrar(maker)
    listener = listener_instalado(objetivo)
    assert listener is not None, "no hay listener que retirar"

    event.remove(objetivo, "after_begin", listener)
    motor = create_async_engine(_dsn_async())
    try:
        with contexto_de_inquilino(7, "11111111-2222-3333-4444-555555555555"):
            m2 = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
            async with m2() as sesion:
                valor = (await sesion.execute(
                    text("SELECT current_setting('app.tenant_id', true)"))).scalar()
        assert not valor, (
            f"sin listener el contexto llego igualmente ({valor!r}): lo fija algo "
            f"mas y la prueba positiva no demuestra nada"
        )
    finally:
        await motor.dispose()
        event.listen(objetivo, "after_begin", listener)  # se deja como estaba

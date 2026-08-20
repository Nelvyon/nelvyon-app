"""La salud de negocio detecta lo que el health de proceso no ve.

EL FALLO QUE ESTO IMPIDE
------------------------
Al activar RLS, toda consulta autenticada de produccion paso a devolver cero
filas: el gancho de contexto no estaba instalado. Durante ese tiempo `/health`
respondia 200 y `/health/ready` decia `database: ok`. Lo encontre leyendo una
linea de WARNING del arranque; sin nadie mirando logs, habria durado hasta que un
cliente llamase.

Ese es el modo de fallo que importa aqui y ningun health de proceso puede verlo.
`core/salud_negocio.py` lo cubre comparando contra una linea base: un cero solo
alarma si antes hubo algo.

LO QUE SE PRUEBA
----------------
La logica de decision como funcion pura —sin base de datos— y luego el recorrido
completo contra PostgreSQL. Los controles negativos son la mitad del valor: una
deteccion que salta con todo es tan inutil como una que no salta nunca.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest

from core.salud_negocio import (
    ALTO,
    COMPROBACIONES,
    CRITICO,
    Comprobacion,
    evaluar,
)

DSN = os.environ.get("NELVYON_PG_CERT_DSN")


def _base(valor, cuando=None, silenciada=None):
    return {"valor_sano": valor,
            "visto_en": cuando or datetime.now(timezone.utc),
            "silenciada_hasta": silenciada}


_CAIDA = Comprobacion(
    metrica="prueba", descripcion="Metrica de prueba",
    sql="SELECT 1", caida_relevante=0.5, severidad=ALTO, impacto="ninguno",
)
_SUBIDA = Comprobacion(
    metrica="cola", descripcion="Cola de prueba",
    sql="SELECT 1", caida_relevante=0.0, severidad=ALTO, impacto="ninguno",
    subir_es_malo=True,
)


# ── el caso que motiva todo el modulo ───────────────────────────────────────


def test_una_caida_a_cero_se_detecta_como_critica():
    """EL FALLO. 1101 clientes que pasan a 0 con health en verde."""
    h = evaluar(_CAIDA, actual=0, base=_base(1101))
    assert h is not None, "una caida a cero no puede pasar desapercibida"
    assert h.severidad == CRITICO, "caer a cero escala por encima de su severidad"
    assert h.evidencia["anterior"] == 1101
    assert h.evidencia["actual"] == 0
    assert h.requiere_humano is False or h.requiere_humano is True  # declarado


def test_una_caida_grande_pero_no_a_cero_usa_su_severidad():
    h = evaluar(_CAIDA, actual=100, base=_base(1000))
    assert h is not None and h.severidad == ALTO
    assert h.evidencia["caida"] == 0.9


# ── controles negativos: no alarmar por ruido ───────────────────────────────


def test_una_tabla_que_siempre_estuvo_vacia_no_alarma():
    """`subscriptions` lleva en cero desde siempre. Alertar por eso seria ruido
    permanente, y el ruido permanente hace que nadie mire."""
    assert evaluar(_CAIDA, actual=0, base=_base(0)) is None


def test_la_primera_observacion_aprende_y_no_alarma():
    """Sin linea base no hay con que comparar: se aprende, no se grita."""
    assert evaluar(_CAIDA, actual=0, base=None) is None


def test_una_variacion_por_debajo_del_umbral_no_alarma():
    """De 1000 a 900 es operacion normal, no una anomalia."""
    assert evaluar(_CAIDA, actual=900, base=_base(1000)) is None


def test_crecer_no_es_una_anomalia():
    assert evaluar(_CAIDA, actual=2000, base=_base(1000)) is None


# ── metricas donde subir es lo malo ─────────────────────────────────────────


def test_una_cola_que_crece_se_detecta():
    """Webhooks en error o tickets sin responder: aqui el cero es lo sano."""
    h = evaluar(_SUBIDA, actual=7, base=_base(0))
    assert h is not None
    assert "subio" in h.que_paso


def test_una_cola_que_se_vacia_no_alarma():
    assert evaluar(_SUBIDA, actual=0, base=_base(7)) is None


# ── el catalogo cubre lo que dice cubrir ────────────────────────────────────


def test_cada_comprobacion_declara_impacto_y_severidad():
    """Una alerta sin impacto declarado obliga a investigar antes de decidir, que
    es justo lo que no puede pasar cuando no hay nadie."""
    for c in COMPROBACIONES:
        assert c.impacto.strip(), f"{c.metrica} no declara impacto"
        assert c.severidad in (CRITICO, ALTO, "medium", "info"), c.metrica
        assert c.cooldown_min > 0, f"{c.metrica} alertaria en cada sondeo"


def test_estan_cubiertos_los_caminos_que_importan():
    """Control de cobertura: si alguien borra una comprobacion, se nota."""
    metricas = {c.metrica for c in COMPROBACIONES}
    for esperada in ("clientes_visibles", "entregables_producidos",
                     "suscripciones_activas", "webhooks_stripe_con_error",
                     "tickets_sin_respuesta"):
        assert esperada in metricas, f"falta la comprobacion {esperada}"


def test_el_dinero_se_vigila_mas_de_cerca_que_el_resto():
    """Las metricas de cobro tienen cooldown corto a proposito: un cobro perdido
    no puede esperar cuatro horas a la siguiente alerta."""
    por_metrica = {c.metrica: c for c in COMPROBACIONES}
    assert por_metrica["suscripciones_activas"].cooldown_min <= 15
    assert por_metrica["webhooks_stripe_con_error"].cooldown_min <= 15


# ── recorrido completo contra PostgreSQL ────────────────────────────────────


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_recorrido_completo_aprende_y_luego_detecta():
    """Dos pasadas: la primera aprende la linea base, la segunda ve la caida.

    Se hace contra la base real para que tambien quede probado que las consultas
    del catalogo son SQL valido — un SELECT mal escrito daria `unmeasurable`, que
    es un falso verde.
    """
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.salud_negocio import revisar

    dsn = DSN.replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")
    motor = create_async_engine(dsn)
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        async with maker() as s:
            await s.execute(text("DELETE FROM business_health_baseline"))
            await s.commit()

        # Primera pasada: aprende. No puede haber hallazgos.
        async with maker() as s:
            primero = await revisar(s)
        assert primero["status"] == "ok", (
            f"la primera pasada alarmo: {primero['findings']}")
        assert not primero["unmeasurable"], (
            f"consultas que no se pudieron ejecutar: {primero['unmeasurable']}. "
            f"Una comprobacion que no corre es un falso verde.")

        # Se falsea una linea base alta: equivale a que la metrica se desplome.
        async with maker() as s:
            await s.execute(text(
                "UPDATE business_health_baseline SET valor_sano = 5000 "
                "WHERE metrica = 'clientes_visibles'"))
            await s.commit()

        async with maker() as s:
            segundo = await revisar(s)
        assert segundo["status"] == "anomaly"
        hallazgo = next(h for h in segundo["findings"]
                        if h["metric"] == "clientes_visibles")
        assert hallazgo["severity"] in (CRITICO, ALTO)
        assert hallazgo["impact"].strip()
        assert "evidence" in hallazgo

        # Tercera pasada inmediata: el cooldown la silencia.
        async with maker() as s:
            tercero = await revisar(s)
        assert not any(h["metric"] == "clientes_visibles"
                       for h in tercero["findings"]), (
            "el cooldown no funciona: la misma anomalia alertaria en cada sondeo")
    finally:
        async with maker() as s:
            await s.execute(text("DELETE FROM business_health_baseline"))
            await s.commit()
        await motor.dispose()

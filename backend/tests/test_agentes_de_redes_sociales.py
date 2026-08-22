"""El equipo de redes existe de verdad, y no puede publicar.

QUE SE EXIGE AQUI
-----------------
Un agente no es una fila en un catalogo. Para contar como capacidad real tiene
que cumplir las cuatro cosas a la vez:

    1. sus herramientas EXISTEN en el catalogo de herramientas
    2. esas herramientas SE EJECUTAN contra PostgreSQL real
    3. todas son de SOLO LECTURA y acotan por `workspace_id`
    4. la politica le PROHIBE publicar

Sin la 2, «capacidad» significa que alguien escribio un nombre. Sin la 4, un
agente de redes es un agente que publica en nombre del cliente.

POR QUE NO PUBLICAN
-------------------
`redes.publicar` esta en `JAMAS_AUTOMATICO` desde el primer dia. Estos tres
miran y redactan; publicar sigue siendo un acto humano. El de borradores exige
`HUMAN_APPROVAL_REQUIRED`: un texto que saldria con la marca del cliente no es
decision de un agente.
"""
from __future__ import annotations

import os

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

AGENTES = [
    "redes.parte_de_publicacion",
    "redes.revisar_cola",
    "redes.redactar_borrador",
]
HERRAMIENTAS = ["redes.publicaciones", "redes.cola", "redes.ajustes"]


# ═══════════════════════════════════════════════════════════════════════════
# Las herramientas existen y son de solo lectura
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("nombre", HERRAMIENTAS)
def test_la_herramienta_esta_registrada(nombre):
    from core.agentes.herramientas import catalogo

    assert nombre in catalogo(), (
        f"`{nombre}` la declara un agente y no existe: seria una capacidad "
        f"anunciada que no se puede ejecutar")


@pytest.mark.parametrize("nombre", HERRAMIENTAS)
def test_la_herramienta_es_de_solo_lectura(nombre):
    """Un agente de redes que pudiera escribir podria publicar por la puerta
    de atras, sin pasar por ninguna politica."""
    from core.agentes.herramientas import catalogo

    assert catalogo()[nombre].solo_lectura, f"`{nombre}` no es de solo lectura"


def test_ninguna_herramienta_de_redes_escribe_en_su_sql():
    """El control del anterior: `solo_lectura` es una etiqueta que alguien pone.

    Se mira el SQL. Una etiqueta que nadie comprueba acaba mintiendo.
    """
    import inspect
    import re

    from core.agentes.herramientas import catalogo

    c = catalogo()
    for nombre in HERRAMIENTAS:
        fuente = inspect.getsource(c[nombre].fn)
        escribe = re.search(r"\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\b",
                            fuente, re.IGNORECASE)
        assert not escribe, (
            f"`{nombre}` esta marcada como solo lectura y su SQL contiene "
            f"`{escribe.group(1)}`")


def test_todas_acotan_por_workspace():
    """Sin `workspace_id` en la consulta, un agente veria las redes de todos."""
    import inspect

    from core.agentes.herramientas import catalogo

    c = catalogo()
    for nombre in HERRAMIENTAS:
        fuente = inspect.getsource(c[nombre].fn)
        assert "workspace_id = :ws" in fuente, (
            f"`{nombre}` no acota por workspace: leeria las publicaciones de "
            f"todos los inquilinos")


# ═══════════════════════════════════════════════════════════════════════════
# Se ejecutan de verdad
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
@pytest.mark.parametrize("nombre", HERRAMIENTAS)
async def test_la_herramienta_se_ejecuta_contra_postgres(nombre):
    """LA PRUEBA QUE SEPARA UNA CAPACIDAD DE UN NOMBRE.

    Se ejecuta contra PostgreSQL real. Si una columna no existe o el SQL esta
    mal, esto falla — que es lo que paso al escribirlas: `social_auto_posts`
    tiene `caption`, no `content`, y `social_auto_settings` no tiene `platform`.
    Las dos consultas estaban inventadas y solo se vio ejecutandolas.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.agentes.herramientas import catalogo

    url = (DSN or "").replace("postgresql://", "postgresql+asyncpg://")
    motor = create_async_engine(url, pool_size=1, max_overflow=1)
    try:
        async with async_sessionmaker(motor, expire_on_commit=False)() as s:
            filas = await catalogo()[nombre].fn(s, 999999, 5)
        assert isinstance(filas, list)
    finally:
        await motor.dispose()


# ═══════════════════════════════════════════════════════════════════════════
# No pueden publicar
# ═══════════════════════════════════════════════════════════════════════════


def test_publicar_en_redes_sigue_siendo_jamas_automatico():
    from core.agentes.politicas import JAMAS_AUTOMATICO

    assert "redes.publicar" in JAMAS_AUTOMATICO, (
        "publicar en redes dejo de estar en JAMAS_AUTOMATICO: un agente podria "
        "publicar en nombre del cliente sin que nadie lo apruebe")


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_la_politica_real_deniega_publicar():
    """Contra `decidir`, que es la funcion que decide de verdad.

    No basta con que `redes.publicar` este en `JAMAS_AUTOMATICO`: hay que
    comprobar que la funcion que consulta la politica lo respeta. Una lista que
    nadie mira no protege nada.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.agentes.politicas import decidir

    url = (DSN or "").replace("postgresql://", "postgresql+asyncpg://")
    motor = create_async_engine(url, pool_size=1, max_overflow=1)
    try:
        async with async_sessionmaker(motor, expire_on_commit=False)() as s:
            d = await decidir(s, "redes.redactar_borrador", "redes.publicar")
        assert not d.permitido, (
            f"la politica dejo publicar en redes: {d}")
    finally:
        await motor.dispose()


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_redactar_un_borrador_si_esta_permitido_con_aprobacion():
    """CONTROL. Si TODO estuviera denegado el equipo seria una lista de nombres.

    Redactar tiene que poder ocurrir; lo que no puede es publicarse solo.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.agentes.politicas import decidir

    url = (DSN or "").replace("postgresql://", "postgresql+asyncpg://")
    motor = create_async_engine(url, pool_size=1, max_overflow=1)
    try:
        async with async_sessionmaker(motor, expire_on_commit=False)() as s:
            d = await decidir(s, "redes.redactar_borrador", "contenido.redactar")
        assert d.modo == "HUMAN_APPROVAL_REQUIRED", (
            f"redactar un borrador quedo en modo {d.modo}: un texto que sale con "
            f"la marca del cliente tiene que esperar aprobacion")
    finally:
        await motor.dispose()


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_los_de_solo_lectura_no_esperan_a_nadie():
    """Y el control simetrico: un parte que solo lee no puede exigir aprobacion,
    o el equipo no serviria para operar sin el fundador delante."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.agentes.politicas import decidir

    url = (DSN or "").replace("postgresql://", "postgresql+asyncpg://")
    motor = create_async_engine(url, pool_size=1, max_overflow=1)
    try:
        async with async_sessionmaker(motor, expire_on_commit=False)() as s:
            for agente in ("redes.parte_de_publicacion", "redes.revisar_cola"):
                d = await decidir(s, agente, "informe.componer")
                assert d.permitido and d.modo == "AUTOMATIC_SAFE", (
                    f"{agente} no puede componer su parte: {d}")
    finally:
        await motor.dispose()


# ═══════════════════════════════════════════════════════════════════════════
# La migracion declara lo que el codigo puede sostener
# ═══════════════════════════════════════════════════════════════════════════


def test_la_migracion_solo_declara_herramientas_que_existen():
    """Una migracion que registra un agente con una herramienta inexistente crea
    una capacidad que fallara la primera vez que alguien la use."""
    import json
    import pathlib
    import re

    from core.agentes.herramientas import catalogo

    sql = (pathlib.Path(__file__).resolve().parents[1]
           / "db" / "migrations" / "571_equipo_de_redes_sociales.sql"
           ).read_text(encoding="utf-8")

    declaradas = set()
    for bloque in re.findall(r"'(\[[^\]]*\])'::jsonb", sql):
        declaradas.update(json.loads(bloque))

    assert declaradas, "no se extrajo ninguna herramienta del SQL: revisa el patron"
    faltan = sorted(declaradas - set(catalogo()))
    assert not faltan, (
        f"la migracion 571 registra agentes con herramientas que no existen: "
        f"{faltan}")


def test_los_tres_agentes_estan_en_la_migracion():
    import pathlib

    sql = (pathlib.Path(__file__).resolve().parents[1]
           / "db" / "migrations" / "571_equipo_de_redes_sociales.sql"
           ).read_text(encoding="utf-8")
    for a in AGENTES:
        assert f"'{a}'" in sql, f"{a} no esta en la migracion"

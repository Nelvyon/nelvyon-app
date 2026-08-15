"""Borrar un proyecto de tienda, contra PostgreSQL real.

EL FALLO QUE ESTO IMPIDE
------------------------
En produccion, un administrador autorizado recibia 500 al borrar:

    DELETE FROM os_store_projects WHERE id = :id::uuid AND workspace_id = $1
    parameters: (3,)
    PostgresSyntaxError: syntax error at or near ":"

`:id::uuid` no produce un parametro llamado `id` en `sqlalchemy.text()`, asi que
el valor se ignoraba y los dos puntos llegaban literales a PostgreSQL. El
borrado no habia funcionado nunca — desde mayo de 2026, cuando se escribio la
consulta. La causa y su alcance —139 consultas iguales en 15 servicios— quedan
en `test_sql_casts_de_parametros.py`; aqui se certifica la conducta.

POR QUE POSTGRESQL Y NO UN DOBLE
--------------------------------
Lo que fallaba era el dialogo real con el motor: el analisis del marcador y el
CAST. Un doble que devuelva `True` habria pasado con la consulta rota, que es
justamente lo que dejo escapar el defecto hasta produccion.
"""
from __future__ import annotations

import os
import uuid as _uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

WS_PROPIO = 944_101
WS_AJENO = 944_102


def _dsn_asyncpg() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _servicio(sesion, workspace_id: int):
    from services.os_store_builder_service import get_os_store_builder_service

    return get_os_store_builder_service(sesion, workspace_id)


@pytest.fixture
async def sesion():
    """Sesion SQLAlchemy contra la base de certificacion."""
    sqlalchemy_asyncio = pytest.importorskip("sqlalchemy.ext.asyncio")
    motor = sqlalchemy_asyncio.create_async_engine(
        (DSN or "").replace("postgresql://", "postgresql+asyncpg://"),
        poolclass=None,
    )
    fabrica = sqlalchemy_asyncio.async_sessionmaker(motor, expire_on_commit=False)
    async with fabrica() as s:
        yield s
    await motor.dispose()


@pytest.fixture
async def limpieza():
    asyncpg = pytest.importorskip("asyncpg")
    conn = await asyncpg.connect(_dsn_asyncpg())

    async def borrar_todo():
        for ws in (WS_PROPIO, WS_AJENO):
            await conn.execute("DELETE FROM os_store_products WHERE workspace_id = $1", ws)
            await conn.execute("DELETE FROM os_store_projects WHERE workspace_id = $1", ws)

    await borrar_todo()
    try:
        yield conn
    finally:
        await borrar_todo()
        await conn.close()


async def _crear(conn, workspace_id: int) -> str:
    proyecto = str(_uuid.uuid4())
    await conn.execute(
        "INSERT INTO os_store_projects (id, workspace_id, name, store_info, status) "
        "VALUES ($1::uuid, $2, 'Proyecto de certificacion', '{}'::jsonb, 'ready')",
        proyecto, workspace_id,
    )
    return proyecto


async def _existe(conn, proyecto: str) -> bool:
    return bool(
        await conn.fetchval(
            "SELECT 1 FROM os_store_projects WHERE id = $1::uuid", proyecto
        )
    )


@requiere_pg
@pytest.mark.asyncio
async def test_el_borrado_funciona(limpieza, sesion):
    """EL fallo. Con `:id::uuid` esto reventaba con PostgresSyntaxError."""
    proyecto = await _crear(limpieza, WS_PROPIO)
    assert await _existe(limpieza, proyecto)

    assert await _servicio(sesion, WS_PROPIO).delete_project(proyecto, WS_PROPIO) is True
    assert not await _existe(limpieza, proyecto), "el proyecto sigue en la base"


@requiere_pg
@pytest.mark.asyncio
async def test_no_se_borra_un_proyecto_de_otro_workspace(limpieza, sesion):
    """Acertar el UUID no basta: el filtro por workspace va en la sentencia."""
    ajeno = await _crear(limpieza, WS_AJENO)

    assert await _servicio(sesion, WS_PROPIO).delete_project(ajeno, WS_PROPIO) is False
    assert await _existe(limpieza, ajeno), "se borro un proyecto de otro workspace"


@requiere_pg
@pytest.mark.asyncio
async def test_un_identificador_que_no_es_uuid_no_revienta(limpieza, sesion):
    """Con el CAST y sin validar, PostgreSQL falla y sale un 500.

    La respuesta correcta a un identificador con forma invalida es la misma que
    a uno que no existe: no hay tal proyecto.
    """
    for basura in ("no-es-un-uuid", "", "123", "'; DROP TABLE os_store_projects; --"):
        assert await _servicio(sesion, WS_PROPIO).delete_project(basura, WS_PROPIO) is False

    # y la tabla sigue ahi: el intento de inyeccion no ejecuto nada
    assert await limpieza.fetchval("SELECT to_regclass('public.os_store_projects') IS NOT NULL")


@requiere_pg
@pytest.mark.asyncio
async def test_un_uuid_inexistente_devuelve_false(limpieza, sesion):
    """Semantica de «no existe», que el router traduce a 404."""
    assert await _servicio(sesion, WS_PROPIO).delete_project(str(_uuid.uuid4()), WS_PROPIO) is False


@requiere_pg
@pytest.mark.asyncio
async def test_borrar_dos_veces_no_deja_estado_a_medias(limpieza, sesion):
    """El segundo intento no encuentra nada y no rompe la sesion."""
    proyecto = await _crear(limpieza, WS_PROPIO)
    svc = _servicio(sesion, WS_PROPIO)

    assert await svc.delete_project(proyecto, WS_PROPIO) is True
    assert await svc.delete_project(proyecto, WS_PROPIO) is False
    assert not await _existe(limpieza, proyecto)


@requiere_pg
@pytest.mark.asyncio
async def test_borrar_un_proyecto_no_arrastra_los_de_al_lado(limpieza, sesion):
    """Control negativo: si la clausula del workspace se perdiera, el borrado
    se llevaria por delante todo lo demas y los otros tests seguirian verdes."""
    a = await _crear(limpieza, WS_PROPIO)
    b = await _crear(limpieza, WS_PROPIO)
    ajeno = await _crear(limpieza, WS_AJENO)

    assert await _servicio(sesion, WS_PROPIO).delete_project(a, WS_PROPIO) is True
    assert not await _existe(limpieza, a)
    assert await _existe(limpieza, b)
    assert await _existe(limpieza, ajeno)

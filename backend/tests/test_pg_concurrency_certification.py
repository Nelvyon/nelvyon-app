"""Atomicidad bajo concurrencia REAL en PostgreSQL.

POR QUE NO BASTABA LO QUE HABIA
-------------------------------
El tope de miembros se reescribio como compare-and-swap (`INSERT ... SELECT ...
WHERE (SELECT COUNT(*)) < :cap`) y se certifico con SQLite. SQLite serializa las
escrituras a nivel de fichero: alli el patron ingenuo `SELECT COUNT` seguido de
`INSERT` TAMBIEN respeta el tope. Es decir, la prueba pasaba tanto con el codigo
arreglado como con el codigo roto, asi que no demostraba nada.

Aqui se abren N conexiones simultaneas contra PostgreSQL real, con READ
COMMITTED, que es donde la carrera existe de verdad.

EL CONTROL POSITIVO NO ES OPCIONAL
----------------------------------
Si solo se probara el patron correcto, un "quedaron 5 de tope 5" seria
compatible con dos mundos: que el patron sea atomico, o que el arnes no haya
producido concurrencia alguna. Por eso primero se ejecuta el patron INGENUO y se
EXIGE que se pase del tope. Si el ingenuo no se pasa, el arnes no esta
generando la carrera y la certificacion del patron bueno se declara invalida —
en vez de dar un verde vacio.
"""
from __future__ import annotations

import asyncio
import os

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL real; levantar con scripts/pg-cert-db.mjs y "
        "exportar NELVYON_PG_CERT_DSN"
    ),
)

TOPE = 5
ASPIRANTES = 24
TABLA = "zz_concurrency_probe"
PADRE = "zz_concurrency_parent"


def _dsn_asyncpg() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


async def _tabla_limpia(pool) -> None:
    async with pool.acquire() as c:
        await c.execute(f"DROP TABLE IF EXISTS {TABLA}")
        await c.execute(f"DROP TABLE IF EXISTS {PADRE}")
        await c.execute(f"CREATE TABLE {PADRE} (id INTEGER PRIMARY KEY)")
        await c.execute(f"INSERT INTO {PADRE} VALUES (1)")
        await c.execute(
            f"""
            CREATE TABLE {TABLA} (
              id SERIAL PRIMARY KEY,
              workspace_id INTEGER NOT NULL,
              miembro TEXT NOT NULL
            )
            """
        )


async def _cuantos(pool) -> int:
    async with pool.acquire() as c:
        return int(await c.fetchval(f"SELECT COUNT(*) FROM {TABLA} WHERE workspace_id = 1"))


# ───────────────────────────── los dos patrones, tal cual

async def _alta_ingenua(pool, quien: str) -> None:
    """Leer y luego escribir: dos sentencias, dos instantes distintos."""
    async with pool.acquire() as c:
        n = int(await c.fetchval(f"SELECT COUNT(*) FROM {TABLA} WHERE workspace_id = 1"))
        if n >= TOPE:
            return
        # La ventana entre la lectura y la escritura es donde vive el defecto.
        # No se fabrica nada que no exista: solo se ensancha lo que ya ocurre.
        await asyncio.sleep(0.02)
        await c.execute(
            f"INSERT INTO {TABLA} (workspace_id, miembro) VALUES (1, $1)", quien
        )


_SQL_INSERT_GUARDADO = f"""
    INSERT INTO {TABLA} (workspace_id, miembro)
    SELECT 1, $1
     WHERE (SELECT COUNT(*) FROM {TABLA} WHERE workspace_id = 1) < {TOPE}
"""


async def _alta_sentencia_unica(pool, quien: str) -> None:
    """El tope comprobado dentro de la misma sentencia que inserta.

    Parecia suficiente y no lo es: ver el test que lo mide.
    """
    async with pool.acquire() as c:
        await c.execute(_SQL_INSERT_GUARDADO, quien)


async def _alta_con_cerrojo(pool, quien: str) -> None:
    """Cerrojo de la fila padre antes de contar. Es lo que hace el router."""
    async with pool.acquire() as c, c.transaction():
        await c.fetchval(f"SELECT id FROM {PADRE} WHERE id = 1 FOR UPDATE")
        await asyncio.sleep(0.02)  # la misma ventana que abria la carrera
        await c.execute(_SQL_INSERT_GUARDADO, quien)


@pytest.fixture
async def pool():
    asyncpg = pytest.importorskip("asyncpg")
    p = await asyncpg.create_pool(_dsn_asyncpg(), min_size=8, max_size=ASPIRANTES)
    try:
        yield p
    finally:
        async with p.acquire() as c:
            await c.execute(f"DROP TABLE IF EXISTS {TABLA}")
        await p.close()


# ───────────────────────────── control positivo: la carrera existe


@requiere_pg
@pytest.mark.asyncio
async def test_control_positivo_el_patron_ingenuo_se_pasa_del_tope(pool):
    """Sin esto, el test siguiente no significa nada.

    Demuestra que el arnes produce concurrencia real: si el patron ingenuo
    respetase el tope, seria que las tareas no se solapan y cualquier verde
    posterior seria un artefacto del arnes, no una propiedad del codigo.
    """
    await _tabla_limpia(pool)
    await asyncio.gather(*(_alta_ingenua(pool, f"u{i}") for i in range(ASPIRANTES)))
    final = await _cuantos(pool)
    assert final > TOPE, (
        f"el patron ingenuo respeto el tope ({final} <= {TOPE}): el arnes NO esta "
        "generando concurrencia real, asi que no certifica nada"
    )


# ───────────────────────────── la propiedad certificada


@requiere_pg
@pytest.mark.asyncio
async def test_control_positivo_la_sentencia_unica_tampoco_basta(pool):
    """El defecto encontrado el 2026-08-13, fijado como positivo conocido.

    `INSERT ... SELECT ... WHERE (SELECT COUNT(*)) < tope` parece cerrar la
    carrera porque comprueba y escribe en una sola sentencia. No la cierra: bajo
    READ COMMITTED la subconsulta lee una instantanea tomada al empezar la
    sentencia, y las filas que otras transacciones aun no han confirmado no
    estan ahi. Ser indivisible no es ver el presente.

    Se conserva como test para que nadie retire el cerrojo creyendo que la
    sentencia unica ya lo resolvia — y para que si algun dia deja de pasarse
    del tope, quede claro que cambio el motor y no el codigo.
    """
    await _tabla_limpia(pool)
    await asyncio.gather(
        *(_alta_sentencia_unica(pool, f"u{i}") for i in range(ASPIRANTES))
    )
    final = await _cuantos(pool)
    assert final > TOPE, (
        f"la sentencia unica respeto el tope ({final}); si el motor cambio de "
        "comportamiento, revisar si el cerrojo sigue siendo necesario"
    )


# ───────────────────────────── la propiedad certificada


@requiere_pg
@pytest.mark.asyncio
async def test_el_cerrojo_de_la_fila_padre_respeta_el_tope(pool):
    """Vale como evidencia porque los dos controles demuestran que hay carrera."""
    await _tabla_limpia(pool)
    await asyncio.gather(*(_alta_con_cerrojo(pool, f"u{i}") for i in range(ASPIRANTES)))
    final = await _cuantos(pool)
    assert final == TOPE, (
        f"quedaron {final} filas con tope {TOPE}: el cerrojo no serializa"
    )


@requiere_pg
@pytest.mark.asyncio
async def test_el_cerrojo_no_se_queda_corto(pool):
    """Un tope que rechaza de mas tambien es un defecto.

    Un patron que serializase mal podria dejar 1 de 5 y pasar el test anterior
    si solo mirase "no pasarse". Se exige exactitud, no prudencia.
    """
    await _tabla_limpia(pool)
    await asyncio.gather(*(_alta_con_cerrojo(pool, f"u{i}") for i in range(ASPIRANTES)))
    assert await _cuantos(pool) == TOPE


def test_el_router_toma_el_cerrojo_antes_de_contar():
    """Guardia estructural, sin PostgreSQL: corre en la suite normal.

    La certificacion de arriba solo se ejecuta con Docker. Sin esta guardia,
    quitar `with_for_update()` del router pasaria desapercibido en cualquier CI
    sin base real, que es justo donde se colo el defecto la primera vez.
    """
    import ast
    from pathlib import Path

    ruta = Path(__file__).resolve().parent.parent / "routers" / "workspace_management.py"
    arbol = ast.parse(ruta.read_text(encoding="utf-8"))

    for nodo in ast.walk(arbol):
        if not isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        codigo = ast.unparse(nodo)
        if "INSERT INTO workspace_members" not in codigo:
            continue
        assert "with_for_update" in codigo, (
            f"{nodo.name} inserta en workspace_members sin tomar el cerrojo de la "
            "fila del workspace: el tope vuelve a ser evadible por concurrencia"
        )
        posicion_cerrojo = codigo.index("with_for_update")
        posicion_insert = codigo.index("INSERT INTO workspace_members")
        assert posicion_cerrojo < posicion_insert, (
            f"{nodo.name} toma el cerrojo DESPUES de insertar: no sirve de nada"
        )
        return

    raise AssertionError("no se encontro el endpoint que inserta en workspace_members")

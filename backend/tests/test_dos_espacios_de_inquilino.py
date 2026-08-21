"""Dos espacios de identidad de inquilino conviviendo en la misma base.

QUE SE ENCONTRO
---------------
El esquema tiene DOS formas incompatibles de decir «de quien es esta fila»:

    workspace_id  INTEGER   167 columnas   apunta a `workspaces.id`
    tenant_id     UUID      159 columnas   no apunta a nada: no hay tabla `tenants`

No es un detalle de estilo. `services/memory_service` —el almacen vectorial que
usarian los agentes para recordar— consulta asi:

    WHERE workspace_id = CAST(:workspace_id AS uuid)

y `routers/memory.py` le pasa `ctx.workspace_id`, que es un ENTERO. Un entero no
es un uuid valido, asi que la consulta falla SIEMPRE. La tabla tiene cero filas y
esa es la razon: nunca ha podido funcionar.

POR QUE ESTO IMPORTA MAS QUE UN BUG NORMAL
------------------------------------------
Porque es el motivo real por el que RAG no se puede «conectar y ya». No falta un
proveedor de embeddings: falta decidir cual de los dos espacios de identidad es
el bueno y migrar el otro. Conectar un proveedor encima de esto produciria un
sistema que guarda recuerdos bajo un identificador y los busca bajo otro — o que
no guarda nada, como ahora.

QUE HACEN ESTAS PRUEBAS
-----------------------
No arreglan la divergencia: alinear 159 columnas es una migracion grande, con
riesgo y con decision de producto detras. Lo que hacen es:

  1. DEMOSTRAR el defecto, para que no se discuta si existe.
  2. FIJARLO con un trinquete, para que no crezca mientras se decide.
  3. IMPEDIR que se conecte RAG sobre un almacen sin aislamiento.
"""
from __future__ import annotations

import os

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

#: Medido el 2026-08-21 sobre el esquema completo. Solo puede BAJAR: cada
#: columna nueva en el espacio equivocado agranda una divergencia que ya impide
#: que funcione la memoria de los agentes.
COLUMNAS_TENANT_UUID = 159
COLUMNAS_WORKSPACE_INT = 167


@pytest.fixture
async def conexion():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(
        (DSN or "").replace("postgresql+asyncpg://", "postgresql://"), timeout=30)
    try:
        yield c
    finally:
        await c.close()


async def test_el_almacen_de_memoria_no_acepta_el_identificador_que_recibe(conexion):
    """LA DEMOSTRACION.

    `routers/memory.py` pasa un entero. `memory_service` castea a uuid. Se
    reproduce exactamente esa combinacion: tiene que fallar, y falla.

    Cuando alguien alinee los espacios de identidad, esta prueba fallara — y eso
    sera la señal de que el defecto se arreglo, no de que se rompio algo.
    """
    import asyncpg

    with pytest.raises((asyncpg.exceptions.DataError, ValueError)):
        await conexion.fetchval(
            "SELECT count(*) FROM client_memory WHERE workspace_id = CAST($1 AS uuid)",
            "12")


async def test_con_un_uuid_la_misma_consulta_si_funciona(conexion):
    """Control: el problema es el TIPO, no la consulta.

    Sin esto, la prueba anterior podria estar pasando por cualquier otro motivo.
    """
    n = await conexion.fetchval(
        "SELECT count(*) FROM client_memory WHERE workspace_id = CAST($1 AS uuid)",
        "11111111-2222-3333-4444-555555555555")
    assert n == 0


async def test_no_existe_la_tabla_a_la_que_apuntarian_los_tenant_id(conexion):
    """159 columnas apuntan a una tabla que no existe.

    Mientras eso sea cierto, ninguna de ellas puede tener una clave ajena, y por
    tanto nada impide guardar un identificador inventado.
    """
    existe = await conexion.fetchval(
        "SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='tenants'")
    assert not existe, (
        "ha aparecido una tabla `tenants`: revisa si los `tenant_id` uuid ya "
        "tienen destino y actualiza esta prueba")


async def test_la_divergencia_de_espacios_no_crece(conexion):
    """Trinquete. Cada columna nueva en el espacio equivocado agranda el problema."""
    uuid_tenant = await conexion.fetchval("""
        SELECT count(*) FROM information_schema.columns
         WHERE table_schema='public' AND column_name='tenant_id' AND data_type='uuid'""")
    int_ws = await conexion.fetchval("""
        SELECT count(*) FROM information_schema.columns
         WHERE table_schema='public' AND column_name='workspace_id'
           AND data_type='integer'""")

    assert uuid_tenant <= COLUMNAS_TENANT_UUID, (
        f"{uuid_tenant} columnas `tenant_id` uuid, sobre un maximo de "
        f"{COLUMNAS_TENANT_UUID}. Cada una nueva agranda una divergencia que ya "
        f"impide que funcione la memoria de los agentes.")
    assert int_ws >= COLUMNAS_WORKSPACE_INT, (
        f"bajaron a {int_ws} las columnas `workspace_id` enteras: si se esta "
        f"migrando al otro espacio, actualiza esta prueba a proposito")


# ═══════════════════════════════════════════════════════════════════════════
# RAG no se conecta hasta que tenga aislamiento
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_almacen_de_fragmentos_sigue_sin_conectarse(conexion):
    """`nelvyon_rag_chunks` no tiene columna de inquilino NI RLS.

    Conectarlo tal cual seria una fuga entre inquilinos por construccion: no hay
    forma de filtrar lo que no se puede nombrar. Esta prueba falla el dia que
    alguien lo conecte sin arreglarlo antes.
    """
    cols = {r["column_name"] for r in await conexion.fetch(
        "SELECT column_name FROM information_schema.columns "
        " WHERE table_name = 'nelvyon_rag_chunks'")}
    tiene_inquilino = bool(cols & {"workspace_id", "tenant_id"})
    rls = await conexion.fetchval(
        "SELECT relrowsecurity FROM pg_class WHERE relname='nelvyon_rag_chunks'")
    filas = await conexion.fetchval("SELECT count(*) FROM nelvyon_rag_chunks")

    if filas > 0:
        assert tiene_inquilino and rls, (
            f"`nelvyon_rag_chunks` tiene {filas} filas pero "
            f"inquilino={tiene_inquilino}, rls={rls}. Se ha conectado un almacen "
            f"de conocimiento sin aislamiento: cualquier busqueda devuelve "
            f"fragmentos de todos los clientes.")
    else:
        assert not tiene_inquilino, (
            "`nelvyon_rag_chunks` ya tiene columna de inquilino: actualiza esta "
            "prueba y exige tambien RLS antes de permitir escrituras")


async def test_el_almacen_vectorial_sigue_sin_rls(conexion):
    """`client_memory` SI acota por inquilino en cada consulta, pero sin RLS ese
    filtro es la unica frontera.

    Se deja documentado y medido. Ponerle RLS exige antes resolver que
    `workspace_id` es uuid ahi y entero en el resto del sistema: las funciones de
    politica reciben enteros, asi que hoy la politica ni siquiera compilaria.
    """
    rls = await conexion.fetchval(
        "SELECT relrowsecurity FROM pg_class WHERE relname='client_memory'")
    tipo = await conexion.fetchval(
        "SELECT data_type FROM information_schema.columns "
        " WHERE table_name='client_memory' AND column_name='workspace_id'")

    if rls:
        assert tipo == "integer", (
            "se activo RLS en `client_memory` con `workspace_id` de tipo "
            f"'{tipo}': las funciones de politica reciben enteros, asi que la "
            "politica no puede estar haciendo lo que parece")
    else:
        assert tipo == "uuid", (
            "cambio el tipo de `client_memory.workspace_id`: si ya es entero, "
            "activa RLS y actualiza esta prueba")

"""Las cuatro derivas de esquema, cerradas y con la conducta comprobada.

EL FALLO QUE ESTO IMPIDE
------------------------
Los logs de PostgreSQL de produccion registraban a diario cuatro errores de
consultas contra objetos inexistentes:

    relation "billing_payments" does not exist
    relation "saas_inbox_conversations" does not exist
    relation "agent_outcomes" does not exist
    column   c.revenue does not exist        (saas_ads_metrics_cache)

Ninguno llegaba al usuario como 5xx: los tres primeros estaban envueltos en un
`catch` que devolvia cero. Eso es lo que los hizo durar tanto — el panel llevaba
tiempo mostrando gasto 0 y «ninguna conversacion abierta» a todo el mundo, y
nadie veia un error.

CADA UNA SE RESOLVIO CON SU PROPIA EVIDENCIA
--------------------------------------------
No se adapto el codigo a la base ni la base al codigo por costumbre; se miro
quien escribe, quien lee y que existe:

    billing_payments          -> no existe y nadie la escribe. La facturacion
                                 real por inquilino esta en `saas_invoices`.
                                 Se corrigio la CONSULTA.

    saas_inbox_conversations  -> no existe. El modulo de bandeja tiene
                                 `saas_inbox_agent_settings`, `_routing`,
                                 `_sla_policies` y `_suggestions`, y las
                                 conversaciones estan en `saas_conversations`.
                                 Se corrigio la CONSULTA.

    agent_outcomes            -> `LearningService` INSERTA en ella. Es una tabla
                                 real que nunca se creo. Se creo el ESQUEMA,
                                 con las columnas exactas de ese INSERT.

    revenue                   -> el servicio de anuncios calcula los ingresos,
                                 los usa para derivar `roas` y los descartaba.
                                 Se anadio la COLUMNA y se persisten, porque el
                                 escritor tiene el dato verdadero y `spend*roas`
                                 no lo reconstruye cuando `roas` es NULL.

POR QUE `to_regclass` NO PROTEGIA NADA
--------------------------------------
La consulta de `billing_payments` llevaba un guard:

    SELECT CASE WHEN to_regclass('public.billing_payments') IS NULL THEN 0
                ELSE (SELECT SUM(...) FROM billing_payments ...) END

Parece defensivo y no lo es: PostgreSQL resuelve las referencias a relaciones al
ANALIZAR la sentencia, antes de evaluar ningun CASE. La rama del ELSE reventaba
aunque la condicion fuese verdadera. Un guard en tiempo de ejecucion no puede
proteger una referencia de tiempo de analisis, y este fichero lo comprueba
contra el motor para que quede demostrado y no como afirmacion.
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

TENANT = "00000000-0000-0000-0000-0000000009aa"


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def conn():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn())
    try:
        yield c
    finally:
        await c.execute("DELETE FROM agent_outcomes WHERE sector = 'certificacion'")
        await c.close()


# ── agent_outcomes: tabla nueva, con el contrato del servicio ────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_agent_outcomes_existe(conn):
    assert await conn.fetchval("SELECT to_regclass('public.agent_outcomes') IS NOT NULL")


@requiere_pg
@pytest.mark.asyncio
async def test_agent_outcomes_acepta_el_insert_del_servicio(conn):
    """Las columnas son las del INSERT real de `LearningService`, no una
    aproximacion. Si alguna faltara o cambiara de tipo, esto falla."""
    await conn.execute(
        """
        INSERT INTO agent_outcomes
          (user_id, agent_id, sector, input, output, quality_score,
           outcome_type, outcome_value, feedback, created_at)
        VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, NULL, $6, $7, $8, now())
        """,
        str(_uuid.uuid4()), "agente-cert", "certificacion",
        '{"pregunta": 1}', '{"respuesta": 2}', "conversion", 12.5, "va bien",
    )
    fila = await conn.fetchrow(
        """
        SELECT id, user_id, agent_id, sector, input, output, quality_score,
               outcome_type, outcome_value, feedback, created_at
          FROM agent_outcomes WHERE sector = 'certificacion'
        """
    )
    assert fila is not None
    assert fila["agent_id"] == "agente-cert"
    assert float(fila["outcome_value"]) == 12.5


@requiere_pg
@pytest.mark.asyncio
async def test_agent_outcomes_tiene_indice_para_su_consulta(conn):
    """El analisis filtra por (agent_id, sector) y ordena por fecha."""
    indices = await conn.fetch(
        "SELECT indexdef FROM pg_indexes WHERE tablename = 'agent_outcomes'"
    )
    definiciones = " ".join(r["indexdef"] for r in indices)
    assert "agent_id" in definiciones and "sector" in definiciones


# ── saas_ads_metrics_cache.revenue ──────────────────────────────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_la_columna_revenue_existe_y_suma(conn):
    """La consulta del panel que fallaba, ejecutada tal cual."""
    total = await conn.fetchval(
        "SELECT COALESCE(SUM(c.revenue), 0) FROM saas_ads_metrics_cache c"
    )
    assert total is not None


# ── las dos consultas reapuntadas ───────────────────────────────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_el_gasto_del_inquilino_se_lee_de_saas_invoices(conn):
    fila = await conn.fetchval(
        "SELECT COALESCE(SUM(amount_eur), 0) FROM saas_invoices "
        "WHERE tenant_id = $1 AND paid_at IS NOT NULL",
        TENANT,
    )
    assert fila is not None


@requiere_pg
@pytest.mark.asyncio
async def test_las_conversaciones_abiertas_se_leen_de_saas_conversations(conn):
    fila = await conn.fetchval(
        "SELECT COUNT(*) FROM saas_conversations "
        "WHERE tenant_id = $1 AND status IN ('open','pending')",
        TENANT,
    )
    assert fila == 0


# ── las tablas fantasma siguen sin existir, y da igual ───────────────────────

@requiere_pg
@pytest.mark.asyncio
@pytest.mark.parametrize("fantasma", ["billing_payments", "saas_inbox_conversations"])
async def test_las_tablas_fantasma_no_se_crearon_por_comodidad(conn, fantasma):
    """Control de la decision: se corrigio la consulta, NO se fabrico la tabla.

    Crear `billing_payments` para que la consulta dejara de fallar habria
    duplicado el concepto de facturacion en dos sitios, con una copia siempre
    vacia. La forma canonica ya existia.
    """
    assert not await conn.fetchval("SELECT to_regclass($1) IS NOT NULL", "public." + fantasma)


@requiere_pg
@pytest.mark.asyncio
async def test_to_regclass_no_protege_una_referencia_en_la_misma_sentencia(conn):
    """La causa raiz del primer defecto, demostrada contra el motor.

    Este era el patron que se creia defensivo. Falla al analizar, no al evaluar.
    """
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(asyncpg.exceptions.UndefinedTableError):
        await conn.fetchval(
            """
            SELECT CASE
                     WHEN to_regclass('public.tabla_que_no_existe_jamas') IS NULL THEN 0
                     ELSE (SELECT count(*) FROM tabla_que_no_existe_jamas)
                   END
            """
        )


@requiere_pg
@pytest.mark.asyncio
async def test_la_comprobacion_previa_si_protege(conn):
    """Control positivo de la forma correcta: preguntar primero, consultar
    despues, en sentencias separadas."""
    existe = await conn.fetchval("SELECT to_regclass('public.tabla_que_no_existe_jamas') IS NOT NULL")
    assert existe is False

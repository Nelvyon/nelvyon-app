"""Guardia: el bootstrap de tests no puede desincronizarse de la migración canónica.

Este fichero existe porque la desincronización YA ocurrió: `conftest.py` espejaba
a mano 2 de las 124 tablas de la migración 507 y 69 pruebas fallaban con
`no such table` pese a ser correcto el producto. Que vuelva a pasar en silencio
es lo que estos tests impiden.
"""

from __future__ import annotations

import pytest
from sqlalchemy import text

from ._schema_bootstrap import (
    CANONICAL_MIGRATION,
    CANONICAL_MIGRATIONS,
    columnas_relajadas,
    indices_unicos_sqlite,
    canonical_table_names,
    sqlite_add_column_statements,
    sqlite_create_statements,
)


#: La fuente canónica dejó de ser un único fichero: 507 transcribió mal el
#: esquema que los servicios ya esperaban, y 524-527 lo corrigen. El bootstrap
#: consume la CONCATENACIÓN, así que este guard verifica el conjunto y su orden.
FUENTES_ESPERADAS = (
    "507_fastapi_runtime_schemas.sql",
    "524_fastapi_raw_sql_schema_drift.sql",
    "525_fastapi_raw_sql_schema_drift_batch2.sql",
    "526_legacy_not_null_relaxation.sql",
    "527_intent_scores_unique.sql",
    "528_intent_scores_legacy_pk_repair.sql",
)


def test_las_fuentes_canonicas_existen_y_estan_en_orden():
    assert tuple(p.name for p in CANONICAL_MIGRATIONS) == FUENTES_ESPERADAS, (
        "el conjunto o el orden de las fuentes canónicas cambió; el orden importa "
        "porque 526 relaja restricciones que 507 declaró"
    )
    for fichero in CANONICAL_MIGRATIONS:
        assert fichero.is_file(), f"falta la migración canónica: {fichero}"


def test_el_bootstrap_consume_exactamente_esas_fuentes():
    """No basta con que existan: el bootstrap debe leerlas todas."""
    texto = CANONICAL_MIGRATION.read_text()
    for fichero in CANONICAL_MIGRATIONS:
        marca = fichero.read_text(encoding="utf-8").strip().split(chr(10))[0]
        assert marca in texto, f"{fichero.name} no llega al bootstrap"


def test_no_se_puede_volver_a_una_unica_ruta():
    """La regresión concreta que este guard impide."""
    from pathlib import Path

    assert not isinstance(CANONICAL_MIGRATION, Path), (
        "CANONICAL_MIGRATION volvió a ser una ruta única: el esquema de test "
        "dejaría fuera 524-527 y los fallos parecerían defectos de producto"
    )
    assert len(CANONICAL_MIGRATIONS) >= 5


def test_la_relajacion_de_526_llega_al_bootstrap():
    """SQLite no soporta `DROP NOT NULL`: se aplica al generar el CREATE TABLE."""
    relajadas = columnas_relajadas()
    assert ("pr_releases", "body") in relajadas
    assert len(relajadas) == 6, f"526 declara {len(relajadas)} columnas, se esperaban 6"


def test_los_indices_unicos_llegan_al_bootstrap():
    """Sin el índice de 527 el `ON CONFLICT` no tendría árbitro en SQLite."""
    indices = indices_unicos_sqlite()
    assert any("uq_intent_scores_lead_workspace" in i for i in indices), indices


def test_toda_tabla_canonica_produce_sentencia_de_creacion():
    """Ninguna tabla de la migración puede quedarse fuera del bootstrap."""
    nombres = canonical_table_names()
    sentencias = sqlite_create_statements()
    assert len(nombres) == len(sentencias), (
        f"{len(nombres)} tablas canónicas pero {len(sentencias)} sentencias: "
        "el parser ha dejado tablas fuera"
    )
    # Una tabla declarada dos veces con `IF NOT EXISTS` es legal e idempotente:
    # la 507 lo hace en un caso. Lo que importa es que ninguna se pierda, no que
    # no se repita, así que se comprueba cobertura y no unicidad.
    assert set(nombres), "el parser no ha encontrado ninguna tabla"


def test_las_columnas_anadidas_por_alter_se_recogen():
    """Las columnas de `ADD COLUMN` deben viajar al bootstrap.

    Omitirlas creaba tablas incompletas: `dialer_calls` sin `client_id` hacía
    fallar el INSERT del servicio con `has no column named`.
    """
    columnas = sqlite_add_column_statements()
    assert columnas, "no se ha recogido ninguna columna de ALTER TABLE"
    assert ("dialer_calls", "client_id") in [(t, c) for t, c, _ in columnas]


def test_las_sentencias_no_conservan_sintaxis_postgres():
    """La traducción debe dejar SQL que SQLite entienda."""
    prohibido = ("SERIAL", "TIMESTAMPTZ", "JSONB", "gen_random_uuid", "::")
    for sentencia in sqlite_create_statements():
        for token in prohibido:
            assert token not in sentencia, f"sintaxis PostgreSQL sin traducir ({token}): {sentencia[:120]}"


@pytest.mark.asyncio
async def test_toda_tabla_canonica_existe_en_la_base_de_tests(db_session):
    """La guardia de verdad: comparar la migración con la base realmente creada.

    Si una migración futura añade una tabla de runtime FastAPI y el bootstrap no
    la recoge, este test falla en vez de dejar que 69 pruebas fallen con un
    `no such table` desconcertante.
    """
    filas = await db_session.execute(
        text("SELECT name FROM sqlite_master WHERE type = 'table'")
    )
    existentes = {str(r[0]).lower() for r in filas.fetchall()}

    faltantes = sorted(set(canonical_table_names()) - existentes)
    assert faltantes == [], (
        f"{len(faltantes)} tablas canónicas no llegaron a la base de tests: "
        f"{faltantes[:10]}. El bootstrap se ha desincronizado de "
        f"{CANONICAL_MIGRATION.name}."
    )

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
    canonical_table_names,
    sqlite_add_column_statements,
    sqlite_create_statements,
)


def test_la_migracion_canonica_existe():
    assert CANONICAL_MIGRATION.is_file(), f"falta la migración canónica: {CANONICAL_MIGRATION}"


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

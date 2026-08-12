"""
Senal de actividad para churn, derivada de fuentes reales.

`churn_prediction_service` leia `workspaces.updated_at`, una columna que no
existe: nadie la crea ni la mantiene. La senal nunca se computaba y el valor por
defecto era `0 dias`, es decir, "maximamente activo" — justo para el workspace
del que no sabemos nada.

Ahora se deriva del ultimo trabajo humano sobre datos del workspace. Ausencia de
senal es `None`, no cero: una senal ausente honesta es preferible a una falsa.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import text

WS_A, WS_B = 1, 2


async def _preparar(db_session):
    for tabla, col in (
        ("saas_deals", "updated_at"),
        ("saas_contacts", "updated_at"),
        ("crm_activities", "completed_at"),
    ):
        await db_session.execute(
            text(f"CREATE TABLE IF NOT EXISTS {tabla} (id INTEGER PRIMARY KEY, workspace_id INTEGER, {col} TEXT)")
        )
        await db_session.execute(text(f"DELETE FROM {tabla}"))


async def _senal(db_session, workspace_id: int):
    from services.churn_prediction_service import ChurnPredictionService

    return await ChurnPredictionService(db_session)._last_activity_at(workspace_id)


async def _inserta(db_session, tabla, col, ws, cuando):
    # `crm_activities` ya existe en el esquema real con `contact_id NOT NULL`:
    # el fixture respeta la tabla de produccion en vez de recrearla a medida.
    extra = ", contact_id, type, description" if tabla == "crm_activities" else ""
    valor = ", 'c1', 'note', 'd'" if tabla == "crm_activities" else ""
    await db_session.execute(
        text(f"INSERT INTO {tabla} (workspace_id, {col}{extra}) VALUES (:ws, :t{valor})"),
        {"ws": ws, "t": cuando},
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "tabla,col,esperado",
    [
        ("saas_deals", "updated_at", "2026-03-01T00:00:00"),
        ("saas_contacts", "updated_at", "2026-03-01T00:00:00"),
        ("crm_activities", "completed_at", "2026-03-01T00:00:00"),
    ],
)
async def test_gana_la_fuente_mas_reciente(db_session, tabla, col, esperado):
    await _preparar(db_session)
    # Las otras dos quedan mas atras: la mas reciente debe imponerse.
    for t, c in (("saas_deals", "updated_at"), ("saas_contacts", "updated_at"), ("crm_activities", "completed_at")):
        await _inserta(db_session, t, c, WS_A, "2026-01-01T00:00:00")
    await _inserta(db_session, tabla, col, WS_A, esperado)
    assert await _senal(db_session, WS_A) == datetime.fromisoformat(esperado)


@pytest.mark.asyncio
async def test_una_sola_fuente_basta(db_session):
    await _preparar(db_session)
    await _inserta(db_session, "saas_contacts", "updated_at", WS_A, "2026-05-05T00:00:00")
    assert await _senal(db_session, WS_A) == datetime.fromisoformat("2026-05-05T00:00:00")


@pytest.mark.asyncio
async def test_sin_actividad_es_none_no_cero(db_session):
    """Lo decisivo: ausencia de senal no puede parecer actividad reciente."""
    await _preparar(db_session)
    assert await _senal(db_session, WS_A) is None


@pytest.mark.asyncio
async def test_jamas_cruza_workspace(db_session):
    """Un MAX global habria devuelto la actividad de B para A."""
    await _preparar(db_session)
    await _inserta(db_session, "saas_deals", "updated_at", WS_B, "2026-09-09T00:00:00")
    assert await _senal(db_session, WS_A) is None, "la actividad de otro workspace se filtro"
    assert await _senal(db_session, WS_B) == datetime.fromisoformat("2026-09-09T00:00:00")


@pytest.mark.asyncio
async def test_actividad_ajena_no_desplaza_la_propia(db_session):
    await _preparar(db_session)
    await _inserta(db_session, "saas_deals", "updated_at", WS_A, "2026-01-01T00:00:00")
    await _inserta(db_session, "saas_deals", "updated_at", WS_B, "2026-12-31T00:00:00")
    assert await _senal(db_session, WS_A) == datetime.fromisoformat("2026-01-01T00:00:00")

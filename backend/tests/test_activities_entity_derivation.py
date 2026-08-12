"""
`global_dashboard` deriva `entity_type`/`entity_id` del modelo real.

Esas dos columnas nunca existieron: `models/activities.py` declara `contact_id`
y `deal_id`, no un modelo polimorfico. El dashboard leia columnas imaginarias y
el endpoint devolvia 500. En vez de anadir schema para satisfacer al lector, se
deriva la forma que el contrato espera.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import text

RUTA = Path(__file__).resolve().parent.parent / "routers" / "global_dashboard.py"


def test_no_queda_referencia_fisica_a_columnas_inexistentes():
    src = RUTA.read_text(encoding="utf-8")
    i = src.index("FROM activities")
    consulta = src[max(0, i - 1400):i]
    # Solo pueden aparecer como ALIAS de la derivacion, nunca como columna leida.
    assert "AS entity_type" in consulta and "AS entity_id" in consulta
    assert "SELECT type, description, entity_type" not in consulta


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "contact_id,deal_id,esperado_tipo,esperado_id",
    [
        (11, None, "contact", 11),
        (None, 22, "deal", 22),
        (None, None, None, None),
        # El modelo no impide que coexistan: la precedencia debe ser explicita.
        (33, 44, "contact", 33),
    ],
)
async def test_derivacion_por_fila(db_session, contact_id, deal_id, esperado_tipo, esperado_id):
    # La tabla se crea aqui: su modelo no esta importado en el conftest, otro
    # sintoma de que `activities` no tiene productor en ninguna capa.
    await db_session.execute(
        text(
            "CREATE TABLE IF NOT EXISTS activities (id INTEGER PRIMARY KEY, user_id TEXT,"
            " workspace_id INTEGER, contact_id INTEGER, deal_id INTEGER, type TEXT,"
            " title TEXT, created_at TEXT)"
        )
    )
    await db_session.execute(text("DELETE FROM activities"))
    await db_session.execute(
        text(
            "INSERT INTO activities (user_id, workspace_id, contact_id, deal_id, type, title, created_at)"
            " VALUES ('u1', 1, :c, :d, 'note', 'T', '2026-01-01T00:00:00')"
        ),
        {"c": contact_id, "d": deal_id},
    )
    r = await db_session.execute(
        text(
            """
            SELECT CASE
                     WHEN contact_id IS NOT NULL THEN 'contact'
                     WHEN deal_id IS NOT NULL THEN 'deal'
                     ELSE NULL
                   END AS entity_type,
                   CASE
                     WHEN contact_id IS NOT NULL THEN contact_id
                     WHEN deal_id IS NOT NULL THEN deal_id
                     ELSE NULL
                   END AS entity_id
            FROM activities WHERE workspace_id = 1
            """
        )
    )
    fila = r.mappings().first()
    assert fila["entity_type"] == esperado_tipo
    assert fila["entity_id"] == esperado_id

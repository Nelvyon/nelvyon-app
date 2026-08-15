"""
El esquema de test debe ser fresco y determinista en cada ejecucion.

`test.db` es un fichero persistente y el bootstrap usa
`CREATE TABLE IF NOT EXISTS`, asi que un fichero superviviente conserva el
esquema ANTIGUO. Durante la auditoria eso hizo que la migracion 524 pareciera no
aplicarse: el bootstrap era correcto y los tests seguian fallando.

Estos tests fijan las dos propiedades que lo impiden.
"""
from __future__ import annotations

import pytest
from sqlalchemy import text

#: Columnas que 524 anade y que el bootstrap debe reflejar SIEMPRE.
COLUMNAS_524 = {
    "intent_events": {"lead_id", "page", "metadata_json"},
    "email_warmup_accounts": {
        "domain", "warmup_day", "deliverability_score",
        "dkim_ok", "spf_ok", "dmarc_ok", "started_at",
    },
}


@pytest.mark.asyncio
@pytest.mark.parametrize("tabla,esperadas", sorted(COLUMNAS_524.items()))
async def test_columnas_de_524_presentes_en_sqlite(db_session, tabla, esperadas):
    """Separa 'problema de bootstrap' de 'problema funcional del servicio'."""
    r = await db_session.execute(text(f"PRAGMA table_info({tabla})"))
    presentes = {row[1] for row in r.fetchall()}
    assert presentes, f"{tabla} no existe en el esquema de test"
    faltan = esperadas - presentes
    assert not faltan, (
        f"{tabla} sin columnas de la migracion 524: {sorted(faltan)}. "
        f"Si el bootstrap las extrae bien, sospecha de un test.db heredado."
    )


@pytest.mark.asyncio
async def test_las_columnas_antiguas_siguen_estando(db_session):
    """524 es aditiva: no elimina lo que 507 declaro."""
    r = await db_session.execute(text("PRAGMA table_info(intent_events)"))
    presentes = {row[1] for row in r.fetchall()}
    assert {"contact_id", "payload_json"} <= presentes


def test_la_base_de_test_se_regenera_en_cada_sesion():
    """
    El reset ocurre al INICIO, no solo en el teardown.

    Sin esto, una sesion interrumpida deja el esquema viejo y la siguiente
    ejecucion miente.
    """
    import inspect

    from tests import conftest

    fuente = inspect.getsource(conftest)
    assert "_reset_test_db()" in fuente
    assert fuente.index("def _reset_test_db") < fuente.index("\n_reset_test_db()")
    # La valvula de escape para depurar existe y es explicita.
    assert "NELVYON_KEEP_TEST_DB" in fuente

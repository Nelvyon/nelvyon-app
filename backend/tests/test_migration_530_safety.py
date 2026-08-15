"""
Retirar un indice redundante sin quedarse sin arbitro.

En `intent_scores` acabaron conviviendo tres estructuras: la PK
`(lead_id, workspace_id)` de la migracion 528, un indice unico IDENTICO de la
527, y otro de la 525 con el orden invertido.

El de la 527 es exactamente la PK y no aporta nada; PostgreSQL lo mantiene en
cada escritura. El de la 525 SI sirve —empieza por `workspace_id`, asi que
responde consultas que un indice que empieza por `lead_id` no puede— y se
conserva.

LO QUE HACE PELIGROSO ESTE DROP
-------------------------------
`ON CONFLICT (lead_id, workspace_id)` necesita una restriccion unica sobre ese
conjunto exacto. La PK la proporciona, pero la 528 tiene precondiciones
fail-closed y puede haber salido sin aplicarse. Retirar el indice en una base
donde la PK no llego a crearse dejaria los INSERT sin arbitro.

Por eso el DROP va condicionado a comprobar la PK, y si no es la esperada, no
toca nada. La condicion se puede leer aqui aunque PostgreSQL no este disponible.
"""
from __future__ import annotations

from pathlib import Path

MIGRACION = (
    Path(__file__).resolve().parent.parent
    / "db" / "migrations" / "530_intent_scores_redundant_index.sql"
)


def _sql() -> str:
    return MIGRACION.read_text(encoding="utf-8")


def test_el_drop_va_condicionado_a_que_exista_la_pk():
    """Sin esa comprobacion, el DROP puede dejar el ON CONFLICT sin arbitro."""
    sql = _sql()
    i = sql.index("DROP INDEX")
    anterior = sql[:i]
    assert "contype = 'p'" in anterior, "no se consulta la PK antes de borrar"
    assert "IS DISTINCT FROM 'lead_id,workspace_id'" in anterior
    assert anterior.count("RETURN;") >= 3, "faltan salidas tempranas fail-closed"


def test_solo_se_retira_el_indice_duplicado():
    """
    El de orden invertido responde consultas por `workspace_id` solo, que la PK
    no puede servir. Borrarlo seria una regresion de rendimiento silenciosa.
    """
    sql = _sql()
    assert "DROP INDEX IF EXISTS uq_intent_scores_lead_workspace" in sql
    assert "ix_intent_scores_workspace_lead" not in sql.split("DROP INDEX")[1], (
        "el indice de orden invertido no debe tocarse"
    )


def test_la_migracion_no_toca_datos():
    """Un indice se reconstruye; una fila borrada no."""
    sql = _sql().upper()
    for destructivo in ("DROP TABLE", "DROP COLUMN", "DELETE FROM", "TRUNCATE", "UPDATE "):
        assert destructivo not in sql, f"la migracion 530 hace {destructivo}"


def test_es_idempotente():
    """Aplicarla dos veces no puede fallar la segunda."""
    sql = _sql()
    assert "IF EXISTS" in sql
    assert "to_regclass('public.uq_intent_scores_lead_workspace') IS NULL" in sql


def test_avisa_en_vez_de_callar_cuando_no_puede_actuar():
    """
    Una migracion que no hace nada y no lo dice es indistinguible de una que
    fallo. Cada salida temprana deja un NOTICE.
    """
    sql = _sql()
    assert sql.count("RAISE NOTICE") >= 4

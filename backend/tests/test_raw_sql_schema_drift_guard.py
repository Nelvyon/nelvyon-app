"""
Casos controlados del detector de deriva raw-SQL.

REGLA DE METODO QUE ESTE FICHERO EXISTE PARA IMPONER
---------------------------------------------------
Un escaner que devuelve cero hallazgos NO esta validado hasta demostrar un
positivo conocido. Durante la auditoria el detector de lecturas reporto
`DRIFT: 0` durante tres iteraciones mientras estaba completamente muerto: un
`\\b` se habia escrito como carater backspace real y ninguna tabla se resolvia.
Escanear el repo real no lo revelo, porque "ningun hallazgo" es indistinguible
de "todo correcto".

Por eso los positivos viven aqui, como fixtures permanentes, y no dependen del
estado del repositorio.
"""
from __future__ import annotations

import pytest

from tests._raw_sql_schema_drift import analizar_sql

ESQUEMA = {
    "customers": {"id", "name"},
    "warmup": {"domain"},
    "tickets": {"id", "status"},
    "events": {"id", "created_at"},
    "orders": {"id", "category", "qty"},
    "a": {"id", "owner_id"},
    "b": {"id"},
}


def clasificar(sql: str):
    """(drift, unresolved, validas) segun ESQUEMA."""
    usos, sin_resolver = analizar_sql(sql)
    drift = {(u.tabla, u.columna) for u in usos if u.columna not in ESQUEMA.get(u.tabla, set())}
    validas = {(u.tabla, u.columna) for u in usos if u.columna in ESQUEMA.get(u.tabla, set())}
    return drift, {u.columna for u in sin_resolver}, validas


# ─────────────────────────────────────────────── los seis casos base
def test_1_select_explicito_valido():
    drift, unresolved, validas = clasificar("SELECT id, name FROM customers")
    assert drift == set()
    assert validas == {("customers", "id"), ("customers", "name")}
    assert unresolved == set()


def test_2_select_con_columna_inexistente():
    drift, _, _ = clasificar("SELECT id, columna_inexistente FROM customers")
    assert ("customers", "columna_inexistente") in drift


def test_3_order_by_inexistente():
    """Reproduce exactamente la clase que se escapo: `sent_today`."""
    drift, _, _ = clasificar("SELECT id FROM customers ORDER BY sent_today ASC")
    assert ("customers", "sent_today") in drift


def test_4_group_by_inexistente():
    drift, _, _ = clasificar("SELECT domain FROM warmup GROUP BY missing_group")
    assert ("warmup", "missing_group") in drift


def test_5_select_estrella_no_inventa_columnas():
    drift, unresolved, validas = clasificar("SELECT * FROM customers")
    assert drift == set() and validas == set() and unresolved == set()


def test_6_join_ambiguo_es_unresolved_no_drift():
    """Con varias tablas no se adivina: la incertidumbre no se vuelve roja."""
    drift, unresolved, _ = clasificar(
        "SELECT id FROM a JOIN b ON a.owner_id = b.id ORDER BY status"
    )
    assert "status" in unresolved
    assert drift == set(), "una columna no atribuible no puede reportarse como drift"


def test_7_caso_real_email_warmup():
    """El positivo real que motivo v2, como fixture permanente."""
    drift, _, validas = clasificar(
        "SELECT deliverability_score FROM warmup "
        "ORDER BY deliverability_score DESC, sent_today ASC"
    )
    assert ("warmup", "sent_today") in drift
    assert ("warmup", "deliverability_score") in drift  # tampoco esta en ESQUEMA


# ───────────────────────────────────── v2.1: aliases y expresiones
def test_8_alias_de_agregado_no_es_columna():
    """`ORDER BY cnt` referencia la proyeccion, no una columna de la tabla."""
    drift, _, _ = clasificar("SELECT COUNT(*) AS cnt FROM tickets ORDER BY cnt")
    assert drift == set(), f"alias de proyeccion tratado como columna: {drift}"


def test_9_alias_de_suma_con_group_by():
    drift, _, _ = clasificar(
        "SELECT category, SUM(qty) AS total FROM orders GROUP BY category ORDER BY total DESC"
    )
    assert drift == set()


def test_10_alias_de_funcion_de_fecha():
    """`day` es alias; `created_at` si debe validarse contra la tabla."""
    sql = "SELECT DATE(created_at) AS day, COUNT(*) AS cnt FROM events GROUP BY day ORDER BY cnt DESC"
    drift, _, _ = clasificar(sql)
    assert ("events", "day") not in drift
    assert ("events", "cnt") not in drift


def test_11_case_no_es_columna():
    sql = "SELECT id FROM tickets ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END"
    drift, _, _ = clasificar(sql)
    assert ("tickets", "case") not in drift
    assert ("tickets", "when") not in drift


def test_12_ordinal_no_es_columna():
    drift, _, _ = clasificar("SELECT id, name FROM customers ORDER BY 1")
    assert drift == set()


def test_13_alias_no_enmascara_una_columna_inexistente_de_otra_parte():
    """Declarar `AS cnt` no debe legitimar `columna_inexistente` en el SELECT."""
    drift, _, _ = clasificar(
        "SELECT columna_inexistente, COUNT(*) AS cnt FROM customers ORDER BY cnt"
    )
    assert ("customers", "columna_inexistente") in drift


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT COUNT(*) AS cnt FROM a JOIN b ON a.owner_id = b.id ORDER BY cnt",
        "SELECT MAX(created_at) AS ultimo FROM a JOIN b ON a.id = b.id ORDER BY ultimo",
    ],
)
def test_14_alias_de_proyeccion_resuelve_incluso_con_join(sql):
    """Un alias explica la referencia aunque la tabla sea ambigua."""
    drift, unresolved, _ = clasificar(sql)
    assert drift == set()
    assert "cnt" not in unresolved and "ultimo" not in unresolved


# ─────────────────────────────── v2.1: literales booleanos
def test_15_true_y_false_no_son_columnas():
    drift, _, _ = clasificar("SELECT true, false FROM warmup")
    assert drift == set(), f"literales booleanos tratados como columnas: {drift}"


def test_16_booleanos_dentro_de_case_y_columna_real_validada():
    sql = "SELECT CASE WHEN enabled THEN true ELSE false END FROM tickets"
    drift, _, _ = clasificar(sql)
    assert ("tickets", "true") not in drift
    assert ("tickets", "false") not in drift


def test_17_mutacion_del_guard_columna_inexistente():
    """Mutacion sobre fixture: el detector debe senalar tabla, columna y uso."""
    usos, _ = analizar_sql("SELECT id FROM customers ORDER BY definitely_missing_column")
    fallo = [u for u in usos if u.columna == "definitely_missing_column"]
    assert fallo, "el guard no detecta una columna claramente inexistente"
    u = fallo[0]
    assert u.tabla == "customers" and u.tipo == "ORDER BY"
    assert u.columna not in ESQUEMA["customers"]


def test_18_mutacion_del_trinquete_nuevo_unresolved():
    """Un SQL ambiguo nuevo incrementa UNRESOLVED, que es lo que el trinquete vigila."""
    _, sin_resolver = analizar_sql(
        "SELECT id FROM a JOIN b ON a.id = b.id ORDER BY columna_ambigua_nueva"
    )
    assert any(x.columna == "columna_ambigua_nueva" for x in sin_resolver)
    assert all(x.tabla == "join_ambiguo" for x in sin_resolver)

"""
Casos controlados del analizador estatico de writers.

Certifica la pieza que NO necesita PostgreSQL: extraer de una cadena SQL la
tabla, las columnas escritas y el conflict target. La comparacion contra
restricciones reales vive en la suite de integracion, porque `pg_catalog` es el
unico oraculo valido para PK/UNIQUE/NOT NULL.

Estos fixtures existen por la misma razon que los del guard de columnas: un
detector que devuelve cero hallazgos no esta validado hasta demostrar un
positivo conocido. Durante esta auditoria un detector estuvo muerto tres
iteraciones dando `0` sin que escanear el repo lo revelara.
"""
from __future__ import annotations

from tests._constraint_drift import analizar_writers


def test_extrae_insert_simple():
    w = analizar_writers("INSERT INTO clientes (id, nombre) VALUES (:a, :b)")
    assert len(w) == 1
    assert w[0].tabla == "clientes"
    assert w[0].columnas == frozenset({"id", "nombre"})
    assert w[0].conflict_target is None


def test_varios_writers_de_la_misma_tabla_no_se_fusionan():
    """Que un writer aporte una columna NO salva a otro que la omite."""
    sql = """
        INSERT INTO clientes (id, nombre, email) VALUES (1, 'a', 'b');
        INSERT INTO clientes (id) VALUES (2);
    """
    w = analizar_writers(sql)
    assert len(w) == 2
    assert w[0].columnas == frozenset({"id", "nombre", "email"})
    assert w[1].columnas == frozenset({"id"})


def test_extrae_conflict_target_compuesto():
    w = analizar_writers(
        "INSERT INTO puntuaciones (lead_id, workspace_id, score) VALUES (1,2,3) "
        "ON CONFLICT(lead_id, workspace_id) DO UPDATE SET score = 9"
    )
    assert w[0].conflict_target == frozenset({"lead_id", "workspace_id"})


def test_conflict_target_es_un_conjunto_no_una_secuencia():
    """PostgreSQL casa por conjunto: `ON CONFLICT(a,b)` acepta `UNIQUE(b,a)`."""
    uno = analizar_writers("INSERT INTO t (a,b) VALUES (1,2) ON CONFLICT(a, b) DO NOTHING")
    otro = analizar_writers("INSERT INTO t (a,b) VALUES (1,2) ON CONFLICT(b, a) DO NOTHING")
    assert uno[0].conflict_target == otro[0].conflict_target


def test_on_conflict_on_constraint_se_resuelve_por_nombre():
    """Arbitro nominal: no se puede comparar por columnas."""
    w = analizar_writers(
        "INSERT INTO t (a) VALUES (1) ON CONFLICT ON CONSTRAINT uq_t_a DO NOTHING"
    )
    assert w[0].conflict_por_constraint == "uq_t_a"
    assert w[0].conflict_target is None


def test_insert_multilinea():
    sql = """
        INSERT INTO facturas (
            id, cliente_id,
            total
        )
        VALUES (:id, :cid, :total)
    """
    assert analizar_writers(sql)[0].columnas == frozenset({"id", "cliente_id", "total"})


def test_limitacion_conocida_insert_dentro_de_un_literal():
    """
    LIMITACION DOCUMENTADA, no defecto silenciado.

    El analizador no distingue un `INSERT` real de uno escrito dentro de una
    cadena SQL. Reconocerlo exigiria un parser completo, que es justo lo que
    este alcance evita.

    Por que es inocuo: el writer espurio apunta a una tabla inventada, y
    `comparar()` ignora toda tabla ausente de `pg_catalog`. No puede producir un
    DRIFT falso — a lo sumo, ruido invisible.
    """
    w = analizar_writers("SELECT id FROM clientes WHERE nombre = 'INSERT INTO falso (x)'")
    assert len(w) == 1 and w[0].tabla == "falso"

    from tests._constraint_drift import comparar

    # Sin la tabla en el catalogo, el comparador no emite nada.
    assert comparar(w, {}) == []


def test_el_conflict_target_no_se_atribuye_al_insert_siguiente():
    """Un `ON CONFLICT` pertenece a SU sentencia, no a la de al lado."""
    sql = """
        INSERT INTO a (x) VALUES (1) ON CONFLICT(x) DO NOTHING;
        INSERT INTO b (y) VALUES (2);
    """
    w = analizar_writers(sql)
    assert w[0].tabla == "a" and w[0].conflict_target == frozenset({"x"})
    assert w[1].tabla == "b" and w[1].conflict_target is None


def test_ignora_valores_no_literales_en_la_lista_de_columnas():
    w = analizar_writers("INSERT INTO t (id, 42, col_ok) VALUES (1,2,3)")
    assert w[0].columnas == frozenset({"id", "col_ok"})


def test_el_repo_real_tiene_writers_y_conflict_targets():
    """Positivo real: si esto cae a cero, el extractor AST murio."""
    from tests._constraint_drift import writers_del_repo

    w = writers_del_repo()
    assert len(w) > 100, f"solo {len(w)} writers: el extractor no lee el repo"
    con_conflicto = [x for x in w if x.conflict_target or x.conflict_por_constraint]
    assert len(con_conflicto) > 10, "los ON CONFLICT del repo dejaron de detectarse"

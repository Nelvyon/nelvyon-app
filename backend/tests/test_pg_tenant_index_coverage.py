"""El filtro de inquilino debe tener indice DONDE el codigo consulta.

QUE PROBLEMA VIGILA
-------------------
En un SaaS multi-inquilino casi toda consulta lleva `WHERE workspace_id = ...`.
Sin indice sobre esa columna, PostgreSQL recorre la tabla ENTERA para devolver
las filas de un solo cliente: el coste crece con el total del sistema, no con lo
que ese cliente tiene. Es la degradacion que aparece justo cuando el producto
empieza a funcionar, y no se nota en desarrollo porque las tablas estan vacias.

Medido a 200.000 filas repartidas en 500 workspaces:

    sin indice   Seq Scan          1082 buffers   9,88 ms
    con indice   Bitmap Index Scan  402 buffers   1,16 ms

POR QUE NO SE EXIGE INDICE EN LAS 367 COLUMNAS
----------------------------------------------
Porque un indice que nadie usa no es gratis: se mantiene en cada INSERT, UPDATE
y DELETE. Exigirlo en todas convertiria la guardia en un impuesto sobre la
escritura y acabaria desactivada. Solo se exige donde hay una consulta real que
filtra por esa columna, que es donde el indice se paga solo.

Las 76 columnas restantes sin indice quedan fuera A PROPOSITO. Si manana alguien
escribe una consulta que filtre por una de ellas, esta guardia la detecta ese
mismo dia: el conjunto se recalcula, no esta escrito a mano.
"""
from __future__ import annotations

import ast
import os
import re
from pathlib import Path

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

RAIZ = Path(__file__).resolve().parent.parent
DIRS = ("services", "routers", "core")
COLUMNAS_INQUILINO = ("workspace_id", "tenant_id")

#: `FROM tabla ... WHERE ... workspace_id =`. El corte en `FROM` y `;` evita que
#: una consulta arrastre el WHERE de la siguiente y atribuya el filtro a la
#: tabla equivocada.
_FILTRO = re.compile(
    r"FROM\s+([a-z_][a-z0-9_]*)\b(?:(?!FROM|;).)*?WHERE(?:(?!FROM|;).)*?"
    r"\b(workspace_id|tenant_id)\s*=",
    re.IGNORECASE | re.DOTALL,
)

_SQL_SIN_INDICE = """
WITH cols AS (
  SELECT c.oid, c.relname, a.attnum, a.attname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
   WHERE c.relkind = 'r' AND a.attname IN ('workspace_id', 'tenant_id')
)
SELECT relname, attname
  FROM cols
 WHERE NOT EXISTS (
   SELECT 1 FROM pg_index ix
    WHERE ix.indrelid = cols.oid
      AND ix.indkey[0] = cols.attnum
 )
"""


def _filtros_del_codigo() -> dict[str, set[str]]:
    """Tablas que el SQL vivo filtra por columna de inquilino.

    Se leen literales por AST, no por regex sobre el fichero: asi un comentario
    que mencione una consulta no cuenta como consulta.
    """
    fuera: dict[str, set[str]] = {}
    for carpeta in DIRS:
        base = RAIZ / carpeta
        if not base.exists():
            continue
        for fichero in base.rglob("*.py"):
            if "__pycache__" in str(fichero):
                continue
            try:
                arbol = ast.parse(fichero.read_text(encoding="utf-8"))
            except (SyntaxError, UnicodeDecodeError):
                continue
            for nodo in ast.walk(arbol):
                if isinstance(nodo, ast.Constant) and isinstance(nodo.value, str):
                    for tabla, columna in _FILTRO.findall(nodo.value):
                        fuera.setdefault(tabla.lower(), set()).add(columna.lower())
    return fuera


@pytest.fixture(scope="module")
def sin_indice() -> dict[str, set[str]]:
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    try:
        cur = conn.cursor()
        cur.execute(_SQL_SIN_INDICE)
        fuera: dict[str, set[str]] = {}
        for tabla, columna in cur.fetchall():
            fuera.setdefault(tabla, set()).add(columna)
        cur.close()
    finally:
        conn.close()
    return fuera


def test_el_extractor_encuentra_filtros_de_inquilino():
    """Control positivo del extractor. Sin PostgreSQL: corre siempre.

    Si el regex dejara de casar, `_filtros_del_codigo()` devolveria un conjunto
    vacio, la interseccion con las columnas sin indice tambien seria vacia, y la
    guardia daria verde sin haber mirado nada.
    """
    filtros = _filtros_del_codigo()
    assert len(filtros) > 50, (
        f"solo {len(filtros)} tablas filtradas por inquilino: el extractor esta "
        "roto y la cobertura no se estaria comprobando"
    )
    assert all(
        c in COLUMNAS_INQUILINO for cols in filtros.values() for c in cols
    )


def test_el_extractor_no_confunde_tablas_vecinas():
    """Control negativo: el filtro pertenece a la tabla de SU consulta.

    Sin el corte en `FROM`, la segunda consulta prestaria su `WHERE` a la
    primera y se exigirian indices en tablas que nadie filtra asi.
    """
    sql = "SELECT * FROM tabla_sin_filtro; SELECT * FROM tabla_con_filtro WHERE workspace_id = 1"
    encontrado = {t for t, _ in _FILTRO.findall(sql)}
    assert "tabla_con_filtro" in encontrado
    assert "tabla_sin_filtro" not in encontrado


@requiere_pg
def test_el_catalogo_tiene_columnas_de_inquilino(sin_indice):
    """Guardia contra certificar sobre una base vacia.

    Con un DSN equivocado no habria columnas, la interseccion seria vacia y el
    test siguiente pasaria sin haber comprobado nada.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT count(*) FROM pg_class c "
            "JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public' "
            "JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 "
            "  AND NOT a.attisdropped "
            "WHERE c.relkind = 'r' AND a.attname IN ('workspace_id', 'tenant_id')"
        )
        total = int(cur.fetchone()[0])
        cur.close()
    finally:
        conn.close()
    assert total > 300, (
        f"solo {total} columnas de inquilino en el catalogo: la base no tiene la "
        "cadena de migraciones aplicada"
    )


@requiere_pg
def test_toda_columna_consultada_tiene_indice(sin_indice):
    descubiertos = sorted(
        f"{tabla}.{columna}"
        for tabla, columnas in _filtros_del_codigo().items()
        for columna in columnas
        if columna in sin_indice.get(tabla, ())
    )
    assert not descubiertos, (
        "el codigo filtra por estas columnas y PostgreSQL no tiene indice que las "
        "lleve en primera posicion, asi que cada consulta recorre la tabla entera:\n  "
        + "\n  ".join(descubiertos)
        + "\n\nAnadirlas a una migracion siguiendo el patron de 531."
    )

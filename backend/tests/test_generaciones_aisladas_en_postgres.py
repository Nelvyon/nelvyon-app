"""Las dos generaciones conviven sin poder contaminarse.

POR QUE NO SE CONSOLIDAN
------------------------
`contacts`/`saas_contacts`, `deals`/`saas_deals` y
`conversations`/`saas_conversations` son entidades distintas de dos generaciones
del producto, no dos formas de lo mismo. Hay ETLs que vuelcan de una a otra
(`SaasCrmEtlService`, `SaasDealsEtlService`), y en produccion `contacts` tiene
241 filas y `saas_contacts` 1: se usan las dos.

Consolidarlas seria un refactor de producto. Lo que si hay que garantizar es que
la coexistencia no puede corromper ni cruzar inquilinos, y eso es comprobable.

LAS CUATRO INVARIANTES
----------------------
1. Ninguna tabla de la generacion ORM tiene `tenant_id`.
2. Ninguna de las tres `saas_*` emparejadas tiene `workspace_id`.

   Si una tabla tuviera las dos columnas, dejaria de estar claro quien manda y
   volveria el problema que costo dos despliegues: la misma tabla reclamada por
   dos identidades.

3. No hay ni una clave ajena entre los tres pares. Son referencialmente
   disjuntos: no existe camino por el que un borrado o una actualizacion en una
   generacion arrastre datos de la otra.

4. `saas_tenants.workspace_id` es UNICO. Es la invariante que sostiene los ETL:
   construyen un mapa `workspace_id -> tenant_id` con

       map.set(r.workspace_id, r.id)

   y si dos inquilinos compartieran workspace el ultimo ganaria EN SILENCIO, y
   los datos de ese workspace acabarian atribuidos al inquilino equivocado. Es
   decir: sin esa unicidad, el ETL seria una fuga entre clientes. La garantiza
   `idx_saas_tenants_workspace_id`, unico parcial sobre `workspace_id IS NOT NULL`.
"""
from __future__ import annotations

import os

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = pytest.mark.skipif(
    not DSN, reason="requiere PostgreSQL real; exportar NELVYON_PG_CERT_DSN"
)

ORM = ("contacts", "deals", "conversations")
TENANT = ("saas_contacts", "saas_deals", "saas_conversations")


@pytest.fixture(scope="module")
def cur():
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    c = conn.cursor()
    yield c
    conn.close()


def _columnas(cur, tabla: str) -> set[str]:
    cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = %s",
        (tabla,),
    )
    return {r[0] for r in cur.fetchall()}


def test_las_seis_tablas_existen(cur):
    """Control positivo: sin esto, todo lo demas pasaria por vacio."""
    for t in ORM + TENANT:
        assert _columnas(cur, t), f"{t} no existe: la base no esta completa"


def test_la_generacion_orm_no_tiene_identidad_de_inquilino(cur):
    for t in ORM:
        cols = _columnas(cur, t)
        assert "tenant_id" not in cols, f"{t} tiene tenant_id: identidad mezclada"
        assert "workspace_id" in cols, f"{t} perdio workspace_id: ya no es la del ORM"


def test_la_generacion_tenant_no_tiene_identidad_de_workspace(cur):
    for t in TENANT:
        cols = _columnas(cur, t)
        assert "workspace_id" not in cols, f"{t} tiene workspace_id: identidad mezclada"
        assert "tenant_id" in cols, f"{t} perdio tenant_id: ya no es la de inquilinos"


def test_los_tres_pares_son_referencialmente_disjuntos(cur):
    """Sin FKs cruzadas no hay camino de corrupcion entre generaciones."""
    cur.execute(
        """
        SELECT s.relname, a.attname, t.relname
        FROM pg_constraint c
        JOIN pg_class s ON s.oid = c.conrelid
        JOIN pg_class t ON t.oid = c.confrelid
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.contype = 'f'
          AND ((s.relname = ANY(%s) AND t.relname LIKE 'saas\\_%%')
            OR (s.relname LIKE 'saas\\_%%' AND t.relname = ANY(%s)))
        """,
        (list(ORM), list(ORM)),
    )
    cruces = cur.fetchall()
    assert not cruces, f"claves ajenas entre generaciones: {cruces}"


def test_un_workspace_no_puede_pertenecer_a_dos_inquilinos(cur):
    """La invariante que impide que el ETL cruce clientes."""
    cur.execute(
        "SELECT indexdef FROM pg_indexes "
        "WHERE tablename = 'saas_tenants' AND indexdef LIKE '%%UNIQUE%%workspace_id%%'"
    )
    indices = [r[0] for r in cur.fetchall()]
    assert indices, (
        "`saas_tenants.workspace_id` no es unico: dos inquilinos podrian compartir "
        "workspace y el mapa del ETL atribuiria sus datos al equivocado"
    )


def test_no_hay_workspaces_compartidos_en_los_datos(cur):
    """Control sobre datos, no solo sobre el esquema."""
    cur.execute(
        "SELECT workspace_id, count(*) FROM saas_tenants "
        "WHERE workspace_id IS NOT NULL GROUP BY workspace_id HAVING count(*) > 1"
    )
    repetidos = cur.fetchall()
    assert not repetidos, f"workspaces con mas de un inquilino: {repetidos}"

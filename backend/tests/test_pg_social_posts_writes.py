"""`social_posts` se escribe con su contrato real. Contra PostgreSQL real.

DOS TABLAS DISTINTAS, NO CONFUNDIR
----------------------------------
    social_posts        migracion 507. `tenant_id INTEGER`. La usa el backend
                        Python: `social_scheduler_service`, `finetuning_service`,
                        `reporting_service`, `e2e_orchestrator`.
    saas_social_posts   migracion 420. `tenant_id UUID`. Otra tabla, otro
                        producto: el scheduler social de `/saas`, con servicio
                        TypeScript propio (`backend/saas/SaasSocialService.ts`).

Este fichero solo trata la primera. La segunda no se toca.

`social_posts.tenant_id` ES ENTERO
----------------------------------
A diferencia de `calendar_events` o `audit_logs`, aqui `tenant_id` guarda
directamente el `workspace_id` — asi lo usa `finetuning_service`, que ata `:ws`
a `sp.tenant_id`. NO hay que traducir por `saas_tenants`; hacerlo meteria un
uuid en una columna entera.

QUE ESTABA ROTO
---------------
`routers/e2e_orchestrator.py` insertaba `user_id`, `platform`, `campaign_name`,
`client_id`, `project_id`, `output_id` y `contract_id`: siete columnas que la
tabla no tiene. Y omitia `tenant_id`, la unica NOT NULL sin default. El INSERT
fallaba siempre.

La evidencia de produccion (Railway → Postgres → Data) confirmo que la tabla
existe con la generacion `tenant_id` y esta VACIA, asi que alinear el codigo no
puede perder nada.

Lo que aquellas columnas transportaban no se pierde: va a `metadata`, que es
jsonb y existe para eso.
"""
from __future__ import annotations

import json
import os

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

WS_A = 936_001
WS_B = 936_002


@pytest.fixture
def conexion():
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DELETE FROM social_posts WHERE tenant_id IN (%s, %s)", (WS_A, WS_B))
    try:
        yield cur
    finally:
        cur.execute("DELETE FROM social_posts WHERE tenant_id IN (%s, %s)", (WS_A, WS_B))
        cur.close()
        conn.close()


def _insertar(cur, ws: int, contenido: str, meta: dict | None = None) -> None:
    """El INSERT tal y como lo emite ahora `e2e_orchestrator`."""
    cur.execute(
        """
        INSERT INTO social_posts
          (tenant_id, content, status, scheduled_at, created_at, updated_at, metadata)
        VALUES (%s, %s, 'draft', NULL, now(), now(), %s::jsonb)
        """,
        (ws, contenido, json.dumps(meta or {})),
    )


@requiere_pg
def test_la_publicacion_se_puede_crear(conexion):
    """Antes fallaba con `column "platform" does not exist`, siempre."""
    _insertar(conexion, WS_A, "hola")
    conexion.execute("SELECT count(*) FROM social_posts WHERE tenant_id = %s", (WS_A,))
    assert conexion.fetchone()[0] == 1


@requiere_pg
def test_lo_que_no_cabe_en_columnas_sobrevive_en_metadata(conexion):
    """`platform`, `campaign_name`, `client_id`… ya no son columnas.

    Perderlas seria perder informacion del producto; van a `metadata`.
    """
    _insertar(
        conexion, WS_A, "hola",
        {"platform": "linkedin", "campaign_name": "verano", "client_id": 7},
    )
    conexion.execute(
        "SELECT metadata->>'platform', metadata->>'campaign_name', metadata->>'client_id' "
        "FROM social_posts WHERE tenant_id = %s",
        (WS_A,),
    )
    assert conexion.fetchone() == ("linkedin", "verano", "7")


@requiere_pg
def test_las_publicaciones_estan_aisladas_por_inquilino(conexion):
    _insertar(conexion, WS_A, "de A")
    _insertar(conexion, WS_B, "de B")
    conexion.execute("SELECT content FROM social_posts WHERE tenant_id = %s", (WS_A,))
    assert [r[0] for r in conexion.fetchall()] == ["de A"]


@requiere_pg
def test_tenant_id_es_obligatorio(conexion):
    """Control positivo: es la unica NOT NULL sin default, y omitirla revienta.

    Sin esto, un dia alguien la quita del INSERT y el resto seguiria pasando.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    with pytest.raises(psycopg2.errors.NotNullViolation):
        conexion.execute("INSERT INTO social_posts (content) VALUES ('sin inquilino')")


@requiere_pg
def test_tenant_id_es_entero_y_no_uuid(conexion):
    """La diferencia con `calendar_events`, fijada como test.

    Si alguien aplicase aqui el puente `saas_tenants` por analogia, metería un
    uuid en una columna entera. Esto lo detecta.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    conexion.execute(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_name = 'social_posts' AND column_name = 'tenant_id'"
    )
    assert conexion.fetchone()[0] == "integer"
    with pytest.raises((psycopg2.errors.InvalidTextRepresentation, psycopg2.errors.DatatypeMismatch)):
        conexion.execute(
            "INSERT INTO social_posts (tenant_id, content) "
            "VALUES (gen_random_uuid(), 'uuid donde va un entero')"
        )


@requiere_pg
def test_no_se_confunde_con_saas_social_posts(conexion):
    """Son dos tablas distintas y deben seguir siendolo.

    `saas_social_posts` es del scheduler de `/saas`, con `tenant_id UUID` y
    servicio TypeScript propio. Si algun dia una de las dos desapareciera o
    cambiara de tipo de inquilino, este test lo dice antes que un cliente.
    """
    conexion.execute(
        "SELECT table_name, data_type FROM information_schema.columns "
        "WHERE table_name IN ('social_posts', 'saas_social_posts') "
        "AND column_name = 'tenant_id' ORDER BY table_name"
    )
    assert conexion.fetchall() == [("saas_social_posts", "uuid"), ("social_posts", "integer")]


@requiere_pg
def test_el_orquestador_no_menciona_columnas_inexistentes():
    """Las columnas que `e2e_orchestrator` nombra existen en el catalogo."""
    import ast
    import re
    from pathlib import Path

    psycopg2 = pytest.importorskip("psycopg2")
    fuente = (
        Path(__file__).resolve().parent.parent / "routers" / "e2e_orchestrator.py"
    ).read_text(encoding="utf-8")

    columnas: set[str] = set()
    for nodo in ast.walk(ast.parse(fuente)):
        if not (isinstance(nodo, ast.Constant) and isinstance(nodo.value, str)):
            continue
        for m in re.finditer(
            r"INSERT\s+INTO\s+social_posts\s*\((?P<cols>[^)]*)\)", nodo.value, re.I | re.S
        ):
            columnas |= {c.strip().lower() for c in m.group("cols").split(",") if c.strip()}
    assert columnas, "no se encontro el INSERT de social_posts"

    conn = psycopg2.connect(DSN)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='social_posts'"
        )
        reales = {r[0] for r in cur.fetchall()}
        cur.close()
    finally:
        conn.close()

    ausentes = sorted(columnas - reales)
    assert not ausentes, (
        "el orquestador escribe columnas que la tabla no tiene: " + ", ".join(ausentes)
    )

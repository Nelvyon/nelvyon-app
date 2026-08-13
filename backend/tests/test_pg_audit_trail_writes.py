"""La traza de auditoria se escribe y se puede leer. Contra PostgreSQL real.

POR QUE HACIA FALTA
-------------------
`AuditService.log_action` escribia `old_value`, `new_value` y un `tenant_id`
entero — la definicion de la migracion 507. Esa definicion nunca se aplica:

  * `audit_logs` la declara antes la 412, y el ejecutor aplica los ficheros por
    nombre con `CREATE TABLE IF NOT EXISTS`, asi que gana la 412;
  * `audit_logs` no tiene modelo ORM, luego `create_all` tampoco puede crearla
    con otra forma.

En cualquier entorno construido desde este repositorio la tabla es la de la 412
(`tenant_id uuid` con clave foranea a `saas_tenants`, `module`, `details`). Un
`pg_dump` real de julio, guardado en `docs/evidence/`, lo confirma.

Es decir: el INSERT fallaba SIEMPRE, y el llamante —«best-effort, never
raises»— se lo tragaba. La traza de acciones criticas estaba vacia.

POR QUE NINGUN TEST LO VIO
--------------------------
El esquema de SQLite se derivaba de la 507, justo la definicion que pierde. Los
tests validaban contra columnas que ninguna base real tiene. Corregido en
`tests/_schema_bootstrap.py`, que ahora reproduce la regla del ejecutor:
primero en el orden, primero en ganar.

Y aun asi SQLite no bastaria aqui: no reproduce ni el tipo `uuid` ni la clave
foranea, que son justo lo que rompia. Por eso este fichero exige PostgreSQL.
"""
from __future__ import annotations

import os
import uuid as _uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

WS_A = 918_001
WS_B = 918_002


@pytest.fixture
def conexion():
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM audit_logs WHERE tenant_id IN "
        "(SELECT id FROM saas_tenants WHERE workspace_id IN (%s, %s))",
        (WS_A, WS_B),
    )
    cur.execute("DELETE FROM saas_tenants WHERE workspace_id IN (%s, %s)", (WS_A, WS_B))
    cur.execute("DELETE FROM nelvyon_users WHERE email LIKE 'zz-audit-%%@test.invalid'")
    for ws, nombre in ((WS_A, "Inquilino A"), (WS_B, "Inquilino B")):
        # `saas_tenants.user_id` tiene clave foranea a `nelvyon_users`, asi que
        # el propietario tiene que existir antes. Se crea uno por inquilino, con
        # un correo `.invalid` que no puede colisionar con datos reales.
        uid = str(_uuid.uuid4())
        cur.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name) "
            "VALUES (%s, %s, 'x', %s)",
            (uid, f"zz-audit-{ws}@test.invalid", nombre),
        )
        cur.execute(
            "INSERT INTO saas_tenants (id, user_id, company_name, industry, workspace_id) "
            "VALUES (%s, %s, %s, 'test', %s)",
            (str(_uuid.uuid4()), uid, nombre, ws),
        )
    try:
        yield cur
    finally:
        cur.execute(
            "DELETE FROM audit_logs WHERE tenant_id IN "
            "(SELECT id FROM saas_tenants WHERE workspace_id IN (%s, %s))",
            (WS_A, WS_B),
        )
        cur.execute("DELETE FROM saas_tenants WHERE workspace_id IN (%s, %s)", (WS_A, WS_B))
        cur.execute("DELETE FROM nelvyon_users WHERE email LIKE 'zz-audit-%%@test.invalid'")
        cur.close()
        conn.close()


def _escribir(cur, ws: int, accion: str, recurso: str = "subscription") -> None:
    """El INSERT tal y como lo emite `AuditService.log_action`."""
    cur.execute("SELECT id FROM saas_tenants WHERE workspace_id = %s LIMIT 1", (ws,))
    tid = cur.fetchone()[0]
    cur.execute(
        """
        INSERT INTO audit_logs (
            id, tenant_id, user_id, action, module, resource_type,
            resource_id, details, ip_address
        ) VALUES (%s, %s, gen_random_uuid(), %s, %s, %s, 'r-1', %s::jsonb, '10.0.0.1')
        """,
        (str(_uuid.uuid4()), tid, accion, recurso, recurso,
         '{"new_value": {"plan": "pro"}}'),
    )


@requiere_pg
def test_la_escritura_de_auditoria_funciona(conexion):
    """Antes fallaba con `column "old_value" does not exist`, siempre."""
    _escribir(conexion, WS_A, "subscription.upgrade")
    conexion.execute(
        "SELECT count(*) FROM audit_logs WHERE tenant_id = "
        "(SELECT id FROM saas_tenants WHERE workspace_id = %s)",
        (WS_A,),
    )
    assert conexion.fetchone()[0] == 1


@requiere_pg
def test_el_antes_y_el_despues_sobreviven_en_details(conexion):
    """Cambiar de columnas a jsonb no puede perder informacion."""
    _escribir(conexion, WS_A, "subscription.upgrade")
    conexion.execute(
        "SELECT details->'new_value'->>'plan' FROM audit_logs WHERE tenant_id = "
        "(SELECT id FROM saas_tenants WHERE workspace_id = %s)",
        (WS_A,),
    )
    assert conexion.fetchone()[0] == "pro"


@requiere_pg
def test_la_traza_esta_aislada_por_inquilino(conexion):
    """La propiedad que hace util una auditoria multiinquilino.

    Si A pudiera leer la de B, la traza dejaria de ser prueba de nada.
    """
    _escribir(conexion, WS_A, "accion.de.A")
    _escribir(conexion, WS_B, "accion.de.B")
    conexion.execute(
        "SELECT action FROM audit_logs WHERE tenant_id = "
        "(SELECT id FROM saas_tenants WHERE workspace_id = %s)",
        (WS_A,),
    )
    acciones = [r[0] for r in conexion.fetchall()]
    assert acciones == ["accion.de.A"]


@requiere_pg
def test_module_es_obligatorio_y_se_proporciona(conexion):
    """Control positivo: `module` es NOT NULL y omitirlo revienta.

    Sin esta comprobacion, un dia alguien quita `module` del INSERT y el test de
    arriba seguiria pasando solo si PostgreSQL lo rellenase — y no lo hace.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    conexion.execute("SELECT id FROM saas_tenants WHERE workspace_id = %s", (WS_A,))
    tid = conexion.fetchone()[0]
    with pytest.raises(psycopg2.errors.NotNullViolation):
        conexion.execute(
            "INSERT INTO audit_logs (id, tenant_id, action) VALUES (%s, %s, 'x')",
            (str(_uuid.uuid4()), tid),
        )


@requiere_pg
def test_un_inquilino_inexistente_no_puede_escribir(conexion):
    """Control positivo de la clave foranea.

    Es lo que impide inventarse el `tenant_id`: por eso `log_action` resuelve el
    uuid desde `saas_tenants` y lanza si no existe, en vez de improvisar uno.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    with pytest.raises(psycopg2.errors.ForeignKeyViolation):
        conexion.execute(
            "INSERT INTO audit_logs (id, tenant_id, action, module) "
            "VALUES (%s, gen_random_uuid(), 'x', 'y')",
            (str(_uuid.uuid4()),),
        )


@requiere_pg
def test_el_writer_del_repo_coincide_con_la_tabla():
    """Las columnas del INSERT de `audit_service` existen en el catalogo.

    Es la comprobacion que faltaba: el defecto era exactamente que no existian.
    """
    import ast
    import re
    from pathlib import Path

    psycopg2 = pytest.importorskip("psycopg2")
    fuente = (
        Path(__file__).resolve().parent.parent / "services" / "audit_service.py"
    ).read_text(encoding="utf-8")
    arbol = ast.parse(fuente)
    columnas: set[str] = set()
    for nodo in ast.walk(arbol):
        if not (isinstance(nodo, ast.Constant) and isinstance(nodo.value, str)):
            continue
        m = re.search(
            r"INSERT\s+INTO\s+audit_logs\s*\((?P<cols>[^)]*)\)", nodo.value, re.I | re.S
        )
        if m:
            columnas |= {
                c.strip().lower() for c in m.group("cols").split(",") if c.strip()
            }
    assert columnas, "no se encontro el INSERT de audit_logs"

    conn = psycopg2.connect(DSN)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='audit_logs'"
        )
        reales = {r[0] for r in cur.fetchall()}
        cur.close()
    finally:
        conn.close()

    ausentes = sorted(columnas - reales)
    assert not ausentes, (
        "el writer de auditoria escribe columnas que la tabla no tiene: "
        + ", ".join(ausentes)
    )

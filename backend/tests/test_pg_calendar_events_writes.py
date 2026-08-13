"""`calendar_events` se escribe y se lee. Contra PostgreSQL real.

QUE PASABA
----------
`services/calendar_service.py` —la sincronizacion con Google Calendar— escribia
`workspace_id`, `start_time`, `end_time` y `status`, columnas que la tabla no
tiene, y omitia `tenant_id`, `type` y `event_date`, que son NOT NULL. El INSERT
fallaba siempre.

QUE LO DESBLOQUEO
-----------------
La comprobacion manual en produccion (Railway → Postgres → Data) confirmo dos
cosas que el repositorio no podia decir:

  * `calendar_events` existe con la generacion `tenant_id` —la de la migracion
    408—, que es la que consulta el dashboard de `apps/web`;
  * la tabla esta VACIA, asi que alinear el codigo no puede perder datos.

Con eso el contrato canonico deja de ser una eleccion: es el de la tabla. Las
columnas de sincronizacion que el servicio si usaba —`start_at`, `end_at`,
`google_event_id`, `calendar_id`, `attendees`, `meet_link`, `synced_at`— ya
estaban ahi, anadidas por migraciones posteriores para el. Solo sobraban los
restos de la otra generacion.

POR QUE NO BASTA SQLITE
-----------------------
Lo que rompia era el tipo `uuid` de `tenant_id`, su clave foranea a
`saas_tenants` y tres `NOT NULL`. SQLite no reproduce ninguna de las tres cosas.
"""
from __future__ import annotations

import datetime as _dt
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

WS_A = 927_001
WS_B = 927_002


@pytest.fixture
def conexion():
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()

    def limpiar():
        cur.execute(
            "DELETE FROM calendar_events WHERE tenant_id IN "
            "(SELECT id FROM saas_tenants WHERE workspace_id IN (%s, %s))",
            (WS_A, WS_B),
        )
        cur.execute("DELETE FROM saas_tenants WHERE workspace_id IN (%s, %s)", (WS_A, WS_B))
        cur.execute("DELETE FROM nelvyon_users WHERE email LIKE 'zz-cal-%%@test.invalid'")

    limpiar()
    for ws, nombre in ((WS_A, "Inquilino A"), (WS_B, "Inquilino B")):
        uid = str(_uuid.uuid4())
        cur.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name) "
            "VALUES (%s, %s, 'x', %s)",
            (uid, f"zz-cal-{ws}@test.invalid", nombre),
        )
        cur.execute(
            "INSERT INTO saas_tenants (id, user_id, company_name, industry, workspace_id) "
            "VALUES (%s, %s, %s, 'test', %s)",
            (str(_uuid.uuid4()), uid, nombre, ws),
        )
    try:
        yield cur
    finally:
        limpiar()
        cur.close()
        conn.close()


def _insertar(cur, ws: int, titulo: str) -> None:
    """El INSERT tal y como lo emite ahora `calendar_service`."""
    cur.execute("SELECT id FROM saas_tenants WHERE workspace_id = %s LIMIT 1", (ws,))
    tid = cur.fetchone()[0]
    inicio = _dt.datetime(2026, 9, 1, 10, 0, tzinfo=_dt.timezone.utc)
    cur.execute(
        """
        INSERT INTO calendar_events (
            tenant_id, title, type, event_date, google_event_id, calendar_id,
            description, start_at, end_at,
            attendees, meet_link, synced_at, created_at, updated_at
        ) VALUES (
            %s::uuid, %s, 'appointment', %s::date, 'g-1', 'primary',
            'desc', %s, %s, %s::jsonb, 'https://meet', now(), now(), now()
        )
        """,
        (tid, titulo, inicio, inicio, inicio + _dt.timedelta(hours=1), "[]"),
    )


@requiere_pg
def test_la_sincronizacion_puede_escribir(conexion):
    """Antes fallaba con `column "workspace_id" does not exist`, siempre."""
    _insertar(conexion, WS_A, "Reunion")
    conexion.execute(
        "SELECT count(*) FROM calendar_events WHERE tenant_id = "
        "(SELECT id FROM saas_tenants WHERE workspace_id = %s)",
        (WS_A,),
    )
    assert conexion.fetchone()[0] == 1


@requiere_pg
def test_event_date_se_deriva_de_start_at(conexion):
    """`event_date` es NOT NULL y el servicio no la recibia de nadie.

    Se deriva del inicio del evento en vez de inventarse, que es lo unico que no
    puede quedar incoherente con `start_at`.
    """
    _insertar(conexion, WS_A, "Reunion")
    conexion.execute(
        "SELECT event_date, start_at::date FROM calendar_events WHERE tenant_id = "
        "(SELECT id FROM saas_tenants WHERE workspace_id = %s)",
        (WS_A,),
    )
    event_date, fecha_inicio = conexion.fetchone()
    assert event_date == fecha_inicio


@requiere_pg
def test_los_eventos_estan_aislados_por_inquilino(conexion):
    _insertar(conexion, WS_A, "de A")
    _insertar(conexion, WS_B, "de B")
    conexion.execute(
        "SELECT title FROM calendar_events WHERE tenant_id = "
        "(SELECT id FROM saas_tenants WHERE workspace_id = %s)",
        (WS_A,),
    )
    assert [r[0] for r in conexion.fetchall()] == ["de A"]


@requiere_pg
def test_type_respeta_la_restriccion_de_la_tabla(conexion):
    """Control positivo: la tabla tiene un CHECK sobre `type`.

    Si el servicio escribiese un valor fuera de la lista, PostgreSQL lo
    rechazaria. Se comprueba que la restriccion esta viva para que el verde de
    arriba signifique algo.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    conexion.execute("SELECT id FROM saas_tenants WHERE workspace_id = %s", (WS_A,))
    tid = conexion.fetchone()[0]
    with pytest.raises(psycopg2.errors.CheckViolation):
        conexion.execute(
            "INSERT INTO calendar_events (tenant_id, title, type, event_date) "
            "VALUES (%s::uuid, 't', 'valor_inventado', CURRENT_DATE)",
            (tid,),
        )


@requiere_pg
def test_un_inquilino_inexistente_no_puede_escribir(conexion):
    """Control positivo de la clave foranea, que es la razon del puente."""
    psycopg2 = pytest.importorskip("psycopg2")
    with pytest.raises(psycopg2.errors.ForeignKeyViolation):
        conexion.execute(
            "INSERT INTO calendar_events (tenant_id, title, type, event_date) "
            "VALUES (gen_random_uuid(), 't', 'appointment', CURRENT_DATE)"
        )


@requiere_pg
def test_el_servicio_no_menciona_columnas_inexistentes():
    """Las columnas que `calendar_service` nombra existen en el catalogo.

    Es la comprobacion que faltaba: el defecto era exactamente que no existian.
    Se leen los literales SQL por AST, no el fichero en bruto, para que un
    comentario que mencione `workspace_id` no cuente como uso.
    """
    import ast
    import re
    from pathlib import Path

    psycopg2 = pytest.importorskip("psycopg2")
    fuente = (
        Path(__file__).resolve().parent.parent / "services" / "calendar_service.py"
    ).read_text(encoding="utf-8")

    columnas: set[str] = set()
    for nodo in ast.walk(ast.parse(fuente)):
        if not (isinstance(nodo, ast.Constant) and isinstance(nodo.value, str)):
            continue
        for m in re.finditer(
            r"INSERT\s+INTO\s+calendar_events\s*\((?P<cols>[^)]*)\)", nodo.value, re.I | re.S
        ):
            columnas |= {c.strip().lower() for c in m.group("cols").split(",") if c.strip()}
    assert columnas, "no se encontro ningun INSERT de calendar_events"

    conn = psycopg2.connect(DSN)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='calendar_events'"
        )
        reales = {r[0] for r in cur.fetchall()}
        cur.close()
    finally:
        conn.close()

    ausentes = sorted(columnas - reales)
    assert not ausentes, (
        "el servicio de calendario escribe columnas que la tabla no tiene: "
        + ", ".join(ausentes)
    )

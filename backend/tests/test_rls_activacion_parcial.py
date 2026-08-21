"""Certificacion de la ACTIVACION PARCIAL de RLS: la superficie FastAPI, con un
rol sin BYPASSRLS, contra la base real.

QUE SE CERTIFICA AQUI Y QUE NO
------------------------------
La decision ya tomada reparte asi las credenciales:

    FastAPI / API   ->  `nelvyon_app`   NOSUPERUSER NOBYPASSRLS   (RLS ENFORCED)
    Web / BFF (TS)  ->  credencial actual, bypassa RLS            (aislamiento
                                                                   de aplicacion)
    Migraciones     ->  `postgres`
    Barridos de fondo -> `nelvyon_jobs` (BYPASSRLS, migracion 540)

Este fichero ejercita SOLO la primera linea. No dice nada del BFF, que no se
toca y sigue aislando por filtrado de aplicacion.

POR QUE HACEN FALTA CONTROLES POSITIVOS EN CADA BLOQUE
------------------------------------------------------
Una bateria de RLS que solo comprueba «A no ve lo de B» pasa entera con unas
politicas que denieguen absolutamente todo. Es el modo de fallo mas probable
—`current_setting` devuelve NULL y todo se cierra— y el mas silencioso, porque
no lanza error: devuelve cero filas. Por eso cada bloque afirma tambien «A SI ve
lo suyo», y el fichero termina con una prueba de mutacion que rompe una politica
a proposito para demostrar que estos asserts tienen dientes.

LAS DOS FAMILIAS DE POLITICAS, Y POR QUE NO GARANTIZAN LO MISMO
---------------------------------------------------------------
El esquema tiene dos formas de decidir, y conviene no confundirlas:

  (1) FAMILIA `os_*` — `nelvyon_os_workspace_select/mutate(workspace_id)`.
      Comprueba, DENTRO de la base, que el sujeto del JWT pertenece de verdad al
      workspace, y con que rol. Es frontera independiente: manipular
      `X-Workspace-Id` no concede nada, porque la pertenencia no se declara, se
      consulta.

  (2) FAMILIA `current_tenant_id()` — `workspace_id = current_tenant_id()`.
      Compara la fila con el valor que la propia aplicacion acaba de fijar
      —que sale del header `X-Workspace-Id`—. Repite lo que dice el cliente, asi
      que NO es una frontera independiente: quien consiga colar un tenant ajeno
      pasa. Lo que impide colarlo es la comprobacion de pertenencia de
      `dependencies/workspace.py`, en la aplicacion.

Las dos se ejercitan aqui, cada una afirmando lo que de verdad garantiza. Decir
que la (2) aisla por si sola seria crear una garantia falsa.
"""
from __future__ import annotations

import os
import re
import uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = pytest.mark.skipif(
    not DSN,
    reason="requiere PostgreSQL real; exportar NELVYON_PG_CERT_DSN",
)

ROL = "nelvyon_app"
CLAVE = "nelvyon_app_cert"

#: Los cinco roles de workspace que el producto reconoce
#: (CHECK `workspace_members_role_valido`, migracion 539).
ROLES = ("owner", "admin", "operator", "member", "viewer")

#: Los que pueden mutar segun `nelvyon_workspace_can_mutate`.
ROLES_QUE_MUTAN = ("owner", "admin", "operator")
ROLES_SOLO_LECTURA = ("member", "viewer")


# ═══════════════════════════════════════════════════════════════════════════
# El rol y sus permisos EXACTOS
# ═══════════════════════════════════════════════════════════════════════════

#: Los GRANT que `nelvyon_app` necesita en produccion, y ni uno mas.
#:
#: Un GRANT de menos NO es una fuga: es un `permission denied`, ruidoso y facil
#: de ver. Un GRANT de mas si puede ser una fuga. Por eso la lista es explicita
#: y esta aqui, en el mismo sitio que la comprueba.
#:
#:   USAGE en `public`  — todo el esquema de aplicacion vive ahi.
#:   USAGE en `auth`    — `auth.uid()` (la que leen 1030 politicas a traves de
#:                        `nelvyon_jwt_user_id`) es una funcion del esquema
#:                        `auth`, y sin USAGE ni siquiera se puede invocar.
#:                        No hay ninguna TABLA en `auth`: es USAGE de esquema,
#:                        no acceso a datos.
#:   SELECT/INSERT/UPDATE/DELETE en las tablas de `public` — el CRUD de la
#:                        aplicacion. Sin TRUNCATE, sin REFERENCES, sin TRIGGER.
#:   USAGE, SELECT en las secuencias — 70 tablas usan `nextval`; sin esto, un
#:                        INSERT en cualquiera de ellas falla.
#:   DEFAULT PRIVILEGES — para que una tabla nueva creada por una migracion
#:                        futura nazca ya accesible y no haya que recordar el
#:                        GRANT en cada despliegue.
#:
#: Y explicitamente NO: BYPASSRLS, SUPERUSER, CREATEDB, CREATEROLE, ni CREATE
#: sobre el esquema `public` (el DDL es de las migraciones, que corren como
#: `postgres`).
GRANTS = (
    "GRANT USAGE ON SCHEMA public TO {rol}",
    "GRANT USAGE ON SCHEMA auth TO {rol}",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {rol}",
    "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {rol}",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
    "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {rol}",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
    "GRANT USAGE, SELECT ON SEQUENCES TO {rol}",
    "REVOKE CREATE ON SCHEMA public FROM {rol}",
)

#: Y la postura NO termina en el GRANT masivo.
#:
#: `ON ALL TABLES` reparte escritura sobre todo, y para las tablas de inquilino
#: eso esta bien: RLS convierte «puede escribir» en «puede escribir LO SUYO». Pero
#: seis tablas de PLATAFORMA no tienen RLS —no tienen inquilino contra el que
#: filtrar— y son justamente las que GOBIERNAN el comportamiento del sistema: las
#: politicas de los agentes, el freno de emergencia, el catalogo, la clasificacion
#: de riesgo de Autopilot, el mapa de planes y el registro de migraciones.
#:
#: Ahi el GRANT es la unica frontera, y estaba abierta. La migracion 559 la cierra.
#: Esta fixture tiene que reproducir la postura REAL, no la anterior: sin esto,
#: reconstruia el despliegue con la puerta abierta y tapaba la proteccion en la
#: base de certificacion — que es exactamente lo que hizo hasta que el guard de
#: gobierno empezo a fallar en la suite completa.
REVOCACIONES_DE_GOBIERNO = (
    "agent_policies", "agent_kill_switch", "agent_catalog",
    "autopilot_capabilities", "plan_rango", "_migrations",
)


def _dsn_del_rol(dsn_admin: str, rol: str, clave: str) -> str:
    return re.sub(r"//[^@]*@", f"//{rol}:{clave}@", dsn_admin)


@pytest.fixture(scope="module")
def admin():
    """Conexion de preparacion. Es la que tiene privilegios; el rol probado no."""
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    yield conn
    conn.close()


@pytest.fixture(scope="module")
def rol_app(admin):
    """Crea (o reafirma) `nelvyon_app` con los permisos exactos. Idempotente."""
    cur = admin.cursor()
    cur.execute(
        """
        DO $bloque$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_app') THEN
            CREATE ROLE nelvyon_app LOGIN PASSWORD %(clave)s
              NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT;
          ELSE
            ALTER ROLE nelvyon_app LOGIN PASSWORD %(clave)s
              NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
          END IF;
        END
        $bloque$;
        """.replace("%(clave)s", "'" + CLAVE + "'")
    )
    for plantilla in GRANTS:
        cur.execute(plantilla.format(rol=ROL))
    # La postura real incluye la retirada de la 559. Ver el comentario de
    # `REVOCACIONES_DE_GOBIERNO`.
    for tabla in REVOCACIONES_DE_GOBIERNO:
        cur.execute(
            "SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=%s",
            (tabla,))
        if cur.fetchone():
            cur.execute(f"REVOKE INSERT, UPDATE, DELETE ON public.{tabla} FROM {ROL}")
            cur.execute(f"GRANT SELECT ON public.{tabla} TO {ROL}")
    return _dsn_del_rol(DSN, ROL, CLAVE)


@pytest.fixture(scope="module")
def _app_conn_raw(rol_app):
    """Conexion con el rol de la aplicacion. SIN autocommit: el contexto es de
    transaccion, y probar su ciclo de vida es medio fichero."""
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(rol_app)
    conn.autocommit = False
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture
def app_conn(_app_conn_raw):
    """La conexion, garantizando que cada test empieza SIN transaccion abierta.

    La conexion es de modulo a proposito —reutilizarla es lo que permite probar
    el reuso de pool—, pero eso significa que una transaccion olvidada por un
    test dejaria contexto y cerrojos al siguiente: exactamente el tipo de
    contaminacion que esta bateria existe para detectar. Se limpia a la entrada
    y a la salida.
    """
    _app_conn_raw.rollback()
    yield _app_conn_raw
    _app_conn_raw.rollback()


# ═══════════════════════════════════════════════════════════════════════════
# Datos: dos workspaces reales, con los cinco roles en el primero
# ═══════════════════════════════════════════════════════════════════════════


class Escenario:
    def __init__(self):
        self.marca = uuid.uuid4().hex[:10]
        self.usuarios: dict[str, str] = {}
        self.usuario_b = ""
        self.ws_a = 0
        self.ws_b = 0
        self.cliente_a = ""
        self.cliente_b = ""
        self.proyecto_a = ""
        self.proyecto_b = ""
        self.web_a = ""
        self.web_b = ""
        self.web_b_publicada = ""


@pytest.fixture(scope="module")
def esc(admin):
    """Workspace A con los cinco roles, workspace B ajeno. Creado como admin."""
    e = Escenario()
    cur = admin.cursor()

    for rol in ROLES:
        e.usuarios[rol] = str(uuid.uuid4())
    e.usuario_b = str(uuid.uuid4())

    for uid in list(e.usuarios.values()) + [e.usuario_b]:
        cur.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, "
            "plan, tenant_id, email_verified) "
            "VALUES (%s, %s, 'x', 'cert', 'free', %s, false)",
            (uid, f"act-{uid[:8]}-{e.marca}@nelvyon.test", uid),
        )

    cur.execute(
        "INSERT INTO workspaces (user_id, name) VALUES (%s, %s) RETURNING id",
        (e.usuarios["owner"], f"cert-A-{e.marca}"),
    )
    e.ws_a = int(cur.fetchone()[0])
    cur.execute(
        "INSERT INTO workspaces (user_id, name) VALUES (%s, %s) RETURNING id",
        (e.usuario_b, f"cert-B-{e.marca}"),
    )
    e.ws_b = int(cur.fetchone()[0])

    # `owner` lo es por ser dueno de la fila `workspaces`, no por membresia.
    for rol in ("admin", "operator", "member", "viewer"):
        cur.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, role, status) "
            "VALUES (%s, %s, %s, 'active')",
            (e.ws_a, e.usuarios[rol], rol),
        )

    e.cliente_a, e.cliente_b = str(uuid.uuid4()), str(uuid.uuid4())
    cur.execute(
        "INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name) "
        "VALUES (%s, %s, %s, %s)",
        (e.cliente_a, e.ws_a, e.usuarios["owner"], f"A-{e.marca}"),
    )
    cur.execute(
        "INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name) "
        "VALUES (%s, %s, %s, %s)",
        (e.cliente_b, e.ws_b, e.usuario_b, f"B-{e.marca}"),
    )

    e.proyecto_a, e.proyecto_b = str(uuid.uuid4()), str(uuid.uuid4())
    cur.execute(
        "INSERT INTO os_projects (id, workspace_id, client_id, name) VALUES (%s,%s,%s,%s)",
        (e.proyecto_a, e.ws_a, e.cliente_a, f"PA-{e.marca}"),
    )
    cur.execute(
        "INSERT INTO os_projects (id, workspace_id, client_id, name) VALUES (%s,%s,%s,%s)",
        (e.proyecto_b, e.ws_b, e.cliente_b, f"PB-{e.marca}"),
    )

    # Familia `current_tenant_id()`, y ademas con politica de lectura publica.
    e.web_a, e.web_b, e.web_b_publicada = (
        str(uuid.uuid4()),
        str(uuid.uuid4()),
        str(uuid.uuid4()),
    )
    for wid, ws, estado in (
        (e.web_a, e.ws_a, "pending"),
        (e.web_b, e.ws_b, "pending"),
        (e.web_b_publicada, e.ws_b, "published"),
    ):
        cur.execute(
            "INSERT INTO os_website_projects (id, workspace_id, name, status) "
            "VALUES (%s, %s, %s, %s)",
            (wid, ws, f"W-{e.marca}", estado),
        )

    yield e

    for tabla, col in (
        ("os_website_projects", "workspace_id"),
        ("os_tasks", "workspace_id"),
        ("os_projects", "workspace_id"),
        ("os_clients", "workspace_id"),
        ("workspace_members", "workspace_id"),
    ):
        cur.execute(
            f"DELETE FROM {tabla} WHERE {col} IN (%s, %s)", (e.ws_a, e.ws_b)
        )
    cur.execute("DELETE FROM workspaces WHERE id IN (%s, %s)", (e.ws_a, e.ws_b))
    cur.execute(
        "DELETE FROM nelvyon_users WHERE user_id::text = ANY(%s)",
        (list(e.usuarios.values()) + [e.usuario_b],),
    )


# ═══════════════════════════════════════════════════════════════════════════
# Utilidades
# ═══════════════════════════════════════════════════════════════════════════


def fijar(conn, tenant_id=None, user_id=None):
    """Las MISMAS dos sentencias que aplica `core/contexto_rls.py` en cada
    transaccion. Si esta bateria pasa, es que ese contexto es el correcto."""
    cur = conn.cursor()
    if tenant_id is not None:
        cur.execute("SELECT set_config('app.tenant_id', %s, true)", (str(tenant_id),))
    if user_id is not None:
        cur.execute(
            "SELECT set_config('request.jwt.claim.sub', %s, true)", (str(user_id),)
        )


def proyectos_visibles(conn, esc) -> set[str]:
    cur = conn.cursor()
    cur.execute(
        "SELECT id::text FROM os_projects WHERE id::text = ANY(%s)",
        ([esc.proyecto_a, esc.proyecto_b],),
    )
    return {r[0] for r in cur.fetchall()}


def webs_visibles(conn, esc) -> set[str]:
    cur = conn.cursor()
    cur.execute(
        "SELECT id::text FROM os_website_projects WHERE id::text = ANY(%s)",
        ([esc.web_a, esc.web_b, esc.web_b_publicada],),
    )
    return {r[0] for r in cur.fetchall()}


# ═══════════════════════════════════════════════════════════════════════════
# 0. La premisa: si el rol tuviese BYPASSRLS, este fichero entero no valdria
# ═══════════════════════════════════════════════════════════════════════════


def test_el_rol_no_bypassa_rls_ni_es_superusuario(admin, rol_app):
    cur = admin.cursor()
    cur.execute(
        "SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolcanlogin "
        "FROM pg_roles WHERE rolname = %s",
        (ROL,),
    )
    fila = cur.fetchone()
    assert fila is not None, f"el rol {ROL} no existe"
    superusuario, bypassrls, createdb, createrole, canlogin = fila
    assert superusuario is False
    assert bypassrls is False, "con BYPASSRLS ninguna politica se evalua: el resto del fichero seria decorativo"
    assert createdb is False
    assert createrole is False
    assert canlogin is True


def test_el_rol_no_puede_crear_objetos_en_public(app_conn):
    """El DDL es de las migraciones, que corren como `postgres`."""
    psycopg2 = pytest.importorskip("psycopg2")
    cur = app_conn.cursor()
    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cur.execute("CREATE TABLE public.cert_no_deberia_existir (id int)")
    app_conn.rollback()


def test_el_rol_llega_a_las_funciones_que_deciden(app_conn, esc):
    """Control positivo de los GRANT: sin USAGE en `auth`, `auth.uid()` —y con
    ella las 1030 politicas que la usan— fallaria con `permission denied`, que
    es un modo de fallo distinto de «no ve nada»."""
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    cur = app_conn.cursor()
    cur.execute("SELECT auth.uid()::text")
    assert cur.fetchone()[0] == esc.usuarios["owner"]
    cur.execute("SELECT public.nelvyon_jwt_user_id()::text")
    assert cur.fetchone()[0] == esc.usuarios["owner"]
    cur.execute("SELECT public.current_tenant_id()")
    assert cur.fetchone()[0] == esc.ws_a
    cur.execute("SELECT public.nelvyon_user_in_workspace(%s)", (esc.ws_a,))
    assert cur.fetchone()[0] is True
    app_conn.rollback()


# ═══════════════════════════════════════════════════════════════════════════
# 1. Los cinco roles: lectura
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("rol", ROLES)
def test_cada_rol_ve_lo_suyo_y_solo_lo_suyo(app_conn, esc, rol):
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    visibles = proyectos_visibles(app_conn, esc)
    # Control positivo: sin esta linea, unas politicas que denegasen todo
    # pasarian el test.
    assert esc.proyecto_a in visibles, f"{rol} deberia ver el proyecto de su workspace"
    assert esc.proyecto_b not in visibles, f"{rol} NO deberia ver el del workspace ajeno"
    app_conn.rollback()


def test_aislamiento_en_los_dos_sentidos(app_conn, esc):
    """A->B y B->A. Un aislamiento que solo se comprueba en un sentido puede
    estar tapando una politica asimetrica."""
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    desde_a = proyectos_visibles(app_conn, esc)
    app_conn.rollback()

    fijar(app_conn, esc.ws_b, esc.usuario_b)
    desde_b = proyectos_visibles(app_conn, esc)
    app_conn.rollback()

    assert desde_a == {esc.proyecto_a}
    assert desde_b == {esc.proyecto_b}


# ═══════════════════════════════════════════════════════════════════════════
# 2. Los cinco roles: escritura real (INSERT / UPDATE / DELETE)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("rol", ROLES_QUE_MUTAN)
def test_los_roles_operativos_escriben_de_verdad(app_conn, esc, rol):
    """Control positivo del bloque de escritura."""
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    cur = app_conn.cursor()

    nuevo = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO os_projects (id, workspace_id, client_id, name) VALUES (%s,%s,%s,%s)",
        (nuevo, esc.ws_a, esc.cliente_a, f"nuevo-{rol}-{esc.marca}"),
    )
    assert cur.rowcount == 1

    cur.execute(
        "UPDATE os_projects SET name = %s WHERE id = %s",
        (f"editado-{rol}", esc.proyecto_a),
    )
    assert cur.rowcount == 1

    cur.execute("DELETE FROM os_projects WHERE id = %s", (nuevo,))
    assert cur.rowcount == 1

    app_conn.rollback()


@pytest.mark.parametrize("rol", ROLES_SOLO_LECTURA)
def test_member_y_viewer_no_escriben(app_conn, esc, rol):
    psycopg2 = pytest.importorskip("psycopg2")
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    cur = app_conn.cursor()

    # Control positivo dentro del mismo bloque: leer si pueden.
    assert esc.proyecto_a in proyectos_visibles(app_conn, esc)

    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cur.execute(
            "INSERT INTO os_projects (workspace_id, client_id, name) VALUES (%s,%s,%s)",
            (esc.ws_a, esc.cliente_a, f"prohibido-{rol}"),
        )
    app_conn.rollback()

    # UPDATE y DELETE no lanzan: la fila simplemente no es visible para mutar.
    # Cero filas afectadas ES la denegacion, y hay que afirmarla explicitamente.
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    cur = app_conn.cursor()
    cur.execute("UPDATE os_projects SET name = 'x' WHERE id = %s", (esc.proyecto_a,))
    assert cur.rowcount == 0
    cur.execute("DELETE FROM os_projects WHERE id = %s", (esc.proyecto_a,))
    assert cur.rowcount == 0
    app_conn.rollback()


def test_nadie_escribe_en_el_workspace_ajeno(app_conn, esc):
    psycopg2 = pytest.importorskip("psycopg2")
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    cur = app_conn.cursor()

    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cur.execute(
            "INSERT INTO os_projects (workspace_id, client_id, name) VALUES (%s,%s,%s)",
            (esc.ws_b, esc.cliente_b, "invasion"),
        )
    app_conn.rollback()

    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    cur = app_conn.cursor()
    cur.execute("UPDATE os_projects SET name = 'x' WHERE id = %s", (esc.proyecto_b,))
    assert cur.rowcount == 0
    cur.execute("DELETE FROM os_projects WHERE id = %s", (esc.proyecto_b,))
    assert cur.rowcount == 0
    app_conn.rollback()


# ═══════════════════════════════════════════════════════════════════════════
# 3. Fail-closed: sin contexto, y con contexto inventado
# ═══════════════════════════════════════════════════════════════════════════


def test_sin_contexto_no_se_ve_nada(app_conn, esc):
    """El modo de fallo que motiva todo esto: no da error, da vacio."""
    app_conn.rollback()
    cur = app_conn.cursor()
    cur.execute("SELECT current_setting('app.tenant_id', true)")
    assert not cur.fetchone()[0], "la transaccion deberia nacer sin contexto"

    assert proyectos_visibles(app_conn, esc) == set()
    app_conn.rollback()

    # Control positivo: la MISMA consulta, con contexto, si devuelve filas.
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    app_conn.rollback()


def test_un_usuario_inventado_no_concede_nada(app_conn, esc):
    fijar(app_conn, esc.ws_a, str(uuid.uuid4()))
    assert proyectos_visibles(app_conn, esc) == set()
    app_conn.rollback()


def test_un_tenant_inventado_no_concede_nada(app_conn, esc):
    fijar(app_conn, 999_999_999, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == set()
    app_conn.rollback()


def test_solo_tenant_sin_sujeto_no_concede_en_la_familia_os(app_conn, esc):
    """Medio contexto no es contexto. `nelvyon_user_in_workspace` necesita el
    sujeto del JWT; sin el, la familia `os_*` cierra."""
    fijar(app_conn, esc.ws_a, None)
    assert proyectos_visibles(app_conn, esc) == set()
    app_conn.rollback()


# ═══════════════════════════════════════════════════════════════════════════
# 4. Manipulacion de `X-Workspace-Id`
# ═══════════════════════════════════════════════════════════════════════════
#
# `middleware/tenant.py` fija `app.tenant_id` a partir del header
# `X-Workspace-Id` ANTES de comprobar la pertenencia. Es decir: el valor de
# `current_tenant_id()` lo elige el cliente. Lo que pasa entonces depende de la
# familia de politicas, y las dos respuestas son distintas.


def test_apuntar_al_workspace_ajeno_no_da_acceso_en_la_familia_os(app_conn, esc):
    """La frontera de verdad: el dueno de A declara el workspace B y no obtiene
    nada, porque `nelvyon_user_in_workspace` CONSULTA la pertenencia en vez de
    creersela."""
    fijar(app_conn, esc.ws_b, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == set()
    app_conn.rollback()

    # Control positivo: el mismo sujeto, apuntando a SU workspace, si ve.
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    app_conn.rollback()


def test_tampoco_puede_escribir_declarando_el_workspace_ajeno(app_conn, esc):
    psycopg2 = pytest.importorskip("psycopg2")
    fijar(app_conn, esc.ws_b, esc.usuarios["owner"])
    cur = app_conn.cursor()
    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cur.execute(
            "INSERT INTO os_projects (workspace_id, client_id, name) VALUES (%s,%s,%s)",
            (esc.ws_b, esc.cliente_b, "suplantacion"),
        )
    app_conn.rollback()


def test_la_familia_solo_tenant_no_es_frontera_independiente(app_conn, esc):
    """Lo contrario, dicho sin adornos.

    `os_website_projects` decide con `workspace_id = current_tenant_id()`. Ese
    valor sale del header, asi que la politica repite lo que dice el cliente en
    vez de comprobarlo. Quien logre fijar un tenant ajeno, pasa.

    Esto NO es un agujero explotable hoy: `dependencies/workspace.py` valida la
    pertenencia y responde 403 antes de que ningun handler consulte. Pero la
    frontera ahi es la aplicacion, no PostgreSQL, y el documento de operaciones
    tiene que decirlo asi. Este test fija esa realidad para que un cambio
    silencioso en `dependencies/workspace.py` no la deje sin red sin que nadie
    se entere.
    """
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert esc.web_a in webs_visibles(app_conn, esc)
    assert esc.web_b not in webs_visibles(app_conn, esc)
    app_conn.rollback()

    fijar(app_conn, esc.ws_b, esc.usuarios["owner"])
    visibles = webs_visibles(app_conn, esc)
    assert esc.web_b in visibles, (
        "la familia `current_tenant_id()` concede con solo declarar el tenant; "
        "si esto cambiase, es que alguien la reforzo y el documento de "
        "operaciones se quedo obsoleto"
    )
    app_conn.rollback()


def test_las_filas_publicadas_son_visibles_para_cualquiera(app_conn, esc):
    """Carve-out DECLARADO, no defecto: `os_website_projects_public_read`,
    `landing_pages_public_read`, `forms_public_read` y `loyalty_programs_public_read`
    son PERMISSIVE y solo miran `status = 'published'`. Una web publicada es
    publica por definicion; el aislamiento no aplica ahi y el documento lo
    recoge para que nadie lo lea como una fuga."""
    app_conn.rollback()
    visibles_sin_contexto = webs_visibles(app_conn, esc)
    assert visibles_sin_contexto == {esc.web_b_publicada}
    app_conn.rollback()


# ═══════════════════════════════════════════════════════════════════════════
# 4bis. Lo que arregla la migracion 543: el plan y las integraciones son del
#       WORKSPACE, no de la persona que los creo
# ═══════════════════════════════════════════════════════════════════════════
#
# Antes de la 543, `subscriptions` y `oauth_connections` decidian POR SUJETO del
# JWT (`user_id = nelvyon_jwt_user_id()`), porque esas politicas se escribieron
# para el modelo centrado en usuario del BFF. FastAPI lee las mismas tablas
# centrado en WORKSPACE, y el desajuste producia cero filas SIN ERROR: todo el
# equipo veia plan `starter` menos el titular, y la integracion de Google Ads
# desaparecia para todos menos para quien la conecto.
#
# La 543 anade politicas PERMISSIVE por pertenencia real
# (`nelvyon_user_in_workspace` / `nelvyon_workspace_can_mutate`). Los tests de
# abajo comprueban las DOS mitades: que ahora se ve lo que se tiene que ver, y
# que el alcance NO se ha ido de las manos.
#
# Las filas de prueba se crean a nombre de un TITULAR EXTERNO —un usuario que no
# es miembro del workspace— justamente para que la politica antigua no pueda
# conceder nada. Todo lo que se vea aqui lo concede la politica nueva.


@pytest.fixture(scope="module")
def titular_externo(admin, esc):
    """El usuario a cuyo nombre esta la fila, ajeno al workspace.

    Modela el caso real: en el BFF la suscripcion es de la persona que pago, que
    no tiene por que ser quien consulta el plan desde la API.
    """
    cur = admin.cursor()
    uid = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, "
        "plan, tenant_id, email_verified) "
        "VALUES (%s, %s, 'x', 'titular', 'free', %s, false)",
        (uid, f"titular-{uid[:8]}-{esc.marca}@nelvyon.test", uid),
    )
    yield uid
    cur.execute("DELETE FROM nelvyon_users WHERE user_id::text = %s", (uid,))


@pytest.fixture
def suscripcion(admin, esc, titular_externo):
    """Suscripcion `agency` activa del workspace A, a nombre del titular externo."""
    cur = admin.cursor()
    sid = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO subscriptions (id, user_id, plan, status, workspace_id) "
        "VALUES (%s, %s, 'agency', 'active', %s)",
        (sid, titular_externo, esc.ws_a),
    )
    yield sid
    cur.execute("DELETE FROM subscriptions WHERE id = %s", (sid,))


@pytest.fixture
def integracion(admin, esc, titular_externo):
    """Conexion OAuth de Google del workspace A, conectada por el titular externo."""
    cur = admin.cursor()
    oid = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO oauth_connections "
        "(id, user_id, provider, access_token, workspace_id, is_active) "
        "VALUES (%s, %s, 'google', 'tok-cert', %s, true)",
        (oid, titular_externo, esc.ws_a),
    )
    yield oid
    cur.execute("DELETE FROM oauth_connections WHERE id = %s", (oid,))


def plan_visto(conn, ws: int) -> str | None:
    """La MISMA consulta que `services/plan_quota.get_active_plan_id_for_workspace`."""
    cur = conn.cursor()
    cur.execute(
        "SELECT plan FROM subscriptions WHERE workspace_id = %s AND status = 'active' "
        "ORDER BY id DESC LIMIT 1",
        (ws,),
    )
    fila = cur.fetchone()
    return fila[0] if fila else None


def token_visto(conn, ws: int) -> str | None:
    """La MISMA consulta que `core/ads_integration.py`."""
    cur = conn.cursor()
    cur.execute(
        "SELECT access_token FROM oauth_connections "
        "WHERE workspace_id = %s AND provider = 'google' AND is_active = true LIMIT 1",
        (ws,),
    )
    fila = cur.fetchone()
    return fila[0] if fila else None


@pytest.mark.parametrize("rol", ROLES)
def test_cualquier_miembro_ve_el_plan_real_del_workspace(app_conn, esc, rol, suscripcion):
    """B2 resuelto: el plan ya no depende de quien pregunta.

    Antes, cualquiera que no fuese el titular obtenia NULL y
    `get_active_plan_id_for_workspace` caia a 'starter' sin registrar nada.
    """
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    assert plan_visto(app_conn, esc.ws_a) == "agency", (
        f"{rol} deberia ver el plan real del workspace, no degradarse a starter"
    )
    app_conn.rollback()


@pytest.mark.parametrize("rol", ROLES)
def test_cualquier_miembro_ve_la_integracion_del_workspace(app_conn, esc, rol, integracion):
    """B3 resuelto: la integracion es del workspace, no de quien la conecto."""
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    assert token_visto(app_conn, esc.ws_a) == "tok-cert", (
        f"{rol} deberia ver la integracion del workspace"
    )
    app_conn.rollback()


def test_el_de_otro_workspace_no_ve_ni_el_plan_ni_la_integracion(
    app_conn, esc, suscripcion, integracion
):
    """El limite de la ampliacion. Sin esto, las politicas nuevas podrian haber
    abierto las dos tablas enteras y los tests de arriba pasarian igual."""
    # Control positivo primero: las filas existen y se ven desde su workspace.
    fijar(app_conn, esc.ws_a, esc.usuarios["member"])
    assert plan_visto(app_conn, esc.ws_a) == "agency"
    assert token_visto(app_conn, esc.ws_a) == "tok-cert"
    app_conn.rollback()

    # El dueno del workspace B, mirando su propio workspace: nada suyo.
    fijar(app_conn, esc.ws_b, esc.usuario_b)
    assert plan_visto(app_conn, esc.ws_b) is None
    assert token_visto(app_conn, esc.ws_b) is None
    app_conn.rollback()

    # Y mirando el ajeno, declarando el workspace A: tampoco.
    fijar(app_conn, esc.ws_a, esc.usuario_b)
    assert plan_visto(app_conn, esc.ws_a) is None, (
        "declarar un workspace ajeno no puede dar acceso: la pertenencia se "
        "consulta en la base, no se declara"
    )
    assert token_visto(app_conn, esc.ws_a) is None
    app_conn.rollback()


def test_sin_contexto_el_plan_y_la_integracion_siguen_cerrados(
    app_conn, esc, suscripcion, integracion
):
    app_conn.rollback()
    assert plan_visto(app_conn, esc.ws_a) is None
    assert token_visto(app_conn, esc.ws_a) is None
    app_conn.rollback()

    # Control positivo: con contexto completo, si.
    fijar(app_conn, esc.ws_a, esc.usuarios["admin"])
    assert plan_visto(app_conn, esc.ws_a) == "agency"
    assert token_visto(app_conn, esc.ws_a) == "tok-cert"
    app_conn.rollback()


def test_medio_contexto_no_abre_el_plan(app_conn, esc, suscripcion):
    """Tenant sin sujeto: `nelvyon_user_in_workspace` no puede comprobar nada y
    cierra. Es lo que impide que fijar `X-Workspace-Id` baste."""
    fijar(app_conn, esc.ws_a, None)
    assert plan_visto(app_conn, esc.ws_a) is None
    app_conn.rollback()


@pytest.mark.parametrize("rol", ROLES_QUE_MUTAN)
def test_los_roles_operativos_pueden_corregir_la_suscripcion(app_conn, esc, rol, suscripcion):
    """`routers/subscriptions.py` expone escritura con `require_workspace_operator`;
    la politica tiene que permitir exactamente ese escalon, ni mas ni menos."""
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    cur = app_conn.cursor()
    cur.execute(
        "UPDATE subscriptions SET stripe_customer_id = %s WHERE id = %s",
        (f"cus_{rol}", suscripcion),
    )
    assert cur.rowcount == 1
    app_conn.rollback()


@pytest.mark.parametrize("rol", ROLES_SOLO_LECTURA)
def test_member_y_viewer_leen_la_suscripcion_pero_no_la_tocan(app_conn, esc, rol, suscripcion):
    fijar(app_conn, esc.ws_a, esc.usuarios[rol])
    assert plan_visto(app_conn, esc.ws_a) == "agency"  # control positivo
    cur = app_conn.cursor()
    cur.execute(
        "UPDATE subscriptions SET stripe_customer_id = 'cus_x' WHERE id = %s", (suscripcion,)
    )
    assert cur.rowcount == 0
    cur.execute("DELETE FROM subscriptions WHERE id = %s", (suscripcion,))
    assert cur.rowcount == 0
    app_conn.rollback()


def test_nadie_muta_la_suscripcion_del_workspace_ajeno(app_conn, esc, suscripcion):
    fijar(app_conn, esc.ws_b, esc.usuario_b)
    cur = app_conn.cursor()
    cur.execute(
        "UPDATE subscriptions SET stripe_customer_id = 'cus_invasor' WHERE id = %s",
        (suscripcion,),
    )
    assert cur.rowcount == 0
    app_conn.rollback()


def test_la_integracion_oauth_sigue_siendo_de_solo_lectura_por_pertenencia(
    app_conn, esc, integracion
):
    """Alcance deliberadamente menor que en `subscriptions`.

    FastAPI solo LEE `oauth_connections`, asi que la 543 le anadio SELECT y
    nada mas. Ampliar la escritura por pertenencia sobre una tabla de
    credenciales sin ninguna ruta que lo pida seria alcance regalado.
    """
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert token_visto(app_conn, esc.ws_a) == "tok-cert"  # control positivo
    cur = app_conn.cursor()
    cur.execute(
        "UPDATE oauth_connections SET access_token = 'robado' WHERE id = %s", (integracion,)
    )
    assert cur.rowcount == 0, (
        "si esto empieza a afectar filas, alguien anadio escritura por "
        "pertenencia sobre credenciales: revisar por que y documentarlo"
    )
    app_conn.rollback()


# ═══════════════════════════════════════════════════════════════════════════
# 4ter. LiveChat publico: el WebSocket resuelve su inquilino
# ═══════════════════════════════════════════════════════════════════════════
#
# `TenantMiddleware` es `BaseHTTPMiddleware` y no cubre scope `websocket`;
# ademas `/api/chat/ws/` es publica. La conexion llega SIN contexto y
# `chat_conversations` tiene RLS por `current_tenant_id()`.
#
# La 543 anade `nelvyon_livechat_tenant_de_conversacion(uuid)`, SECURITY DEFINER
# con `search_path` fijado, que lee el inquilino DE LA BASE a partir del
# identificador de conversacion. `routers/chat.py` la llama antes de consultar
# nada y fija el contexto para el resto de la conexion.
#
# Lo que esto NO es: control de acceso. El endpoint es publico y no lleva token.
# La autorizacion efectiva sigue siendo la posesion del `conversation_id` —UUID
# v4, no adivinable, pero obtenible por cualquiera para su propia conversacion—
# mas las comprobaciones de cookie/Bearer de `routers/chat.py`.


@pytest.fixture
def conversacion(admin, esc):
    """Una conversacion de LiveChat del workspace A."""
    cur = admin.cursor()
    cid = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO chat_conversations (id, tenant_id, visitor_id, status) "
        "VALUES (%s, %s, %s, 'open')",
        (cid, esc.ws_a, f"vis-{uuid.uuid4().hex[:8]}"),
    )
    yield cid
    cur.execute("DELETE FROM chat_messages WHERE conversation_id::text = %s", (cid,))
    cur.execute("DELETE FROM chat_conversations WHERE id::text = %s", (cid,))


def conversaciones_visibles(conn, cid: str) -> int:
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM chat_conversations WHERE id::text = %s", (cid,))
    return cur.fetchone()[0]


def resolver_inquilino(conn, cid: str):
    """La llamada exacta que hace `routers/chat.py._inquilino_de_la_conversacion`."""
    cur = conn.cursor()
    cur.execute(
        "SELECT public.nelvyon_livechat_tenant_de_conversacion(CAST(%s AS uuid))", (cid,)
    )
    return cur.fetchone()[0]


def test_el_websocket_resuelve_su_inquilino_y_encuentra_la_conversacion(
    app_conn, esc, conversacion
):
    """B1 resuelto, reproduciendo el camino completo del handler."""
    app_conn.rollback()

    # 1. Tal como llega la conexion: sin contexto, la fila no se ve. Esto NO es
    #    el fallo, es el punto de partida correcto de una tabla con RLS.
    assert conversaciones_visibles(app_conn, conversacion) == 0

    # 2. El resolvedor SI puede leerlo, porque es SECURITY DEFINER.
    tenant = resolver_inquilino(app_conn, conversacion)
    assert tenant == esc.ws_a, "el resolvedor tiene que devolver el workspace real"

    # 3. Con ese contexto, el handler ya encuentra su conversacion.
    fijar(app_conn, tenant, None)
    assert conversaciones_visibles(app_conn, conversacion) == 1, (
        "el WebSocket seguiria cerrando con 4004 para todos los visitantes"
    )
    app_conn.rollback()


def test_el_resolvedor_no_revela_conversaciones_que_no_existen(app_conn):
    """Devuelve NULL, y `routers/chat.py` cierra con 4004. Fail-closed."""
    app_conn.rollback()
    assert resolver_inquilino(app_conn, str(uuid.uuid4())) is None
    app_conn.rollback()


def test_el_resolvedor_devuelve_un_entero_no_la_fila(app_conn, esc, conversacion):
    """Lo maximo que revela es a que workspace pertenece un identificador que
    ya hay que conocer: ni el visitante, ni el contenido, ni el estado."""
    app_conn.rollback()
    valor = resolver_inquilino(app_conn, conversacion)
    assert isinstance(valor, int)
    # Y la fila sigue cerrada sin contexto, aunque se acabe de resolver.
    assert conversaciones_visibles(app_conn, conversacion) == 0
    app_conn.rollback()


def test_con_contexto_ajeno_la_conversacion_sigue_cerrada(app_conn, esc, conversacion):
    fijar(app_conn, esc.ws_b, esc.usuario_b)
    assert conversaciones_visibles(app_conn, conversacion) == 0
    app_conn.rollback()

    # Control positivo con el inquilino correcto.
    fijar(app_conn, esc.ws_a, None)
    assert conversaciones_visibles(app_conn, conversacion) == 1
    app_conn.rollback()


def test_el_websocket_puede_escribir_el_mensaje_del_visitante(app_conn, esc, conversacion):
    """El otro medio camino: sin contexto, el INSERT en `chat_messages` lanzaba
    `new row violates row-level security policy`."""
    app_conn.rollback()
    tenant = resolver_inquilino(app_conn, conversacion)
    fijar(app_conn, tenant, None)
    cur = app_conn.cursor()
    cur.execute(
        "INSERT INTO chat_messages (conversation_id, sender_type, content) "
        "VALUES (CAST(%s AS uuid), 'visitor', 'hola')",
        (conversacion,),
    )
    assert cur.rowcount == 1
    app_conn.rollback()



# ═══════════════════════════════════════════════════════════════════════════
# 5. Ciclo de vida: commit, rollback, consulta tras commit, reuso de conexion
# ═══════════════════════════════════════════════════════════════════════════


def test_tras_el_commit_el_contexto_desaparece(app_conn, esc):
    """La razon de ser de `core/contexto_rls.py`.

    `set_config(..., is_local => true)` muere con la transaccion. Un handler que
    hace `commit()` y sigue consultando abre una transaccion NUEVA, sin
    contexto — y eso no da error: da cero filas. Aqui se demuestra el fallo con
    la conexion desnuda, para que quede claro que el enganche `after_begin` no
    es una precaucion teorica.
    """
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}  # control positivo

    app_conn.commit()

    assert proyectos_visibles(app_conn, esc) == set(), (
        "si esto viese filas, el contexto estaria sobreviviendo al commit, que "
        "es justo lo que NO debe pasar con conexiones de pool"
    )
    app_conn.rollback()

    # Y refijandolo —lo que hace `after_begin` en cada transaccion— vuelve.
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    app_conn.rollback()


def test_tras_el_rollback_el_contexto_tampoco_sobrevive(app_conn, esc):
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    app_conn.rollback()
    assert proyectos_visibles(app_conn, esc) == set()
    app_conn.rollback()


def test_la_conexion_reutilizada_no_hereda_el_inquilino_anterior(app_conn, esc):
    """El escenario que convierte un pool en una fuga entre inquilinos.

    Misma conexion fisica, dos «peticiones» seguidas de inquilinos distintos. Si
    el contexto tuviese ambito de conexion en vez de transaccion, la segunda
    veria los datos de la primera.
    """
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    app_conn.commit()

    fijar(app_conn, esc.ws_b, esc.usuario_b)
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_b}
    app_conn.commit()

    # Y una tercera sin contexto: el pool no debe arrastrar nada.
    assert proyectos_visibles(app_conn, esc) == set()
    app_conn.rollback()


def test_los_datos_escritos_y_confirmados_se_leen_despues(app_conn, esc, admin):
    """INSERT + commit + SELECT en transaccion nueva. Sin este control positivo,
    todo el bloque de ciclo de vida pasaria con una base que no escribe nada."""
    nuevo = str(uuid.uuid4())
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    cur = app_conn.cursor()
    cur.execute(
        "INSERT INTO os_projects (id, workspace_id, client_id, name) VALUES (%s,%s,%s,%s)",
        (nuevo, esc.ws_a, esc.cliente_a, f"persistente-{esc.marca}"),
    )
    app_conn.commit()

    try:
        fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
        cur = app_conn.cursor()
        cur.execute("SELECT name FROM os_projects WHERE id = %s", (nuevo,))
        fila = cur.fetchone()
        assert fila is not None and fila[0] == f"persistente-{esc.marca}"
        app_conn.rollback()

        # Y el ajeno sigue sin verlo.
        fijar(app_conn, esc.ws_b, esc.usuario_b)
        cur = app_conn.cursor()
        cur.execute("SELECT count(*) FROM os_projects WHERE id = %s", (nuevo,))
        assert cur.fetchone()[0] == 0
        app_conn.rollback()
    finally:
        # Sin este rollback, un assert fallido dejaria la transaccion abierta y
        # el DELETE de limpieza se quedaria esperando el cerrojo.
        app_conn.rollback()
        admin.cursor().execute("DELETE FROM os_projects WHERE id = %s", (nuevo,))


# ═══════════════════════════════════════════════════════════════════════════
# 6. El camino de fondo (jobs)
# ═══════════════════════════════════════════════════════════════════════════


def test_el_despacho_de_jobs_extrae_el_inquilino_de_la_carga():
    """`core/job_queue.py` lee `workspace_id`/`actor_user_id` de la carga y los
    pone en el ContextVar mientras corre el handler."""
    from core.job_queue import _inquilino_del_job
    from core.tenant_context import (
        contexto_de_inquilino,
        get_tenant_context,
        get_tenant_user_id,
    )

    actor = str(uuid.uuid4())
    ws, uid = _inquilino_del_job({"workspace_id": "77", "actor_user_id": actor})
    assert (ws, uid) == (77, actor)

    # Una carga sin inquilino NO se inventa uno: sigue cerrando.
    assert _inquilino_del_job({"to": "x@y.z"}) == (None, None)

    with contexto_de_inquilino(ws, uid):
        assert get_tenant_context() == 77
        assert get_tenant_user_id() == actor
    # Y restaura al salir, en vez de dejarlo a None y robarle el suyo al llamador.
    assert get_tenant_context() is None


def test_el_contexto_de_fondo_restaura_el_del_llamador():
    from core.tenant_context import (
        contexto_de_inquilino,
        get_tenant_context,
        set_tenant_context,
    )

    set_tenant_context(11, "u-11")
    try:
        with contexto_de_inquilino(22, "u-22"):
            assert get_tenant_context() == 22
        assert get_tenant_context() == 11, "un job anidado no puede robarle el contexto a su llamador"
    finally:
        set_tenant_context(None, None)


def test_el_contexto_que_fija_un_job_da_acceso_de_verdad(app_conn, esc):
    """El puente entre lo anterior y la base: las sentencias que
    `core/contexto_rls.py` genera a partir de ese ContextVar son exactamente las
    que abren la puerta bajo `nelvyon_app`."""
    from core.contexto_rls import sentencias_de_contexto

    sentencias = sentencias_de_contexto(esc.ws_a, esc.usuarios["operator"])
    assert len(sentencias) == 2, "un job necesita las DOS variables, no una"

    cur = app_conn.cursor()
    for sql, params in sentencias:
        cur.execute(sql.replace(":valor", "%(valor)s"), params)

    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    cur.execute(
        "UPDATE os_projects SET name = %s WHERE id = %s",
        (f"job-{esc.marca}", esc.proyecto_a),
    )
    assert cur.rowcount == 1, "un job con rol operativo debe poder escribir"
    app_conn.rollback()


def test_un_job_sin_contexto_no_escribe_nada(app_conn, esc):
    """El otro lado: es lo que pasaba ANTES del arreglo del despacho."""
    app_conn.rollback()
    cur = app_conn.cursor()
    cur.execute("UPDATE os_projects SET name = 'sin-contexto' WHERE id = %s", (esc.proyecto_a,))
    assert cur.rowcount == 0
    app_conn.rollback()


async def test_el_worker_de_webs_aplica_el_contexto_que_recibe(monkeypatch):
    """`os_web_builder_worker._run_generation` fija el inquilino que le pasaron
    ANTES de abrir la sesion, en vez de confiar en heredarlo."""
    from core import database as core_db
    from core.tenant_context import get_tenant_context, get_tenant_user_id
    from services import os_web_builder_worker as worker

    visto: dict[str, object] = {}

    class _SesionFalsa:
        async def __aenter__(self):
            # El momento que importa: cuando la sesion se abre, el contexto ya
            # tiene que estar puesto, porque `after_begin` lo lee justo ahi.
            visto["tenant"] = get_tenant_context()
            visto["user"] = get_tenant_user_id()
            return self

        async def __aexit__(self, *exc):
            return False

    class _ServicioFalso:
        def __init__(self, session):
            self.session = session

        async def generate_website_with_ai(self, project_id):
            return None

    monkeypatch.setattr(core_db.db_manager, "async_session_maker", lambda: _SesionFalsa())
    monkeypatch.setattr(worker, "OsWebBuilderService", _ServicioFalso)

    await worker._run_generation("proj-1", 42, "u-42")
    assert visto == {"tenant": 42, "user": "u-42"}
    assert get_tenant_context() is None, "el worker no debe dejar contexto colgando"

    # Y el control negativo: sin inquilino, el worker no se inventa ninguno.
    visto.clear()
    await worker._run_generation("proj-2", None, None)
    assert visto == {"tenant": None, "user": None}


# ═══════════════════════════════════════════════════════════════════════════
# 7. Prueba de mutacion: ¿tienen dientes estos asserts?
# ═══════════════════════════════════════════════════════════════════════════
#
# Una bateria verde no demuestra nada si no se ha comprobado que puede ponerse
# roja. Aqui se rompe a proposito (a) el contexto y (b) una politica, y se
# afirma que las comprobaciones de arriba dejan de cumplirse.


def test_mutacion_del_contexto_rompe_el_aislamiento_esperado(app_conn, esc):
    """(a) Contexto equivocado -> el assert de «ve lo suyo» falla."""
    fijar(app_conn, esc.ws_b, esc.usuario_b)
    visibles = proyectos_visibles(app_conn, esc)
    assert esc.proyecto_a not in visibles, (
        "con el contexto del inquilino equivocado, el proyecto de A NO debe "
        "aparecer; si apareciera, `test_cada_rol_ve_lo_suyo_y_solo_lo_suyo` "
        "estaria pasando por casualidad"
    )
    app_conn.rollback()


def test_mutacion_de_la_politica_rompe_el_aislamiento(admin, app_conn, esc):
    """(b) Se sustituye `os_projects_os_select` por una que permita todo, se
    comprueba que el aislamiento SE ROMPE, y se restaura.

    Si tras aflojar la politica el aislamiento siguiera intacto, seria que estos
    tests no estan mirando lo que creen mirar —por ejemplo, que las filas no
    existen o que el rol no llega a la tabla— y todos los verdes anteriores
    serian falsos verdes.
    """
    cur_admin = admin.cursor()
    original = (
        "CREATE POLICY os_projects_os_select ON public.os_projects "
        "FOR SELECT USING (nelvyon_os_workspace_select(workspace_id))"
    )
    try:
        cur_admin.execute("DROP POLICY os_projects_os_select ON public.os_projects")
        cur_admin.execute(
            "CREATE POLICY os_projects_os_select ON public.os_projects "
            "FOR SELECT USING (true)"
        )

        app_conn.rollback()
        fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
        visibles = proyectos_visibles(app_conn, esc)
        assert esc.proyecto_b in visibles, (
            "con la politica aflojada el proyecto ajeno DEBE verse; si no se ve, "
            "el aislamiento que miden los demas tests no lo estaba dando esta "
            "politica y la certificacion no vale"
        )
        app_conn.rollback()
    finally:
        cur_admin.execute(
            "DROP POLICY IF EXISTS os_projects_os_select ON public.os_projects"
        )
        cur_admin.execute(original)

    # Restaurada: el aislamiento vuelve.
    fijar(app_conn, esc.ws_a, esc.usuarios["owner"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    app_conn.rollback()


def test_mutacion_de_la_pertenencia_retira_el_acceso(admin, app_conn, esc):
    """(c) Se desactiva la membresia de `operator` y se comprueba que deja de
    ver. Es la prueba de que quien decide es la pertenencia real, no el header."""
    cur_admin = admin.cursor()
    fijar(app_conn, esc.ws_a, esc.usuarios["operator"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}  # control positivo
    app_conn.rollback()

    try:
        cur_admin.execute(
            "UPDATE workspace_members SET status = 'revoked' "
            "WHERE workspace_id = %s AND user_id = %s",
            (esc.ws_a, esc.usuarios["operator"]),
        )
        fijar(app_conn, esc.ws_a, esc.usuarios["operator"])
        assert proyectos_visibles(app_conn, esc) == set()
        app_conn.rollback()
    finally:
        cur_admin.execute(
            "UPDATE workspace_members SET status = 'active' "
            "WHERE workspace_id = %s AND user_id = %s",
            (esc.ws_a, esc.usuarios["operator"]),
        )

    fijar(app_conn, esc.ws_a, esc.usuarios["operator"])
    assert proyectos_visibles(app_conn, esc) == {esc.proyecto_a}
    app_conn.rollback()


def test_mutacion_retirar_la_politica_543_devuelve_el_fallo_silencioso(
    admin, app_conn, esc, suscripcion
):
    """(d) Se quita `subscriptions_workspace_select` y se comprueba que vuelve
    el degradado silencioso a `starter`.

    Es la prueba de que lo que arregla B2 es esa politica y no otra cosa: si el
    plan siguiera viendose sin ella, los tests de arriba estarian pasando por un
    motivo distinto del que dicen.
    """
    cur_admin = admin.cursor()
    original = (
        "CREATE POLICY subscriptions_workspace_select ON public.subscriptions "
        "FOR SELECT USING (workspace_id IS NOT NULL "
        "AND public.nelvyon_user_in_workspace(workspace_id))"
    )

    fijar(app_conn, esc.ws_a, esc.usuarios["member"])
    assert plan_visto(app_conn, esc.ws_a) == "agency"  # control positivo
    app_conn.rollback()

    try:
        cur_admin.execute(
            "DROP POLICY subscriptions_workspace_select ON public.subscriptions"
        )
        fijar(app_conn, esc.ws_a, esc.usuarios["member"])
        assert plan_visto(app_conn, esc.ws_a) is None, (
            "sin la politica de la 543 el plan DEBE desaparecer para quien no "
            "es titular; si sigue viendose, lo esta concediendo otra cosa y "
            "hay que averiguar cual"
        )
        app_conn.rollback()
    finally:
        app_conn.rollback()
        cur_admin.execute(
            "DROP POLICY IF EXISTS subscriptions_workspace_select ON public.subscriptions"
        )
        cur_admin.execute(original)

    fijar(app_conn, esc.ws_a, esc.usuarios["member"])
    assert plan_visto(app_conn, esc.ws_a) == "agency"
    app_conn.rollback()


def test_mutacion_neutralizar_el_resolvedor_deja_ciego_al_websocket(
    admin, app_conn, esc, conversacion
):
    """(e) Se sustituye `nelvyon_livechat_tenant_de_conversacion` por una que
    devuelve NULL y se comprueba que el WebSocket vuelve a no encontrar nada.

    Demuestra que quien rompe el huevo-y-gallina es esa funcion, y que el test
    de B1 detecta la vuelta atras.
    """
    cur_admin = admin.cursor()
    original = """
        CREATE OR REPLACE FUNCTION public.nelvyon_livechat_tenant_de_conversacion(
            p_conversation_id uuid
        )
        RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
        AS $f$
            SELECT c.tenant_id FROM public.chat_conversations c
             WHERE c.id = p_conversation_id LIMIT 1;
        $f$;
    """

    app_conn.rollback()
    assert resolver_inquilino(app_conn, conversacion) == esc.ws_a  # control positivo
    app_conn.rollback()

    try:
        cur_admin.execute(
            """
            CREATE OR REPLACE FUNCTION public.nelvyon_livechat_tenant_de_conversacion(
                p_conversation_id uuid
            )
            RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
            AS $f$ SELECT NULL::integer; $f$;
            """
        )
        app_conn.rollback()
        assert resolver_inquilino(app_conn, conversacion) is None
        # Y sin inquilino, el handler no encuentra su conversacion: 4004.
        assert conversaciones_visibles(app_conn, conversacion) == 0
        app_conn.rollback()
    finally:
        app_conn.rollback()
        cur_admin.execute(original)

    app_conn.rollback()
    assert resolver_inquilino(app_conn, conversacion) == esc.ws_a


def test_el_resolvedor_conserva_su_search_path_fijado(admin):
    """Una `SECURITY DEFINER` sin `search_path` fijo es una escalada esperando
    a que alguien coloque un objeto homonimo en un esquema anterior del path."""
    cur = admin.cursor()
    cur.execute(
        "SELECT prosecdef, proconfig FROM pg_proc "
        "WHERE proname = 'nelvyon_livechat_tenant_de_conversacion'"
    )
    fila = cur.fetchone()
    assert fila is not None, "falta la funcion de la migracion 543"
    secdef, config = fila
    assert secdef is True
    assert config and any(c.startswith("search_path=") for c in config), (
        "la funcion debe fijar su search_path"
    )


# ═══════════════════════════════════════════════════════════════════════════
# 8. El webhook de Stripe: actor de SISTEMA
# ═══════════════════════════════════════════════════════════════════════════
#
# Stripe llega sin JWT y sin usuario. Ni la politica por titular ni la de
# pertenencia de la 543 le conceden nada — y es correcto que no se la concedan:
# inventarle una identidad seria abrir `subscriptions` a quien no la tiene.
#
# Por eso ese unico camino usa el rol `nelvyon_jobs` (BYPASSRLS, migracion 540)
# a traves de `core.database.sesion_de_barrido()`, y SOLO para la escritura de
# suscripciones. Aqui se comprueba con los dos roles reales.


@pytest.fixture(scope="module")
def rol_jobs(admin):
    """Da credenciales a `nelvyon_jobs` en la base de CERTIFICACION.

    La migracion 540 lo crea `NOLOGIN` a proposito: declara el mecanismo y deja
    el reparto de credenciales como acto explicito del operador. Aqui se le dan
    para poder certificarlo, y solo aqui.

    LO QUE ESTA FIXTURE HACIA MAL
    -----------------------------
    Hasta la 544 concedia ademas
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public`. Eso
    fabricaba un entorno mas permisivo que el real y es la razon exacta por la que
    la bateria daba verde mientras produccion estaba rota: alli el rol solo tenia
    privilegios sobre cinco catalogos, y el webhook de Stripe habria muerto con
    `permission denied for table subscriptions`.

    Una prueba que se concede a si misma los permisos que deberia estar
    verificando no verifica nada. Ahora la fixture solo reparte credenciales; los
    privilegios los tiene que haber puesto la migracion 544, y si no estan, la
    comprobacion de abajo lo dice en vez de taparlo.
    """
    cur = admin.cursor()
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs'")
    if cur.fetchone() is None:
        pytest.fail("falta el rol nelvyon_jobs; aplicar la migracion 540")

    cur.execute("ALTER ROLE nelvyon_jobs LOGIN PASSWORD 'nelvyon_jobs_cert'")

    cur.execute(
        "SELECT has_table_privilege('nelvyon_jobs', 'public.subscriptions', 'INSERT')")
    if not cur.fetchone()[0]:
        pytest.fail(
            "nelvyon_jobs no puede insertar en subscriptions: falta la migracion "
            "544. Sin ella el webhook de Stripe se rompe en cuanto la API deje de "
            "usar un rol con BYPASSRLS."
        )

    yield _dsn_del_rol(DSN, "nelvyon_jobs", "nelvyon_jobs_cert")
    # Se le retira LOGIN al terminar: el rol vuelve a como lo dejo la 540.
    cur.execute("ALTER ROLE nelvyon_jobs NOLOGIN")


@pytest.fixture
def jobs_conn(rol_jobs):
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(rol_jobs)
    conn.autocommit = False
    yield conn
    conn.rollback()
    conn.close()


def test_el_rol_de_jobs_bypassa_rls_y_el_de_la_api_no(admin, rol_jobs, rol_app):
    """La premisa del reparto, dicha en la base y no en un comentario."""
    cur = admin.cursor()
    cur.execute(
        "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles "
        "WHERE rolname IN ('nelvyon_app', 'nelvyon_jobs') ORDER BY rolname"
    )
    atributos = {n: (s, b) for n, s, b in cur.fetchall()}
    assert atributos["nelvyon_app"] == (False, False)
    assert atributos["nelvyon_jobs"] == (False, True), (
        "el rol de sistema tiene que bypassar RLS; si no, el webhook de Stripe "
        "seguiria sin poder escribir"
    )


def test_el_webhook_sin_sesion_privilegiada_no_escribiria_la_suscripcion(
    app_conn, esc, suscripcion
):
    """El fallo que motiva el cambio, reproducido con el rol de la API.

    Un actor de sistema no tiene contexto que fijar: ni tenant ni sujeto. Con
    `nelvyon_app`, la actualizacion afecta a CERO filas.
    """
    app_conn.rollback()
    cur = app_conn.cursor()
    cur.execute(
        "UPDATE subscriptions SET status = 'active', stripe_subscription_id = %s WHERE id = %s",
        ("sub_stripe_cert", suscripcion),
    )
    assert cur.rowcount == 0, (
        "si esto escribiese, el webhook no necesitaria sesion privilegiada y "
        "sobraria todo este bloque"
    )
    app_conn.rollback()


def test_el_webhook_con_la_sesion_de_barrido_si_escribe(jobs_conn, admin, esc, suscripcion):
    """Y con el rol `nelvyon_jobs`, sin contexto ninguno, la escritura entra."""
    cur = jobs_conn.cursor()
    cur.execute("SELECT current_setting('app.tenant_id', true)")
    assert not cur.fetchone()[0], "un actor de sistema no fija contexto: no lo tiene"

    cur.execute(
        "UPDATE subscriptions SET status = 'active', stripe_subscription_id = %s WHERE id = %s",
        ("sub_stripe_cert", suscripcion),
    )
    assert cur.rowcount == 1, (
        "la sincronizacion de cobros de Stripe tiene que poder escribir"
    )
    jobs_conn.commit()

    # Y el efecto se ve desde la API con el contexto normal: el ciclo completo.
    try:
        cur_admin = admin.cursor()
        cur_admin.execute(
            "SELECT stripe_subscription_id FROM subscriptions WHERE id = %s", (suscripcion,)
        )
        assert cur_admin.fetchone()[0] == "sub_stripe_cert"
    finally:
        cur_jobs = jobs_conn.cursor()
        cur_jobs.execute(
            "UPDATE subscriptions SET stripe_subscription_id = NULL WHERE id = %s",
            (suscripcion,),
        )
        jobs_conn.commit()


def test_la_sesion_privilegiada_no_es_una_puerta_para_el_trafico_normal(admin, rol_jobs):
    """`nelvyon_jobs` bypassa RLS, asi que lo unico que lo hace aceptable es que
    NO sea la credencial del trafico de la aplicacion. Se comprueba que el rol
    de la API sigue siendo otro y sigue sin bypassar."""
    cur = admin.cursor()
    cur.execute("SELECT rolbypassrls FROM pg_roles WHERE rolname = %s", (ROL,))
    assert cur.fetchone()[0] is False
    assert ROL != "nelvyon_jobs"

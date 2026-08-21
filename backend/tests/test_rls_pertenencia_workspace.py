"""Las ocho tablas `os_*` dejan de denegarlo todo, certificado por rol.

QUÉ ESTABA ROTO
---------------
`322_os_rls.sql` instaló la rama de emergencia de su propio `DO` block:

    nelvyon_user_in_workspace(integer)     -> SELECT false
    nelvyon_workspace_can_mutate(integer)  -> SELECT false

No fue un descuido: la 322 comprobaba si `workspaces` y `workspace_members`
existían y entonces NO existían —las crea la 479, ciento cincuenta migraciones
después—. Lo que nadie volvió a hacer fue rehacer las funciones cuando las
tablas aparecieron. Resultado: 32 políticas sobre 8 tablas apoyadas en un
`false` constante.

Y había un segundo desajuste, distinto y también silencioso:
`nelvyon_current_workspace_id()` leía `app.workspace_id` o
`request.jwt.claim.workspace_id`, y la aplicación no fija ninguna de las dos —
fija `app.tenant_id` y `request.jwt.claim.sub`. Aun arregladas las dos funciones
anteriores, las 8 políticas de SELECT habrían seguido denegando.

`541_rls_pertenencia_workspace_real.sql` cierra los dos.

POR QUÉ EL CONTROL POSITIVO ES EL QUE IMPORTA AQUÍ
---------------------------------------------------
El fallo que se arregla NO era una fuga: era una denegación total. Un test de
aislamiento lo habría aprobado con nota, porque `false` aísla perfectamente. Lo
único que lo detecta es exigir que owner, admin y operator SÍ puedan escribir en
lo suyo. Por eso ese es el primer test del fichero.

LA AUTORIDAD NO SE INVENTA
--------------------------
`WORKSPACE_MUTATION_ROLES = {"owner", "admin", "operator"}` de
`backend/core/rbac.py`. `member` colabora sin mutar y `viewer` solo mira. Este
fichero comprueba los cinco roles, uno a uno, contra la misma tabla.
"""
from __future__ import annotations

import os
import uuid as _uuid

import pytest

from tests._guardia_de_roles import alterar_rol

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

ROL = "nelvyon_rls_pertenencia"
CLAVE = "pertenencia-cert"
MARCA = "wscert"

#: Los roles de workspace y si el producto les deja mutar. Sale de
#: `WORKSPACE_MUTATION_ROLES`; `member` y `viewer` quedan fuera a propósito.
ROLES = (
    ("owner", True),
    ("admin", True),
    ("operator", True),
    ("member", False),
    ("viewer", False),
)


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_rol() -> str:
    return f"postgresql://{ROL}:{CLAVE}@{_dsn().split('@', 1)[1]}"


@pytest.fixture
async def escenario():
    """Dos workspaces con sus equipos, y un rol de conexión sin BYPASSRLS.

    Los cinco roles del producto son cinco USUARIOS distintos, no cinco roles de
    PostgreSQL: la conexión es siempre la misma —la de la aplicación— y lo que
    cambia es `request.jwt.claim.sub`. Es exactamente como funciona en
    producción, y por eso es lo que hay que certificar.
    """
    asyncpg = pytest.importorskip("asyncpg")
    admin = await asyncpg.connect(_dsn())

    # `owner` no es una fila de `workspace_members`: es `workspaces.user_id`,
    # igual que lo resuelve `dependencies/workspace.py`.
    usuarios = {nombre: str(_uuid.uuid4()) for nombre, _ in ROLES}
    usuarios["inactivo"] = str(_uuid.uuid4())   # miembro con status != 'active'
    usuarios["extrano"] = str(_uuid.uuid4())    # sin relación con ningún workspace
    usuarios["owner_b"] = str(_uuid.uuid4())

    async def limpiar():
        await admin.execute(f"DELETE FROM os_clients WHERE business_name LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM workspace_members WHERE email LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM workspaces WHERE name LIKE '{MARCA}%'")

    if await admin.fetchval("SELECT count(*) FROM pg_roles WHERE rolname=$1", ROL):
        await admin.execute(f"DROP OWNED BY {ROL}")
        await alterar_rol(admin, f"DROP ROLE {ROL}", DSN)
    await alterar_rol(admin, f"CREATE ROLE {ROL} LOGIN PASSWORD '{CLAVE}' NOSUPERUSER NOBYPASSRLS", DSN)
    await admin.execute(f"GRANT USAGE ON SCHEMA public, auth TO {ROL}")
    # Solo la tabla que se prueba. Ni `workspaces` ni `workspace_members`: las
    # leen las funciones SECURITY DEFINER, y que el rol NO tenga GRANT sobre
    # ellas es justamente lo que ese DEFINER tiene que resolver.
    await admin.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_clients TO {ROL}")

    await limpiar()

    ws_a = await admin.fetchval(
        "INSERT INTO workspaces (user_id, name) VALUES ($1, $2) RETURNING id",
        usuarios["owner"], f"{MARCA} A",
    )
    ws_b = await admin.fetchval(
        "INSERT INTO workspaces (user_id, name) VALUES ($1, $2) RETURNING id",
        usuarios["owner_b"], f"{MARCA} B",
    )
    for nombre, _ in ROLES:
        if nombre == "owner":
            continue
        await admin.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
            "VALUES ($1, $2, $3, $4, 'active')",
            ws_a, usuarios[nombre], f"{MARCA}-{nombre}@nelvyon.test", nombre,
        )
    await admin.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1, $2, $3, 'admin', 'pending')",
        ws_a, usuarios["inactivo"], f"{MARCA}-inactivo@nelvyon.test",
    )
    for ws, etiqueta, duenno in ((ws_a, "A", usuarios["owner"]), (ws_b, "B", usuarios["owner_b"])):
        await admin.execute(
            "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name) "
            "VALUES ($1, $2, $3)",
            ws, duenno, f"{MARCA} cliente {etiqueta}",
        )

    try:
        yield admin, usuarios, ws_a, ws_b
    finally:
        await limpiar()
        await admin.execute(f"DROP OWNED BY {ROL}")
        await alterar_rol(admin, f"DROP ROLE IF EXISTS {ROL}", DSN)
        await admin.close()


@pytest.fixture
async def conn():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn_rol())
    try:
        yield c
    finally:
        await c.close()


async def _contexto(c, workspace: int | None, usuario: str | None) -> None:
    """El contexto tal y como lo fija `core/contexto_rls.py`: `app.tenant_id` y
    `request.jwt.claim.sub`, con ámbito de transacción. Ni una variable más —el
    arreglo de la 541 consiste precisamente en que no haga falta ninguna otra."""
    if workspace is not None:
        await c.execute("SELECT set_config('app.tenant_id', $1, true)", str(workspace))
    if usuario is not None:
        await c.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", usuario)


async def _clientes(c) -> set[str]:
    filas = await c.fetch(f"SELECT business_name FROM os_clients WHERE business_name LIKE '{MARCA}%'")
    return {f["business_name"] for f in filas}


# ═══════════════════════════════════════════════════════════════════════════
# CONTROL POSITIVO — lo que hoy estaría denegado por completo
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
@pytest.mark.parametrize("rol", ["owner", "admin", "operator"])
async def test_quien_puede_mutar_lee_inserta_y_actualiza_en_su_workspace(escenario, conn, rol):
    """Este es el test que la versión rota NO pasaba.

    Con `nelvyon_workspace_can_mutate` devolviendo `false`, las 16 políticas de
    mutación denegaban a TODO el mundo, incluido el propietario. Y con
    `nelvyon_current_workspace_id()` leyendo una variable que nadie fija, las 8
    de SELECT devolvían vacío. Aquí se exige lo contrario, con el contexto que
    la aplicación fija de verdad.
    """
    _admin, usuarios, ws_a, _ws_b = escenario
    async with conn.transaction():
        await _contexto(conn, ws_a, usuarios[rol])

        assert await _clientes(conn) == {f"{MARCA} cliente A"}, (
            f"{rol} no ve el cliente de su propio workspace: el SELECT sigue denegando"
        )

        await conn.execute(
            "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name) "
            "VALUES ($1, $2, $3)", ws_a, usuarios[rol], f"{MARCA} cliente nuevo de {rol}",
        )
        await conn.execute(
            f"UPDATE os_clients SET status='archived' WHERE business_name = '{MARCA} cliente A'"
        )
        estado = await conn.fetchval(
            f"SELECT status FROM os_clients WHERE business_name = '{MARCA} cliente A'"
        )
        assert estado == "archived", f"{rol} no pudo actualizar en su workspace"


@requiere_pg
@pytest.mark.asyncio
@pytest.mark.parametrize("rol", ["member", "viewer"])
async def test_quien_no_muta_si_lee_lo_suyo(escenario, conn, rol):
    """`member` y `viewer` trabajan en el workspace: quitarles la LECTURA sería
    tan roto como darles la escritura."""
    _admin, usuarios, ws_a, _ws_b = escenario
    async with conn.transaction():
        await _contexto(conn, ws_a, usuarios[rol])
        assert await _clientes(conn) == {f"{MARCA} cliente A"}, f"{rol} no ve lo de su workspace"


# ═══════════════════════════════════════════════════════════════════════════
# CONTROL NEGATIVO — la autoridad, derivada de WORKSPACE_MUTATION_ROLES
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
@pytest.mark.parametrize("rol", ["member", "viewer"])
async def test_quien_no_muta_no_inserta_ni_actualiza(escenario, conn, rol):
    """La otra mitad de la regla. `member` colabora sin mutar; `viewer` mira.

    El INSERT falla con error de política; el UPDATE no falla —no encuentra
    fila que le pertenezca— y por eso se comprueba el efecto desde el admin.
    """
    admin, usuarios, ws_a, _ws_b = escenario
    async with conn.transaction():
        await _contexto(conn, ws_a, usuarios[rol])
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name) "
                "VALUES ($1, $2, $3)", ws_a, usuarios[rol], f"{MARCA} cliente intruso {rol}",
            )

    # Transacción aparte: la anterior queda abortada por el error de política, y
    # UPDATE/DELETE deniegan de otra forma —sin error, sin filas— que es
    # justamente lo que hay que medir.
    async with conn.transaction():
        await _contexto(conn, ws_a, usuarios[rol])
        await conn.execute(
            f"UPDATE os_clients SET status='archived' WHERE business_name = '{MARCA} cliente A'"
        )
        await conn.execute(f"DELETE FROM os_clients WHERE business_name = '{MARCA} cliente A'")

    fila = await admin.fetchrow(
        f"SELECT status FROM os_clients WHERE business_name = '{MARCA} cliente A'"
    )
    assert fila is not None, f"{rol} borro una fila que no puede mutar"
    assert fila["status"] == "active", f"{rol} modifico una fila que no puede mutar"


@requiere_pg
@pytest.mark.asyncio
async def test_un_miembro_no_activo_no_entra(escenario, conn):
    """`status` distinto de 'active' no es pertenencia, ni siquiera con rol
    `admin`. La aplicación exige `status == "active"` y la política también:
    relajarlo aquí abriría en la base a quien la aplicación rechaza."""
    _admin, usuarios, ws_a, _ws_b = escenario
    async with conn.transaction():
        await _contexto(conn, ws_a, usuarios["inactivo"])
        assert await _clientes(conn) == set(), "una invitacion pendiente concede lectura"
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name) "
                "VALUES ($1, $2, $3)", ws_a, usuarios["inactivo"], f"{MARCA} cliente pendiente",
            )


@requiere_pg
@pytest.mark.asyncio
async def test_nadie_ve_ni_toca_el_workspace_de_otro(escenario, conn):
    """Aislamiento entre workspaces, incluso apuntando el contexto al ajeno.

    El segundo caso es el que importa: manipular `app.tenant_id` para señalar el
    workspace de B no concede nada, porque el id solo dice QUÉ se mira — la
    autoridad la da la pertenencia, que se consulta aparte.
    """
    admin, usuarios, ws_a, ws_b = escenario
    async with conn.transaction():
        await _contexto(conn, ws_a, usuarios["owner"])
        assert f"{MARCA} cliente B" not in await _clientes(conn), "FUGA entre workspaces"

    async with conn.transaction():
        await _contexto(conn, ws_b, usuarios["owner"])
        assert await _clientes(conn) == set(), (
            "apuntar el contexto al workspace ajeno concedio lectura"
        )
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name) "
                "VALUES ($1, $2, $3)", ws_b, usuarios["owner"], f"{MARCA} cliente invasor",
            )

    fila = await admin.fetchrow(
        f"SELECT status FROM os_clients WHERE business_name = '{MARCA} cliente B'"
    )
    assert fila is not None and fila["status"] == "active"


@requiere_pg
@pytest.mark.asyncio
async def test_un_usuario_sin_workspace_no_entra_en_ninguno(escenario, conn):
    """Una identidad válida pero ajena a todo equipo no abre nada."""
    _admin, usuarios, ws_a, _ws_b = escenario
    async with conn.transaction():
        await _contexto(conn, ws_a, usuarios["extrano"])
        assert await _clientes(conn) == set()


# ═══════════════════════════════════════════════════════════════════════════
# FAIL-CLOSED sin contexto
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_sin_contexto_no_se_ve_ni_se_escribe(escenario, conn):
    """Sin las dos variables no hay ni workspace ni identidad: NULL en los dos
    lados de la cadena, y NULL no deja pasar ninguna fila."""
    _admin, usuarios, ws_a, _ws_b = escenario
    assert await _clientes(conn) == set()
    async with conn.transaction():
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name) "
                "VALUES ($1, $2, $3)", ws_a, usuarios["owner"], f"{MARCA} cliente sin contexto",
            )


@requiere_pg
@pytest.mark.asyncio
async def test_con_identidad_pero_sin_workspace_tampoco(escenario, conn):
    """Media identidad no es identidad. Si una ruta fijara solo el `sub` y
    olvidara el inquilino, tiene que dar vacío y no el workspace de cualquiera."""
    _admin, usuarios, _ws_a, _ws_b = escenario
    async with conn.transaction():
        await _contexto(conn, None, usuarios["owner"])
        assert await _clientes(conn) == set()


# ═══════════════════════════════════════════════════════════════════════════
# SOBRE LAS FUNCIONES: que no vuelvan a ser `SELECT false`
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_las_funciones_de_pertenencia_no_son_deny_all(escenario):
    """Guardia contra la regresión exacta que motivó esta migración.

    La 322 instaló `SELECT false` como rama de emergencia porque `workspaces` y
    `workspace_members` aún no existían, y ese respaldo sobrevivió ciento
    cincuenta migraciones sin que nada fallara — porque la aplicación se conecta
    como superusuario y RLS no se evalúa. Un `false` constante no rompe ningún
    test de aislamiento: aísla perfectamente. Solo lo delata pedirle que
    conceda.

    Este test mira el cuerpo de las funciones: si alguien vuelve a instalarlas
    en deny-all —reaplicando la 322 sobre una base a medio migrar, por ejemplo—
    salta aquí y no seis meses después con ocho tablas vacías en producción.
    """
    admin, _usuarios, _ws_a, _ws_b = escenario
    for nombre in ("nelvyon_user_in_workspace", "nelvyon_workspace_can_mutate"):
        cuerpo = await admin.fetchval(
            "SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace "
            "WHERE n.nspname='public' AND p.proname=$1", nombre,
        )
        normalizado = " ".join(cuerpo.lower().split())
        assert normalizado != "select false;", (
            f"{nombre} volvio a ser deny-all. Con RLS activo eso deja las 8 tablas "
            "os_* vacias y mudas: sin error, sin log, sin nada."
        )
        assert "workspace_members" in normalizado and "workspaces" in normalizado, (
            f"{nombre} ya no consulta la pertenencia real"
        )


@requiere_pg
@pytest.mark.asyncio
async def test_las_funciones_son_security_definer_con_search_path_fijado(escenario):
    """El DEFINER hace falta —el rol de petición no tiene GRANT sobre
    `workspace_members`— y sin `search_path` fijado sería un vector de escalada:
    quien controlara el `search_path` podría interponer sus propias tablas."""
    admin, _usuarios, _ws_a, _ws_b = escenario
    filas = await admin.fetch(
        "SELECT p.proname, p.prosecdef, p.proconfig FROM pg_proc p "
        "JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' "
        "AND p.proname IN ('nelvyon_user_in_workspace','nelvyon_workspace_can_mutate')"
    )
    assert len(filas) == 2
    for fila in filas:
        assert fila["prosecdef"] is True, f"{fila['proname']} no es SECURITY DEFINER"
        assert "search_path=public" in (fila["proconfig"] or []), (
            f"{fila['proname']} es SECURITY DEFINER sin search_path fijado"
        )


@requiere_pg
@pytest.mark.asyncio
async def test_el_workspace_actual_sale_de_la_variable_que_la_aplicacion_fija(escenario):
    """El segundo fallo, comprobado en la propia función.

    `nelvyon_current_workspace_id()` leía `app.workspace_id` o
    `request.jwt.claim.workspace_id`, y nadie en `backend/` ni en
    `apps/web/src` escribe ninguna de las dos. Ahora acepta además
    `app.tenant_id`, que es la que fija `contexto_rls.py` en cada transacción.

    Se comprueba también que la precedencia anterior se conserva: si alguna vez
    alguien fija `app.workspace_id`, esa gana.
    """
    admin, _usuarios, ws_a, ws_b = escenario
    async with admin.transaction():
        await admin.execute("SELECT set_config('app.tenant_id', $1, true)", str(ws_a))
        assert await admin.fetchval("SELECT nelvyon_current_workspace_id()") == ws_a, (
            "la funcion sigue sin leer `app.tenant_id`: las 8 politicas de SELECT "
            "de las tablas os_* evaluarian NULL y denegarian"
        )
        await admin.execute("SELECT set_config('app.workspace_id', $1, true)", str(ws_b))
        assert await admin.fetchval("SELECT nelvyon_current_workspace_id()") == ws_b, (
            "se perdio la precedencia de `app.workspace_id`"
        )

    assert await admin.fetchval("SELECT nelvyon_current_workspace_id()") is None, (
        "fuera de la transaccion tiene que ser NULL: fail-closed"
    )

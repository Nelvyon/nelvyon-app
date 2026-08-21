"""Las políticas que faltaban, certificadas contra la base real.

QUÉ CIERRA ESTE FICHERO
-----------------------
`test_rls_flujo_completo.py` medía los huecos: 28 tablas con RLS sin política de
INSERT, 13 sin SELECT, 10 sin ninguna. Una tabla con RLS y sin la política del
verbo no deniega con error — devuelve cero filas o descarta la escritura. Es el
modo de fallo que nadie ve hasta que un cliente reclama.

`540_rls_politicas_completas.sql` los cierra. Este fichero comprueba que los
cerró BIEN, que es una afirmación distinta de que los cerró.

POR QUÉ HAY CONTROL POSITIVO Y NO SOLO NEGATIVO
-----------------------------------------------
Unas políticas que denegaran TODO pasarían cualquier test de fuga con nota. El
control positivo —con el contexto correcto, el rol restringido SÍ puede leer y
escribir lo suyo— es lo único que distingue «aísla» de «no funciona nada». Sin
él, la forma más fácil de aprobar la certificación sería romper el producto.

Cada categoría de la migración tiene aquí su par positivo/negativo:

    INQUILINO por workspace_id ..... sms_campaigns, landing_pages
    INQUILINO por tenant_id entero . chat_conversations, chat_messages
    INQUILINO por tenant_id uuid ... qr_codes
    USUARIO ........................ support_tickets, affiliate_profiles
    INGESTA PÚBLICA ACOTADA ........ affiliate_clicks
    CATÁLOGO GLOBAL ................ landing_templates
    JOBS / MANTENIMIENTO ........... rol nelvyon_jobs con BYPASSRLS

TODO CONTRA UN ROL SIN BYPASSRLS
--------------------------------
Con el superusuario de la aplicación, RLS no se evalúa y estas pruebas no
probarían nada. El rol de certificación es NOSUPERUSER NOBYPASSRLS y recibe los
GRANT explícitos, para que una denegación por política no se confunda nunca con
una denegación por privilegio: si faltara el GRANT, el error sería otro y el
test lo distingue.
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

ROL = "nelvyon_rls_politicas"
CLAVE = "politicas-cert"
ROL_FONDO = "nelvyon_rls_fondo_cert"
CLAVE_FONDO = "fondo-cert"

WS_A = 990001
WS_B = 990002
MARCA = "polcert"

#: Tablas donde el rol de petición necesita poder operar para que las pruebas
#: midan la política y no el privilegio.
TABLAS = (
    "sms_campaigns",
    "landing_pages",
    "chat_conversations",
    "chat_messages",
    "qr_codes",
    "support_tickets",
    "affiliate_profiles",
    "affiliate_clicks",
    "landing_templates",
    "nelvyon_users",
    "saas_tenants",
)


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_rol(rol: str, clave: str) -> str:
    return f"postgresql://{rol}:{clave}@{_dsn().split('@', 1)[1]}"


@pytest.fixture
async def escenario():
    """Dos inquilinos completos —A y B— y un rol sin BYPASSRLS que los consulta.

    Cada inquilino tiene usuario, fila en `saas_tenants` (que es el puente entre
    el workspace entero y el `tenant_id uuid` de la generación `/saas`), y una
    fila en cada tabla de las que certifica este fichero.
    """
    asyncpg = pytest.importorskip("asyncpg")
    admin = await asyncpg.connect(_dsn())
    a, b = str(_uuid.uuid4()), str(_uuid.uuid4())

    async def limpiar():
        await admin.execute(f"DELETE FROM affiliate_clicks WHERE code LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM affiliate_profiles WHERE code LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM support_tickets WHERE subject LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM qr_codes WHERE name LIKE '{MARCA}%'")
        await admin.execute(
            "DELETE FROM chat_messages WHERE conversation_id IN "
            f"(SELECT id FROM chat_conversations WHERE visitor_id LIKE '{MARCA}%')"
        )
        await admin.execute(f"DELETE FROM chat_conversations WHERE visitor_id LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM landing_pages WHERE name LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM sms_campaigns WHERE name LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM landing_templates WHERE name LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM saas_tenants WHERE company_name LIKE '{MARCA}%'")
        await admin.execute(f"DELETE FROM nelvyon_users WHERE email LIKE '{MARCA}-%@nelvyon.test'")

    for rol, clave, extra in (
        (ROL, CLAVE, "NOSUPERUSER NOBYPASSRLS"),
        # El rol de fondo reproduce el mecanismo de la sección 8 de la migración:
        # BYPASSRLS acotado a procesos sin contexto de petición, NUNCA al tráfico
        # normal. Es de certificación; el real (`nelvyon_jobs`) nace NOLOGIN.
        (ROL_FONDO, CLAVE_FONDO, "NOSUPERUSER BYPASSRLS"),
    ):
        if await admin.fetchval("SELECT count(*) FROM pg_roles WHERE rolname=$1", rol):
            await admin.execute(f"DROP OWNED BY {rol}")
            await alterar_rol(admin, f"DROP ROLE {rol}", DSN)
        await alterar_rol(admin, f"CREATE ROLE {rol} LOGIN PASSWORD '{clave}' {extra}", DSN)
        await admin.execute(f"GRANT USAGE ON SCHEMA public, auth TO {rol}")
        for tabla in TABLAS:
            await admin.execute(
                f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{tabla} TO {rol}"
            )

    await limpiar()

    tenants: dict[str, str] = {}
    for usuario, ws, etiqueta in ((a, WS_A, "A"), (b, WS_B, "B")):
        await admin.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan, tenant_id) "
            "VALUES ($1::uuid, $2, 'x', 'Cert politicas', 'free', gen_random_uuid())",
            usuario, f"{MARCA}-{usuario[:8]}@nelvyon.test",
        )
        tenants[etiqueta] = str(await admin.fetchval(
            "INSERT INTO saas_tenants (user_id, company_name, industry, workspace_id) "
            "VALUES ($1::uuid, $2, 'saas', $3) RETURNING id",
            usuario, f"{MARCA} {etiqueta}", ws,
        ))
        await admin.execute(
            "INSERT INTO sms_campaigns (workspace_id, name, message) VALUES ($1, $2, 'hola')",
            ws, f"{MARCA} campana {etiqueta}",
        )
        # `status='draft'`: la política pública de `landing_pages` solo abre las
        # publicadas, así que un borrador mide el aislamiento de verdad.
        await admin.execute(
            "INSERT INTO landing_pages (workspace_id, name, status) VALUES ($1, $2, 'draft')",
            ws, f"{MARCA} borrador {etiqueta}",
        )
        conversacion = await admin.fetchval(
            "INSERT INTO chat_conversations (tenant_id, visitor_id) VALUES ($1, $2) RETURNING id",
            ws, f"{MARCA}-visitante-{etiqueta}",
        )
        await admin.execute(
            "INSERT INTO chat_messages (conversation_id, sender_type, content) "
            "VALUES ($1, 'visitor', $2)",
            conversacion, f"{MARCA} mensaje {etiqueta}",
        )
        await admin.execute(
            "INSERT INTO qr_codes (tenant_id, name, destination_url) "
            "VALUES ($1::uuid, $2, 'https://nelvyon.test')",
            tenants[etiqueta], f"{MARCA} qr {etiqueta}",
        )
        await admin.execute(
            "INSERT INTO support_tickets (user_id, subject, body, category, status) "
            "VALUES ($1::uuid, $2, 'cert', 'other', 'open')",
            usuario, f"{MARCA} ticket {etiqueta}",
        )
        await admin.execute(
            "INSERT INTO affiliate_profiles (user_id, code) VALUES ($1::uuid, $2)",
            usuario, f"{MARCA}{etiqueta}",
        )
        await admin.execute(
            "INSERT INTO affiliate_clicks (code) VALUES ($1)", f"{MARCA}{etiqueta}"
        )
    await admin.execute(
        "INSERT INTO landing_templates (name, category, blocks) "
        "VALUES ($1, 'cert', '[]'::jsonb)", f"{MARCA} plantilla",
    )

    try:
        yield admin, {"a": a, "b": b, "tenants": tenants}
    finally:
        await limpiar()
        for rol in (ROL, ROL_FONDO):
            await admin.execute(f"DROP OWNED BY {rol}")
            await alterar_rol(admin, f"DROP ROLE IF EXISTS {rol}", DSN)
        await admin.close()


@pytest.fixture
async def conn():
    """Una conexión con el rol restringido, cerrada pase lo que pase."""
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn_rol(ROL, CLAVE))
    try:
        yield c
    finally:
        await c.close()


async def _con_contexto(c, *, workspace: int | None = None, usuario: str | None = None):
    """Fija el contexto tal y como lo fija `core/contexto_rls.py`: en la
    transacción en curso, con `set_config(..., true)`, y las dos variables."""
    if workspace is not None:
        await c.execute("SELECT set_config('app.tenant_id', $1, true)", str(workspace))
    if usuario is not None:
        await c.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", usuario)


async def _nombres(c, sql: str, *args) -> set[str]:
    return {fila[0] for fila in await c.fetch(sql, *args)}


# ═══════════════════════════════════════════════════════════════════════════
# INQUILINO por workspace_id — control positivo y negativo
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_workspace_lee_y_escribe_lo_suyo(escenario, conn):
    """POSITIVO. Con `app.tenant_id` fijado, el rol restringido opera con
    normalidad sobre su workspace. Si esto fallara, las políticas nuevas
    habrían hecho desaparecer datos legítimos."""
    async with conn.transaction():
        await _con_contexto(conn, workspace=WS_A)
        vistas = await _nombres(conn, f"SELECT name FROM sms_campaigns WHERE name LIKE '{MARCA}%'")
        assert vistas == {f"{MARCA} campana A"}, f"A no ve su propia campana: {vistas}"

        await conn.execute(
            "INSERT INTO sms_campaigns (workspace_id, name, message) VALUES ($1, $2, 'nueva')",
            WS_A, f"{MARCA} campana A nueva",
        )
        await conn.execute(
            f"UPDATE sms_campaigns SET status='sent' WHERE name = '{MARCA} campana A'"
        )
        tras = await _nombres(conn, f"SELECT name FROM sms_campaigns WHERE name LIKE '{MARCA}%'")
        assert tras == {f"{MARCA} campana A", f"{MARCA} campana A nueva"}


@requiere_pg
@pytest.mark.asyncio
async def test_workspace_no_ve_ni_toca_lo_de_otro(escenario, conn):
    """NEGATIVO. Las cuatro operaciones sobre la fila del inquilino B."""
    admin, _ = escenario
    async with conn.transaction():
        await _con_contexto(conn, workspace=WS_A)
        assert f"{MARCA} campana B" not in await _nombres(
            conn, f"SELECT name FROM sms_campaigns WHERE name LIKE '{MARCA}%'"
        ), "FUGA de lectura entre workspaces"

        # UPDATE y DELETE no fallan: no encuentran la fila. Se comprueba desde
        # el admin, porque el silencio es justo lo peligroso.
        await conn.execute(f"UPDATE sms_campaigns SET status='sent' WHERE name = '{MARCA} campana B'")
        await conn.execute(f"DELETE FROM sms_campaigns WHERE name = '{MARCA} campana B'")

        # Escribir bajo el workspace ajeno sí falla, y con error de política.
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO sms_campaigns (workspace_id, name, message) VALUES ($1, $2, 'x')",
                WS_B, f"{MARCA} campana intrusa",
            )

    fila = await admin.fetchrow(f"SELECT status FROM sms_campaigns WHERE name = '{MARCA} campana B'")
    assert fila is not None, "A borro la campana de B"
    assert fila["status"] == "draft", "A modifico la campana de B"


@requiere_pg
@pytest.mark.asyncio
async def test_el_borrador_ajeno_no_se_ve_pese_a_la_superficie_publica(escenario, conn):
    """`landing_pages` tiene una política pública para las páginas PUBLICADAS —es
    su razón de ser, se sirven a visitantes anónimos—. La política nueva del
    dueño no debe abrir además los borradores de otros."""
    async with conn.transaction():
        await _con_contexto(conn, workspace=WS_A)
        vistas = await _nombres(conn, f"SELECT name FROM landing_pages WHERE name LIKE '{MARCA}%'")
    assert vistas == {f"{MARCA} borrador A"}, f"se ve un borrador ajeno: {vistas}"


# ═══════════════════════════════════════════════════════════════════════════
# INQUILINO por tenant_id entero — incluida la tabla derivada
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_tenant_entero_lee_y_escribe_conversaciones_y_mensajes(escenario, conn):
    """POSITIVO. `chat_messages` no tiene columna de inquilino: cuelga de la
    conversación. La política compuesta tiene que dejar pasar igualmente."""
    async with conn.transaction():
        await _con_contexto(conn, workspace=WS_A)
        conversaciones = await _nombres(
            conn, f"SELECT visitor_id FROM chat_conversations WHERE visitor_id LIKE '{MARCA}%'"
        )
        assert conversaciones == {f"{MARCA}-visitante-A"}

        mensajes = await _nombres(
            conn, f"SELECT content FROM chat_messages WHERE content LIKE '{MARCA}%'"
        )
        assert mensajes == {f"{MARCA} mensaje A"}, f"A no ve su propio mensaje: {mensajes}"

        conversacion = await conn.fetchval(
            "INSERT INTO chat_conversations (tenant_id, visitor_id) VALUES ($1, $2) RETURNING id",
            WS_A, f"{MARCA}-visitante-A2",
        )
        await conn.execute(
            "INSERT INTO chat_messages (conversation_id, sender_type, content) "
            "VALUES ($1, 'agent', $2)", conversacion, f"{MARCA} mensaje A2",
        )


@requiere_pg
@pytest.mark.asyncio
async def test_tenant_entero_aisla_conversaciones_y_mensajes(escenario, conn):
    """NEGATIVO. Ni la conversación ajena ni —lo que importa— su mensaje."""
    admin, _ = escenario
    ajena = await admin.fetchval(
        f"SELECT id FROM chat_conversations WHERE visitor_id = '{MARCA}-visitante-B'"
    )
    async with conn.transaction():
        await _con_contexto(conn, workspace=WS_A)
        assert f"{MARCA} mensaje B" not in await _nombres(
            conn, f"SELECT content FROM chat_messages WHERE content LIKE '{MARCA}%'"
        ), "FUGA: se lee el mensaje de otro inquilino"

        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO chat_messages (conversation_id, sender_type, content) "
                "VALUES ($1, 'agent', $2)", ajena, f"{MARCA} mensaje intruso",
            )


# ═══════════════════════════════════════════════════════════════════════════
# INQUILINO por tenant_id uuid — pasando por el puente saas_tenants
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_tenant_uuid_lee_y_escribe_lo_suyo(escenario, conn):
    """POSITIVO. `qr_codes` acota por uuid; el contexto trae un workspace entero.
    La traducción la hace `nelvyon_rls_tenant_uuid()`, igual que el servicio."""
    _, datos = escenario
    async with conn.transaction():
        await _con_contexto(conn, workspace=WS_A)
        assert await _nombres(conn, f"SELECT name FROM qr_codes WHERE name LIKE '{MARCA}%'") == {
            f"{MARCA} qr A"
        }
        await conn.execute(
            "INSERT INTO qr_codes (tenant_id, name, destination_url) "
            "VALUES ($1::uuid, $2, 'https://nelvyon.test')",
            datos["tenants"]["A"], f"{MARCA} qr A nuevo",
        )


@requiere_pg
@pytest.mark.asyncio
async def test_tenant_uuid_no_ve_ni_escribe_lo_ajeno(escenario, conn):
    """NEGATIVO. Un uuid de inquilino ajeno no vale ni siquiera aportándolo."""
    _, datos = escenario
    async with conn.transaction():
        await _con_contexto(conn, workspace=WS_A)
        assert f"{MARCA} qr B" not in await _nombres(
            conn, f"SELECT name FROM qr_codes WHERE name LIKE '{MARCA}%'"
        )
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO qr_codes (tenant_id, name, destination_url) "
                "VALUES ($1::uuid, $2, 'https://nelvyon.test')",
                datos["tenants"]["B"], f"{MARCA} qr intruso",
            )


# ═══════════════════════════════════════════════════════════════════════════
# USUARIO
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_usuario_lee_lo_suyo_y_puede_darse_de_alta_como_afiliado(escenario, conn):
    """POSITIVO. El INSERT de `affiliate_profiles` es una de las políticas
    nuevas: antes un usuario podía ver y editar su perfil pero no crearlo."""
    admin, datos = escenario
    nuevo = str(_uuid.uuid4())
    await admin.execute(
        "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan, tenant_id) "
        "VALUES ($1::uuid, $2, 'x', 'Cert politicas', 'free', gen_random_uuid())",
        nuevo, f"{MARCA}-{nuevo[:8]}@nelvyon.test",
    )
    async with conn.transaction():
        await _con_contexto(conn, usuario=datos["a"])
        assert await _nombres(
            conn, f"SELECT subject FROM support_tickets WHERE subject LIKE '{MARCA}%'"
        ) == {f"{MARCA} ticket A"}

    async with conn.transaction():
        await _con_contexto(conn, usuario=nuevo)
        await conn.execute(
            "INSERT INTO affiliate_profiles (user_id, code) VALUES ($1::uuid, $2)",
            nuevo, f"{MARCA}NUEVO",
        )


@requiere_pg
@pytest.mark.asyncio
async def test_usuario_no_puede_darse_de_alta_en_nombre_de_otro(escenario, conn):
    """NEGATIVO. La política nueva compara contra la fila, no contra lo que
    diga el cliente: pedir el alta con el `user_id` de B no cuela."""
    _, datos = escenario
    async with conn.transaction():
        await _con_contexto(conn, usuario=datos["a"])
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO affiliate_profiles (user_id, code) VALUES ($1::uuid, $2)",
                datos["b"], f"{MARCA}INTRUSO",
            )


@requiere_pg
@pytest.mark.asyncio
async def test_el_afiliado_solo_ve_los_clics_de_sus_codigos(escenario, conn):
    """`affiliate_clicks` no tenía NINGUNA política. La de lectura sigue el
    código hasta el perfil, con el mismo predicado que ya usaban las
    conversiones."""
    _, datos = escenario
    async with conn.transaction():
        await _con_contexto(conn, usuario=datos["a"])
        codigos = await _nombres(conn, f"SELECT code FROM affiliate_clicks WHERE code LIKE '{MARCA}%'")
    assert codigos == {f"{MARCA}A"}, f"se ven clics de codigos ajenos: {codigos}"


# ═══════════════════════════════════════════════════════════════════════════
# INGESTA PÚBLICA ACOTADA
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_la_ingesta_de_clics_acepta_un_codigo_real_y_rechaza_uno_inventado(escenario, conn):
    """El clic lo registra un visitante ANÓNIMO: no hay usuario ni inquilino en
    el contexto todavía. La política no puede exigir identidad, pero tampoco es
    `true`: exige que el código EXISTA. Las dos mitades se comprueban aquí."""
    async with conn.transaction():
        await conn.execute("INSERT INTO affiliate_clicks (code) VALUES ($1)", f"{MARCA}A")

    async with conn.transaction():
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO affiliate_clicks (code) VALUES ($1)", f"{MARCA}-inventado"
            )


# ═══════════════════════════════════════════════════════════════════════════
# CATÁLOGO GLOBAL y el mecanismo para JOBS
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_el_catalogo_global_lo_lee_cualquiera_incluso_sin_contexto(escenario, conn):
    """POSITIVO. Una plantilla por defecto no tiene dueño y se sirve a todos:
    `USING (true)` es aquí la respuesta correcta, no una concesión."""
    assert f"{MARCA} plantilla" in await _nombres(
        conn, f"SELECT name FROM landing_templates WHERE name LIKE '{MARCA}%'"
    )


@requiere_pg
@pytest.mark.asyncio
async def test_el_rol_de_peticion_no_escribe_el_catalogo(escenario, conn):
    """NEGATIVO. El catálogo se lee abierto y se escribe cerrado. El rol tiene
    el GRANT de INSERT —se le concede en el fixture a propósito—, así que la
    denegación viene de la política y no de un privilegio que falte."""
    async with conn.transaction():
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO landing_templates (name, category, blocks) "
                "VALUES ($1, 'cert', '[]'::jsonb)", f"{MARCA} plantilla intrusa",
            )


@requiere_pg
@pytest.mark.asyncio
async def test_el_rol_de_fondo_si_escribe_el_catalogo(escenario):
    """El mecanismo explícito para JOBS, certificado.

    Las plantillas las siembra `_seed_templates()`, que abre su propia sesión
    sin contexto de petición: bajo el rol normal quedaría denegado para siempre.
    La respuesta NO es abrir la política —eso abriría el mismo agujero al
    tráfico normal, porque una política no distingue quién la usa— sino un rol
    dedicado con BYPASSRLS. Aquí se comprueba que ese rol, y solo ese, escribe.
    """
    asyncpg = pytest.importorskip("asyncpg")
    fondo = await asyncpg.connect(_dsn_rol(ROL_FONDO, CLAVE_FONDO))
    try:
        await fondo.execute(
            "INSERT INTO landing_templates (name, category, blocks) "
            "VALUES ($1, 'cert', '[]'::jsonb)", f"{MARCA} plantilla de fondo",
        )
        assert f"{MARCA} plantilla de fondo" in await _nombres(
            fondo, f"SELECT name FROM landing_templates WHERE name LIKE '{MARCA}%'"
        )
    finally:
        await fondo.close()


@requiere_pg
@pytest.mark.asyncio
async def test_el_rol_de_fondo_declarado_existe_y_nace_sin_credenciales(escenario):
    """La migración DECLARA el mecanismo, no reparte credenciales.

    `nelvyon_jobs` nace NOLOGIN: habilitarlo es un acto explícito del operador.
    Y NOSUPERUSER: BYPASSRLS es lo único que necesita un job, no el resto.
    """
    admin, _ = escenario
    fila = await admin.fetchrow(
        "SELECT rolcanlogin, rolbypassrls, rolsuper FROM pg_roles WHERE rolname='nelvyon_jobs'"
    )
    assert fila is not None, "la migracion 540 no declaro el rol de fondo"
    assert fila["rolbypassrls"] is True, "el rol de fondo sin BYPASSRLS no sirve para nada"
    assert fila["rolsuper"] is False, "un job no necesita ser superusuario"
    assert fila["rolcanlogin"] is False, (
        "el rol de fondo no debe nacer con login: la migracion declara el "
        "mecanismo, el operador decide cuando y con que secreto habilitarlo"
    )


# ═══════════════════════════════════════════════════════════════════════════
# FAIL-CLOSED sin contexto
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_sin_contexto_no_se_ve_ningun_dato_de_inquilino(escenario, conn):
    """Un descuido —una ruta que no fije el contexto— tiene que dar vacío, nunca
    los datos de otro. Se comprueba en los tres ejes de inquilino."""
    for consulta in (
        f"SELECT name FROM sms_campaigns WHERE name LIKE '{MARCA}%'",
        f"SELECT name FROM landing_pages WHERE name LIKE '{MARCA}%'",
        f"SELECT visitor_id FROM chat_conversations WHERE visitor_id LIKE '{MARCA}%'",
        f"SELECT content FROM chat_messages WHERE content LIKE '{MARCA}%'",
        f"SELECT name FROM qr_codes WHERE name LIKE '{MARCA}%'",
        f"SELECT code FROM affiliate_clicks WHERE code LIKE '{MARCA}%'",
    ):
        assert await _nombres(conn, consulta) == set(), f"sin contexto se ve algo: {consulta}"


@requiere_pg
@pytest.mark.asyncio
async def test_sin_contexto_no_se_puede_escribir_dato_de_inquilino(escenario, conn):
    """Y escribir sin contexto falla con error, que es mejor que escribir en el
    inquilino equivocado."""
    async with conn.transaction():
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO sms_campaigns (workspace_id, name, message) VALUES ($1, $2, 'x')",
                WS_A, f"{MARCA} campana sin contexto",
            )


@requiere_pg
@pytest.mark.asyncio
async def test_un_contexto_inventado_no_abre_nada(escenario, conn):
    """Fijar un workspace que no es el propio no concede acceso a nada suyo."""
    async with conn.transaction():
        await _con_contexto(conn, workspace=999999, usuario=str(_uuid.uuid4()))
        assert await _nombres(conn, f"SELECT name FROM sms_campaigns WHERE name LIKE '{MARCA}%'") == set()
        assert await _nombres(conn, f"SELECT name FROM qr_codes WHERE name LIKE '{MARCA}%'") == set()


# ═══════════════════════════════════════════════════════════════════════════
# EL INVENTARIO: ni un hueco sin declarar
# ═══════════════════════════════════════════════════════════════════════════

_SIN_VERBO = (
    "SELECT t.tablename FROM pg_tables t "
    "WHERE t.schemaname='public' AND t.rowsecurity AND NOT EXISTS ("
    "  SELECT 1 FROM pg_policies p WHERE p.schemaname='public' "
    "  AND p.tablename=t.tablename AND p.cmd IN ($1, 'ALL')) ORDER BY 1"
)

#: Catálogos globales sin dueño. No reciben INSERT y no es un descuido: no hay
#: columna de propiedad contra la que comparar, así que la única política de
#: escritura posible sería `WITH CHECK (true)` — abrir contenido compartido a
#: cualquier rol con el GRANT. Los escribe el rol de fondo de la sección 8.
RESIDUO_SIN_INSERT = {
    "landing_templates": "plantillas por defecto; las siembra _seed_templates() sin contexto",
    "os_store_templates": "idem, catalogo de tiendas",
    "os_website_templates": "idem, catalogo de webs",
    "changelog_entries": "contenido de producto; en todo el codigo solo se LEE",
    "roadmap_items": "idem, contenido de producto cargado por mantenimiento",
}

#: Tablas que ESCRIBE el motor y solo el motor.
#:
#: Tienen politica de SELECT y de UPDATE —un cliente puede ver sus trabajos y
#: apagar sus capacidades— pero ninguna de INSERT, y eso es deliberado: crear un
#: trabajo de Autopilot o darse de alta capacidades no es una accion de usuario.
#: Lo hace el planner, que corre como `nelvyon_jobs` con BYPASSRLS.
#:
#: Una politica de INSERT aqui dejaria que un inquilino se programara trabajo a si
#: mismo saltandose el plan contratado y la clasificacion de riesgo del catalogo.
#: Por eso hay una prueba en `test_provisioning_de_inquilinos` que comprueba, con
#: el rol de la aplicacion de verdad, que ese INSERT sigue siendo rechazado.
RESIDUO_ESCRIBE_EL_MOTOR = {
    "autopilot_jobs": "los trabajos los crea el planner, no el inquilino",
    "autopilot_workspace_settings": "el provisioning es del motor; el cliente apaga con UPDATE",
    "autopilot_workspace_capabilities": "idem: se activan al nacer, se apagan con UPDATE",
}

#: La plantilla de agentes: SOLO LECTURA para el inquilino.
#:
#: Se separa de `RESIDUO_ESCRIBE_EL_MOTOR` porque no es el mismo caso, aunque lo
#: parezca. Las tablas de Autopilot dan UPDATE al inquilino a proposito: es su
#: motor y tiene que poder apagar lo que no quiera. Estas tres no dan ninguno:
#:
#:   agent_runs     es la AUDITORIA. Una auditoria que su propio sujeto puede
#:                  editar no audita nada. Se lee —es suya y ocultarsela seria
#:                  pedirle que confie sin poder comprobar— pero no se toca.
#:   agent_memory   lo que NELVYON sabe lo escribe NELVYON. Si el cliente
#:                  pudiera editarlo, podria plantar hechos falsos que los
#:                  agentes tomarian como ciertos.
#:   agent_budget   falsear el consumo es saltarse el limite de gasto.
RESIDUO_SOLO_LECTURA_DEL_INQUILINO = {
    "agent_runs": "auditoria: se lee, no se toca",
    "agent_memory": "lo que NELVYON sabe lo escribe NELVYON",
    "agent_budget": "falsear el consumo seria saltarse el limite de gasto",
}

#: Tablas de solo-añadir. La ausencia de UPDATE/DELETE ES el control, no un hueco.
RESIDUO_INMUTABLE = {
    "audit_logs": "un registro que su inquilino pueda reescribir no audita nada",
    "nps_responses": "una respuesta reescrita despues no mide nada",
    "affiliate_clicks": "telemetria de atribucion; la retencion es mantenimiento",
    "affiliate_conversions": "idem, y ademas soporta liquidaciones",
    "landing_analytics": "telemetria de paginas; no se edita fila a fila",
    "qr_scans": "telemetria de escaneos; no se edita fila a fila",
}


@requiere_pg
@pytest.mark.asyncio
async def test_no_queda_ninguna_tabla_con_rls_sin_politica(escenario):
    """Eran 10. La cuenta tiene que ser exactamente cero: una tabla con RLS y
    sin ninguna política deniega TODO en silencio."""
    admin, _ = escenario
    sin_ninguna = [
        f["tablename"] for f in await admin.fetch(
            "SELECT t.tablename FROM pg_tables t WHERE t.schemaname='public' AND t.rowsecurity "
            "AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' "
            "AND p.tablename=t.tablename) ORDER BY 1"
        )
    ]
    assert sin_ninguna == [], f"tablas con RLS y sin politica: {sin_ninguna}"


@requiere_pg
@pytest.mark.asyncio
async def test_no_queda_ninguna_tabla_con_rls_sin_select(escenario):
    """Eran 13. Cero: sin política de SELECT, la tabla devuelve vacío siempre."""
    admin, _ = escenario
    sin_select = [f["tablename"] for f in await admin.fetch(_SIN_VERBO, "SELECT")]
    assert sin_select == [], f"tablas con RLS y sin SELECT: {sin_select}"


@requiere_pg
@pytest.mark.asyncio
async def test_el_residuo_sin_insert_es_exactamente_el_catalogo_declarado(escenario):
    """Eran 28. Quedan 5, y son las cinco declaradas una a una arriba.

    El test no acepta «menos o igual»: exige la lista EXACTA. Si aparece otra
    tabla sin INSERT, alguien añadió una con RLS sin su política; si desaparece
    una de estas, alguien le abrió la escritura a un catálogo global. Las dos
    cosas hay que verlas.
    """
    admin, _ = escenario
    sin_insert = {f["tablename"] for f in await admin.fetch(_SIN_VERBO, "INSERT")}
    esperado = (set(RESIDUO_SIN_INSERT) | set(RESIDUO_ESCRIBE_EL_MOTOR)
                | set(RESIDUO_SOLO_LECTURA_DEL_INQUILINO))
    assert sin_insert == esperado, (
        f"residuo inesperado. sobran={sorted(sin_insert - esperado)} "
        f"faltan={sorted(esperado - sin_insert)}"
    )


@requiere_pg
@pytest.mark.asyncio
async def test_las_tablas_de_solo_anadir_son_las_declaradas(escenario):
    """UPDATE y DELETE no se conceden en todas partes a propósito.

    Las de solo-añadir están arriba con su motivo. Además hay tres ausencias
    puntuales de DELETE —`affiliate_profiles`, `os_store_orders` y
    `support_tickets`— que también son decisiones: un perfil con comisiones
    pendientes se da de baja cambiando `status`, un pedido es un registro
    financiero y un ticket es la prueba de una conversación con el cliente.
    """
    admin, _ = escenario
    sin_update = {f["tablename"] for f in await admin.fetch(_SIN_VERBO, "UPDATE")}
    sin_delete = {f["tablename"] for f in await admin.fetch(_SIN_VERBO, "DELETE")}

    # Las del motor NO entran en `esperado_update`: si tienen politica de UPDATE
    # a proposito, para que el cliente pueda apagar lo que no quiera. Solo les
    # falta INSERT, y en DELETE se comportan como los catalogos: borrar el
    # historial de lo que Autopilot hizo destruiria la evidencia de las entregas.
    # Las de Autopilot NO entran en `esperado_update`: tienen politica de UPDATE
    # a proposito, para que el cliente pueda apagar lo que no quiera. Las de
    # agentes SI, porque el inquilino no escribe ninguna de las tres.
    esperado_update = (set(RESIDUO_INMUTABLE) | set(RESIDUO_SIN_INSERT)
                       | set(RESIDUO_SOLO_LECTURA_DEL_INQUILINO))
    esperado_delete = esperado_update | set(RESIDUO_ESCRIBE_EL_MOTOR) | {
        "affiliate_profiles", "os_store_orders", "support_tickets",
    }
    assert sin_update == esperado_update, (
        f"sobran={sorted(sin_update - esperado_update)} faltan={sorted(esperado_update - sin_update)}"
    )
    assert sin_delete == esperado_delete, (
        f"sobran={sorted(sin_delete - esperado_delete)} faltan={sorted(esperado_delete - sin_delete)}"
    )


@requiere_pg
@pytest.mark.asyncio
async def test_ninguna_politica_nueva_de_inquilino_o_usuario_usa_true(escenario):
    """La forma más fácil de cerrar un hueco es `USING (true)`, y sería fabricar
    verde: la tabla dejaría de denegar y dejaría de aislar a la vez.

    Se auditan las políticas que introdujo la 540 —las que llevan `_rls_`— y se
    exige que ninguna sea un `true` pelado. Las únicas concesiones abiertas del
    esquema son las que ya existían y son deliberadas: catálogos globales y la
    ingestión anónima, que aquí no se tocan.
    """
    admin, _ = escenario
    abiertas = [
        f"{f['tablename']}.{f['policyname']}"
        for f in await admin.fetch(
            "SELECT tablename, policyname FROM pg_policies "
            "WHERE schemaname='public' AND policyname LIKE '%\\_rls\\_%' "
            "AND (btrim(coalesce(qual,'')) = 'true' OR btrim(coalesce(with_check,'')) = 'true') "
            "ORDER BY 1, 2"
        )
    ]
    assert abiertas == [], f"politicas nuevas con USING/CHECK (true): {abiertas}"

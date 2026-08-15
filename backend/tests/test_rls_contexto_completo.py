"""El contexto de sesion que RLS necesita, fijado entero y verificado.

QUE SE AUDITO
-------------
Recuento sobre el esquema completo (439 migraciones, PostgreSQL real):

    politicas en `public` ................. 969
    tablas con ROW LEVEL SECURITY ......... 317
    tablas con FORCE ROW LEVEL SECURITY ... 266
    rol de conexion de la aplicacion ...... postgres, SUPERUSER, BYPASSRLS

De esas 969 politicas, la inmensa mayoria NO se apoya en `auth.uid()` de
Supabase —solo 8 lo hacen— sino en ayudantes propios:

    606  (user_id = nelvyon_jwt_user_id())
     33  tenant_id = nelvyon_erp_tenant_text()
     20  workspace_id = current_tenant_id()
     11  tenant_id = nelvyon_current_saas_tenant_uuid()

Y ahi esta el desajuste, porque esos ayudantes leen dos variables distintas:

    nelvyon_jwt_user_id()          -> request.jwt.claim.sub
    current_tenant_id()            -> app.tenant_id
    nelvyon_erp_tenant_text()      -> app.tenant_id
    nelvyon_current_saas_tenant_uuid() -> request.jwt.claim.sub (via la primera)

La aplicacion solo fijaba `app.tenant_id`. Es decir: aun quitando el
superusuario, 617 politicas evaluarian NULL y denegarian TODO, mientras que solo
53 aislarian de verdad. Retirar el privilegio sin arreglar esto no habria
endurecido nada: habria dejado el producto devolviendo listas vacias sin un solo
error visible.

QUE HACE ESTE FICHERO
---------------------
Comprueba que el contexto se fija COMPLETO y que, con el completo y un rol sin
`BYPASSRLS`, las politicas aislan de verdad. Es la pieza verificable que faltaba
para poder cambiar el rol algun dia con evidencia en vez de con fe.

LO QUE SIGUE SIN ESTAR HECHO, DICHO CLARO
-----------------------------------------
La aplicacion sigue conectandose como superusuario, asi que HOY RLS no forma
parte de la frontera efectiva de seguridad. El aislamiento real lo da el
filtrado por workspace/tenant de la aplicacion, certificado aparte con datos
reales A/B y con manipulacion de `X-Workspace-Id`.

Cambiar el rol de produccion es la unica pieza que queda, y no se hace aqui: un
fallo en cualquier ruta que no fije el contexto se manifestaria como datos que
desaparecen, no como un error. Necesita ventana propia y verificacion sobre un
entorno equivalente.
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

ROL = "nelvyon_rls_contexto"


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def admin():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn())
    try:
        yield c
    finally:
        await c.close()


# ── el contexto se fija entero ──────────────────────────────────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_las_dos_variables_del_contexto_se_fijan(admin):
    """Reproduce lo que hace `TenantService.set_tenant_context` y comprueba que
    los cuatro ayudantes de las politicas resuelven con ese contexto.

    Antes, con solo `app.tenant_id`, `nelvyon_jwt_user_id()` devolvia NULL.
    """
    usuario = str(_uuid.uuid4())
    async with admin.transaction():
        await admin.execute("SELECT set_tenant_context($1)", 4242)
        await admin.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", usuario)

        assert await admin.fetchval("SELECT current_tenant_id()") == 4242
        assert str(await admin.fetchval("SELECT nelvyon_jwt_user_id()")) == usuario
        assert await admin.fetchval("SELECT nelvyon_erp_tenant_text()") == "4242"


@requiere_pg
@pytest.mark.asyncio
async def test_sin_el_sujeto_del_jwt_las_politicas_de_usuario_no_resuelven(admin):
    """Control negativo: el estado ANTERIOR del producto.

    Sin esta comprobacion no quedaria demostrado que faltaba algo — el test de
    arriba podria pasar por casualidad si el ayudante leyera `app.tenant_id`.
    """
    async with admin.transaction():
        await admin.execute("SELECT set_tenant_context($1)", 4243)
        assert await admin.fetchval("SELECT current_tenant_id()") == 4243
        assert await admin.fetchval("SELECT nelvyon_jwt_user_id()") is None


@requiere_pg
@pytest.mark.asyncio
async def test_el_contexto_no_sobrevive_a_la_transaccion(admin):
    """`is_local = true`: sin esto, una conexion reutilizada de un pool
    arrastraria el inquilino de la peticion anterior — que seria una fuga entre
    inquilinos causada precisamente por el mecanismo que debe evitarla."""
    async with admin.transaction():
        await admin.execute("SELECT set_tenant_context($1)", 4244)
        assert await admin.fetchval("SELECT current_tenant_id()") == 4244
    assert await admin.fetchval("SELECT current_tenant_id()") is None


# ── con el contexto completo y sin BYPASSRLS, las politicas aislan ───────────

@requiere_pg
@pytest.mark.asyncio
async def test_con_contexto_completo_y_rol_sin_bypass_rls_aisla(admin):
    """La propiedad entera, contra el motor.

    Se usa `support_tickets`, que tiene FORCE ROW LEVEL SECURITY y politicas
    sobre `user_id = auth.uid()` —resuelto por `nelvyon_jwt_user_id()`—.
    """
    asyncpg = pytest.importorskip("asyncpg")
    a, b = str(_uuid.uuid4()), str(_uuid.uuid4())

    # `DROP OWNED BY` antes de `DROP ROLE`: los GRANT sobrevivirian a una
    # corrida anterior interrumpida y PostgreSQL se niega a borrar un rol del
    # que aun cuelgan privilegios.
    await admin.execute(f"DROP OWNED BY {ROL}" if await admin.fetchval(
        "SELECT count(*) FROM pg_roles WHERE rolname=$1", ROL) else "SELECT 1")
    await admin.execute(f"DROP ROLE IF EXISTS {ROL}")
    await admin.execute(f"CREATE ROLE {ROL} LOGIN PASSWORD 'ctx-cert' NOSUPERUSER NOBYPASSRLS")
    await admin.execute(f"GRANT USAGE ON SCHEMA public, auth TO {ROL}")
    await admin.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO {ROL}")
    await admin.execute("DELETE FROM support_tickets WHERE subject LIKE 'ctx-cert%'")
    # Los tickets tienen clave foranea a `nelvyon_users`: los dos usuarios
    # tienen que existir de verdad. Certificar el aislamiento con identidades
    # inventadas que la base no reconoce no probaria nada.
    for usuario in (a, b):
        await admin.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan, tenant_id) "
            "VALUES ($1::uuid, $2, 'x', 'Certificacion RLS', 'free', gen_random_uuid()) "
            "ON CONFLICT DO NOTHING",
            usuario, f"ctx-cert-{usuario[:8]}@nelvyon.test",
        )
    for usuario, asunto in ((a, "ctx-cert A"), (b, "ctx-cert B")):
        await admin.execute(
            "INSERT INTO support_tickets (user_id, subject, body, category, status) "
            "VALUES ($1::uuid, $2, 'certificacion de contexto', 'other', 'open')",
            usuario, asunto,
        )

    limitada = None
    try:
        origen = _dsn()
        sin_credenciales = origen.split("@", 1)[1]
        limitada = await asyncpg.connect(f"postgresql://{ROL}:ctx-cert@{sin_credenciales}")

        # control positivo: con su contexto, A ve lo suyo
        async with limitada.transaction():
            await limitada.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", a)
            suyos = await limitada.fetch(
                "SELECT subject FROM support_tickets WHERE subject LIKE 'ctx-cert%'"
            )
        asuntos = {r["subject"] for r in suyos}
        assert "ctx-cert A" in asuntos, "RLS deniega incluso lo propio: el contexto no llega"
        assert "ctx-cert B" not in asuntos, "FUGA: A ve los tickets de B"

        # y sin contexto no ve nada (fail-closed)
        vacio = await limitada.fetch(
            "SELECT subject FROM support_tickets WHERE subject LIKE 'ctx-cert%'"
        )
        assert vacio == [], "sin contexto deberia no ver nada"
    finally:
        if limitada is not None:
            await limitada.close()
        await admin.execute("DELETE FROM support_tickets WHERE subject LIKE 'ctx-cert%'")
        await admin.execute("DELETE FROM nelvyon_users WHERE email LIKE 'ctx-cert-%@nelvyon.test'")
        await admin.execute(f"DROP OWNED BY {ROL}")
        await admin.execute(f"DROP ROLE IF EXISTS {ROL}")


# ── el estado real de produccion, dicho sin adornos ─────────────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_el_rol_de_la_aplicacion_sigue_evitando_rls(admin):
    """Deja constancia del gate que queda, y falla si alguien lo cierra sin
    actualizar la documentacion — que tambien seria una sorpresa indeseable.
    """
    evita = await admin.fetchval(
        "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user"
    )
    assert evita is True, (
        "el rol de conexion ya NO evita RLS. Es el cambio pendiente, y si se ha "
        "hecho hay que revisar que todas las rutas fijen el contexto completo y "
        "actualizar docs/ops: sin contexto, las politicas deniegan todo en "
        "silencio y el sintoma son listas vacias, no un error."
    )

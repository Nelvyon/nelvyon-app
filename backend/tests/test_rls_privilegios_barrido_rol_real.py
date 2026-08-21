"""Los privilegios de `nelvyon_jobs` se comprueban CONECTANDO como el rol.

EL FALLO QUE ESTO IMPIDE
------------------------
La bateria anterior daba verde sobre el webhook de Stripe y aun asi el camino
estaba roto en produccion: `nelvyon_jobs` no tenia ningun privilegio sobre
`subscriptions`, y en cuanto el API dejara de usar un rol con BYPASSRLS el INSERT
habria muerto con `permission denied for table subscriptions`.

El hueco no era del despliegue, era de la prueba. `test_rls_webhook_stripe_sistema`
verifica el ORDEN —que la sesion privilegiada se abra despues de
`construct_event`— y nunca el PRIVILEGIO. Como el rol estaba en NOLOGIN, ninguna
prueba pudo conectarse como el, asi que todas comprobaban lo que el codigo
pretendia hacer y ninguna lo que la base permitia.

Esta bateria cierra eso: abre una conexion PostgreSQL REAL autenticada como un rol
equivalente a `nelvyon_jobs` y ejecuta el DML de verdad. Consultar `pg_roles` o
`has_table_privilege` no cuenta como prueba aqui —eso es preguntarle al catalogo
por su propia opinion—; lo que cuenta es que la sentencia pase o reviente.

SOBRE BYPASSRLS
---------------
`nelvyon_jobs` TIENE BYPASSRLS, a proposito y desde la 540: los barridos son
cross-tenant por definicion y no tienen un inquilino que fijar. Quitarselo no
mejoraria nada, los dejaria leyendo cero filas.

Por eso la propiedad que de verdad acota este rol no es «no puede saltarse RLS»
sino «saltarse RLS no le sirve de nada donde no tiene privilegios». Un rol con
BYPASSRLS y SELECT sobre 16 tablas no puede leer la 17. Eso es lo que se prueba
abajo, y es una garantia mas fuerte que la que daria una comprobacion de atributo.
"""
from __future__ import annotations

import os
import secrets

import pytest

from tests._guardia_de_roles import alterar_rol

DSN_ADMIN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN_ADMIN,
    reason="sin NELVYON_PG_CERT_DSN: esta bateria necesita un PostgreSQL real",
)

pytestmark = [requiere_pg, pytest.mark.asyncio]

#: Rol de certificacion. Nunca es el de produccion: hereda de `nelvyon_jobs`
#: —y por tanto sus GRANT— pero vive y muere dentro de la prueba.
ROL_CERT = "nelvyon_jobs_cert"

# ── el mapa de la 544, repetido aqui a proposito ────────────────────────────
#
# Repetirlo NO es duplicacion ociosa: si alguien amplia la migracion, esta lista
# deja de cuadrar y la prueba lo dice. Una prueba que leyera la lista de la propia
# migracion no podria detectar que la migracion concede de mas.

ESCRITURA = ["subscriptions", "workspace_models", "executive_reports"]
ACTUALIZACION = ["report_schedules", "social_posts"]
LECTURA = [
    "social_accounts", "social_post_analytics", "campaigns",
    "chatbot_conversations", "crm_contacts", "crm_deals",
    "public_analytics_events", "tickets", "ticket_messages",
    "workspaces", "workspace_members",
]

# ── lo que anadieron las migraciones posteriores ────────────────────────────
#
# Esta lista llevaba parada en el mapa de la 544 mientras cinco migraciones mas
# repartian privilegios. Como la bateria entera solo corre con un PostgreSQL de
# certificacion, nadie lo vio: se saltaba. Cada entrada de abajo esta trazada al
# codigo que la consume, y si manana sobra una, esta prueba lo dice.

#: 546 y 548-549 — el vigilante de negocio y la autorrecuperacion.
VIGILANCIA_LECTURA = ["onboarding_progress", "stripe_webhook_events",
                      "os_clients", "os_deliverables", "os_projects"]
VIGILANCIA_ESCRITURA = ["business_health_baseline", "business_incidents",
                        "recovery_circuit"]

#: 551-552 — el nucleo de Autopilot. `autopilot_capabilities` y `plan_rango` son
#: catalogos: se leen, no se tocan. Los otros tres los ESCRIBE el motor, y solo
#: el motor: sus tablas tienen RLS forzado sin politica de INSERT, asi que el rol
#: de la aplicacion no puede crearlos aunque lo intente.
AUTOPILOT_LECTURA = ["autopilot_capabilities", "plan_rango"]
AUTOPILOT_ESCRITURA = ["autopilot_jobs", "autopilot_workspace_settings",
                       "autopilot_workspace_capabilities"]

#: 554 — los 14 servicios de OS. Catorce handlers solo leen; uno escribe, y
#: escribe UNA columna (`os_tasks.metadata`), otorgada por columna.
OS_LECTURA = ["os_tasks", "os_cashflow", "os_expenses", "os_deals",
              "os_store_projects", "os_website_projects"]

#: 555 — soporte y ciclo de vida. Igual: solo `helpdesk_tickets.category` se
#: escribe, y tambien por columna.
SOPORTE_LECTURA = ["helpdesk_tickets", "support_templates",
                   "onboarding_workspace_steps"]

#: 556-558 — la plantilla de agentes.
#:
#: El motor escribe la auditoria, la memoria y el presupuesto. El catalogo, las
#: politicas y el freno de emergencia los lee y NADA MAS: un agente que pudiera
#: reescribir su propia politica no tiene politica, y uno que pudiera quitarse el
#: freno no tiene freno. Hay pruebas que lo comprueban ejecutando, no leyendo el
#: GRANT.
AGENTES_ESCRITURA = ["agent_runs", "agent_memory", "agent_budget"]
AGENTES_LECTURA = ["agent_catalog", "agent_policies", "agent_kill_switch"]

CONCEDIDAS = (
    set(ESCRITURA) | set(ACTUALIZACION) | set(LECTURA)
    | set(VIGILANCIA_LECTURA) | set(VIGILANCIA_ESCRITURA)
    | set(AUTOPILOT_LECTURA) | set(AUTOPILOT_ESCRITURA)
    | set(OS_LECTURA) | set(SOPORTE_LECTURA)
    | set(AGENTES_ESCRITURA) | set(AGENTES_LECTURA)
)

#: Tablas que el rol NO debe alcanzar. Cada una es un camino de usuario servido
#: por el API, no un barrido.
#:
#: `support_tickets` sigue aqui, y ahora con mas razon. Tuvo SELECT durante un
#: tiempo porque el vigilante la consultaba para «tickets sin respuesta»… siendo
#: una tabla vacia que ningun codigo escribe. La comprobacion devolvia cero para
#: siempre. Corregida para mirar `helpdesk_tickets`, la 555 retira el privilegio.
PROHIBIDAS = ["oauth_connections", "support_tickets", "workspace_members_invites"]


def _dsn_admin() -> str:
    return (DSN_ADMIN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_con_rol(base: str, usuario: str, clave: str) -> str:
    """Misma base, mismo host, otra identidad."""
    resto = base.split("://", 1)[1]
    resto = resto.split("@", 1)[1] if "@" in resto else resto
    return f"postgresql://{usuario}:{clave}@{resto}"


async def _retirar_rol(admin) -> None:
    """Borra el rol de certificacion si quedo de una ejecucion anterior.

    `DROP ROLE` no basta: el `GRANT CONNECT` sobre la base es una dependencia y
    PostgreSQL se niega mientras exista. Hay que soltar lo que posee y revocar
    lo concedido antes de poder retirarlo.
    """
    base = await admin.fetchval("SELECT current_database()")
    if not await admin.fetchval(
        "SELECT 1 FROM pg_roles WHERE rolname = $1", ROL_CERT
    ):
        return
    await admin.execute(f"REVOKE ALL ON DATABASE {base} FROM {ROL_CERT}")
    await admin.execute(f"DROP OWNED BY {ROL_CERT}")
    await alterar_rol(admin, f"DROP ROLE IF EXISTS {ROL_CERT}", DSN_ADMIN)


@pytest.fixture
async def admin():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn_admin())
    try:
        yield c
    finally:
        await c.close()


@pytest.fixture
async def barrido(admin):
    """Conexion REAL autenticada como un equivalente de `nelvyon_jobs`.

    `IN ROLE nelvyon_jobs` le da exactamente los GRANT del rol de produccion, ni
    uno mas. `BYPASSRLS` reproduce el atributo que el rol lleva desde la 540, para
    que la prueba mida el caso real y no uno mas comodo.
    """
    asyncpg = pytest.importorskip("asyncpg")
    clave = secrets.token_urlsafe(32)

    await _retirar_rol(admin)
    await alterar_rol(
        admin,
        f"CREATE ROLE {ROL_CERT} LOGIN PASSWORD '{clave}' "
        f"IN ROLE nelvyon_jobs NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION "
        f"INHERIT BYPASSRLS",
        DSN_ADMIN,
    )
    base = await admin.fetchval("SELECT current_database()")
    await admin.execute(f"GRANT CONNECT ON DATABASE {base} TO {ROL_CERT}")

    c = await asyncpg.connect(_dsn_con_rol(_dsn_admin(), ROL_CERT, clave))
    try:
        yield c
    finally:
        await c.close()
        await _retirar_rol(admin)


# ── controles de que la prueba mide lo que dice medir ───────────────────────


async def test_la_conexion_es_realmente_del_rol_de_barrido(barrido):
    """Control positivo. Sin esto, una conexion caida al usuario admin daria
    verde en todo lo de abajo y la bateria no valdria nada."""
    assert await barrido.fetchval("SELECT current_user") == ROL_CERT


async def test_el_rol_hereda_de_nelvyon_jobs_y_no_de_otro_sitio(barrido):
    """Los privilegios que se prueban vienen del rol de produccion, no de un
    GRANT que la propia prueba se haya regalado."""
    assert await barrido.fetchval(
        "SELECT pg_has_role(current_user, 'nelvyon_jobs', 'USAGE')")


# ── lo que el rol SI puede hacer, ejecutado de verdad ───────────────────────


@pytest.mark.parametrize("tabla", ESCRITURA + ACTUALIZACION + LECTURA)
async def test_puede_leer_cada_tabla_de_su_alcance(admin, barrido, tabla):
    """SELECT real sobre las 16. Si la 544 se dejara una, esto se pone rojo.

    Una tabla ausente se declara como skip y no como verde: `campaigns` existe en
    produccion pero ninguna migracion la crea —la levanta `create_all` al
    arrancar— asi que en una base construida solo con migraciones no esta. Es
    deriva de esquema previa a la 544, no un fallo de esta.
    """
    if not await admin.fetchval("SELECT to_regclass($1)", f"public.{tabla}"):
        pytest.skip(f"{tabla} no existe en este entorno (deriva de esquema)")
    await barrido.fetchval(f'SELECT count(*) FROM public."{tabla}"')


@pytest.mark.parametrize("tabla", ESCRITURA)
async def test_puede_insertar_donde_debe(barrido, tabla):
    """El INSERT se ejecuta y se deshace.

    Se comprueba el privilegio, no el esquema: si la fila no cuadra con las
    restricciones de columnas el error sera otro, y ese caso lo cubre la bateria
    de Stripe con una fila completa. Aqui lo unico inaceptable es
    `InsufficientPrivilegeError`.
    """
    asyncpg = pytest.importorskip("asyncpg")
    tr = barrido.transaction()
    await tr.start()
    try:
        await barrido.execute(f'INSERT INTO public."{tabla}" DEFAULT VALUES')
    except asyncpg.exceptions.InsufficientPrivilegeError:
        pytest.fail(f"la 544 no concedio INSERT sobre {tabla}")
    except Exception:
        pass  # cualquier otro fallo es de datos, no de permisos
    finally:
        await tr.rollback()


@pytest.mark.parametrize("tabla", ESCRITURA + ACTUALIZACION)
async def test_puede_actualizar_donde_debe(barrido, tabla):
    asyncpg = pytest.importorskip("asyncpg")
    tr = barrido.transaction()
    await tr.start()
    try:
        await barrido.execute(f'UPDATE public."{tabla}" SET id = id WHERE false')
    except asyncpg.exceptions.InsufficientPrivilegeError:
        pytest.fail(f"la 544 no concedio UPDATE sobre {tabla}")
    except Exception:
        pass
    finally:
        await tr.rollback()


# ── lo que el rol NO puede hacer ────────────────────────────────────────────


@pytest.mark.parametrize("tabla", PROHIBIDAS)
async def test_no_alcanza_una_tabla_fuera_de_su_lista(admin, barrido, tabla):
    """La propiedad central: BYPASSRLS no le sirve donde no tiene GRANT.

    Se salta la tabla si no existe en este entorno, en vez de dar un verde
    silencioso: una prueba negativa que no llega a ejecutarse es peor que ninguna.
    """
    asyncpg = pytest.importorskip("asyncpg")
    if not await admin.fetchval("SELECT to_regclass($1)", f"public.{tabla}"):
        pytest.skip(f"{tabla} no existe en este entorno")
    assert tabla not in CONCEDIDAS, "la lista de prohibidas se solapa con la de concedidas"
    with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
        await barrido.fetchval(f'SELECT count(*) FROM public."{tabla}"')


async def test_no_puede_borrar_suscripciones(barrido):
    """Ningun camino de barrido borra. Conceder DELETE «por si acaso» le daria a
    un job con BYPASSRLS la capacidad de vaciar la tabla de cobros."""
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
        await barrido.execute("DELETE FROM public.subscriptions WHERE false")


async def test_no_puede_insertar_donde_solo_tiene_lectura_y_actualizacion(barrido):
    """`report_schedules` se actualiza, nunca se crea: el alta la hace una ruta
    de API con la sesion normal."""
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
        await barrido.execute("INSERT INTO public.report_schedules DEFAULT VALUES")


async def test_no_puede_escribir_donde_solo_tiene_lectura(barrido):
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
        await barrido.execute("UPDATE public.workspaces SET id = id WHERE false")


async def test_no_puede_crear_tablas(barrido):
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
        await barrido.execute("CREATE TABLE public.intruso_544 (id int)")


async def test_no_puede_alterar_el_esquema(barrido):
    """Sin esto, un job podria anadirse columnas o quitar restricciones."""
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(
        (asyncpg.exceptions.InsufficientPrivilegeError,
         asyncpg.exceptions.PostgresSyntaxError)
    ):
        await barrido.execute("ALTER TABLE public.subscriptions ADD COLUMN intruso_544 int")


async def test_no_puede_tocar_roles(barrido):
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
        await alterar_rol(barrido, "CREATE ROLE intruso_544 LOGIN", DSN_ADMIN)


async def test_no_puede_darse_privilegios(barrido):
    """Un rol que pudiera concederse a si mismo lo que le falta convertiria toda
    esta bateria en decorativa."""
    asyncpg = pytest.importorskip("asyncpg")
    with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
        await barrido.execute(
            f"GRANT SELECT ON public.oauth_connections TO {ROL_CERT}")


async def test_no_es_superusuario(barrido):
    """SUPERUSER si seria inaceptable: haria irrelevante cualquier GRANT."""
    assert await barrido.fetchval(
        "SELECT rolsuper FROM pg_roles WHERE rolname = current_user") is False


async def test_nelvyon_jobs_de_produccion_no_es_superusuario(admin):
    assert await admin.fetchval(
        "SELECT rolsuper FROM pg_roles WHERE rolname = 'nelvyon_jobs'") is False


# ── la lista concedida es exactamente la esperada ───────────────────────────


async def test_no_tiene_privilegios_de_mas(admin):
    """El contrapeso de todo lo anterior.

    Las pruebas de arriba verifican que puede lo que debe; esta verifica que no
    puede nada mas. Sin ella, un `GRANT ... ON ALL TABLES` pasaria la bateria
    entera en verde.
    """
    filas = await admin.fetch(
        "SELECT DISTINCT table_name FROM information_schema.role_table_grants "
        "WHERE grantee = 'nelvyon_jobs' AND table_schema = 'public'")
    concedidas = {r["table_name"] for r in filas}

    # Los cinco catalogos publicos vienen de la 540 y siguen siendo legitimos.
    de_la_540 = {"landing_templates", "os_store_templates", "os_website_templates",
                 "changelog_entries", "roadmap_items"}
    sobrantes = concedidas - CONCEDIDAS - de_la_540
    assert not sobrantes, (
        f"nelvyon_jobs tiene privilegios sobre tablas que ningun barrido usa: "
        f"{sorted(sobrantes)}. Cada GRANT de este rol se salta RLS; uno de mas es "
        f"una via cross-tenant abierta sin que nadie la pidiera."
    )


async def test_ninguna_tabla_del_alcance_quedo_sin_conceder(admin):
    """Control negativo del anterior: si la 544 no se aplico, esto lo dice."""
    filas = await admin.fetch(
        "SELECT DISTINCT table_name FROM information_schema.role_table_grants "
        "WHERE grantee = 'nelvyon_jobs' AND table_schema = 'public'")
    concedidas = {r["table_name"] for r in filas}

    # Solo se exige lo que existe: la 544 salta con WARNING lo que no encuentra.
    presentes = {
        t for t in CONCEDIDAS
        if await admin.fetchval("SELECT to_regclass($1)", f"public.{t}")
    }
    faltan = presentes - concedidas
    assert not faltan, (
        f"la 544 no concedio: {sorted(faltan)}. Si falta `subscriptions`, el "
        f"webhook de Stripe esta roto."
    )
    # Y que la ausencia sea de verdad ausencia, no un fallo de la comprobacion.
    assert "subscriptions" in presentes, (
        "`subscriptions` no existe en este entorno: la bateria no esta midiendo "
        "el camino de cobro que dice medir"
    )

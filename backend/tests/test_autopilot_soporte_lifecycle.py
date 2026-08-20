"""Soporte autonomo y ciclo de vida, con el rol que usa produccion.

QUE CERTIFICA
-------------
Que un ticket entra, se clasifica solo, se detecta que su SLA se esta venciendo
y que la respuesta al cliente NO sale sin que una persona la apruebe. Y que el
onboarding parado y las senales de abandono se ven sin que nadie mire.

TODO CORRE COMO `nelvyon_jobs`
-----------------------------
Igual que en `test_autopilot_14_servicios.py`, y por el mismo motivo: certificar
con el rol de la aplicacion mide un sistema que no existe.
"""
from __future__ import annotations

import json
import os
import secrets

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")
#: DSN del rol `nelvyon_jobs`, que es el que ejecuta Autopilot EN PRODUCCION.
#: Se reparte al vuelo desde `_rol_de_barrido` porque el rol no tiene LOGIN de
#: forma permanente: prepararlo a mano antes de la suite deja de funcionar en
#: cuanto `test_rls_activacion_parcial` lo rota, y las pruebas empiezan a fallar
#: por un motivo que no tiene nada que ver con lo que comprueban.
DSN_JOBS: str | None = None


@pytest.fixture(autouse=True, scope="module")
def _credencial_de_barrido():
    """LOGIN temporal para el rol de Autopilot. Se retira al terminar."""
    import asyncio

    global DSN_JOBS
    if not DSN:
        yield
        return
    admin = (DSN or "").replace("postgresql+asyncpg://", "postgresql://")
    from tests._rol_de_barrido import dar_login, retirar_login

    DSN_JOBS = asyncio.run(dar_login(admin))
    try:
        yield
    finally:
        asyncio.run(retirar_login(admin))
        DSN_JOBS = None

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

AUTOMATICAS = [
    "os_helpdesk.sla_en_riesgo",
    "os_helpdesk.triage_entrante",
    "os_lifecycle.onboarding_estancado",
    "os_lifecycle.senales_de_churn",
]

CON_APROBACION = [
    "os_helpdesk.respuesta_sugerida",
    "os_lifecycle.campana_de_retencion",
]


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    crudo = DSN_JOBS or DSN or ""
    return crudo.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql://", "postgresql+asyncpg://").replace("@localhost:", "@127.0.0.1:")


@pytest.fixture
async def ws():
    """Workspace con tickets de verdad: sin clasificar, viejos y sin asignar."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    correo = f"cs-{marca}@nelvyon.test"
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Cert CS') RETURNING user_id", correo)
    ident = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(uid), f"CERTIFICATION-CS-{marca}")
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active') ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        ident, str(uid), correo)
    await adm.execute(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
        "status) VALUES ($1,$2,'enterprise','monthly','active')", ident, uid)

    # Tres tickets clasificables por su texto y uno deliberadamente ambiguo.
    tickets = [
        ("No encuentro mi factura de julio", "Necesito la factura para el pago", "urgent"),
        ("Error 500 al conectar la API", "La integracion falla con timeout", "high"),
        ("Sugerencia: seria util un modo oscuro", "Propuesta de mejora", "low"),
        ("Hola", "", "medium"),
    ]
    for asunto, desc, pri in tickets:
        await adm.execute(
            "INSERT INTO helpdesk_tickets (user_id, workspace_id, subject, description, "
            "status, priority, created_at) VALUES ($1,$2,$3,$4,'open',$5, "
            "now() - interval '3 days')", str(uid), ident, asunto, desc, pri)

    # Onboarding empezado y parado hace tres semanas.
    for paso, hecho in (("crear_workspace", True), ("invitar_equipo", True),
                        ("primer_cliente", False), ("primer_entregable", False)):
        await adm.execute(
            "INSERT INTO onboarding_workspace_steps (workspace_id, step, completed, "
            "completed_at) VALUES ($1,$2,$3,$4)", ident, paso, hecho,
            None if not hecho else __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc) - __import__("datetime").timedelta(days=21))

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    from core.autopilot_ciclo import nacer_autopilot
    async with maker() as s:
        await nacer_autopilot(s, ident)
        await s.commit()

    try:
        yield {"id": int(ident), "uid": uid, "adm": adm, "maker": maker}
    finally:
        for t in ("autopilot_jobs", "autopilot_workspace_capabilities",
                  "autopilot_workspace_settings", "helpdesk_tickets",
                  "onboarding_workspace_steps", "subscriptions", "workspace_members"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id=$1", ident)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ident)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.close()
        await motor.dispose()


async def _ciclo(ws, capacidad):
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    async with ws["maker"]() as s:
        job = await planificar(s, ws["id"], capacidad, "CS-" + secrets.token_hex(3))
        await s.commit()
    if job is None:
        return None, None
    async with ws["maker"]() as s:
        salida = await ejecutar_uno(s, trabajador="cert-cs")
    fila = await ws["adm"].fetchrow(
        "SELECT estado, resultado, validacion, evidencia, ultimo_error "
        "FROM autopilot_jobs WHERE id=$1", job)
    return salida, fila


# ═══════════════════════════════════════════════════════════════════════════
# E2E por capacidad
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("capacidad", AUTOMATICAS)
async def test_cada_capacidad_completa_el_ciclo(ws, capacidad):
    salida, fila = await _ciclo(ws, capacidad)
    assert salida is not None, "no se planifico"
    assert salida["resultado"] == "confirmado", (
        f"{capacidad}: {salida} / {fila['ultimo_error']}")
    assert fila["evidencia"] is not None and fila["validacion"] is not None
    assert json.loads(fila["resultado"])["workspace_id"] == ws["id"]


@pytest.mark.parametrize("capacidad", CON_APROBACION)
async def test_lo_que_sale_hacia_el_cliente_espera_aprobacion(ws, capacidad):
    """Un correo enviado por error ya lo ha leido alguien."""
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    async with ws["maker"]() as s:
        job = await planificar(s, ws["id"], capacidad, "CS-" + secrets.token_hex(3))
        await s.commit()
    assert await ws["adm"].fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job) == "awaiting_approval"

    async with ws["maker"]() as s:
        await ejecutar_uno(s, trabajador="cert-cs")
    assert await ws["adm"].fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job) == "awaiting_approval", (
        f"el executor recogio {capacidad}")


# ═══════════════════════════════════════════════════════════════════════════
# El triage clasifica bien, y calla cuando no sabe
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_triage_clasifica_por_el_texto_real(ws):
    salida, fila = await _ciclo(ws, "os_helpdesk.triage_entrante")
    assert salida["resultado"] == "confirmado", fila["ultimo_error"]

    filas = await ws["adm"].fetch(
        "SELECT subject, category FROM helpdesk_tickets WHERE workspace_id=$1", ws["id"])
    por_asunto = {f["subject"]: f["category"] for f in filas}
    assert por_asunto["No encuentro mi factura de julio"] == "billing"
    assert por_asunto["Error 500 al conectar la API"] == "technical"
    assert por_asunto["Sugerencia: seria util un modo oscuro"] == "feature_request"


async def test_ante_la_duda_el_triage_no_inventa(ws):
    """Un ticket mal clasificado se enruta a quien no toca y desaparece.

    Uno sin clasificar, al menos, se ve.
    """
    await _ciclo(ws, "os_helpdesk.triage_entrante")
    cat = await ws["adm"].fetchval(
        "SELECT COALESCE(category,'') FROM helpdesk_tickets "
        "WHERE workspace_id=$1 AND subject='Hola'", ws["id"])
    assert cat == "", f"clasifico como '{cat}' un ticket que no dice nada"


async def test_el_triage_no_toca_la_prioridad_ni_el_estado(ws):
    """Cambiar la prioridad no es etiquetar: es mover el reloj del SLA."""
    antes = {f["subject"]: (f["priority"], f["status"], f["assigned_to"])
             for f in await ws["adm"].fetch(
                 "SELECT subject, priority, status, assigned_to FROM helpdesk_tickets "
                 "WHERE workspace_id=$1", ws["id"])}
    await _ciclo(ws, "os_helpdesk.triage_entrante")
    despues = {f["subject"]: (f["priority"], f["status"], f["assigned_to"])
               for f in await ws["adm"].fetch(
                   "SELECT subject, priority, status, assigned_to FROM helpdesk_tickets "
                   "WHERE workspace_id=$1", ws["id"])}
    assert antes == despues, "el triage cambio algo que no era la categoria"


async def test_repetir_el_triage_no_reclasifica(ws):
    """Idempotencia: solo mira los que tienen la categoria vacia."""
    await _ciclo(ws, "os_helpdesk.triage_entrante")
    await ws["adm"].execute(
        "UPDATE helpdesk_tickets SET category='other' WHERE workspace_id=$1 "
        "AND subject='Error 500 al conectar la API'", ws["id"])
    _, fila = await _ciclo(ws, "os_helpdesk.triage_entrante")
    assert json.loads(fila["resultado"])["clasificados"] == 0
    assert await ws["adm"].fetchval(
        "SELECT category FROM helpdesk_tickets WHERE workspace_id=$1 "
        "AND subject='Error 500 al conectar la API'", ws["id"]) == "other", (
        "piso una categoria que ya tenia")


async def test_sin_limites_declarados_el_triage_no_escribe(ws):
    adm = ws["adm"]
    await adm.execute("ALTER TABLE autopilot_capabilities "
                      "DROP CONSTRAINT ck_autopilot_limites_declarados")
    await adm.execute("UPDATE autopilot_capabilities SET limites='{}'::jsonb "
                      "WHERE clave='os_helpdesk.triage_entrante'")
    try:
        _, fila = await _ciclo(ws, "os_helpdesk.triage_entrante")
        res = json.loads(fila["resultado"])
        assert res["clasificados"] == 0 and res.get("omitido")
        sin_cat = await adm.fetchval(
            "SELECT count(*) FROM helpdesk_tickets WHERE workspace_id=$1 "
            "AND COALESCE(category,'')=''", ws["id"])
        assert sin_cat == 4, "escribio sin limites declarados"
    finally:
        await adm.execute(
            "UPDATE autopilot_capabilities SET limites="
            "'{\"max_filas_por_ejecucion\": 50, \"solo_sin_categoria\": true}'::jsonb "
            "WHERE clave='os_helpdesk.triage_entrante'")
        await adm.execute(
            "ALTER TABLE autopilot_capabilities ADD CONSTRAINT "
            "ck_autopilot_limites_declarados CHECK ("
            "modo_ejecucion <> 'AUTOMATIC_WITH_LIMITS' OR limites <> '{}'::jsonb)")


# ═══════════════════════════════════════════════════════════════════════════
# El SLA se mide con el reloj de cada prioridad
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_sla_usa_los_minutos_de_cada_prioridad(ws):
    """Un urgente y un bajo no llevan el mismo reloj.

    Los cuatro tickets tienen tres dias. Con los objetivos reales, el urgente
    (15 min), el alto (60) y el medio (240) ya se pasaron de primera respuesta;
    el bajo (480 min = 8 h) tambien. Lo que separa a unos de otros es la
    resolucion: 4320 min del bajo son tres dias justos.
    """
    from services.helpdesk_notifications import SLA_TARGETS

    _, fila = await _ciclo(ws, "os_helpdesk.sla_en_riesgo")
    res = json.loads(fila["resultado"])
    assert res["total"] == 4
    assert res["abiertos"] == 4
    assert res["sin_primera_respuesta_a_tiempo"] == 4, (
        f"con objetivos {SLA_TARGETS} y 3 dias, los cuatro estan fuera: {res}")
    assert res["sin_asignar"] == 4
    assert res["atencion_requerida"] is True


async def test_un_ticket_respondido_a_tiempo_no_cuenta_como_incumplido(ws):
    await ws["adm"].execute(
        "UPDATE helpdesk_tickets SET first_response_minutes = 5 "
        "WHERE workspace_id=$1 AND priority='urgent'", ws["id"])
    _, fila = await _ciclo(ws, "os_helpdesk.sla_en_riesgo")
    res = json.loads(fila["resultado"])
    assert res["sin_primera_respuesta_a_tiempo"] == 3, res


async def test_el_sla_no_mira_tickets_de_otro_workspace(ws):
    """A<->B. `nelvyon_jobs` tiene BYPASSRLS: el WHERE es la unica frontera."""
    adm = ws["adm"]
    marca = secrets.token_hex(4)
    otro_uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Vecino CS') RETURNING user_id", f"vec-cs-{marca}@nelvyon.test")
    otro_ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id", str(otro_uid), f"vec-{marca}")
    try:
        for i in range(25):
            await adm.execute(
                "INSERT INTO helpdesk_tickets (user_id, workspace_id, subject, status, "
                "priority, created_at) VALUES ($1,$2,$3,'open','urgent', "
                "now() - interval '30 days')", str(otro_uid), otro_ws, f"vecino {i}")

        _, fila = await _ciclo(ws, "os_helpdesk.sla_en_riesgo")
        res = json.loads(fila["resultado"])
        assert res["total"] == 4, f"conto tickets del vecino: {res}"
    finally:
        await adm.execute("DELETE FROM helpdesk_tickets WHERE workspace_id=$1", otro_ws)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", otro_ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", otro_uid)


async def test_el_triage_no_clasifica_tickets_de_otro_workspace(ws):
    """La capacidad que ESCRIBE es la que mas importa aislar."""
    adm = ws["adm"]
    marca = secrets.token_hex(4)
    otro_uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Vecino T') RETURNING user_id", f"vec-t-{marca}@nelvyon.test")
    otro_ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id", str(otro_uid), f"vect-{marca}")
    try:
        await adm.execute(
            "INSERT INTO helpdesk_tickets (user_id, workspace_id, subject, description, "
            "status, priority) VALUES ($1,$2,'No encuentro mi factura','pago','open',"
            "'high')", str(otro_uid), otro_ws)

        await _ciclo(ws, "os_helpdesk.triage_entrante")

        cat = await adm.fetchval(
            "SELECT COALESCE(category,'') FROM helpdesk_tickets WHERE workspace_id=$1",
            otro_ws)
        assert cat == "", f"escribio en el workspace vecino: '{cat}'"
    finally:
        await adm.execute("DELETE FROM helpdesk_tickets WHERE workspace_id=$1", otro_ws)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", otro_ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", otro_uid)


# ═══════════════════════════════════════════════════════════════════════════
# Ciclo de vida
# ═══════════════════════════════════════════════════════════════════════════


async def test_un_onboarding_parado_se_ve(ws):
    _, fila = await _ciclo(ws, "os_lifecycle.onboarding_estancado")
    res = json.loads(fila["resultado"])
    assert res["pasos"] == 4 and res["completados"] == 2
    assert res["dias_sin_avanzar"] >= 20
    assert res["estancado"] is True


async def test_un_onboarding_sin_empezar_no_es_un_onboarding_estancado(ws):
    """Sin empezar y parado son problemas distintos con respuestas distintas."""
    await ws["adm"].execute(
        "UPDATE onboarding_workspace_steps SET completed=false, completed_at=NULL "
        "WHERE workspace_id=$1", ws["id"])
    _, fila = await _ciclo(ws, "os_lifecycle.onboarding_estancado")
    res = json.loads(fila["resultado"])
    assert res["empezado"] is False
    assert res["estancado"] is False, "llamo estancado a algo que nunca arranco"


async def test_las_senales_de_churn_son_hechos_y_no_una_puntuacion(ws):
    _, fila = await _ciclo(ws, "os_lifecycle.senales_de_churn")
    res = json.loads(fila["resultado"])
    assert isinstance(res["senales"], list)
    assert res["n_senales"] == len(res["senales"])
    assert "sin entregables en 30 dias" in res["senales"]
    assert "puntuacion" not in res, "aparecio un numero inventado con aire de precision"


async def test_una_suscripcion_marcada_para_cancelar_es_una_senal(ws):
    await ws["adm"].execute(
        "UPDATE subscriptions SET cancel_at_period_end=true WHERE workspace_id=$1",
        ws["id"])
    _, fila = await _ciclo(ws, "os_lifecycle.senales_de_churn")
    res = json.loads(fila["resultado"])
    assert "suscripcion marcada para cancelar" in res["senales"]


# ═══════════════════════════════════════════════════════════════════════════
# Privilegios
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_rol_de_autopilot_solo_puede_escribir_la_categoria():
    """Minimo privilegio comprobado ejecutando.

    Si manana alguien ampliara el triage para cerrar tickets o reasignarlos, la
    base lo rechazaria antes de que llegue a un cliente.
    """
    if not DSN_JOBS:
        pytest.skip("sin NELVYON_PG_CERT_JOBS_DSN")
    import asyncpg
    c = await asyncpg.connect(DSN_JOBS.replace("postgresql+asyncpg://", "postgresql://"))
    try:
        assert await c.fetchval("SELECT current_user") == "nelvyon_jobs"
        for sql in (
            "UPDATE helpdesk_tickets SET status='closed' WHERE id IS NOT NULL",
            "UPDATE helpdesk_tickets SET priority='low' WHERE id IS NOT NULL",
            "UPDATE helpdesk_tickets SET assigned_to='x' WHERE id IS NOT NULL",
            "UPDATE helpdesk_tickets SET resolution_notes='x' WHERE id IS NOT NULL",
            "DELETE FROM helpdesk_tickets WHERE id IS NOT NULL",
            "INSERT INTO helpdesk_tickets (user_id, workspace_id, subject) "
            "VALUES ('x',1,'y')",
            "UPDATE support_templates SET auto_response='x' WHERE id IS NOT NULL",
            "UPDATE onboarding_workspace_steps SET completed=true WHERE id IS NOT NULL",
        ):
            with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                await c.execute(sql)
    finally:
        await c.close()


async def test_las_seis_capacidades_estan_en_el_catalogo(ws):
    from core.autopilot_ciclo import asegurar_capacidades, capacidades_conectadas

    asegurar_capacidades()
    conectadas = set(capacidades_conectadas())
    en_base = {f["clave"] for f in await ws["adm"].fetch(
        "SELECT clave FROM autopilot_capabilities")}
    for cap in AUTOMATICAS + CON_APROBACION:
        assert cap in conectadas, f"{cap} sin ejecutor"
        assert cap in en_base, f"{cap} sin entrada en el catalogo"

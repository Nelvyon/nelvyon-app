"""Los agentes trabajando SOLOS, dentro del ciclo de Autopilot.

LA DIFERENCIA CON `test_agentes_runtime`
----------------------------------------
Alli se invoca a cada agente directamente: prueba que el agente funciona. Aqui no
se invoca a ninguno. Se llama al planner y al executor —lo que los bucles hacen
cada quince minutos y cada minuto— y se comprueba que la plantilla entera se
pone a trabajar sin que nadie pida nada.

Es la diferencia entre «tengo agentes» y «la empresa trabaja sola».
"""
from __future__ import annotations

import json
import os
import secrets

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")
DSN_JOBS: str | None = None

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]


@pytest.fixture(autouse=True, scope="module")
def _credencial_de_barrido():
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


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    crudo = DSN_JOBS or DSN or ""
    return crudo.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql://", "postgresql+asyncpg://").replace("@localhost:", "@127.0.0.1:")


@pytest.fixture
async def empresa():
    """Un workspace con trabajo real y Autopilot encendido."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    correo = f"puente-{marca}@certificacion.invalid"
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Puente') RETURNING user_id", correo)
    ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(uid), f"CERTIFICATION-PUENTE-{marca}")
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active') ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        ws, str(uid), correo)
    await adm.execute(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
        "status) VALUES ($1,$2,'enterprise','monthly','active')", ws, uid)
    cli = await adm.fetchval(
        "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, "
        "status, metadata) VALUES ($1,$2,'Cliente','active','{}'::jsonb) RETURNING id",
        ws, str(uid))
    proy = await adm.fetchval(
        "INSERT INTO os_projects (workspace_id, client_id, name, status, due_date) "
        "VALUES ($1,$2,'Proyecto','active', now() - interval '2 days') RETURNING id",
        ws, cli)
    await adm.execute(
        "INSERT INTO os_tasks (workspace_id, project_id, client_id, title, status, "
        "due_date) VALUES ($1,$2,$3,'Vencida','pending', now() - interval '5 days')",
        ws, proy, cli)
    await adm.execute(
        "INSERT INTO os_deliverables (workspace_id, client_id, project_id, title, "
        "type, status, delivered_at) VALUES ($1,$2,$3,'Entrega','json','published',"
        "now() - interval '3 days')", ws, cli, proy)
    await adm.execute(
        "INSERT INTO helpdesk_tickets (user_id, workspace_id, subject, status, "
        "priority, created_at) VALUES ($1,$2,'Duda','open','high', "
        "now() - interval '2 days')", str(uid), ws)
    await adm.execute(
        "INSERT INTO agent_budget (workspace_id, dia, tope_centimos, tope_ejecuciones) "
        "VALUES ($1, CURRENT_DATE, 0, 500) ON CONFLICT (workspace_id, dia) "
        "DO UPDATE SET tope_ejecuciones = 500", ws)

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    from core.autopilot_ciclo import nacer_autopilot
    async with maker() as s:
        await nacer_autopilot(s, ws)
        await s.commit()

    try:
        yield {"id": int(ws), "uid": uid, "adm": adm, "maker": maker}
    finally:
        for t in ("agent_runs", "agent_memory", "agent_budget", "autopilot_jobs",
                  "autopilot_workspace_capabilities", "autopilot_workspace_settings",
                  "helpdesk_tickets", "os_deliverables", "os_tasks", "os_projects",
                  "os_clients", "subscriptions", "workspace_members"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id=$1", ws)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.execute("UPDATE agent_kill_switch SET detenido=false")
        await adm.close()
        await motor.dispose()


async def _planner(empresa) -> int:
    from core.autopilot_ciclo import planear

    async with empresa["maker"]() as s:
        return len((await planear(s))["creados"])


async def _executor(empresa, vueltas: int = 80) -> list[dict]:
    from core.autopilot_ciclo import ejecutar_uno

    hechos = []
    for _ in range(vueltas):
        async with empresa["maker"]() as s:
            r = await ejecutar_uno(s, trabajador="puente")
        if r is None:
            break
        hechos.append(r)
    return hechos


# ═══════════════════════════════════════════════════════════════════════════
# Coherencia entre codigo y catalogo
# ═══════════════════════════════════════════════════════════════════════════


async def test_todo_agente_puenteado_esta_en_el_catalogo(empresa):
    """Desplegar codigo que atiende capacidades que la base no conoce convierte
    trabajo sano en trabajo escalado. El vigilante tiene una alerta para eso;
    esta prueba lo impide antes."""
    from core.agentes.puente import capacidades_sin_catalogar

    async with empresa["maker"]() as s:
        faltan = await capacidades_sin_catalogar(s)
    assert not faltan, f"capacidades puenteadas sin entrada en el catalogo: {faltan}"


async def test_toda_capacidad_de_agente_tiene_quien_la_ejecute(empresa):
    """El control inverso: catalogo sin implementacion."""
    from core.autopilot_ciclo import asegurar_capacidades, capacidades_conectadas

    asegurar_capacidades()
    conectadas = set(capacidades_conectadas())
    en_base = {f["clave"] for f in await empresa["adm"].fetch(
        "SELECT clave FROM autopilot_capabilities WHERE clave LIKE 'agente.%'")}
    assert en_base <= conectadas, (
        f"capacidades de agente sin ejecutor: {sorted(en_base - conectadas)}")


async def test_ningun_agente_de_aprobacion_humana_se_programa_solo(empresa):
    """Una cola llena de trabajo inejecutable atasca la empresa en silencio."""
    from core.agentes.puente import PUENTEADOS

    filas = await empresa["adm"].fetch(
        "SELECT p.agente FROM agent_policies p "
        " WHERE p.modo = 'HUMAN_APPROVAL_REQUIRED'")
    de_aprobacion = {f["agente"] for f in filas}
    puenteados = set(PUENTEADOS)
    assert not (de_aprobacion & puenteados), (
        f"agentes de aprobacion humana programados solos: "
        f"{sorted(de_aprobacion & puenteados)}")


# ═══════════════════════════════════════════════════════════════════════════
# El ciclo completo, sin que nadie invoque a ningun agente
# ═══════════════════════════════════════════════════════════════════════════


async def test_la_plantilla_entera_se_pone_a_trabajar_sola(empresa):
    """LA PRUEBA. Nadie nombra un agente aqui: solo planner y executor."""
    creados = await _planner(empresa)
    assert creados > 0

    hechos = await _executor(empresa)
    assert hechos, "el executor no tomo nada"

    filas = await empresa["adm"].fetch(
        "SELECT capacidad, estado, evidencia, validacion, resultado "
        "  FROM autopilot_jobs WHERE workspace_id=$1 AND capacidad LIKE 'agente.%'",
        empresa["id"])
    assert filas, "el planner no programo ni un agente"

    for f in filas:
        assert f["estado"] == "confirmed", (
            f"{f['capacidad']} quedo en {f['estado']}")
        assert f["evidencia"] is not None, f"{f['capacidad']} sin evidencia"
        assert f["validacion"] is not None, f"{f['capacidad']} sin validar"
        res = json.loads(f["resultado"])
        assert res["estado_agente"] == "entregado", res
        assert res["agent_run_id"], "sin fila de auditoria del agente"


async def test_cada_trabajo_de_agente_deja_su_propia_auditoria(empresa):
    """Dos rastros, y tienen que cuadrar: el del trabajo y el del agente."""
    await _planner(empresa)
    await _executor(empresa)

    trabajos = await empresa["adm"].fetch(
        "SELECT resultado FROM autopilot_jobs "
        " WHERE workspace_id=$1 AND capacidad LIKE 'agente.%' AND estado='confirmed'",
        empresa["id"])
    assert trabajos

    for t in trabajos:
        run_id = json.loads(t["resultado"])["agent_run_id"]
        f = await empresa["adm"].fetchrow(
            "SELECT agente, job_id, evidencia, veredicto, evaluador, politica_id, "
            "       herramientas_usadas, estado FROM agent_runs WHERE id=$1", run_id)
        assert f is not None, f"la auditoria {run_id} no existe"
        assert f["estado"] == "entregado"
        assert f["job_id"] is not None, "el agente no sabe de que trabajo vino"
        assert f["evidencia"] and f["veredicto"] and f["evaluador"]
        assert f["politica_id"], "entrego sin politica que lo autorizara"
        assert json.loads(f["herramientas_usadas"]), "no uso ninguna herramienta"


async def test_repetir_el_ciclo_no_duplica_trabajo_de_agentes(empresa):
    """El planner corre cada quince minutos."""
    await _planner(empresa)
    await _executor(empresa)
    antes = await empresa["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1 "
        "AND capacidad LIKE 'agente.%'", empresa["id"])

    for _ in range(5):
        await _planner(empresa)
        await _executor(empresa)

    despues = await empresa["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1 "
        "AND capacidad LIKE 'agente.%'", empresa["id"])
    assert despues == antes, f"cinco pasadas mas crearon {despues - antes} duplicados"


# ═══════════════════════════════════════════════════════════════════════════
# La doble puerta
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_freno_de_emergencia_para_el_trabajo_programado(empresa):
    """Un trabajo autorizado a correr no se ejecuta si el freno esta puesto.

    Es la razon de que existan dos puertas: Autopilot decide CUANDO, la politica
    del agente decide QUE, y el freno gana a las dos.
    """
    adm = empresa["adm"]
    await _planner(empresa)
    await adm.execute("UPDATE agent_kill_switch SET detenido=true, "
                      "motivo='parada de certificacion' WHERE ambito='global'")
    try:
        await _executor(empresa)
        filas = await adm.fetch(
            "SELECT capacidad, estado, ultimo_error FROM autopilot_jobs "
            " WHERE workspace_id=$1 AND capacidad LIKE 'agente.%'", empresa["id"])
        assert filas
        assert all(f["estado"] != "confirmed" for f in filas), (
            "se entrego trabajo con el freno de emergencia puesto")
        runs = await adm.fetch(
            "SELECT estado FROM agent_runs WHERE workspace_id=$1", empresa["id"])
        assert runs and all(r["estado"] == "detenido_por_kill_switch" for r in runs)
    finally:
        await adm.execute("UPDATE agent_kill_switch SET detenido=false "
                          "WHERE ambito='global'")


async def test_sin_presupuesto_el_trabajo_no_se_entrega_pero_queda_constancia(
        empresa):
    """Quedarse sin presupuesto no es un fallo del sistema: es el sistema."""
    adm = empresa["adm"]
    await _planner(empresa)
    await adm.execute("UPDATE agent_budget SET tope_ejecuciones=0, ejecuciones=0 "
                      " WHERE workspace_id=$1 AND dia=CURRENT_DATE", empresa["id"])
    try:
        await _executor(empresa)
        runs = await adm.fetch(
            "SELECT estado, error FROM agent_runs WHERE workspace_id=$1",
            empresa["id"])
        assert runs, "no quedo constancia de que se intentara"
        assert all(r["estado"] == "sin_presupuesto" for r in runs), (
            [r["estado"] for r in runs])
    finally:
        await adm.execute("UPDATE agent_budget SET tope_ejecuciones=500 "
                          " WHERE workspace_id=$1 AND dia=CURRENT_DATE", empresa["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Aislamiento en el ciclo real
# ═══════════════════════════════════════════════════════════════════════════


async def test_los_agentes_no_cruzan_inquilinos_ni_por_el_planner(empresa):
    """El vecino tiene mucho mas de todo, y no aparece en ningun resultado."""
    adm = empresa["adm"]
    marca = secrets.token_hex(4)
    otro_uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Vecino') RETURNING user_id", f"vec-{marca}@certificacion.invalid")
    otro = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id", str(otro_uid), f"vec-{marca}")
    try:
        for i in range(30):
            await adm.execute(
                "INSERT INTO helpdesk_tickets (user_id, workspace_id, subject, "
                "status, priority) VALUES ($1,$2,$3,'open','urgent')",
                str(otro_uid), otro, f"vecino {i}")

        await _planner(empresa)
        await _executor(empresa)

        fila = await adm.fetchrow(
            "SELECT resultado FROM autopilot_jobs WHERE workspace_id=$1 "
            "AND capacidad='agente.soporte.priorizar' AND estado='confirmed'",
            empresa["id"])
        assert fila is not None
        res = json.loads(fila["resultado"])["resultado"]
        assert res["workspace_id"] == empresa["id"]
        assert res["total"] == 1, f"conto tickets del vecino: {res['total']}"
    finally:
        await adm.execute("DELETE FROM helpdesk_tickets WHERE workspace_id=$1", otro)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", otro)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", otro_uid)


async def test_un_agente_roto_no_arrastra_a_los_demas(empresa):
    """Fallo parcial: nueve entregan y uno escala. La empresa no se para."""
    from core.autopilot_ciclo import _REGISTRO

    clave = "agente.qa.revisar_entregables"
    original = _REGISTRO[clave]

    async def _revienta(sesion, job):
        raise RuntimeError("agente averiado a proposito")

    _REGISTRO[clave] = (_revienta, original[1])
    try:
        await _planner(empresa)
        await _executor(empresa)
        filas = await empresa["adm"].fetch(
            "SELECT capacidad, estado FROM autopilot_jobs "
            " WHERE workspace_id=$1 AND capacidad LIKE 'agente.%'", empresa["id"])
        por_estado = {f["capacidad"]: f["estado"] for f in filas}
        assert por_estado.get(clave) != "confirmed"
        confirmados = [k for k, v in por_estado.items() if v == "confirmed"]
        assert len(confirmados) >= 5, (
            f"un agente roto arrastro a los demas: {por_estado}")
    finally:
        _REGISTRO[clave] = original

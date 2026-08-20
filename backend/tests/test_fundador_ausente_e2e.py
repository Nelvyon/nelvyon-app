"""Un dia entero de NELVYON con el fundador ausente.

LA PREGUNTA
-----------
No «funcionan las piezas» — eso ya lo prueban las otras baterias. Aqui la
pregunta es la del negocio: si nadie mira los logs, no ejecuta comandos y no
entra en ningun panel entre las 08:00 y las 19:00, ¿la empresa produce, se
recupera de lo que puede, se detiene ante lo que no debe hacer sola, y se lo
cuenta al fundador cuando vuelve?

LA REGLA DE ESTA BATERIA
------------------------
Despues de montar el escenario inicial, NADA de lo que ocurre lo provoca una
persona. Solo se llaman las funciones que los bucles llaman solos:

    nacer_autopilot   provisioning al crear el workspace
    planear           lo que hace el planner cada 15 minutos
    ejecutar_uno      lo que hace el executor cada 60 segundos
    una_pasada        lo que hace el vigilante cada 15 minutos
    componer          lo que ve el fundador al volver

No hay ni una peticion HTTP. Las unicas escrituras manuales son las AVERIAS que
se provocan a proposito, y estan marcadas como tales.

LOS 5050 HISTORICOS NO SE USAN
------------------------------
El escenario se construye entero y se borra al terminar.
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


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    crudo = DSN_JOBS or DSN or ""
    return crudo.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql://", "postgresql+asyncpg://").replace("@localhost:", "@127.0.0.1:")


@pytest.fixture
async def empresa():
    """Dos clientes con trabajo real. Nada mas: el resto lo hace NELVYON."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from core.salud_negocio import COMPROBACIONES

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    workspaces = []

    for n in ("A", "B"):
        correo = f"dia-{n}-{marca}@nelvyon.test"
        uid = await adm.fetchval(
            "INSERT INTO nelvyon_users (email, password_hash, full_name) "
            "VALUES ($1,'x',$2) RETURNING user_id", correo, f"Cliente {n}")
        ident = await adm.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id",
            str(uid), f"CERTIFICATION-DIA-{n}-{marca}")
        await adm.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
            "VALUES ($1,$2,$3,'owner','active') ON CONFLICT (workspace_id, user_id) "
            "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
            ident, str(uid), correo)
        await adm.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
            "billing_cycle, status) VALUES ($1,$2,'enterprise','monthly','active')",
            ident, uid)

        cli = await adm.fetchval(
            "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, "
            "status, metadata) VALUES ($1,$2,$3,'active','{}'::jsonb) RETURNING id",
            ident, str(uid), f"Cliente de {n}")
        proy = await adm.fetchval(
            "INSERT INTO os_projects (workspace_id, client_id, name, status, due_date) "
            "VALUES ($1,$2,'Proyecto','active', now() + interval '10 days') RETURNING id",
            ident, cli)
        await adm.execute(
            "INSERT INTO os_tasks (workspace_id, project_id, client_id, title, status, "
            "due_date) VALUES ($1,$2,$3,'Pendiente','pending', now() - interval '4 days')",
            ident, proy, cli)
        await adm.execute(
            "INSERT INTO os_deliverables (workspace_id, client_id, project_id, title, "
            "type, status, delivered_at, file_url) VALUES ($1,$2,$3,'Entrega','json',"
            "'published', now() - interval '20 days', 'https://ejemplo/x.json')",
            ident, cli, proy)
        await adm.execute(
            "INSERT INTO helpdesk_tickets (user_id, workspace_id, subject, description, "
            "status, priority, created_at) VALUES ($1,$2,"
            "'No encuentro mi factura','pago pendiente','open','high', "
            "now() - interval '2 days')", str(uid), ident)
        await adm.execute(
            "INSERT INTO os_cashflow (workspace_id, user_id, direction, amount, "
            "flow_date) VALUES ($1,$2,'in',2500, to_char(now(),'YYYY-MM-DD'))",
            ident, str(uid))
        workspaces.append({"id": int(ident), "uid": uid, "nombre": n,
                           "cliente": cli, "proyecto": proy})

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    metricas = [c.metrica for c in COMPROBACIONES]

    # Se limpia la vigilancia AL EMPEZAR, no solo al terminar.
    #
    # `business_health_baseline` es global y vive fuera de cualquier workspace,
    # asi que una bateria anterior deja lineas base aprendidas y esta empieza con
    # el vigilante ya «entrenado» — su primera pasada ya no aprende, alarma. La
    # prueba fallaba por el estado que le dejaba otro fichero, no por el sistema.
    await adm.execute("DELETE FROM business_incidents WHERE metrica = ANY($1::text[])",
                      metricas)
    await adm.execute(
        "DELETE FROM business_health_baseline WHERE metrica = ANY($1::text[])",
        metricas)
    try:
        yield {"ws": workspaces, "adm": adm, "maker": maker, "metricas": metricas}
    finally:
        ids = [w["id"] for w in workspaces]
        for t in ("autopilot_jobs", "autopilot_workspace_capabilities",
                  "autopilot_workspace_settings", "helpdesk_tickets",
                  "os_deliverables", "os_tasks", "os_cashflow", "os_projects",
                  "os_clients", "subscriptions", "workspace_members"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id = ANY($1::int[])", ids)
        await adm.execute("DELETE FROM workspaces WHERE id = ANY($1::int[])", ids)
        # `nelvyon_users.user_id` es uuid, no entero.
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id = ANY($1::uuid[])",
                          [w["uid"] for w in workspaces])
        await adm.execute("DELETE FROM business_incidents WHERE metrica = ANY($1::text[])",
                          metricas)
        await adm.execute(
            "DELETE FROM business_health_baseline WHERE metrica = ANY($1::text[])",
            metricas)
        await adm.close()
        await motor.dispose()


# ─── las cuatro cosas que hacen los bucles, y nada mas ──────────────────────


async def _provisionar(empresa):
    from core.autopilot_ciclo import nacer_autopilot

    async with empresa["maker"]() as s:
        for w in empresa["ws"]:
            await nacer_autopilot(s, w["id"])
        await s.commit()


async def _planner(empresa) -> int:
    from core.autopilot_ciclo import planear

    async with empresa["maker"]() as s:
        return len((await planear(s))["creados"])


async def _executor(empresa, vueltas: int = 60) -> list[dict]:
    from core.autopilot_ciclo import ejecutar_uno

    hechos = []
    for _ in range(vueltas):
        async with empresa["maker"]() as s:
            r = await ejecutar_uno(s, trabajador="dia")
        if r is None:
            break
        hechos.append(r)
    return hechos


async def _vigilante(empresa) -> dict:
    from services.vigilante_negocio import una_pasada

    async with empresa["maker"]() as s:
        r = await una_pasada(s)
        await s.commit()
    return r


async def _panel(empresa) -> dict:
    from core.centro_de_control import componer

    async with empresa["maker"]() as s:
        # Ambito `todo`: los workspaces de esta bateria son CERTIFICATION y el
        # ambito real —el que ve el fundador— los excluye a proposito.
        return await componer(s, ambito="todo")


# ═══════════════════════════════════════════════════════════════════════════
# EL DIA
# ═══════════════════════════════════════════════════════════════════════════


async def test_un_dia_completo_sin_el_fundador(empresa):
    """08:00 a 19:00. La prueba entera en una sola historia."""
    adm = empresa["adm"]
    a, b = empresa["ws"]

    # ── 08:00 · nacen con Autopilot encendido y defaults seguros ──────────
    await _provisionar(empresa)

    encendidas = await adm.fetch(
        "SELECT c.clave, c.modo_ejecucion, c.reversible "
        "FROM autopilot_workspace_capabilities wc "
        "JOIN autopilot_capabilities c ON c.clave = wc.capacidad "
        "WHERE wc.workspace_id = $1 AND wc.habilitada", a["id"])
    assert encendidas, "nacio sin ninguna capacidad encendida"
    for f in encendidas:
        assert f["modo_ejecucion"] == "AUTOMATIC_SAFE" and f["reversible"], (
            f"se encendio sola una capacidad que no es segura: {f['clave']}")

    # ── 08:15 · el planner programa el trabajo del dia ────────────────────
    creados = await _planner(empresa)
    assert creados > 0, "el planner no programo nada"

    # ── 08:16 · el executor lo vacia ──────────────────────────────────────
    hechos = await _executor(empresa)
    confirmados = [h for h in hechos if h["resultado"] == "confirmado"]
    assert confirmados, f"no se confirmo nada: {hechos}"

    pendientes = await adm.fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id = ANY($1::int[]) "
        "AND estado NOT IN ('confirmed','awaiting_approval')",
        [a["id"], b["id"]])
    assert pendientes == 0, f"{pendientes} trabajos quedaron a medias"

    # ── el trabajo de A no se mezclo con el de B ──────────────────────────
    for w in (a, b):
        ajenos = await adm.fetch(
            "SELECT resultado FROM autopilot_jobs WHERE workspace_id=$1 "
            "AND estado='confirmed'", w["id"])
        for f in ajenos:
            assert json.loads(f["resultado"])["workspace_id"] == w["id"], (
                "un resultado lleva datos de otro inquilino")

    # ── 09:00 · el vigilante aprende. No alarma en la primera pasada ──────
    primera = await _vigilante(empresa)
    assert primera["incidentes_abiertos"] == 0, (
        f"alarmo la primera vez que miro: {primera}")

    # ── 13:00 · AVERIA PROVOCADA: la cola se atasca ───────────────────────
    #
    # Es el fallo mas silencioso que existe: nada devuelve error, el API sigue
    # en verde y la empresa deja de entregar.
    for _ in range(5):
        await adm.execute(
            "INSERT INTO autopilot_jobs (workspace_id, capacidad, idempotency_key, "
            "estado, programado_para) VALUES ($1,'os_tasks.carga_semanal',$2,"
            "'scheduled', now() - interval '6 hours')",
            b["id"], secrets.token_hex(24))

    segunda = await _vigilante(empresa)
    assert segunda["incidentes_abiertos"] > 0, (
        f"nadie vio la cola atascada: {segunda}")
    incidentes = {i["metrica"] for i in await adm.fetch(
        "SELECT metrica FROM business_incidents WHERE estado <> 'resuelto'")}
    assert "autopilot_cola_atascada" in incidentes, incidentes

    # ── 13:05 · lo que puede arreglarse solo, se intenta ──────────────────
    assert segunda["acciones"], "abrio el incidente y no intento nada"

    # ── 14:00 · una capacidad que publica NO se ejecuta sola ──────────────
    from core.autopilot import planificar

    async with empresa["maker"]() as s:
        job_publica = await planificar(
            s, a["id"], "os_web_builder.preparar_borrador", "DIA-" + secrets.token_hex(3))
        await s.commit()
    await _executor(empresa)
    assert await adm.fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job_publica
    ) == "awaiting_approval", "el executor toco algo que publica hacia fuera"

    # ── 19:00 · el fundador vuelve y mira UNA pantalla ────────────────────
    panel = await _panel(empresa)

    for nombre, bloque in panel["bloques"].items():
        assert bloque["medible"], f"{nombre} no se pudo medir: {bloque.get('motivo')}"

    v = panel["veredicto"]
    assert v["requiere_atencion"] is True, (
        "con la cola atascada y una decision pendiente, el panel dijo que todo "
        f"estaba bien: {v}")
    assert v["estado"] == "roto", v

    # produjo de verdad, y el panel lo dice
    assert panel["bloques"]["produccion"]["confirmados_24h"] >= len(confirmados)

    # la decision pendiente esta ahi, con su motivo
    esperando = panel["bloques"]["esperando_decision"]["trabajos"]
    mios = [t for t in esperando if t["id"] == job_publica]
    assert mios and mios[0]["reversible"] is False
    assert mios[0]["descripcion"], "no dice que haria si se aprueba"


async def test_el_dia_bueno_termina_con_el_portatil_cerrado(empresa):
    """Control negativo del dia entero.

    Sin esto, un panel que dijera «hay que mirar» siempre pasaria la prueba
    anterior sin significar nada.
    """
    # Un dia bueno DE VERDAD. El escenario base trae un ticket de alta prioridad
    # sin responder desde hace dos dias, y eso incumple el SLA de 60 minutos: la
    # primera version de esta prueba fallaba por esa razon, que era correcta. Se
    # arregla el escenario, no la asercion.
    ids = [w["id"] for w in empresa["ws"]]
    await empresa["adm"].execute(
        "UPDATE helpdesk_tickets SET first_response_minutes = 12, "
        "status = 'resolved', resolved_at = now() - interval '1 day', "
        "assigned_to = 'soporte' WHERE workspace_id = ANY($1::int[])", ids)
    # Y ademas hay trabajo TERMINADO. Sin esto, «sin tareas cerradas en 30 dias»
    # es una senal de abandono perfectamente legitima, y el panel hace bien en
    # levantarla: un cliente al que no se le entrega nada se acaba yendo.
    for w in empresa["ws"]:
        await empresa["adm"].execute(
            "INSERT INTO os_tasks (workspace_id, project_id, client_id, title, "
            "status, completed_at) VALUES ($1,$2,$3,'Hecha','completed', "
            "now() - interval '2 days')", w["id"], w["proyecto"], w["cliente"])

    await _provisionar(empresa)
    await _planner(empresa)
    hechos = await _executor(empresa)
    assert [h for h in hechos if h["resultado"] == "confirmado"]

    await _vigilante(empresa)   # aprende
    segunda = await _vigilante(empresa)
    assert segunda["incidentes_abiertos"] == 0, (
        f"alarmo sin que pasara nada: {segunda}")

    panel = await _panel(empresa)
    assert panel["veredicto"]["estado"] == "en_marcha", (
        f"{panel['veredicto']} · riesgo: "
        f"{panel['bloques']['clientes_en_riesgo']['workspaces']}")
    assert panel["veredicto"]["requiere_atencion"] is False


async def test_si_el_motor_no_corre_el_panel_no_dice_que_todo_va_bien(empresa):
    """El fallo que mas importa: no que algo falle, sino que nada ocurra.

    Autopilot encendido, trabajo programado y NADIE ejecutandolo. No hay errores,
    no hay excepciones y no hay entregas. El panel tiene que decirlo.
    """
    await _provisionar(empresa)
    creados = await _planner(empresa)
    assert creados > 0
    # A proposito: no se llama al executor. El motor esta muerto.

    panel = await _panel(empresa)
    assert panel["veredicto"]["requiere_atencion"] is True, (
        f"con el motor parado el panel dijo que todo iba bien: {panel['veredicto']}")
    assert panel["bloques"]["produccion"]["confirmados_24h"] == 0
    assert panel["bloques"]["motor"]["en_cola"] >= creados


async def test_una_averia_de_base_no_se_presenta_como_calma(empresa):
    """Si el panel no puede consultar, lo dice. No pinta ceros.

    Se retira un privilegio al rol del panel: con `medible: false` el veredicto
    tiene que ser `desconocido`, nunca `en_marcha`. Es el fallo que ya produjo un
    «0 clientes» teniendo 1101.
    """
    if not DSN_JOBS:
        pytest.skip("sin NELVYON_PG_CERT_JOBS_DSN")

    await _provisionar(empresa)
    await _planner(empresa)
    await _executor(empresa)

    adm = empresa["adm"]
    await adm.execute("REVOKE SELECT ON autopilot_workspace_settings FROM nelvyon_jobs")
    try:
        panel = await _panel(empresa)
        assert panel["bloques"]["motor"]["medible"] is False
        assert panel["veredicto"]["estado"] == "desconocido", panel["veredicto"]
        assert panel["veredicto"]["requiere_atencion"] is True
    finally:
        await adm.execute(
            "GRANT SELECT ON autopilot_workspace_settings TO nelvyon_jobs")


async def test_repetir_el_dia_no_duplica_el_trabajo(empresa):
    """El planner corre cada 15 minutos: 44 veces entre las 08:00 y las 19:00."""
    await _provisionar(empresa)
    await _planner(empresa)
    await _executor(empresa)

    antes = await empresa["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id = ANY($1::int[])",
        [w["id"] for w in empresa["ws"]])

    for _ in range(10):
        await _planner(empresa)
        await _executor(empresa)

    despues = await empresa["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id = ANY($1::int[])",
        [w["id"] for w in empresa["ws"]])
    assert despues == antes, f"diez pasadas mas crearon {despues - antes} duplicados"


async def test_todo_lo_entregado_lleva_evidencia(empresa):
    """Ningun trabajo confirmado sin prueba de lo que hizo.

    Es lo que separa «la maquina dice que lo hizo» de «se puede comprobar».
    """
    await _provisionar(empresa)
    await _planner(empresa)
    await _executor(empresa)

    filas = await empresa["adm"].fetch(
        "SELECT capacidad, evidencia, validacion FROM autopilot_jobs "
        "WHERE workspace_id = ANY($1::int[]) AND estado = 'confirmed'",
        [w["id"] for w in empresa["ws"]])
    assert filas, "no se confirmo nada"
    for f in filas:
        assert f["evidencia"] is not None, f"{f['capacidad']} entregado sin evidencia"
        assert f["validacion"] is not None, f"{f['capacidad']} entregado sin validar"
        prueba = json.loads(f["evidencia"])
        assert prueba.get("sha256"), f"{f['capacidad']}: evidencia sin huella"

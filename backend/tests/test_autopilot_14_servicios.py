"""Los 14 servicios de NELVYON OS conectados al nucleo, uno por uno.

QUE CERTIFICA
-------------
Que cada capacidad recorre el ciclo completo sin una sola peticion HTTP:

    planner -> cola -> executor -> servicio OS -> validador -> evidencia -> confirmado

Y que la clasificacion de riesgo no es decorativa: lo que publica hacia fuera
NUNCA llega al executor, por construccion.

LO QUE NO SE USA COMO PRUEBA
----------------------------
Ni los 5050 entregables historicos ni nada `synthetic`. Cada prueba crea su
workspace CERTIFICATION con datos propios y lo borra.
"""
from __future__ import annotations

import asyncio
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

#: Las que el executor SI debe ejecutar solo.
AUTOMATICAS = [
    "os_deliverables.snapshot_semanal",
    "os_observability.salud_semanal",
    "os_excellence.checklist_qa",
    "os_global.riesgo_semanal",
    "os_cashflow.resumen_mensual",
    "os_expenses.resumen_mensual",
    "os_deals.pipeline_semanal",
    "os_clients.cartera_semanal",
    "os_projects.estado_semanal",
    "os_tasks.carga_semanal",
    "os_deliverables_rest.pendientes_revision",
    "os_tasks_rest.marcar_vencidas",
]

#: Las que NUNCA debe ejecutar solo.
CON_APROBACION = [
    "os_store_builder.preparar_borrador",
    "os_web_builder.preparar_borrador",
    "os_autonomous.proponer_plan",
]


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    """El motor del executor. Usa `nelvyon_jobs` si esta disponible.

    La preparacion y el borrado de datos siguen yendo por el rol administrador:
    montar el escenario no es parte de lo que se certifica. Lo que se certifica
    es que el ciclo funcione con los privilegios que tiene en produccion.
    """
    crudo = DSN_JOBS or DSN or ""
    return crudo.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql://", "postgresql+asyncpg://").replace("@localhost:", "@127.0.0.1:")


@pytest.fixture
async def ws():
    """Workspace CERTIFICATION con datos reales en las siete tablas de OS."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    correo = f"cert14-{marca}@nelvyon.test"
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Cert 14') RETURNING user_id", correo)
    ident = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(uid), f"CERTIFICATION-14-{marca}")
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active') "
        "ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        ident, str(uid), correo)
    # Plan enterprise: cubre incluso las capacidades que lo exigen.
    await adm.execute(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
        "status) VALUES ($1,$2,'enterprise','monthly','active')", ident, uid)

    cli = await adm.fetchval(
        "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, "
        "status, metadata) VALUES ($1,$2,'Cert','active','{}'::jsonb) RETURNING id",
        ident, str(uid))
    proy = await adm.fetchval(
        "INSERT INTO os_projects (workspace_id, client_id, name, status, due_date) "
        "VALUES ($1,$2,'Cert','active', now() - interval '3 days') RETURNING id",
        ident, cli)
    # Datos con los que cada capacidad tenga algo que medir.
    await adm.execute(
        "INSERT INTO os_tasks (workspace_id, project_id, client_id, title, status, "
        "due_date) VALUES ($1,$2,$3,'Tarea vencida','pending', now() - interval '5 days')",
        ident, proy, cli)
    await adm.execute(
        "INSERT INTO os_deliverables (workspace_id, client_id, project_id, title, "
        "type, status, delivered_at) VALUES ($1,$2,$3,'Entregable','json','published',"
        "now() - interval '20 days')", ident, cli, proy)
    await adm.execute(
        "INSERT INTO os_cashflow (workspace_id, user_id, direction, amount, "
        "flow_date) VALUES ($1,$2,'in',1000, now())", ident, str(uid))
    await adm.execute(
        "INSERT INTO os_cashflow (workspace_id, user_id, direction, amount, "
        "flow_date) VALUES ($1,$2,'out',400, now())", ident, str(uid))
    await adm.execute(
        "INSERT INTO os_expenses (workspace_id, user_id, title, amount, "
        "expense_date) VALUES ($1,$2,'Gasto viejo',250, now() - interval '90 days')",
        ident, str(uid))
    await adm.execute(
        "INSERT INTO os_deals (workspace_id, user_id, title, status, "
        "estimated_value) VALUES ($1,$2,'Oportunidad','open',5000)", ident, str(uid))

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    from core.autopilot_ciclo import nacer_autopilot
    async with maker() as s:
        await nacer_autopilot(s, ident)
        await s.commit()

    try:
        yield {"id": int(ident), "uid": uid, "adm": adm, "maker": maker,
               "cliente": cli, "proyecto": proy}
    finally:
        for t in ("autopilot_jobs", "autopilot_workspace_capabilities",
                  "autopilot_workspace_settings", "os_deliverables", "os_tasks",
                  "os_cashflow", "os_expenses", "os_deals", "os_projects",
                  "os_clients", "subscriptions", "workspace_members"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id=$1", ident)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ident)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.close()
        await motor.dispose()


async def _ciclo(ws, capacidad, periodo=None):
    """Planifica y ejecuta UNA capacidad. Devuelve la fila final."""
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    periodo = periodo or ("CERT-" + secrets.token_hex(3))
    async with ws["maker"]() as s:
        job = await planificar(s, ws["id"], capacidad, periodo)
        await s.commit()
    if job is None:
        return None, None
    async with ws["maker"]() as s:
        salida = await ejecutar_uno(s, trabajador="cert14")
    fila = await ws["adm"].fetchrow(
        "SELECT estado, resultado, validacion, evidencia, ultimo_error "
        "FROM autopilot_jobs WHERE id=$1", job)
    return salida, fila


# ═══════════════════════════════════════════════════════════════════════════
# 1. Las 15 capacidades estan conectadas
# ═══════════════════════════════════════════════════════════════════════════


async def test_la_certificacion_corre_con_el_rol_de_produccion():
    """Guard de la propia certificacion.

    Si esto se salta, todo lo demas mide un sistema que no existe: uno donde
    Autopilot tiene los privilegios de la aplicacion. Ya paso una vez.
    """
    if not DSN_JOBS:
        pytest.skip("sin NELVYON_PG_CERT_JOBS_DSN")
    import asyncpg
    c = await asyncpg.connect(DSN_JOBS.replace("postgresql+asyncpg://", "postgresql://"))
    try:
        assert await c.fetchval("SELECT current_user") == "nelvyon_jobs"
    finally:
        await c.close()


async def test_el_rol_de_autopilot_no_puede_tocar_lo_que_no_debe():
    """Minimo privilegio comprobado ejecutando, no leyendo el GRANT.

    El unico handler que escribe toca `os_tasks.metadata`. Se comprueba que el
    rol NO puede escribir ninguna otra columna ni borrar ninguna fila, porque un
    limite que depende de que nadie se equivoque revisando codigo no es un
    limite.
    """
    if not DSN_JOBS:
        pytest.skip("sin NELVYON_PG_CERT_JOBS_DSN")
    import asyncpg
    c = await asyncpg.connect(DSN_JOBS.replace("postgresql+asyncpg://", "postgresql://"))
    try:
        for sql in (
            "UPDATE os_tasks SET status = 'completed' WHERE id IS NOT NULL",
            "UPDATE os_tasks SET due_date = now() WHERE id IS NOT NULL",
            "DELETE FROM os_tasks WHERE id IS NOT NULL",
            "INSERT INTO os_tasks (workspace_id, title, status) VALUES (1,'x','pending')",
            "DELETE FROM os_clients WHERE id IS NOT NULL",
            "UPDATE os_deals SET estimated_value = 0 WHERE id IS NOT NULL",
        ):
            with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                await c.execute(sql)
    finally:
        await c.close()


async def test_las_quince_capacidades_tienen_ejecutor():
    """Una capacidad en el catalogo sin ejecutor conectado escalaria trabajo
    perfectamente sano. Este guard lo detecta antes."""
    from core.autopilot_ciclo import asegurar_capacidades, capacidades_conectadas

    asegurar_capacidades()
    conectadas = set(capacidades_conectadas())
    faltan = set(AUTOMATICAS + CON_APROBACION) - conectadas
    assert not faltan, f"capacidades sin ejecutor: {sorted(faltan)}"


async def test_el_catalogo_coincide_con_lo_conectado(ws):
    """Control inverso: nada conectado que no este en el catalogo."""
    from core.autopilot_ciclo import asegurar_capacidades, capacidades_conectadas

    asegurar_capacidades()
    en_base = {f["clave"] for f in await ws["adm"].fetch(
        "SELECT clave FROM autopilot_capabilities")}
    huerfanas = set(capacidades_conectadas()) - en_base
    assert not huerfanas, f"ejecutores sin capacidad en catalogo: {sorted(huerfanas)}"


# ═══════════════════════════════════════════════════════════════════════════
# 2. E2E por capacidad automatica
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("capacidad", AUTOMATICAS)
async def test_cada_capacidad_automatica_completa_el_ciclo(ws, capacidad):
    """EL E2E. Sin peticion HTTP: planner, executor, validador, evidencia."""
    salida, fila = await _ciclo(ws, capacidad)
    assert salida is not None, "el trabajo no se planifico"
    assert salida["resultado"] == "confirmado", (
        f"{capacidad} no llego a confirmado: {salida} / {fila['ultimo_error']}")
    assert fila["estado"] == "confirmed"
    assert fila["evidencia"] is not None, "entregado sin evidencia"
    assert fila["validacion"] is not None, "entregado sin validar"

    res = json.loads(fila["resultado"])
    assert res["workspace_id"] == ws["id"], (
        f"{capacidad} devolvio datos de otro workspace")


# ═══════════════════════════════════════════════════════════════════════════
# 3. La clasificacion de riesgo no es decorativa
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("capacidad", CON_APROBACION)
async def test_lo_que_publica_nunca_lo_ejecuta_el_executor(ws, capacidad):
    """LA FRONTERA.

    Publicar una tienda o un sitio no se deshace, y lanzar una ejecucion autonoma
    consume credito. Estas capacidades quedan en `awaiting_approval` al
    planificarse y el executor NO las recoge: solo toma `scheduled`.
    """
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    async with ws["maker"]() as s:
        job = await planificar(s, ws["id"], capacidad, "CERT-" + secrets.token_hex(3))
        await s.commit()
    assert job is not None

    estado = await ws["adm"].fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job)
    assert estado == "awaiting_approval", (
        f"{capacidad} quedo en '{estado}' en vez de esperar aprobacion")

    async with ws["maker"]() as s:
        salida = await ejecutar_uno(s, trabajador="cert14")
    quedo = await ws["adm"].fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job)
    assert quedo == "awaiting_approval", (
        f"el executor toco un trabajo que esperaba aprobacion: {salida}")


async def test_ninguna_capacidad_irreversible_es_automatica(ws):
    """El CHECK de la base ya lo impide; esto comprueba que nadie lo ha rodeado."""
    malas = await ws["adm"].fetch(
        "SELECT clave FROM autopilot_capabilities "
        "WHERE NOT reversible AND modo_ejecucion LIKE 'AUTOMATIC%'")
    assert not malas, f"irreversibles marcadas automaticas: {[m['clave'] for m in malas]}"


async def test_toda_capacidad_con_limites_los_declara(ws):
    """Fail-closed: una accion automatica sin tope es una accion sin frontera."""
    sin = await ws["adm"].fetch(
        "SELECT clave FROM autopilot_capabilities "
        "WHERE modo_ejecucion = 'AUTOMATIC_WITH_LIMITS' AND limites = '{}'::jsonb")
    assert not sin, f"sin limites declarados: {[s['clave'] for s in sin]}"


# ═══════════════════════════════════════════════════════════════════════════
# 4. Los limites se respetan de verdad
# ═══════════════════════════════════════════════════════════════════════════


async def test_la_capacidad_con_limites_no_escribe_de_mas(ws):
    """Se crean mas tareas vencidas que el tope y se comprueba que para."""
    adm = ws["adm"]
    await adm.execute(
        "UPDATE autopilot_capabilities "
        "SET limites = '{\"max_filas_por_ejecucion\": 3, \"antiguedad_min_dias\": 1}'::jsonb "
        "WHERE clave = 'os_tasks_rest.marcar_vencidas'")
    try:
        for i in range(8):
            await adm.execute(
                "INSERT INTO os_tasks (workspace_id, project_id, client_id, title, "
                "status, due_date) VALUES ($1,$2,$3,$4,'pending', now() - interval '9 days')",
                ws["id"], ws["proyecto"], ws["cliente"], f"vencida {i}")

        salida, fila = await _ciclo(ws, "os_tasks_rest.marcar_vencidas")
        assert salida["resultado"] == "confirmado", fila["ultimo_error"]
        res = json.loads(fila["resultado"])
        assert res["marcadas"] <= 3, f"escribio {res['marcadas']} con tope 3"

        marcadas = await adm.fetchval(
            "SELECT count(*) FROM os_tasks WHERE workspace_id=$1 "
            "AND metadata->>'autopilot_vencida' = 'true'", ws["id"])
        assert marcadas <= 3, f"{marcadas} filas marcadas con tope 3"
    finally:
        await adm.execute(
            "UPDATE autopilot_capabilities SET limites = "
            "'{\"max_filas_por_ejecucion\": 200, \"antiguedad_min_dias\": 1}'::jsonb "
            "WHERE clave = 'os_tasks_rest.marcar_vencidas'")


async def test_sin_limites_declarados_no_escribe_nada(ws):
    """Fail-closed comprobado ejecutando, no leyendo el codigo."""
    adm = ws["adm"]
    await adm.execute(
        "ALTER TABLE autopilot_capabilities DROP CONSTRAINT ck_autopilot_limites_declarados")
    await adm.execute(
        "UPDATE autopilot_capabilities SET limites = '{}'::jsonb "
        "WHERE clave = 'os_tasks_rest.marcar_vencidas'")
    try:
        for i in range(3):
            await adm.execute(
                "INSERT INTO os_tasks (workspace_id, project_id, client_id, title, "
                "status, due_date) VALUES ($1,$2,$3,$4,'pending', now() - interval '9 days')",
                ws["id"], ws["proyecto"], ws["cliente"], f"sinlimite {i}")

        salida, fila = await _ciclo(ws, "os_tasks_rest.marcar_vencidas")
        res = json.loads(fila["resultado"])
        assert res["marcadas"] == 0, "escribio sin limites declarados"
        assert res.get("omitido"), "no dejo constancia de por que no actuo"
    finally:
        await adm.execute(
            "UPDATE autopilot_capabilities SET limites = "
            "'{\"max_filas_por_ejecucion\": 200, \"antiguedad_min_dias\": 1}'::jsonb "
            "WHERE clave = 'os_tasks_rest.marcar_vencidas'")
        await adm.execute(
            "ALTER TABLE autopilot_capabilities ADD CONSTRAINT "
            "ck_autopilot_limites_declarados CHECK ("
            "modo_ejecucion <> 'AUTOMATIC_WITH_LIMITS' OR limites <> '{}'::jsonb)")


# ═══════════════════════════════════════════════════════════════════════════
# 5. Aislamiento y anomalias
# ═══════════════════════════════════════════════════════════════════════════


async def test_ninguna_capacidad_mira_otro_workspace(ws):
    """A↔B. Se crea un vecino con MUCHOS datos y se comprueba que no aparecen."""
    adm = ws["adm"]
    marca = secrets.token_hex(4)
    otro_uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Vecino') RETURNING user_id", f"vecino-{marca}@nelvyon.test")
    otro_ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id", str(otro_uid), f"vec-{marca}")
    try:
        otro_cli = await adm.fetchval(
            "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, "
            "status, metadata) VALUES ($1,$2,'Vecino','active','{}'::jsonb) RETURNING id",
            otro_ws, str(otro_uid))
        for i in range(30):
            await adm.execute(
                "INSERT INTO os_deals (workspace_id, user_id, title, status, "
                "estimated_value) VALUES ($1,$2,$3,'open',99999)",
                otro_ws, str(otro_uid), f"vecino {i}")
            await adm.execute(
                "INSERT INTO os_expenses (workspace_id, user_id, title, amount, "
                "expense_date) VALUES ($1,$2,$3,777, now())",
                otro_ws, str(otro_uid), f"gasto vecino {i}")

        _, fila = await _ciclo(ws, "os_deals.pipeline_semanal")
        res = json.loads(fila["resultado"])
        assert res["total"] == 1, f"el pipeline incluye datos del vecino: {res}"

        _, fila = await _ciclo(ws, "os_expenses.resumen_mensual")
        res = json.loads(fila["resultado"])
        assert res["total"] == 1, f"los gastos incluyen los del vecino: {res}"
    finally:
        for t in ("os_deals", "os_expenses", "os_clients"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id=$1", otro_ws)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", otro_ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", otro_uid)


async def test_un_resultado_invalido_no_se_entrega(ws, monkeypatch):
    """Validador independiente: si dice que no, no hay entrega ni evidencia."""
    import core.autopilot_ciclo as ciclo
    from core.autopilot_ciclo import asegurar_capacidades

    asegurar_capacidades()
    cap = "os_cashflow.resumen_mensual"
    handler, _ = ciclo._REGISTRO[cap]
    monkeypatch.setitem(ciclo._REGISTRO, cap,
                        (handler, lambda r: {"valido": False, "fallos": ["forzado"]}))

    salida, fila = await _ciclo(ws, cap)
    assert salida["resultado"] == "invalido", salida
    assert fila["estado"] != "delivered"
    assert fila["evidencia"] is None, "dejo evidencia de algo que no entrego"


async def test_dos_workers_concurrentes_reparten_capacidades(ws):
    """Concurrencia sobre capacidades distintas: cada worker se lleva una."""
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    async with ws["maker"]() as s:
        for cap in ("os_clients.cartera_semanal", "os_projects.estado_semanal"):
            await planificar(s, ws["id"], cap, "CERT-conc-" + secrets.token_hex(3))
        await s.commit()

    async def _ejec(nombre):
        async with ws["maker"]() as s:
            r = await ejecutar_uno(s, trabajador=nombre)
            return r["id"] if r else None

    a, b = await asyncio.gather(_ejec("w-a"), _ejec("w-b"))
    assert a and b and a != b, f"los dos workers tomaron el mismo trabajo: {a}, {b}"


async def test_un_handler_que_falla_reintenta_y_luego_escala(ws, monkeypatch):
    """Fallo provocado: backoff mientras quedan intentos, escalado al agotarlos."""
    import core.autopilot_ciclo as ciclo
    from core.autopilot import planificar
    from core.autopilot_ciclo import asegurar_capacidades, ejecutar_uno

    asegurar_capacidades()
    cap = "os_tasks.carga_semanal"

    async def _revienta(sesion, job):
        raise RuntimeError("fallo provocado")

    _, validador = ciclo._REGISTRO[cap]
    monkeypatch.setitem(ciclo._REGISTRO, cap, (_revienta, validador))

    periodo = "CERT-fallo-" + secrets.token_hex(3)
    async with ws["maker"]() as s:
        job = await planificar(s, ws["id"], cap, periodo)
        await s.commit()

    async with ws["maker"]() as s:
        r = await ejecutar_uno(s, trabajador="cert14")
    assert r["resultado"] == "fallo_ejecucion", r
    estado = await ws["adm"].fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job)
    assert estado == "scheduled", f"tras el primer fallo quedo en '{estado}'"

    # Se agotan los intentos: el trabajo escala en vez de dar vueltas.
    await ws["adm"].execute(
        "UPDATE autopilot_jobs SET intentos = 99, proximo_intento = NULL, "
        "locked_until = NULL WHERE id=$1", job)
    async with ws["maker"]() as s:
        await ejecutar_uno(s, trabajador="cert14")
    estado = await ws["adm"].fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job)
    assert estado == "escalated", f"con los intentos agotados quedo en '{estado}'"


# ═══════════════════════════════════════════════════════════════════════════
# 6. El planner solo, sin que nadie le diga que capacidad tocar
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_planner_solo_pone_a_trabajar_los_servicios_seguros(ws):
    """Nadie nombra una capacidad aqui.

    Se llama al planner tal cual corre en produccion y se comprueba que del
    catalogo salen trabajos para los servicios seguros y NINGUNO para los que
    publican. Es la diferencia entre «el ciclo funciona si lo empujo» y «el ciclo
    se alimenta solo».
    """
    from core.autopilot_ciclo import planear

    async with ws["maker"]() as s:
        creados = len((await planear(s))["creados"])
        await s.commit()
    assert creados > 0, "el planner no programo nada con Autopilot encendido"

    filas = await ws["adm"].fetch(
        "SELECT j.capacidad, j.estado, c.modo_ejecucion "
        "FROM autopilot_jobs j JOIN autopilot_capabilities c ON c.clave = j.capacidad "
        "WHERE j.workspace_id = $1", ws["id"])
    assert filas, "no hay trabajos para este workspace"

    publicados = [f["capacidad"] for f in filas if f["modo_ejecucion"] == "HUMAN_APPROVAL"]
    assert not publicados, f"el planner programo solo capacidades que publican: {publicados}"

    for f in filas:
        assert f["estado"] == "scheduled", (
            f"{f['capacidad']} nacio en '{f['estado']}'")


async def test_repetir_el_planner_no_duplica_trabajo(ws):
    """Idempotencia del ciclo entero: el bucle corre cada 15 minutos."""
    from core.autopilot_ciclo import planear

    async with ws["maker"]() as s:
        await planear(s)
        await s.commit()
    antes = await ws["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1", ws["id"])

    for _ in range(3):
        async with ws["maker"]() as s:
            await planear(s)
            await s.commit()

    despues = await ws["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1", ws["id"])
    assert despues == antes, f"tres pasadas mas crearon {despues - antes} duplicados"


async def test_el_executor_vacia_lo_que_el_planner_programo(ws):
    """De cola llena a cola vacia sin intervencion, con todo confirmado."""
    from core.autopilot_ciclo import ejecutar_uno, planear

    async with ws["maker"]() as s:
        await planear(s)
        await s.commit()

    for _ in range(40):
        async with ws["maker"]() as s:
            if await ejecutar_uno(s, trabajador="cert14") is None:
                break

    resumen = await ws["adm"].fetch(
        "SELECT estado, count(*) AS n FROM autopilot_jobs "
        "WHERE workspace_id=$1 GROUP BY estado", ws["id"])
    por_estado = {f["estado"]: int(f["n"]) for f in resumen}
    assert por_estado.get("confirmed", 0) > 0, f"nada confirmado: {por_estado}"
    assert not (set(por_estado) - {"confirmed"}), (
        f"quedaron trabajos sin cerrar: {por_estado}")

    sin_evidencia = await ws["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1 "
        "AND estado='confirmed' AND evidencia IS NULL", ws["id"])
    assert sin_evidencia == 0, f"{sin_evidencia} confirmados sin evidencia"

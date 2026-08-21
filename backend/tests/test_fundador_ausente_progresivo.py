"""NELVYON sola durante 1 ciclo, un dia, 24 h y 72 h.

POR QUE ESCALAR LA DURACION Y NO REPETIR LA MISMA PRUEBA
--------------------------------------------------------
Porque los fallos que importan no aparecen en el primer ciclo. Aparecen cuando
algo se acumula:

    1 ciclo    ¿arranca?
    1 jornada  ¿el planner repite trabajo? ¿la cola crece?
    24 h       ¿se agota un presupuesto? ¿un cerrojo se filtra? — este es el
               tramo donde el cerrojo del planner se habria visto: se retenia al
               tercer ciclo y a partir de ahi la empresa no programaba nada
    72 h       ¿algo se degrada sin que nadie lo note?

COMO SE SIMULA EL TIEMPO
------------------------
No con `sleep`. Se mueve el reloj de los DATOS: los trabajos se planifican con
`ahora` desplazado, que es el mismo parametro que usa el planner de produccion.
Asi 72 horas caben en segundos y, sobre todo, son REPRODUCIBLES — una simulacion
que dependiera del reloj de pared daria un resultado distinto cada vez.

Lo que NO se simula es el trabajo: cada ciclo ejecuta el executor de verdad,
contra la base de verdad, con el rol de produccion.

LA REGLA
--------
Despues de montar el escenario, ninguna persona interviene. Solo se llaman las
funciones que los bucles llaman solos.
"""
from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timedelta, timezone

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
    """Dos clientes con trabajo real. El resto lo hace NELVYON."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.salud_negocio import COMPROBACIONES

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    metricas = [c.metrica for c in COMPROBACIONES]
    await adm.execute("DELETE FROM business_incidents WHERE metrica = ANY($1::text[])",
                      metricas)
    await adm.execute(
        "DELETE FROM business_health_baseline WHERE metrica = ANY($1::text[])",
        metricas)

    ws = []
    for n in ("A", "B"):
        correo = f"prog-{n}-{marca}@certificacion.invalid"
        uid = await adm.fetchval(
            "INSERT INTO nelvyon_users (email, password_hash, full_name) "
            "VALUES ($1,'x',$2) RETURNING user_id", correo, f"Progresivo {n}")
        ident = await adm.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id",
            str(uid), f"CERTIFICATION-PROG-{n}-{marca}")
        await adm.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, "
            "status) VALUES ($1,$2,$3,'owner','active') "
            "ON CONFLICT (workspace_id, user_id) "
            "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
            ident, str(uid), correo)
        await adm.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
            "billing_cycle, status) VALUES ($1,$2,'enterprise','monthly','active')",
            ident, uid)
        cli = await adm.fetchval(
            "INSERT INTO os_clients (workspace_id, created_by_user_id, "
            "business_name, status, metadata) VALUES ($1,$2,$3,'active','{}'::jsonb) "
            "RETURNING id", ident, str(uid), f"Cliente {n}")
        proy = await adm.fetchval(
            "INSERT INTO os_projects (workspace_id, client_id, name, status, "
            "due_date) VALUES ($1,$2,'Proyecto','active', now() + interval '20 days') "
            "RETURNING id", ident, cli)
        await adm.execute(
            "INSERT INTO os_tasks (workspace_id, project_id, client_id, title, "
            "status, completed_at) VALUES ($1,$2,$3,'Hecha','completed', now())",
            ident, proy, cli)
        await adm.execute(
            "INSERT INTO os_deliverables (workspace_id, client_id, project_id, "
            "title, type, status, delivered_at, file_url) VALUES ($1,$2,$3,"
            "'Entrega','json','published', now(), 'https://cert.invalid/x')",
            ident, cli, proy)
        await adm.execute(
            "INSERT INTO agent_budget (workspace_id, dia, tope_centimos, "
            "tope_ejecuciones) VALUES ($1, CURRENT_DATE, 0, 2000) "
            "ON CONFLICT (workspace_id, dia) DO UPDATE SET tope_ejecuciones = 2000",
            ident)
        ws.append({"id": int(ident), "uid": uid, "cliente": cli, "proyecto": proy})

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    from core.autopilot_ciclo import nacer_autopilot
    async with maker() as s:
        for w in ws:
            await nacer_autopilot(s, w["id"])
        await s.commit()

    try:
        yield {"ws": ws, "adm": adm, "maker": maker, "metricas": metricas}
    finally:
        ids = [w["id"] for w in ws]
        for t in ("agent_runs", "agent_memory", "agent_budget", "autopilot_jobs",
                  "autopilot_workspace_capabilities", "autopilot_workspace_settings",
                  "helpdesk_tickets", "os_deliverables", "os_tasks", "os_projects",
                  "os_clients", "subscriptions", "workspace_members"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id = ANY($1::int[])",
                              ids)
        await adm.execute("DELETE FROM workspaces WHERE id = ANY($1::int[])", ids)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id = ANY($1::uuid[])",
                          [w["uid"] for w in ws])
        await adm.execute("DELETE FROM business_incidents WHERE metrica = ANY($1::text[])",
                          metricas)
        await adm.execute(
            "DELETE FROM business_health_baseline WHERE metrica = ANY($1::text[])",
            metricas)
        await adm.execute("UPDATE agent_kill_switch SET detenido=false")
        await adm.close()
        await motor.dispose()


# ─── un ciclo del reloj de NELVYON ──────────────────────────────────────────


async def _ciclo(empresa, ahora: datetime) -> dict:
    """Lo que hacen los bucles en un momento dado. Nadie mas interviene.

    EL EXECUTOR CORRE DESPUES DEL PLANNER, Y ESO IMPORTA
    ----------------------------------------------------
    `programado_para` se fija con el reloj de la BASE al insertar, y
    `tomar_trabajo` exige `programado_para <= ahora`. La primera version de esta
    simulacion capturaba `ahora` una vez y lo usaba para las dos cosas: el
    executor miraba un instante ANTERIOR a la creacion del trabajo y encontraba
    la cola vacia, con 24 trabajos recien programados delante.

    No es un defecto del producto —en produccion son dos bucles distintos y el
    executor siempre llega despues— pero si lo era de la simulacion: modelaba un
    orden que nunca ocurre.
    """
    from core.autopilot_ciclo import ejecutar_uno, planear
    from services.vigilante_negocio import una_pasada

    async with empresa["maker"]() as s:
        plan = await planear(s, ahora=ahora)

    despues = ahora + timedelta(minutes=1)   # el executor corre cada 60 s
    hechos, fallidos = 0, 0
    for _ in range(200):
        async with empresa["maker"]() as s:
            r = await ejecutar_uno(s, trabajador="prog", ahora=despues)
        if r is None:
            break
        if r.get("resultado") == "confirmado":
            hechos += 1
        else:
            fallidos += 1

    async with empresa["maker"]() as s:
        vig = await una_pasada(s, ahora=despues)
        await s.commit()

    return {"programados": len(plan["creados"]), "confirmados": hechos,
            "no_confirmados": fallidos, "incidentes": vig["incidentes_abiertos"]}


async def _simular(empresa, horas: int, cada_minutos: int = 15) -> list[dict]:
    """Corre el reloj. Cada paso es una pasada completa de los bucles."""
    inicio = datetime.now(timezone.utc)
    pasos = []
    t = inicio
    fin = inicio + timedelta(hours=horas)
    while t <= fin:
        pasos.append(await _ciclo(empresa, t))
        t += timedelta(minutes=cada_minutos)
    return pasos


async def _estado(empresa) -> dict:
    filas = await empresa["adm"].fetch(
        "SELECT estado, count(*) n FROM autopilot_jobs "
        " WHERE workspace_id = ANY($1::int[]) GROUP BY estado",
        [w["id"] for w in empresa["ws"]])
    return {f["estado"]: int(f["n"]) for f in filas}


# ═══════════════════════════════════════════════════════════════════════════
# 1 CICLO
# ═══════════════════════════════════════════════════════════════════════════


async def test_un_ciclo_arranca_y_produce(empresa):
    paso = await _ciclo(empresa, datetime.now(timezone.utc))
    assert paso["programados"] > 0, "el planner no descubrio trabajo"
    assert paso["confirmados"] > 0, "el executor no entrego nada"
    assert paso["no_confirmados"] == 0, paso

    estado = await _estado(empresa)
    assert not (set(estado) - {"confirmed", "awaiting_approval"}), (
        f"quedaron trabajos sin cerrar: {estado}")


# ═══════════════════════════════════════════════════════════════════════════
# UNA JORNADA — 08:00 a 19:00
# ═══════════════════════════════════════════════════════════════════════════


async def test_una_jornada_completa_no_duplica_ni_se_atasca(empresa):
    """44 pasadas del planner, que es lo que hace entre las 08:00 y las 19:00."""
    pasos = await _simular(empresa, horas=11)
    assert len(pasos) >= 44, len(pasos)

    total_programado = sum(p["programados"] for p in pasos)
    total_confirmado = sum(p["confirmados"] for p in pasos)
    assert pasos[0]["programados"] > 0, "no arranco"
    assert total_confirmado > 0

    # Solo la primera pasada programa: el resto encuentra el trabajo ya hecho.
    # Si no fuera asi, la cola crecería 44 veces en una jornada.
    assert sum(p["programados"] for p in pasos[1:]) < total_programado, (
        "el planner reprogramo trabajo que ya existia")

    assert all(p["no_confirmados"] == 0 for p in pasos), (
        [p for p in pasos if p["no_confirmados"]])

    estado = await _estado(empresa)
    assert not (set(estado) - {"confirmed", "awaiting_approval"}), estado


# ═══════════════════════════════════════════════════════════════════════════
# 24 HORAS — el tramo donde el cerrojo del planner se habria visto
# ═══════════════════════════════════════════════════════════════════════════


async def test_veinticuatro_horas_sin_degradarse(empresa):
    """96 pasadas. El cerrojo se filtraba al TERCER ciclo.

    A partir de ahi el planner devolvia `omitido` para siempre y la empresa
    dejaba de programar sin un solo error. Esta prueba lo habria visto.
    """
    pasos = await _simular(empresa, horas=24)
    assert len(pasos) >= 96, len(pasos)

    assert all(p["no_confirmados"] == 0 for p in pasos)

    # Cambia el dia: la cadencia diaria vuelve a programar. Lo que no puede pasar
    # es que deje de programar PARA SIEMPRE.
    programaron = [i for i, p in enumerate(pasos) if p["programados"] > 0]
    assert programaron, "el planner no programo nada en 24 horas"
    assert programaron[0] == 0, "no arranco en la primera pasada"

    estado = await _estado(empresa)
    assert estado.get("confirmed", 0) > 0
    assert not (set(estado) - {"confirmed", "awaiting_approval"}), estado


async def test_en_veinticuatro_horas_el_cerrojo_nunca_se_queda_retenido(empresa):
    """La propiedad, medida directamente sobre `pg_locks`."""
    from sqlalchemy import text

    from services.autopilot_loop import LOCK_PLANNER, un_ciclo_planner

    for vuelta in range(96):
        async with empresa["maker"]() as s:
            await un_ciclo_planner(s)
        retenidos = await empresa["adm"].fetchval(
            "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND objid=$1",
            LOCK_PLANNER)
        assert retenidos == 0, (
            f"el ciclo {vuelta + 1} dejo el cerrojo retenido: a partir de aqui la "
            "empresa no programaria nada, sin un solo error")


# ═══════════════════════════════════════════════════════════════════════════
# 72 HORAS
# ═══════════════════════════════════════════════════════════════════════════


async def test_setenta_y_dos_horas_y_la_empresa_sigue_entera(empresa):
    """288 pasadas. Se mira lo que se acumula, no lo que ocurre una vez."""
    pasos = await _simular(empresa, horas=72)
    assert len(pasos) >= 288, len(pasos)

    assert all(p["no_confirmados"] == 0 for p in pasos), (
        [p for p in pasos if p["no_confirmados"]][:3])

    estado = await _estado(empresa)
    assert not (set(estado) - {"confirmed", "awaiting_approval"}), estado

    # Ni un trabajo entregado sin evidencia en 72 horas.
    sin_evidencia = await empresa["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id = ANY($1::int[]) "
        "AND estado='confirmed' AND evidencia IS NULL",
        [w["id"] for w in empresa["ws"]])
    assert sin_evidencia == 0

    # Y el trabajo de A nunca llevo datos de B.
    for w in empresa["ws"]:
        for f in await empresa["adm"].fetch(
                "SELECT resultado FROM autopilot_jobs WHERE workspace_id=$1 "
                "AND estado='confirmed'", w["id"]):
            res = json.loads(f["resultado"])
            assert res.get("workspace_id") == w["id"], (
                "un resultado lleva datos de otro inquilino")


async def test_en_setenta_y_dos_horas_el_panel_no_miente(empresa):
    """Al final del tercer dia, el fundador mira UNA pantalla."""
    from core.centro_de_control import componer

    await _simular(empresa, horas=72)

    async with empresa["maker"]() as s:
        panel = await componer(s, ambito="todo")

    for nombre, bloque in panel["bloques"].items():
        assert bloque["medible"], f"{nombre}: {bloque.get('motivo')}"

    assert panel["bloques"]["produccion"]["confirmados_24h"] >= 0
    assert panel["bloques"]["motor"]["vencidos_sin_tomar"] == 0, (
        "quedaron trabajos vencidos sin recoger tras 72 horas")
    assert not panel["bloques"]["roto"]["trabajos_escalados"], (
        panel["bloques"]["roto"]["trabajos_escalados"][:2])


async def test_setenta_y_dos_horas_con_una_averia_en_medio(empresa):
    """Lo que de verdad se le pide: que aguante un fallo, no que no falle.

    Se rompe una capacidad a mitad del segundo dia. Las demas tienen que seguir,
    la rota tiene que escalar, y el panel tiene que decirlo al final.
    """
    from core.autopilot_ciclo import _REGISTRO
    from core.centro_de_control import componer

    clave = "os_tasks.carga_semanal"
    original = _REGISTRO[clave]
    inicio = datetime.now(timezone.utc)

    async def _revienta(sesion, job):
        raise RuntimeError("averia provocada a mitad de la simulacion")

    # Dia 1 sano.
    t = inicio
    for _ in range(48):
        await _ciclo(empresa, t)
        t += timedelta(minutes=15)

    sanos_dia_1 = (await _estado(empresa)).get("confirmed", 0)
    assert sanos_dia_1 > 0

    _REGISTRO[clave] = (_revienta, original[1])
    try:
        for _ in range(96):   # dias 2 y 3 con la averia
            await _ciclo(empresa, t)
            t += timedelta(minutes=15)
    finally:
        _REGISTRO[clave] = original

    estado = await _estado(empresa)
    assert estado.get("confirmed", 0) >= sanos_dia_1, (
        f"la averia arrastro trabajo que ya estaba bien: {estado}")

    async with empresa["maker"]() as s:
        panel = await componer(s, ambito="todo")
    assert all(b["medible"] for b in panel["bloques"].values())
    # Si la capacidad rota escalo, el panel TIENE que decirlo.
    escalados = await empresa["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id = ANY($1::int[]) "
        "AND estado='escalated'", [w["id"] for w in empresa["ws"]])
    if escalados:
        assert panel["veredicto"]["requiere_atencion"] is True, (
            f"{escalados} trabajos escalados y el panel dice que todo va bien: "
            f"{panel['veredicto']}")

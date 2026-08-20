"""El ciclo completo de Autopilot, sin una sola peticion HTTP manual.

QUE DEMUESTRA
-------------
    workspace CERTIFICATION -> owner -> plan -> autopilot con defaults seguros
    -> planner programa SIN que nadie llame a nada
    -> scheduler lo toma -> executor llama al servicio OS
    -> valida -> entrega con evidencia verificable -> confirmado

Y despues las nueve anomalias que un sistema desatendido va a encontrar de verdad:
dos planners a la vez, dos workers, worker muerto, resultado invalido, capacidad
no contratada, Autopilot apagado, workspace ajeno y reinicio.

LO QUE NO SE USA COMO PRUEBA
----------------------------
Ni los 5050 entregables historicos, ni datos `synthetic`, ni fixtures. Cada
ejecucion de esta bateria crea su propio workspace CERTIFICATION y lo borra al
terminar. Lo que se mide es trabajo generado AHORA por la maquina.
"""
from __future__ import annotations

import asyncio
import os
import secrets

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")
CAP = "os_deliverables.snapshot_semanal"

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    return _dsn().replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")


@pytest.fixture
async def ws():
    """Un workspace CERTIFICATION completo, borrado al terminar."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.autopilot_ciclo import nacer_autopilot

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    correo = f"e2e-autopilot-{marca}@nelvyon.test"
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','E2E Autopilot') RETURNING user_id", correo)
    ident = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(uid), f"CERTIFICATION-e2e-{marca}")
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active') "
        "ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        ident, str(uid), correo)

    # `os_deliverables` exige cliente y proyecto: se crean con el workspace.
    cli = await adm.fetchval(
        "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, "
        "status, metadata) VALUES ($1,$2,'Cliente E2E','active','{}'::jsonb) "
        "RETURNING id", ident, str(uid))
    proy = await adm.fetchval(
        "INSERT INTO os_projects (workspace_id, client_id, name, status) "
        "VALUES ($1,$2,'Proyecto E2E','active') RETURNING id", ident, cli)

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)

    # PROVISIONING: Autopilot nace aqui, no lo configura nadie a mano.
    async with maker() as s:
        nacido = await nacer_autopilot(s, ident)
        await s.commit()

    try:
        yield {"id": int(ident), "uid": uid, "maker": maker, "adm": adm,
               "nacido": nacido, "cliente": cli, "proyecto": proy}
    finally:
        for t in ("autopilot_jobs", "autopilot_workspace_capabilities",
                  "autopilot_workspace_settings", "os_deliverables",
                  "os_projects", "os_clients", "workspace_members"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id=$1", ident)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ident)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.close()
        await motor.dispose()


# ═══════════════════════════════════════════════════════════════════════════
# 1. El ciclo completo
# ═══════════════════════════════════════════════════════════════════════════


async def test_autopilot_nace_con_defaults_seguros(ws):
    """Solo se encienden capacidades reversibles y AUTOMATIC_SAFE."""
    assert CAP in ws["nacido"]["capacidades"], ws["nacido"]

    peligrosas = await ws["adm"].fetchval(
        "SELECT count(*) FROM autopilot_workspace_capabilities c "
        "JOIN autopilot_capabilities cap ON cap.clave = c.capacidad "
        "WHERE c.workspace_id = $1 AND c.habilitada "
        "AND (NOT cap.reversible OR cap.modo_ejecucion <> 'AUTOMATIC_SAFE')",
        ws["id"])
    assert peligrosas == 0, "se encendio sola una capacidad que no es segura"


async def test_el_ciclo_entero_sin_una_sola_peticion_manual(ws):
    """LA PRUEBA DECISIVA.

    Nadie llama a ningun endpoint. El planner descubre el trabajo, el executor lo
    ejecuta contra el servicio OS, valida y entrega con evidencia verificable.
    """
    from core.autopilot_ciclo import ejecutar_uno, planear

    adm, maker = ws["adm"], ws["maker"]

    # Trabajo REAL sobre el que producir: entregables de este workspace, creados
    # ahora. No se usa ni una fila de las historicas.
    for i in range(3):
        await adm.execute(
            "INSERT INTO os_deliverables (workspace_id, client_id, project_id, "
            "title, type, status, delivered_at) "
            "VALUES ($1,$2,$3,$4,'json','published', now())",
            ws["id"], ws["cliente"], ws["proyecto"], f"E2E entregable {i}")

    async with maker() as s:
        plan = await planear(s)
    assert ws["id"] in [
        (await adm.fetchval("SELECT workspace_id FROM autopilot_jobs WHERE id=$1", j))
        for j in plan["creados"]
    ], f"el planner no programo trabajo para este workspace: {plan}"

    async with maker() as s:
        salida = await ejecutar_uno(s, trabajador="e2e")
    assert salida is not None and salida["resultado"] == "confirmado", salida

    fila = await adm.fetchrow(
        "SELECT estado, resultado, validacion, evidencia FROM autopilot_jobs "
        "WHERE id=$1", salida["id"])
    assert fila["estado"] == "confirmed"
    assert fila["evidencia"] is not None, "entregado sin evidencia"
    assert fila["validacion"] is not None, "entregado sin validar"

    import json
    res = json.loads(fila["resultado"])
    assert res["total"] == 3, f"el servicio OS midio mal: {res}"


async def test_el_planner_no_repite_trabajo_del_mismo_periodo(ws):
    """Idempotencia por periodo: dos pasadas seguidas no duplican."""
    from core.autopilot_ciclo import planear

    async with ws["maker"]() as s:
        primero = await planear(s)
    async with ws["maker"]() as s:
        segundo = await planear(s)

    assert len(primero["creados"]) >= 1
    assert segundo["creados"] == [], f"la segunda pasada duplico: {segundo}"


# ═══════════════════════════════════════════════════════════════════════════
# 2. Las nueve anomalias
# ═══════════════════════════════════════════════════════════════════════════


async def test_dos_planners_concurrentes_no_duplican_trabajo(ws):
    """Dos replicas planificando a la vez producen UN trabajo por capacidad.

    La version original de esta prueba exigia `total == 1` porque en su momento
    solo habia una capacidad conectada. Con veintiuna, ese numero media cuantas
    capacidades hay, no si hubo duplicados — y habria seguido «pasando» mientras
    el catalogo no creciera. Lo que importa se mide directamente: que ninguna
    (capacidad, periodo) aparezca dos veces.
    """
    from core.autopilot_ciclo import planear

    async def _planear():
        async with ws["maker"]() as s:
            return await planear(s)

    a, b = await asyncio.gather(_planear(), _planear())
    creados = len(a["creados"]) + len(b["creados"])
    assert creados > 0, "ninguno de los dos planners programo nada"

    filas = await ws["adm"].fetch(
        "SELECT capacidad, idempotency_key FROM autopilot_jobs WHERE workspace_id=$1",
        ws["id"])
    assert len(filas) == creados, (
        f"se crearon {creados} trabajos y hay {len(filas)} filas")
    claves = [f["idempotency_key"] for f in filas]
    assert len(claves) == len(set(claves)), "hay claves de idempotencia repetidas"
    capacidades = [f["capacidad"] for f in filas]
    assert len(capacidades) == len(set(capacidades)), (
        f"una capacidad se programo dos veces en el mismo periodo: {capacidades}")


async def test_dos_workers_concurrentes_no_ejecutan_el_mismo(ws):
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    async with ws["maker"]() as s:
        for periodo in ("2026-W50", "2026-W51"):
            await planificar(s, ws["id"], CAP, periodo)
        await s.commit()

    async def _ejecutar(nombre):
        async with ws["maker"]() as s:
            r = await ejecutar_uno(s, trabajador=nombre)
            return r["id"] if r else None

    a, b = await asyncio.gather(_ejecutar("w-a"), _ejecutar("w-b"))
    assert a and b and a != b, f"los dos workers tomaron el mismo trabajo: {a}, {b}"


async def test_un_worker_muerto_deja_el_trabajo_retomable(ws):
    """REINICIO. El cerrojo caduca por tiempo, asi que otro lo retoma."""
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    adm = ws["adm"]
    async with ws["maker"]() as s:
        job = await planificar(s, ws["id"], CAP, "2026-W52")
        await s.commit()

    # El worker lo toma y muere sin terminar.
    await adm.execute(
        "UPDATE autopilot_jobs SET estado='running', locked_by='muerto', "
        "locked_until = now() + interval '15 minutes' WHERE id=$1", job)
    async with ws["maker"]() as s:
        assert await ejecutar_uno(s, trabajador="otro") is None, (
            "se tomo un trabajo con cerrojo vigente")

    # Pasa el tiempo: el cerrojo caduca.
    await adm.execute(
        "UPDATE autopilot_jobs SET estado='scheduled', "
        "locked_until = now() - interval '1 minute' WHERE id=$1", job)
    async with ws["maker"]() as s:
        r = await ejecutar_uno(s, trabajador="rescatador")
    assert r is not None and r["id"] == job, "el trabajo quedo inalcanzable"


async def test_un_resultado_invalido_no_se_entrega(ws, monkeypatch):
    """Nunca entregar en silencio algo que el sistema sabe que esta mal."""
    import core.autopilot_ciclo as ciclo
    from core.autopilot import planificar

    async with ws["maker"]() as s:
        job = await planificar(s, ws["id"], CAP, "2026-W53")
        await s.commit()

    handler, _ = ciclo._REGISTRO[CAP]
    monkeypatch.setitem(ciclo._REGISTRO, CAP,
                        (handler, lambda r: {"valido": False, "fallos": ["forzado"]}))

    async with ws["maker"]() as s:
        r = await ciclo.ejecutar_uno(s, trabajador="e2e")
    assert r["resultado"] == "invalido", r

    fila = await ws["adm"].fetchrow(
        "SELECT estado, evidencia FROM autopilot_jobs WHERE id=$1", job)
    assert fila["estado"] != "delivered"
    assert fila["evidencia"] is None, "se dejo evidencia de algo que no se entrego"


async def test_una_capacidad_no_contratada_no_se_programa(ws):
    """El plan manda: `starter` no alcanza una capacidad `enterprise`."""
    from core.autopilot_ciclo import planear

    adm = ws["adm"]
    await adm.execute(
        "INSERT INTO autopilot_capabilities (clave, servicio_os, descripcion, "
        "modo_ejecucion, reversible, plan_minimo, cadencia) "
        "VALUES ('e2e.solo_enterprise','os_x','solo enterprise',"
        "'AUTOMATIC_SAFE', true, 'enterprise', 'weekly') "
        "ON CONFLICT (clave) DO NOTHING")
    await adm.execute(
        "INSERT INTO autopilot_workspace_capabilities "
        "(workspace_id, capacidad, habilitada) VALUES ($1,'e2e.solo_enterprise',true) "
        "ON CONFLICT DO NOTHING", ws["id"])
    try:
        async with ws["maker"]() as s:
            await planear(s)
        n = await adm.fetchval(
            "SELECT count(*) FROM autopilot_jobs "
            "WHERE workspace_id=$1 AND capacidad='e2e.solo_enterprise'", ws["id"])
        assert n == 0, "se programo una capacidad que el plan no cubre"
    finally:
        await adm.execute("DELETE FROM autopilot_workspace_capabilities "
                          "WHERE capacidad='e2e.solo_enterprise'")
        await adm.execute("DELETE FROM autopilot_capabilities "
                          "WHERE clave='e2e.solo_enterprise'")


async def test_con_autopilot_apagado_no_se_programa_nada(ws):
    from core.autopilot_ciclo import planear

    await ws["adm"].execute(
        "UPDATE autopilot_workspace_settings SET habilitado=false WHERE workspace_id=$1",
        ws["id"])
    async with ws["maker"]() as s:
        r = await planear(s)
    n = await ws["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1", ws["id"])
    assert n == 0, f"se programo trabajo con Autopilot apagado: {r}"


async def test_un_workspace_sin_miembros_no_genera_trabajo(ws):
    """Producir para un workspace huerfano es producir para nadie — el mismo
    derroche que ya se corrigio en el brief de CEO."""
    from core.autopilot_ciclo import planear

    await ws["adm"].execute(
        "UPDATE workspace_members SET status='inactive' WHERE workspace_id=$1",
        ws["id"])
    async with ws["maker"]() as s:
        await planear(s)
    n = await ws["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1", ws["id"])
    assert n == 0, "se programo trabajo para un workspace sin nadie dentro"


async def test_el_trabajo_no_se_mezcla_entre_workspaces(ws):
    """Aislamiento: el resultado cuenta SOLO los entregables de su workspace."""
    from core.autopilot import planificar
    from core.autopilot_ciclo import ejecutar_uno

    adm = ws["adm"]
    marca = secrets.token_hex(4)
    otro_uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Ajeno') RETURNING user_id", f"ajeno-{marca}@nelvyon.test")
    otro_ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id", str(otro_uid), f"ajeno-{marca}")
    try:
        otro_cli = await adm.fetchval(
            "INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, "
            "status, metadata) VALUES ($1,$2,'Ajeno','active','{}'::jsonb) RETURNING id",
            otro_ws, str(otro_uid))
        otro_proy = await adm.fetchval(
            "INSERT INTO os_projects (workspace_id, client_id, name, status) "
            "VALUES ($1,$2,'Proyecto ajeno','active') RETURNING id", otro_ws, otro_cli)
        for i in range(7):
            await adm.execute(
                "INSERT INTO os_deliverables (workspace_id, client_id, project_id, "
                "title, type, status) VALUES ($1,$2,$3,$4,'json','published')",
                otro_ws, otro_cli, otro_proy, f"ajeno {i}")
        await adm.execute(
            "INSERT INTO os_deliverables (workspace_id, client_id, project_id, title, "
            "type, status) VALUES ($1,$2,$3,'propio','json','published')",
            ws["id"], ws["cliente"], ws["proyecto"])

        async with ws["maker"]() as s:
            await planificar(s, ws["id"], CAP, "2026-W20")
            await s.commit()
        async with ws["maker"]() as s:
            r = await ejecutar_uno(s, trabajador="aislamiento")

        import json
        res = json.loads(await adm.fetchval(
            "SELECT resultado FROM autopilot_jobs WHERE id=$1", r["id"]))
        assert res["total"] == 1, (
            f"el resultado incluye entregables de otro workspace: {res}")
    finally:
        await adm.execute("DELETE FROM os_deliverables WHERE workspace_id=$1", otro_ws)
        await adm.execute("DELETE FROM os_projects WHERE workspace_id=$1", otro_ws)
        await adm.execute("DELETE FROM os_clients WHERE workspace_id=$1", otro_ws)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", otro_ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", otro_uid)


async def test_el_estado_sobrevive_a_un_reinicio(ws):
    """Motor nuevo = proceso nuevo. Si el estado viviera en memoria, aqui se
    perderia y el trabajo se repetiria."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.autopilot_ciclo import planear

    async with ws["maker"]() as s:
        primero = await planear(s)
    assert len(primero["creados"]) >= 1

    # Motor nuevo = proceso nuevo. El estado tiene que venir de PostgreSQL.
    motor2 = create_async_engine(_dsn_async())
    maker2 = async_sessionmaker(motor2, expire_on_commit=False)
    try:
        async with maker2() as s:
            r = await planear(s)
        assert r["creados"] == [], "tras el reinicio se duplico el trabajo"
        assert r["ya_existian"] >= 1, "el proceso nuevo no vio el trabajo anterior"
    finally:
        await motor2.dispose()

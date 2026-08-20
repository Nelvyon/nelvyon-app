"""Quien recibe Autopilot al nacer, y quien NO.

LA DECISION QUE ESTO PROTEGE
----------------------------
Produccion tiene 22 inquilinos y los 22 son `@nelvyon.test`. Encenderles Autopilot
generaria trabajo real para clientes falsos: exactamente lo que ya costo 153 filas
inutiles con el CEO brief. La instruccion es explicita — no se les toca, no se les
borra y no se les genera trabajo.

POR QUE EL PROVISIONING NO ESTA EN LA RUTA QUE CREA EL WORKSPACE
----------------------------------------------------------------
Se intento ahi primero y no funciona: `autopilot_workspace_settings` tiene RLS
FORZADO con politicas de SELECT y UPDATE pero ninguna de INSERT, asi que el rol de
la aplicacion recibe «new row violates row-level security policy». Habria fallado
en silencio con cada cliente real.

Encender Autopilot no es una accion del usuario, es una accion del motor. Vive en
el planner, que ya corre como `nelvyon_jobs`. Aqui se comprueban las dos mitades:
que el motor lo enciende, y que el rol de la aplicacion sigue sin poder hacerlo
—porque si pudiera, la barrera se habria aflojado sin que nadie lo decidiera.
"""
from __future__ import annotations

import os
import secrets

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")
DSN_JOBS: str | None = None


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


# ═══════════════════════════════════════════════════════════════════════════
# La definicion de «cliente real», sin base de datos
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("nombre,correo,esperado", [
    ("Acme Marketing", "hola@acme.com", True),
    ("CERTIFICATION-DIA-A-1234", "x@acme.com", False),
    ("certification-en-minusculas", "x@acme.com", False),
    ("Proyecto synthetic 2025", "x@acme.com", False),
    ("demo-test interno", "x@acme.com", False),
    ("Acme Marketing", "founder@nelvyon.test", False),
    ("Acme Marketing", "FOUNDER@NELVYON.TEST", False),
    # Un nombre que solo CONTIENE la palabra no es un workspace de certificacion.
    ("Certifications R Us", "hola@certifications.com", True),
    ("Acme Demo Day", "hola@acme.com", True),
])
def test_que_cuenta_como_cliente_real(nombre, correo, esperado):
    from core.inquilinos_reales import es_real

    assert es_real(nombre, correo) is esperado


def test_la_definicion_no_depende_de_haber_pasado_el_correo():
    """Hay consultas que no tienen JOIN con `workspace_members`."""
    from core.inquilinos_reales import es_real

    assert es_real("Acme") is True
    assert es_real("CERTIFICATION-x") is False


# ═══════════════════════════════════════════════════════════════════════════
# Contra PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════

pg = pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    crudo = DSN_JOBS or DSN or ""
    return crudo.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql://", "postgresql+asyncpg://").replace("@localhost:", "@127.0.0.1:")


@pytest.fixture
async def cuatro_workspaces():
    """Uno real y tres que no lo son. Ninguno tiene Autopilot al empezar."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    creados = {}

    #                  clave        nombre                       correo del dueño
    for clave, nombre, correo in (
        ("real",     f"Acme Real {marca}",            f"real-{marca}@acme.example"),
        ("test",     f"Inquilino viejo {marca}",      f"viejo-{marca}@nelvyon.test"),
        ("cert",     f"CERTIFICATION-{marca}",        f"cert-{marca}@acme.example"),
        ("synth",    f"synthetic relleno {marca}",    f"synth-{marca}@acme.example"),
    ):
        uid = await adm.fetchval(
            "INSERT INTO nelvyon_users (email, password_hash, full_name) "
            "VALUES ($1,'x',$2) RETURNING user_id", correo, clave)
        ws = await adm.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id", str(uid), nombre)
        await adm.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
            "VALUES ($1,$2,$3,'owner','active') ON CONFLICT (workspace_id, user_id) "
            "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
            ws, str(uid), correo)
        creados[clave] = {"ws": int(ws), "uid": uid, "correo": correo}

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        yield {"w": creados, "adm": adm, "maker": maker}
    finally:
        ids = [v["ws"] for v in creados.values()]
        for t in ("autopilot_jobs", "autopilot_workspace_capabilities",
                  "autopilot_workspace_settings", "workspace_members"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id = ANY($1::int[])", ids)
        await adm.execute("DELETE FROM workspaces WHERE id = ANY($1::int[])", ids)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id = ANY($1::uuid[])",
                          [v["uid"] for v in creados.values()])
        await adm.close()
        await motor.dispose()


@pg
@pytest.mark.asyncio
async def test_solo_el_cliente_real_recibe_autopilot(cuatro_workspaces):
    """La prueba central de la decision del fundador."""
    from core.autopilot_ciclo import provisionar_nuevos

    w = cuatro_workspaces["w"]
    async with cuatro_workspaces["maker"]() as s:
        r = await provisionar_nuevos(s)

    assert w["real"]["ws"] in r["encendidos"], (
        f"el cliente real no se provisiono: {r}")
    for clave in ("test", "cert", "synth"):
        assert w[clave]["ws"] not in r["encendidos"], (
            f"se provisiono un workspace que no es un cliente: {clave}")

    encendidos = {f["workspace_id"] for f in await cuatro_workspaces["adm"].fetch(
        "SELECT workspace_id FROM autopilot_workspace_settings "
        "WHERE workspace_id = ANY($1::int[])",
        [v["ws"] for v in w.values()])}
    assert encendidos == {w["real"]["ws"]}, encendidos


@pg
@pytest.mark.asyncio
async def test_los_inquilinos_de_prueba_no_se_borran_ni_se_tocan(cuatro_workspaces):
    """La instruccion es explicita: inactivos, no eliminados."""
    adm = cuatro_workspaces["adm"]
    w = cuatro_workspaces["w"]
    from core.autopilot_ciclo import provisionar_nuevos

    antes = await adm.fetch(
        "SELECT id, name, status, plan FROM workspaces WHERE id = ANY($1::int[]) "
        "ORDER BY id", [v["ws"] for v in w.values()])
    async with cuatro_workspaces["maker"]() as s:
        await provisionar_nuevos(s)
    despues = await adm.fetch(
        "SELECT id, name, status, plan FROM workspaces WHERE id = ANY($1::int[]) "
        "ORDER BY id", [v["ws"] for v in w.values()])
    assert [dict(f) for f in antes] == [dict(f) for f in despues]


@pg
@pytest.mark.asyncio
async def test_provisionar_dos_veces_no_cambia_nada(cuatro_workspaces):
    from core.autopilot_ciclo import provisionar_nuevos

    async with cuatro_workspaces["maker"]() as s:
        primera = await provisionar_nuevos(s)
    async with cuatro_workspaces["maker"]() as s:
        segunda = await provisionar_nuevos(s)

    assert primera["encendidos"], "la primera pasada no encendio nada"
    assert segunda["encendidos"] == [], f"la segunda volvio a encender: {segunda}"


@pg
@pytest.mark.asyncio
async def test_un_workspace_sin_dueno_activo_no_se_provisiona(cuatro_workspaces):
    """Sin dueño no hay a quien entregarle el trabajo."""
    adm = cuatro_workspaces["adm"]
    from core.autopilot_ciclo import provisionar_nuevos

    huerfano = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ('0','Acme Huerfano','active','starter') RETURNING id")
    try:
        async with cuatro_workspaces["maker"]() as s:
            r = await provisionar_nuevos(s)
        assert huerfano not in r["encendidos"]
    finally:
        await adm.execute("DELETE FROM autopilot_workspace_settings WHERE workspace_id=$1",
                          huerfano)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", huerfano)


@pg
@pytest.mark.asyncio
async def test_el_planner_provisiona_y_planifica_en_la_misma_pasada(cuatro_workspaces):
    """Un cliente que se dio de alta hace un minuto no espera al siguiente ciclo."""
    from core.autopilot_ciclo import planear

    w = cuatro_workspaces["w"]
    await cuatro_workspaces["adm"].execute(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
        "status) VALUES ($1,$2,'enterprise','monthly','active')",
        w["real"]["ws"], w["real"]["uid"])
    try:
        async with cuatro_workspaces["maker"]() as s:
            r = await planear(s)
        assert w["real"]["ws"] in r["provisionados"]
        mios = await cuatro_workspaces["adm"].fetchval(
            "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1", w["real"]["ws"])
        assert mios > 0, "se provisiono pero no se planifico nada en la misma pasada"

        for clave in ("test", "cert", "synth"):
            ajenos = await cuatro_workspaces["adm"].fetchval(
                "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1",
                w[clave]["ws"])
            assert ajenos == 0, f"se genero trabajo para {clave}"
    finally:
        await cuatro_workspaces["adm"].execute(
            "DELETE FROM subscriptions WHERE workspace_id=$1", w["real"]["ws"])


@pg
@pytest.mark.asyncio
async def test_el_rol_de_la_aplicacion_sigue_sin_poder_encender_autopilot(
        cuatro_workspaces):
    """La barrera que obligo a mover el provisioning tiene que seguir en pie.

    Si un dia alguien anadiera una politica de INSERT para «arreglarlo», esta
    prueba lo diria: aflojar RLS no puede ser un efecto secundario de que algo
    resulte incomodo.
    """
    import asyncpg

    adm = cuatro_workspaces["adm"]
    w = cuatro_workspaces["w"]["real"]
    await adm.execute("ALTER ROLE nelvyon_app LOGIN PASSWORD 'cert_app_tmp'")
    try:
        c = await asyncpg.connect(
            _dsn().split("://")[0] + "://nelvyon_app:cert_app_tmp@"
            + _dsn().split("@", 1)[1])
        try:
            with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                async with c.transaction():
                    await c.execute(
                        "SELECT set_config('request.jwt.claim.sub',$1,true)",
                        str(w["uid"]))
                    await c.execute("SELECT set_config('app.tenant_id',$1,true)",
                                    str(w["ws"]))
                    await c.execute(
                        "INSERT INTO autopilot_workspace_settings "
                        "(workspace_id, habilitado, defaults_aplicados) "
                        "VALUES ($1, true, now())", w["ws"])
        finally:
            await c.close()
    finally:
        await adm.execute("ALTER ROLE nelvyon_app NOLOGIN")


# ═══════════════════════════════════════════════════════════════════════════
# El panel cuenta el negocio, no la certificacion
# ═══════════════════════════════════════════════════════════════════════════


@pg
@pytest.mark.asyncio
async def test_los_kpis_del_panel_excluyen_prueba_y_certificacion(cuatro_workspaces):
    from core.autopilot_ciclo import planear
    from core.centro_de_control import componer

    w = cuatro_workspaces["w"]
    adm = cuatro_workspaces["adm"]
    # Se enciende Autopilot A MANO en los tres que no son clientes, que es lo
    # peor que podria pasar, y aun asi el panel no debe contarlos.
    from core.autopilot_ciclo import nacer_autopilot

    async with cuatro_workspaces["maker"]() as s:
        for clave in ("test", "cert", "synth"):
            await nacer_autopilot(s, w[clave]["ws"])
        await s.commit()
        await planear(s)

    async with cuatro_workspaces["maker"]() as s:
        real = await componer(s, ambito="real")
        todo = await componer(s, ambito="todo")

    assert real["ambito"] == "real"
    encendidos_reales = real["bloques"]["motor"]["workspaces_encendidos"]
    encendidos_todos = todo["bloques"]["motor"]["workspaces_encendidos"]
    assert encendidos_todos >= encendidos_reales + 3, (
        f"el ambito `todo` deberia ver los tres de prueba: "
        f"real={encendidos_reales} todo={encendidos_todos}")

    ids_reales = {f["workspace_id"] for f in real["bloques"]["roto"]["trabajos_escalados"]}
    for clave in ("test", "cert", "synth"):
        assert w[clave]["ws"] not in ids_reales

    assert await adm.fetchval("SELECT 1") == 1   # la sesion sigue viva


@pg
@pytest.mark.asyncio
async def test_el_panel_rechaza_un_ambito_inventado(cuatro_workspaces):
    """Un ambito mal escrito no puede degradar en «lo enseño todo»."""
    from core.centro_de_control import componer

    async with cuatro_workspaces["maker"]() as s:
        with pytest.raises(ValueError):
            await componer(s, ambito="todos")

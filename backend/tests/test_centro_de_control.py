"""El panel del fundador: que sea cierto, y que este cerrado.

LAS DOS COSAS QUE PUEDEN SALIR MAL
----------------------------------
Que mienta —diga «todo bien» cuando no pudo mirar— o que este abierto. La
primera hace que el fundador cierre el portatil con la empresa parada; la segunda
expone el estado de todos los inquilinos a quien pase por la URL.

Las dos se prueban aqui, y la segunda sin base de datos: no hace falta ninguna
para comprobar que una puerta esta cerrada.
"""
from __future__ import annotations

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


# ═══════════════════════════════════════════════════════════════════════════
# La puerta
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def cliente():
    from fastapi.testclient import TestClient

    import main

    return TestClient(main.app)


def test_sin_secreto_configurado_la_ruta_no_existe(cliente, monkeypatch):
    """Fail-closed.

    Un panel de plataforma que se abriera solo porque alguien olvido configurarlo
    seria peor que no tenerlo.
    """
    monkeypatch.delenv("NELVYON_CONTROL_CENTER_TOKEN", raising=False)
    assert cliente.get("/control-center").status_code == 404


def test_con_secreto_pero_sin_cabecera_no_pasa(cliente, monkeypatch):
    monkeypatch.setenv("NELVYON_CONTROL_CENTER_TOKEN", secrets.token_urlsafe(32))
    assert cliente.get("/control-center").status_code == 404


def test_un_token_equivocado_no_pasa(cliente, monkeypatch):
    monkeypatch.setenv("NELVYON_CONTROL_CENTER_TOKEN", "el-bueno-" + "x" * 30)
    r = cliente.get("/control-center", headers={"x-control-token": "el-malo"})
    assert r.status_code == 404


def test_un_token_equivocado_responde_404_y_no_401(cliente, monkeypatch):
    """Quien no tiene el secreto no debe ni saber que la ruta existe.

    Un 401 confirma que hay algo detras y convierte la ruta en un objetivo.
    """
    monkeypatch.setenv("NELVYON_CONTROL_CENTER_TOKEN", "s" * 40)
    sin = cliente.get("/control-center")
    malo = cliente.get("/control-center", headers={"x-control-token": "no"})
    assert sin.status_code == malo.status_code == 404
    assert sin.json() == malo.json(), "la respuesta delata si el secreto existe"


def test_un_prefijo_del_token_no_pasa(cliente, monkeypatch):
    """La comparacion es de igualdad completa, no de prefijo."""
    token = "t" * 40
    monkeypatch.setenv("NELVYON_CONTROL_CENTER_TOKEN", token)
    r = cliente.get("/control-center", headers={"x-control-token": token[:-1]})
    assert r.status_code == 404


def test_el_token_no_se_acepta_por_la_url(cliente, monkeypatch):
    """Las URLs acaban en logs de acceso, historiales y cabeceras referer."""
    token = "u" * 40
    monkeypatch.setenv("NELVYON_CONTROL_CENTER_TOKEN", token)
    r = cliente.get(f"/control-center?token={token}")
    assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# El veredicto
# ═══════════════════════════════════════════════════════════════════════════


def _bloques(**cambios):
    base = {
        "produccion": {"medible": True, "confirmados_24h": 12, "por_capacidad": []},
        "motor": {"medible": True, "workspaces_encendidos": 3, "en_cola": 0,
                  "ejecutandose": 0, "vencidos_sin_tomar": 0},
        "roto": {"medible": True, "trabajos_escalados": [], "incidentes_abiertos": []},
        "esperando_decision": {"medible": True, "total": 0, "trabajos": []},
        "clientes_en_riesgo": {"medible": True, "workspaces": []},
    }
    for k, v in cambios.items():
        base[k] = {**base[k], **v}
    return base


def test_con_todo_en_orden_el_fundador_puede_cerrar_el_portatil():
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques())
    assert v["estado"] == "en_marcha"
    assert v["requiere_atencion"] is False


def test_un_bloque_no_medible_gana_a_todo_lo_demas():
    """«No lo se» nunca puede presentarse como «todo bien».

    Es la unica salida que el panel no puede permitirse: el cero de un bloque que
    no pudo consultar se lee igual que el cero de un bloque tranquilo.
    """
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques(produccion={"medible": False}))
    assert v["estado"] == "desconocido"
    assert v["requiere_atencion"] is True
    assert "produccion" in v["frase"]


def test_no_medible_gana_incluso_habiendo_cosas_rotas():
    """Si no se pudo mirar todo, decir «hay 3 cosas rotas» es afirmar de mas."""
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques(
        roto={"medible": False, "trabajos_escalados": [{"x": 1}]}))
    assert v["estado"] == "desconocido"


def test_lo_roto_gana_a_lo_que_espera_decision():
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques(
        roto={"trabajos_escalados": [{"capacidad": "x"}]},
        esperando_decision={"total": 5}))
    assert v["estado"] == "roto"
    assert "1 cosas rotas" in v["frase"]


def test_una_cola_atascada_cuenta_como_roto_aunque_nada_haya_fallado():
    """Nadie recogiendo trabajo no produce ni un error, y para la empresa igual."""
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques(motor={"vencidos_sin_tomar": 7}))
    assert v["estado"] == "roto"
    assert "7 trabajos atascados" in v["frase"]


def test_lo_que_espera_decision_no_se_esconde():
    """Un trabajo esperando aprobacion para siempre es la empresa parada en
    silencio: no falla, no alarma y no avanza."""
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques(esperando_decision={"total": 2}))
    assert v["estado"] == "requiere_decision"
    assert v["requiere_atencion"] is True
    assert "2 decisiones esperando" in v["frase"]


def test_autopilot_encendido_sin_producir_no_pasa_por_sano():
    """Un motor encendido que no produce se ve igual que uno sin trabajo."""
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques(produccion={"confirmados_24h": 0}))
    assert v["estado"] == "sin_produccion"
    assert v["requiere_atencion"] is True


def test_sin_ningun_workspace_encendido_no_se_alarma_por_no_producir():
    """Nadie ha encendido Autopilot todavia: no producir es lo correcto."""
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques(produccion={"confirmados_24h": 0},
                            motor={"workspaces_encendidos": 0}))
    assert v["estado"] == "en_marcha"
    assert v["requiere_atencion"] is False


def test_el_veredicto_nunca_inventa_una_puntuacion():
    """Ni «salud 87%» ni indices compuestos: hechos o nada."""
    from core.centro_de_control import _veredicto

    v = _veredicto(_bloques())
    assert set(v) == {"estado", "frase", "requiere_atencion"}
    assert not any(isinstance(x, float) for x in v.values())


# ═══════════════════════════════════════════════════════════════════════════
# Contra PostgreSQL, con el rol real
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_el_panel_se_compone_entero_con_el_rol_de_barrido():
    """Los seis bloques, medibles. Si a `nelvyon_jobs` le faltara un privilegio,
    el bloque saldria `medible: false` y esto lo detecta."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.centro_de_control import componer

    crudo = DSN_JOBS or DSN
    dsn = crudo.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql://", "postgresql+asyncpg://").replace("@localhost:", "@127.0.0.1:")
    motor = create_async_engine(dsn)
    try:
        async with async_sessionmaker(motor, expire_on_commit=False)() as s:
            panel = await componer(s, ambito="todo")
        for nombre, bloque in panel["bloques"].items():
            assert bloque["medible"], (
                f"{nombre} no se pudo medir: {bloque.get('motivo')}")
        assert panel["veredicto"]["estado"] in (
            "en_marcha", "roto", "requiere_decision", "sin_produccion")
    finally:
        await motor.dispose()


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
async def test_un_trabajo_esperando_aprobacion_aparece_en_el_panel():
    """De la cola al panel, sin intermediarios."""
    import asyncpg
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.autopilot import planificar
    from core.autopilot_ciclo import nacer_autopilot
    from core.centro_de_control import componer

    crudo = DSN_JOBS or DSN
    dsn = crudo.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql://", "postgresql+asyncpg://").replace("@localhost:", "@127.0.0.1:")
    adm = await asyncpg.connect(DSN.replace("postgresql+asyncpg://", "postgresql://"))
    marca = secrets.token_hex(4)
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Panel') RETURNING user_id", f"panel-{marca}@nelvyon.test")
    ident = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(uid), f"CERTIFICATION-PANEL-{marca}")
    await adm.execute(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
        "status) VALUES ($1,$2,'enterprise','monthly','active')", ident, uid)

    motor = create_async_engine(dsn)
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        async with maker() as s:
            await nacer_autopilot(s, ident)
            await planificar(s, ident, "os_web_builder.preparar_borrador",
                             "PANEL-" + marca)
            await s.commit()

        async with maker() as s:
            # `todo`: este workspace es CERTIFICATION y el ambito real lo excluye
            # a proposito. Ver `AMBITOS` en `core/centro_de_control`.
            panel = await componer(s, ambito="todo")

        esperando = panel["bloques"]["esperando_decision"]
        assert esperando["medible"]
        mios = [t for t in esperando["trabajos"] if t["workspace_id"] == ident]
        assert mios, "el trabajo pendiente de aprobacion no llego al panel"
        assert mios[0]["capacidad"] == "os_web_builder.preparar_borrador"
        # El panel dice POR QUE espera: sin eso el fundador tiene que investigar.
        assert mios[0]["descripcion"], "sin descripcion de lo que haria"
        assert mios[0]["reversible"] is False
        assert panel["veredicto"]["requiere_atencion"] is True
    finally:
        for t in ("autopilot_jobs", "autopilot_workspace_capabilities",
                  "autopilot_workspace_settings", "subscriptions"):
            await adm.execute(f"DELETE FROM {t} WHERE workspace_id=$1", ident)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ident)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.close()
        await motor.dispose()


# ═══════════════════════════════════════════════════════════════════════════
# El camino de error tiene que funcionar, que es cuando mas se necesita
# ═══════════════════════════════════════════════════════════════════════════


def test_ninguna_ruta_usa_un_logger_que_no_existe():
    """`main.py` no tiene `logger` de modulo: cada funcion define el suyo.

    Dos rutas lo usaban sin definirlo, las dos dentro de un `except`. Es el peor
    sitio posible: `NameError` solo aparece cuando algo YA ha fallado, sustituye
    la causa real por otra distinta y convierte en 500 dos rutas cuyo contrato
    es no devolver 5xx jamas — `/health/business` y `/control-center`, las dos
    que el orquestador y el fundador consultan precisamente cuando algo va mal.
    """
    import ast
    import pathlib

    arbol = ast.parse(pathlib.Path("main.py").read_text(encoding="utf-8"))
    culpables: list[str] = []

    def revisar(nodo):
        define = any(isinstance(x, ast.Name) and x.id == "logger"
                     and isinstance(x.ctx, ast.Store) for x in ast.walk(nodo))
        usa = any(isinstance(x, ast.Attribute) and isinstance(x.value, ast.Name)
                  and x.value.id == "logger" for x in ast.walk(nodo))
        if usa and not define:
            culpables.append(f"{nodo.name}:{nodo.lineno}")
        for hijo in nodo.body:
            for sub in ast.walk(hijo):
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    revisar(sub)

    for nodo in arbol.body:
        if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            revisar(nodo)

    assert not culpables, (
        "usan `logger` sin definirlo (NameError en tiempo de ejecucion): "
        + ", ".join(culpables))


def test_el_panel_no_devuelve_5xx_aunque_reviente_por_dentro(cliente, monkeypatch):
    """El contrato: el estado va en el cuerpo, nunca en el codigo HTTP.

    Un panel que devolviera 500 haria que el orquestador lo interpretara como
    proceso enfermo. El fallo se cuenta, no se propaga.
    """
    monkeypatch.setenv("NELVYON_CONTROL_CENTER_TOKEN", "z" * 40)

    import core.database as bd

    async def _revienta():
        raise RuntimeError("base caida a proposito")

    monkeypatch.setattr(bd.db_manager, "ensure_initialized", _revienta)

    r = cliente.get("/control-center", headers={"x-control-token": "z" * 40})
    assert r.status_code == 200, f"devolvio {r.status_code}"
    assert r.json()["veredicto"]["estado"] == "desconocido"
    assert r.json()["veredicto"]["requiere_atencion"] is True

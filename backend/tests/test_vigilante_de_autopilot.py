"""El vigilante mirando a Autopilot, con las anomalias provocadas de verdad.

POR QUE HACE FALTA ESTO
-----------------------
Autopilot es lo que corre cuando el fundador no esta. Hasta ahora el vigilante
miraba el negocio —clientes, cobros, tickets— pero no miraba al que hace el
trabajo. Un motor autonomo sin supervisor no es autonomia: es una caja negra que
puede llevar semanas parada sin que nadie lo note, porque un motor que no produce
tiene exactamente la misma pinta que uno sin trabajo que hacer.

COMO SE PRUEBA
--------------
No comprobando que las comprobaciones existen. Provocando cada anomalia en una
base real y exigiendo que el vigilante la vea: cola atascada, worker muerto,
reintentos agotados, capacidad sin ejecutor y produccion caida a cero.
"""
from __future__ import annotations

import os
import secrets

import pytest

from tests._vista_global_limpia import exigir_vista_global_limpia

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
async def entorno():
    """Workspace propio y linea base limpia para las metricas de Autopilot."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from core.salud_negocio import COMPROBACIONES

    metricas = [c.metrica for c in COMPROBACIONES if c.metrica.startswith("autopilot")]
    adm = await asyncpg.connect(_dsn(), timeout=30)
    # Mide la vista global: sobre residuo de otra ejecucion mediria la
    # empresa de otro. Ver `_vista_global_limpia`.
    await exigir_vista_global_limpia(adm)
    marca = secrets.token_hex(4)
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Vigilante') RETURNING user_id", f"vig-{marca}@nelvyon.test")
    ident = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(uid), f"CERTIFICATION-VIG-{marca}")

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        yield {"id": int(ident), "uid": uid, "adm": adm, "maker": maker,
               "metricas": metricas}
    finally:
        await adm.execute("DELETE FROM autopilot_jobs WHERE workspace_id=$1", ident)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ident)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.execute(
            "DELETE FROM business_health_baseline WHERE metrica = ANY($1::text[])",
            metricas)
        await adm.close()
        await motor.dispose()


async def _crear_job(entorno, estado, **expresiones):
    """Inserta un trabajo en un estado que el nucleo no permitiria alcanzar.

    A proposito por SQL directo: el objetivo es simular un motor averiado, y un
    motor averiado no respeta la maquina de estados. Los valores extra van como
    expresiones SQL literales porque casi todos son fechas relativas.
    """
    cols = ["workspace_id", "capacidad", "idempotency_key", "estado"]
    marcas = ["$1", "$2", "$3", "$4"]
    vals = [entorno["id"], "os_deliverables.snapshot_semanal",
            secrets.token_hex(24), estado]
    for k, expr in expresiones.items():
        cols.append(k)
        marcas.append(expr)
    return await entorno["adm"].fetchval(
        f"INSERT INTO autopilot_jobs ({', '.join(cols)}) "
        f"VALUES ({', '.join(marcas)}) RETURNING id", *vals)


async def _hallazgos(entorno) -> dict[str, dict]:
    from core.salud_negocio import revisar

    async with entorno["maker"]() as s:
        r = await revisar(s)
        await s.commit()
    return {h["metric"]: h for h in r["findings"]}


async def _aprender(entorno) -> None:
    """Primera pasada: el vigilante aprende y no alarma. Es su contrato."""
    hallazgos = await _hallazgos(entorno)
    for m in entorno["metricas"]:
        assert m not in hallazgos, f"{m} alarmo en la primera observacion"


# ═══════════════════════════════════════════════════════════════════════════
# Cada anomalia, provocada
# ═══════════════════════════════════════════════════════════════════════════


async def test_una_cola_atascada_se_ve(entorno):
    """Trabajo listo desde hace horas que nadie recoge.

    Es el fallo mas silencioso de todos: el API responde 200, el proceso vive y
    la empresa no entrega nada.
    """
    await _aprender(entorno)
    for _ in range(3):
        await _crear_job(entorno, "scheduled",
                         proximo_intento="now() - interval '4 hours'")

    hallazgos = await _hallazgos(entorno)
    assert "autopilot_cola_atascada" in hallazgos, hallazgos
    h = hallazgos["autopilot_cola_atascada"]
    assert h["severity"] == "high"
    assert h["evidence"]["actual"] >= 3


async def test_un_worker_muerto_se_ve(entorno):
    """Cerrojo caducado con el trabajo aun en ejecucion.

    El estado se llama `running`, no `executing`. La comprobacion nacio con el
    nombre equivocado y por tanto no habria encontrado un worker muerto jamas:
    habria devuelto 0 para siempre, que es indistinguible de «todo bien». Lo
    encontro esta prueba al intentar provocar la anomalia.
    """
    await _aprender(entorno)
    await _crear_job(entorno, "running",
                     locked_until="now() - interval '2 hours'")

    hallazgos = await _hallazgos(entorno)
    assert "autopilot_bloqueados_por_worker_muerto" in hallazgos, hallazgos
    # No es urgente: el cerrojo expira solo y otro worker retoma.
    assert hallazgos["autopilot_bloqueados_por_worker_muerto"]["severity"] == "medium"
    assert hallazgos["autopilot_bloqueados_por_worker_muerto"][
        "automatic_action"] != "ninguna"


async def test_los_reintentos_agotados_se_ven(entorno):
    await _aprender(entorno)
    await _crear_job(entorno, "escalated",
                     ultimo_error="'RuntimeError: reventado'")

    hallazgos = await _hallazgos(entorno)
    assert "autopilot_trabajos_escalados" in hallazgos, hallazgos
    assert hallazgos["autopilot_trabajos_escalados"]["needs_human"] is True


async def test_una_capacidad_sin_ejecutor_se_distingue_de_un_fallo_cualquiera(entorno):
    """Desplegar el catalogo sin el modulo que lo atiende tiene su propia alerta.

    Mezclarlo con «escalados» diria «algo fallo» cuando lo que pasa es «falta
    codigo», y son dos arreglos distintos.
    """
    await _aprender(entorno)
    await _crear_job(
        entorno, "escalated",
        ultimo_error="'capacidad sin ejecutor conectado: os_futuro.algo'")

    hallazgos = await _hallazgos(entorno)
    assert "autopilot_capacidades_sin_ejecutor" in hallazgos, hallazgos
    assert "catalogo" in hallazgos["autopilot_capacidades_sin_ejecutor"]["impact"]


async def test_una_entrega_sin_evidencia_es_critica(entorno):
    """No deberia poder existir: hay un CHECK que lo impide.

    Se retira la restriccion para provocarlo, exactamente el escenario que la
    comprobacion vigila: alguien escribiendo por debajo del nucleo.
    """
    await _aprender(entorno)
    adm = entorno["adm"]
    await adm.execute("ALTER TABLE autopilot_jobs "
                      "DROP CONSTRAINT ck_autopilot_entrega_con_evidencia")
    try:
        await _crear_job(entorno, "confirmed")
        hallazgos = await _hallazgos(entorno)
        assert "autopilot_entregas_sin_evidencia" in hallazgos, hallazgos
        assert hallazgos["autopilot_entregas_sin_evidencia"]["severity"] == "critical"
    finally:
        await adm.execute("DELETE FROM autopilot_jobs WHERE workspace_id=$1",
                          entorno["id"])
        await adm.execute(
            "ALTER TABLE autopilot_jobs ADD CONSTRAINT "
            "ck_autopilot_entrega_con_evidencia CHECK ("
            "estado NOT IN ('delivered','confirmed') OR evidencia IS NOT NULL)")


async def test_la_produccion_caida_a_cero_se_ve(entorno):
    """Lo que ya se produjo no puede desaparecer.

    Se aprende una linea base con trabajo confirmado y luego se borra: si el
    acumulado baja, o alguien borro trabajo o la consulta dejo de verlo. Las dos
    cosas hay que mirarlas.
    """
    adm = entorno["adm"]
    for _ in range(4):
        await _crear_job(entorno, "confirmed", evidencia="'{\"sha256\":\"x\"}'::jsonb")

    await _aprender(entorno)   # aprende con 4 confirmados

    await adm.execute("DELETE FROM autopilot_jobs WHERE workspace_id=$1 "
                      "AND estado='confirmed'", entorno["id"])

    hallazgos = await _hallazgos(entorno)
    assert "autopilot_trabajos_confirmados" in hallazgos, hallazgos
    h = hallazgos["autopilot_trabajos_confirmados"]
    assert h["severity"] == "critical"
    assert "A CERO" in h["what_happened"]


async def test_producir_mas_no_es_una_anomalia(entorno):
    """El vigilante no puede convertir una buena noticia en una alerta."""
    await _aprender(entorno)
    for _ in range(6):
        await _crear_job(entorno, "confirmed", evidencia="'{\"sha256\":\"x\"}'::jsonb")

    hallazgos = await _hallazgos(entorno)
    assert "autopilot_trabajos_confirmados" not in hallazgos, (
        "alarmo porque Autopilot produjo mas")


async def test_con_autopilot_sano_el_vigilante_calla(entorno):
    """Control negativo. Sin esto, un vigilante que alarmase siempre pasaria
    todas las pruebas anteriores."""
    await _aprender(entorno)
    hallazgos = await _hallazgos(entorno)
    for m in entorno["metricas"]:
        assert m not in hallazgos, f"{m} alarmo sin que pasara nada: {hallazgos[m]}"


async def test_el_vigilante_puede_medir_autopilot_con_su_propio_rol(entorno):
    """`_valor` devuelve None cuando no puede medir, y None NO es cero.

    Si al vigilante le faltara un privilegio, esta comprobacion lo detecta: sin
    ella, «no pude mirar» y «esta todo a cero» son indistinguibles, que es
    exactamente el fallo que este modulo existe para evitar.
    """
    from core.salud_negocio import COMPROBACIONES, _valor

    async with entorno["maker"]() as s:
        for c in COMPROBACIONES:
            if not c.metrica.startswith("autopilot"):
                continue
            v = await _valor(s, c)
            assert v is not None, f"{c.metrica} no se pudo medir con el rol real"

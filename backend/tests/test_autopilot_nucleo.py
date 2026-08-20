"""El nucleo del orquestador, probado donde importa: concurrencia y fronteras.

QUE CERTIFICA
-------------
Una sola infraestructura para los 14 servicios de OS, ninguno de los cuales tenia
disparador automatico. Los servicios NO se tocan: siguen sirviendo peticiones
manuales igual que antes.

Lo que se prueba aqui no es que existan tablas —eso no demuestra nada— sino las
propiedades que hacen seguro dejar trabajando sola a una maquina:

  * dos planificadores simultaneos crean UN trabajo, no dos;
  * dos trabajadores simultaneos toman trabajos DISTINTOS;
  * un cerrojo caducado se puede retomar, para que un reinicio no deje trabajo
    colgado para siempre;
  * `delivered` exige evidencia — terminar un worker no es entregar;
  * una capacidad irreversible no puede declararse automatica;
  * las transiciones ilegales se rechazan.
"""
from __future__ import annotations

import asyncio
import os
import secrets
from datetime import datetime, timedelta, timezone

import pytest

from core.autopilot import (
    AUTOMATICO,
    APROBACION_HUMANA,
    CANCELADO,
    CONFIRMADO,
    EJECUTANDO,
    ENTREGADO,
    ESCALADO,
    ESPERANDO_APROBACION,
    PRODUCIDO,
    PROGRAMADO,
    SOLO_ESCALAR,
    VALIDADO,
    Capacidad,
    clave_idempotencia,
    decide_autonomia,
    puede_transicionar,
    toca_reintentar,
)

DSN = os.environ.get("NELVYON_PG_CERT_DSN")


def _cap(modo=AUTOMATICO, reversible=True) -> Capacidad:
    return Capacidad(
        clave="prueba.capacidad", servicio_os="os_deliverables",
        modo_ejecucion=modo, reversible=reversible, plan_minimo="starter",
        cadencia="weekly", tiempo_limite_s=120, max_intentos=3)


# ═══════════════════════════════════════════════════════════════════════════
# 1. La frontera de la autonomia. Funciones puras: se leen y se prueban solas.
# ═══════════════════════════════════════════════════════════════════════════


def test_lo_reversible_y_seguro_se_ejecuta_solo():
    assert decide_autonomia(_cap(AUTOMATICO, reversible=True)) == PROGRAMADO


def test_lo_irreversible_nunca_se_ejecuta_solo():
    """CINTURON ademas del CHECK de la base.

    Si alguna vez entrara una capacidad irreversible marcada como automatica
    —por una insercion manual, por una migracion futura— aqui NO se ejecuta.
    """
    assert decide_autonomia(_cap(AUTOMATICO, reversible=False)) == ESCALADO


def test_lo_que_exige_aprobacion_espera():
    assert decide_autonomia(_cap(APROBACION_HUMANA)) == ESPERANDO_APROBACION


def test_solo_escalar_no_se_ejecuta_jamas():
    assert decide_autonomia(_cap(SOLO_ESCALAR)) == ESCALADO


def test_un_modo_desconocido_escala_en_vez_de_ejecutar():
    """Fallar hacia el lado seguro: ante lo que no se entiende, no se actua."""
    assert decide_autonomia(_cap("MODO_INVENTADO")) == ESCALADO


# ═══════════════════════════════════════════════════════════════════════════
# 2. Maquina de estados
# ═══════════════════════════════════════════════════════════════════════════


def test_el_camino_feliz_es_transitable():
    camino = [PROGRAMADO, EJECUTANDO, PRODUCIDO, VALIDADO,
              "delivery_pending", ENTREGADO, CONFIRMADO]
    for desde, hasta in zip(camino, camino[1:]):
        assert puede_transicionar(desde, hasta), f"{desde} -> {hasta}"


def test_no_se_puede_entregar_sin_ejecutar():
    """El salto que convertiria un trabajo no hecho en una entrega."""
    assert not puede_transicionar(PROGRAMADO, ENTREGADO)
    assert not puede_transicionar(PROGRAMADO, CONFIRMADO)


def test_no_se_puede_entregar_sin_validar():
    assert not puede_transicionar(PRODUCIDO, ENTREGADO)


def test_los_estados_finales_no_tienen_salida():
    for final in (CONFIRMADO, ESCALADO, CANCELADO):
        assert puede_transicionar(final, PROGRAMADO) is False


def test_el_backoff_es_finito():
    ahora = datetime.now(timezone.utc)
    assert toca_reintentar(0, None, ahora)
    assert not toca_reintentar(0, ahora, ahora), "reintento inmediato"
    assert not toca_reintentar(99, ahora - timedelta(days=1), ahora)


def test_la_clave_de_idempotencia_es_estable_y_distingue():
    a = clave_idempotencia(1, "cap", "2026-W34")
    assert a == clave_idempotencia(1, "cap", "2026-W34"), "no es estable"
    assert a != clave_idempotencia(2, "cap", "2026-W34"), "no distingue workspace"
    assert a != clave_idempotencia(1, "cap", "2026-W35"), "no distingue periodo"


# ═══════════════════════════════════════════════════════════════════════════
# 3. Contra PostgreSQL: concurrencia, cerrojos y evidencia
# ═══════════════════════════════════════════════════════════════════════════

pg = pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    return _dsn().replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")


@pytest.fixture
async def entorno():
    """Un workspace de CERTIFICACION, borrado al terminar."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Autopilot cert') RETURNING user_id",
        f"autopilot-{marca}@nelvyon.test")
    ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(uid), f"CERTIFICATION-autopilot-{marca}")
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active') "
        "ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        ws, str(uid), f"autopilot-{marca}@nelvyon.test")

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        yield {"ws": int(ws), "uid": uid, "maker": maker, "adm": adm}
    finally:
        await adm.execute("DELETE FROM autopilot_jobs WHERE workspace_id=$1", ws)
        await adm.execute("DELETE FROM workspace_members WHERE workspace_id=$1", ws)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.close()
        await motor.dispose()


@pg
@pytest.mark.asyncio
async def test_dos_planificaciones_simultaneas_crean_un_solo_trabajo(entorno):
    """LA PROPIEDAD QUE MAS IMPORTA.

    Un `SELECT` previo no protege: ambos planificadores verian la cola vacia y
    ambos insertarian. Quien lo impide es la restriccion unica de la base — la
    misma leccion que ya costo dos incidentes, en `subscriptions` y en
    `workspace_members`.
    """
    from core.autopilot import planificar

    ws, maker = entorno["ws"], entorno["maker"]

    async def _planificar():
        async with maker() as s:
            r = await planificar(s, ws, "os_deliverables.snapshot_semanal", "2026-W34")
            await s.commit()
            return r

    resultados = await asyncio.gather(*[_planificar() for _ in range(4)])
    creados = [r for r in resultados if r is not None]
    assert len(creados) == 1, f"se crearon {len(creados)} trabajos"

    n = await entorno["adm"].fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE workspace_id=$1", ws)
    assert n == 1


@pg
@pytest.mark.asyncio
async def test_dos_trabajadores_simultaneos_no_toman_el_mismo(entorno):
    """`FOR UPDATE SKIP LOCKED`: el segundo salta la fila, no espera ni la duplica."""
    from core.autopilot import planificar, tomar_trabajo

    ws, maker = entorno["ws"], entorno["maker"]
    async with maker() as s:
        for semana in ("2026-W40", "2026-W41"):
            await planificar(s, ws, "os_deliverables.snapshot_semanal", semana)
        await s.commit()

    async def _tomar(nombre):
        async with maker() as s:
            t = await tomar_trabajo(s, trabajador=nombre)
            await s.commit()
            return t["id"] if t else None

    a, b = await asyncio.gather(_tomar("w-a"), _tomar("w-b"))
    assert a is not None and b is not None, "algun trabajador se quedo sin trabajo"
    assert a != b, "los dos trabajadores tomaron el MISMO trabajo"


@pg
@pytest.mark.asyncio
async def test_un_cerrojo_caducado_se_puede_retomar(entorno):
    """REINICIO. Un trabajador que muere a media faena deja el trabajo bloqueado;
    si el cerrojo no caducara, nadie lo retomaria nunca — es lo que paso con los
    eventos de Stripe atascados en 'processing'."""
    from core.autopilot import planificar, tomar_trabajo

    ws, maker, adm = entorno["ws"], entorno["maker"], entorno["adm"]
    async with maker() as s:
        await planificar(s, ws, "os_deliverables.snapshot_semanal", "2026-W42")
        await s.commit()

    async with maker() as s:
        tomado = await tomar_trabajo(s, trabajador="w-que-muere")
        await s.commit()
    assert tomado is not None

    # El trabajador muere: su cerrojo queda, pero caduca.
    await adm.execute(
        "UPDATE autopilot_jobs SET estado='scheduled', "
        "locked_until = now() - interval '1 hour' WHERE id=$1", tomado["id"])

    async with maker() as s:
        retomado = await tomar_trabajo(s, trabajador="w-que-retoma")
        await s.commit()
    assert retomado is not None and retomado["id"] == tomado["id"], (
        "un cerrojo caducado dejo el trabajo inalcanzable")


@pg
@pytest.mark.asyncio
async def test_no_se_puede_marcar_entregado_sin_evidencia(entorno):
    """EL FALLO QUE ESTO IMPIDE.

    2742 entregables de produccion estan marcados como entregados sin artefacto
    —resultaron ser sinteticos, pero el esquema lo permitia—. Aqui la base lo
    rechaza: terminar un worker no es entregar.
    """
    asyncpg = pytest.importorskip("asyncpg")
    from core.autopilot import planificar

    ws, maker, adm = entorno["ws"], entorno["maker"], entorno["adm"]
    async with maker() as s:
        job = await planificar(s, ws, "os_deliverables.snapshot_semanal", "2026-W43")
        await s.commit()

    with pytest.raises(asyncpg.exceptions.CheckViolationError):
        await adm.execute(
            "UPDATE autopilot_jobs SET estado='delivered' WHERE id=$1", job)

    # Con evidencia si se puede.
    await adm.execute(
        "UPDATE autopilot_jobs SET estado='delivered', "
        "evidencia='{\"artefacto\":\"s3://x\",\"bytes\":120}'::jsonb WHERE id=$1", job)
    assert await adm.fetchval(
        "SELECT estado FROM autopilot_jobs WHERE id=$1", job) == "delivered"


@pg
@pytest.mark.asyncio
async def test_una_capacidad_irreversible_no_puede_ser_automatica(entorno):
    """La regla vive en la base para que no dependa de que alguien la recuerde."""
    asyncpg = pytest.importorskip("asyncpg")

    with pytest.raises(asyncpg.exceptions.CheckViolationError):
        await entorno["adm"].execute(
            "INSERT INTO autopilot_capabilities "
            "(clave, servicio_os, descripcion, modo_ejecucion, reversible) "
            "VALUES ('peligro.borrar', 'os_x', 'borra cosas', "
            "        'AUTOMATIC_SAFE', false)")


@pg
@pytest.mark.asyncio
async def test_una_transicion_ilegal_se_rechaza(entorno):
    from core.autopilot import avanzar, planificar

    ws, maker = entorno["ws"], entorno["maker"]
    async with maker() as s:
        job = await planificar(s, ws, "os_deliverables.snapshot_semanal", "2026-W44")
        await s.commit()

    async with maker() as s:
        assert await avanzar(s, job, PROGRAMADO, ENTREGADO) is False, (
            "se permitio saltar de programado a entregado")


@pg
@pytest.mark.asyncio
async def test_el_trabajo_pertenece_a_su_workspace(entorno):
    """Aislamiento: la cola lleva `workspace_id` y RLS forzado."""
    adm = entorno["adm"]
    r = await adm.fetchrow(
        "SELECT relrowsecurity, relforcerowsecurity FROM pg_class "
        "WHERE oid='public.autopilot_jobs'::regclass")
    assert r[0] is True and r[1] is True, "la cola no tiene RLS forzado"
    assert await adm.fetchval(
        "SELECT count(*) FROM pg_policies WHERE schemaname='public' "
        "AND tablename='autopilot_jobs'") >= 2

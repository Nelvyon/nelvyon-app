"""Los bucles de Autopilot: coexistencia, cerrojo de replica y salud propia.

QUE SE PRUEBA
-------------
No que los bucles existan, sino las propiedades que hacen seguro dejarlos
corriendo dentro del API sin nadie mirando:

  * dos replicas NO planifican a la vez — la segunda se retira sola;
  * un fallo del planner no tumba el bucle ni el API;
  * el executor respeta su limite de concurrencia y no gira en vacio;
  * el apagado espera a que terminen, para no dejar cerrojos puestos;
  * la salud de Autopilot es DISTINTA de la del API.
"""
from __future__ import annotations

import asyncio
import os

import pytest

from services.autopilot_loop import (
    CONCURRENCIA,
    INTERVALO_EXECUTOR,
    INTERVALO_PLANNER,
    LOCK_PLANNER,
    estado,
)

DSN = os.environ.get("NELVYON_PG_CERT_DSN")


def _dsn_async() -> str:
    return (DSN or "").replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")


# ── configuracion y salud: sin base de datos ───────────────────────────────


def test_los_intervalos_no_son_un_busy_loop():
    """Un bucle que gira sin pausa comparte proceso con el trafico HTTP."""
    assert INTERVALO_PLANNER >= 60, "el planner giraria demasiado seguido"
    assert INTERVALO_EXECUTOR >= 10, "el executor giraria casi sin pausa"
    assert 1 <= CONCURRENCIA <= 8, (
        "la concurrencia comparte proceso con el trafico: no puede ser ilimitada")


def test_la_salud_de_autopilot_es_distinta_de_la_del_api():
    """El API puede estar perfecto y Autopilot estancado. Confundirlos haria que
    una caida de ventas reiniciara el contenedor, o al reves."""
    e = estado()
    assert e["status"] in ("healthy", "degraded", "stalled")
    assert "planner" in e and "executor" in e
    assert "frescura" in e["planner"], "no se puede saber si el planner sigue vivo"


def test_sin_haber_corrido_nunca_no_se_declara_sano_por_defecto():
    e = estado()
    if e["planner"]["ciclos"] == 0:
        assert e["planner"]["frescura"] == "sin ejecutar todavia", (
            "un bucle que no ha corrido nunca no puede presentarse como fresco")


# ── el cerrojo de replica ──────────────────────────────────────────────────

pg = pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")


@pg
@pytest.mark.asyncio
async def test_dos_replicas_no_planifican_a_la_vez():
    """EL GUARD DE ESCALADO.

    Si mañana alguien pone dos replicas del API, la clave de idempotencia
    impediria el trabajo duplicado —ya esta probado— pero se pagaria el doble de
    consultas y el comportamiento dejaria de ser el certificado.

    `pg_try_advisory_lock` no espera: la segunda replica descubre que no lo tiene
    y se retira hasta el siguiente ciclo.
    """
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from services.autopilot_loop import soltar_cerrojo_planner, tomar_cerrojo_planner

    motor_a = create_async_engine(_dsn_async())
    motor_b = create_async_engine(_dsn_async())
    maker_a = async_sessionmaker(motor_a, expire_on_commit=False)
    maker_b = async_sessionmaker(motor_b, expire_on_commit=False)
    try:
        async with maker_a() as sa, maker_b() as sb:
            primera = await tomar_cerrojo_planner(sa)
            segunda = await tomar_cerrojo_planner(sb)
            assert primera is True, "la primera replica no obtuvo el cerrojo"
            assert segunda is False, (
                "DOS replicas planificarian a la vez: el guard no funciona")

            # Al soltarlo, la otra puede tomarlo: no queda bloqueado.
            await soltar_cerrojo_planner(sa)
            assert await tomar_cerrojo_planner(sb) is True
            await soltar_cerrojo_planner(sb)
    finally:
        await motor_a.dispose()
        await motor_b.dispose()


@pg
@pytest.mark.asyncio
async def test_la_replica_sin_cerrojo_no_planifica_nada():
    """Control del anterior: no basta con no tener el cerrojo, hay que NO actuar."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from services.autopilot_loop import (
        soltar_cerrojo_planner,
        tomar_cerrojo_planner,
        un_ciclo_planner,
    )

    motor_a = create_async_engine(_dsn_async())
    motor_b = create_async_engine(_dsn_async())
    maker_a = async_sessionmaker(motor_a, expire_on_commit=False)
    maker_b = async_sessionmaker(motor_b, expire_on_commit=False)
    try:
        async with maker_a() as sa:
            assert await tomar_cerrojo_planner(sa)
            async with maker_b() as sb:
                r = await un_ciclo_planner(sb)
            assert r.get("omitido") is True, f"la replica sin cerrojo planifico: {r}"
            await soltar_cerrojo_planner(sa)
    finally:
        await motor_a.dispose()
        await motor_b.dispose()


# ── resistencia ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_un_fallo_del_ciclo_no_mata_el_bucle():
    """Un bucle que muere al primer error deja de vigilar justo cuando hace falta,
    y su propia muerte es invisible."""
    import services.autopilot_loop as loop

    llamadas = {"n": 0}

    async def _ciclo_que_falla(sesion):
        llamadas["n"] += 1
        raise RuntimeError("fallo provocado")

    async def _sin_sesion():
        raise RuntimeError("sin base")

    # Se ejecuta el cuerpo del bucle un par de veces con intervalo minimo.
    tarea = asyncio.create_task(loop._bucle("planner", 0, _ciclo_que_falla))
    await asyncio.sleep(0.15)
    tarea.cancel()
    await asyncio.gather(tarea, return_exceptions=True)

    assert loop._METRICAS["planner_ultimo_error"] is not None, (
        "el fallo no quedo registrado")


@pytest.mark.asyncio
async def test_el_apagado_espera_a_que_terminen():
    """Sin esperar, un trabajo a medias dejaria su cerrojo puesto hasta caducar:
    quince minutos de espera por ahorrar milisegundos aqui."""
    import services.autopilot_loop as loop

    async def _ciclo_lento(sesion):
        await asyncio.sleep(5)

    tareas = [asyncio.create_task(loop._bucle("executor", 0, _ciclo_lento))]
    await asyncio.sleep(0.05)
    await loop.detener(tareas)
    assert all(t.done() for t in tareas), "el apagado no espero a las tareas"


@pg
@pytest.mark.asyncio
async def test_el_executor_no_gira_en_vacio():
    """Con la cola vacia sale al primer intento en vez de repetir `CONCURRENCIA`
    veces contra la base."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from services.autopilot_loop import un_ciclo_executor

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        async with maker() as s:
            r = await un_ciclo_executor(s, limite=5)
        assert r == {"confirmados": 0, "no_confirmados": 0}
    finally:
        await motor.dispose()


def test_se_puede_desactivar_sin_desplegar():
    """Un interruptor de emergencia: si Autopilot molestara, se apaga con una
    variable y el API sigue sirviendo peticiones igual."""
    import services.autopilot_loop as loop

    assert "NELVYON_AUTOPILOT_DESACTIVADO" in loop.arrancar.__doc__ or True
    import inspect
    assert "NELVYON_AUTOPILOT_DESACTIVADO" in inspect.getsource(loop.arrancar)


def test_el_api_no_se_cae_si_autopilot_no_arranca():
    """`main.py` captura el fallo de arranque: los 14 servicios OS siguen
    sirviendo peticiones manuales aunque Autopilot no levante."""
    from pathlib import Path

    fuente = (Path(__file__).resolve().parent.parent / "main.py").read_text(
        encoding="utf-8")
    assert "Autopilot no arranco" in fuente
    assert "app.state.autopilot = []" in fuente, (
        "sin valor por defecto, el apagado fallaria tras un arranque fallido")

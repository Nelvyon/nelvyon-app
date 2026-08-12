"""
Un job que falla no puede parar la cola.

DEFECTO: el reintento se esperaba EN LINEA dentro del worker —
`await asyncio.sleep(delay)` con backoff hasta 300 s— antes de reencolar. El
worker quedaba ocupado todo ese tiempo por un unico job. Con 5 workers bastaban
5 jobs fallando para que la cola dejase de procesar nada, incluidos los sanos.

Ahora el reintento se PROGRAMA como tarea aparte y el worker vuelve al pool de
inmediato. La referencia a la tarea se guarda: una tarea sin referencias puede
recolectarse antes de ejecutarse y el reintento se perderia en silencio.
"""
from __future__ import annotations

import asyncio

import pytest

from core.job_queue import AsyncJobQueue, JobStatus


@pytest.mark.asyncio
async def test_un_job_que_falla_no_bloquea_a_los_demas():
    """La propiedad central, medida en tiempo real."""
    cola = AsyncJobQueue(max_workers=1)
    cola.reset_for_new_event_loop()

    sanos: list[str] = []

    async def siempre_falla(_p):
        raise RuntimeError("fallo transitorio")

    async def sano(_p):
        sanos.append("ok")
        return "ok"

    cola.register_handler("falla", siempre_falla)
    cola.register_handler("sano", sano)
    await cola.start()
    try:
        # `retry_delay` alto: si el worker esperase en linea, el job sano no se
        # procesaria dentro del plazo de este test.
        await cola.enqueue("falla", {}, max_retries=3, retry_delay=30)
        await cola.enqueue("sano", {})
        for _ in range(50):
            if sanos:
                break
            await asyncio.sleep(0.05)
        assert sanos == ["ok"], "el worker seguia bloqueado esperando el reintento"
    finally:
        await cola.stop()


@pytest.mark.asyncio
async def test_el_reintento_se_ejecuta_de_verdad():
    """
    Contraprueba: no basta con no bloquear — el job tiene que volver. Si la
    tarea se recolectase por falta de referencia, esto no llegaria a 2 intentos.
    """
    cola = AsyncJobQueue(max_workers=1)
    cola.reset_for_new_event_loop()

    intentos: list[int] = []

    async def falla_una_vez(_p):
        intentos.append(1)
        if len(intentos) < 2:
            raise RuntimeError("primer intento falla")
        return "ok"

    cola.register_handler("reintenta", falla_una_vez)
    await cola.start()
    try:
        job_id = await cola.enqueue("reintenta", {}, max_retries=3, retry_delay=0)
        for _ in range(60):
            estado = await cola.get_status(job_id)
            if estado and estado.get("status") == JobStatus.COMPLETED:
                break
            await asyncio.sleep(0.05)
        assert len(intentos) >= 2, f"el reintento no llego a ejecutarse: {intentos}"
    finally:
        await cola.stop()


@pytest.mark.asyncio
async def test_parar_la_cola_cancela_los_reintentos_pendientes():
    """Si no, quedan tareas vivas atadas a un event loop que ya no existe."""
    cola = AsyncJobQueue(max_workers=1)
    cola.reset_for_new_event_loop()

    async def falla(_p):
        raise RuntimeError("x")

    cola.register_handler("falla", falla)
    await cola.start()
    await cola.enqueue("falla", {}, max_retries=3, retry_delay=60)
    for _ in range(40):
        if cola._reintentos_pendientes:
            break
        await asyncio.sleep(0.05)
    assert cola._reintentos_pendientes, "no se programo ningun reintento"
    await cola.stop()
    assert cola._reintentos_pendientes == set(), "quedaron reintentos vivos tras parar"


@pytest.mark.asyncio
async def test_agotados_los_intentos_el_job_queda_en_estado_terminal():
    """Ni RETRYING eterno ni jobs zombis."""
    cola = AsyncJobQueue(max_workers=1)
    cola.reset_for_new_event_loop()

    async def falla(_p):
        raise RuntimeError("siempre")

    cola.register_handler("falla", falla)
    await cola.start()
    try:
        job_id = await cola.enqueue("falla", {}, max_retries=2, retry_delay=0)
        for _ in range(80):
            estado = await cola.get_status(job_id)
            if estado and estado.get("status") == JobStatus.FAILED:
                break
            await asyncio.sleep(0.05)
        estado = await cola.get_status(job_id)
        assert estado["status"] == JobStatus.FAILED, estado
        assert estado["error"], "un job fallido sin causa registrada"
    finally:
        await cola.stop()


def test_el_worker_no_vuelve_a_esperar_en_linea():
    """Regresion de forma: el `sleep` no puede volver al cuerpo del worker."""
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "core" / "job_queue.py").read_text(
        encoding="utf-8"
    )
    i = src.index("class AsyncJobQueue")
    cuerpo = src[i:]
    j = cuerpo.index("job.status = JobStatus.RETRYING")
    tramo = cuerpo[j : j + 600]
    assert "await asyncio.sleep(delay)" not in tramo, "volvio la espera en linea"
    assert "_programar_reintento" in tramo

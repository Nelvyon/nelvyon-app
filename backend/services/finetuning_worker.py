"""Background worker — auto fine-tuning retrain every 30 days when enough new examples exist."""

from __future__ import annotations

import asyncio

from core import latidos
import logging

from core.database import db_manager, sesion_de_barrido
from services.finetuning_service import FineTuningService, RETRAIN_INTERVAL_DAYS

logger = logging.getLogger(__name__)

_worker_task: asyncio.Task | None = None
_CHECK_INTERVAL_SEC = 24 * 3600  # daily scan


async def _retrain_tick() -> None:
    """Barrido CROSS-TENANT: `list_auto_retrain_candidates` devuelve N workspaces.

    Ademas la recoleccion de ejemplos de `start_auto_retrain` lee tablas con RLS
    (`social_posts`, `chatbot_conversations`, `campaigns`). Sin contexto
    devolveria conjuntos vacios y reentrenaria con nada, sin un solo error.
    Misma solucion que los otros dos barridos: `sesion_de_barrido()`.
    """
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return

    async with await sesion_de_barrido() as session:
        svc = FineTuningService(session)
        candidates = await svc.list_auto_retrain_candidates(max_age_days=RETRAIN_INTERVAL_DAYS)
        for workspace_id in candidates:
            try:
                await svc.start_auto_retrain(workspace_id)
            except Exception as exc:
                logger.debug("auto retrain skipped ws=%s: %s", workspace_id, exc)


async def _scheduler_loop() -> None:
    await asyncio.sleep(30)
    while True:
        try:
            await _retrain_tick()
            # El latido va DESPUES de la vuelta, no antes: latir al empezar
            # diria «vivo» de un bucle que se cuelga a mitad en cada iteracion.
            latidos.latir("reentrenamiento")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("Fine-tuning retrain tick error: %s", exc)
            # Un tick que falla TAMBIEN late, con su error. Si no latiera, un
            # bucle que revienta siempre se veria igual que uno muerto, y son dos
            # averias distintas con dos arreglos distintos.
            latidos.latir("reentrenamiento", error=f"{type(exc).__name__}: {exc}")
        await asyncio.sleep(_CHECK_INTERVAL_SEC)


async def start_finetuning_worker() -> None:
    global _worker_task
    if _worker_task and not _worker_task.done():
        return
    latidos.registrar("reentrenamiento", _CHECK_INTERVAL_SEC)
    _worker_task = asyncio.create_task(_scheduler_loop())
    logger.info("Fine-tuning auto-retrain worker started (interval=%ss)", _CHECK_INTERVAL_SEC)


async def stop_finetuning_worker() -> None:
    global _worker_task
    if _worker_task is None:
        return
    _worker_task.cancel()
    try:
        await _worker_task
    except asyncio.CancelledError:
        pass
    _worker_task = None

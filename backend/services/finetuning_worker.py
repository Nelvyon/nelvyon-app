"""Background worker — auto fine-tuning retrain every 30 days when enough new examples exist."""

from __future__ import annotations

import asyncio
import logging

from core.database import db_manager
from services.finetuning_service import FineTuningService, RETRAIN_INTERVAL_DAYS

logger = logging.getLogger(__name__)

_worker_task: asyncio.Task | None = None
_CHECK_INTERVAL_SEC = 24 * 3600  # daily scan


async def _retrain_tick() -> None:
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return

    async with db_manager.async_session_maker() as session:
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
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("Fine-tuning retrain tick error: %s", exc)
        await asyncio.sleep(_CHECK_INTERVAL_SEC)


async def start_finetuning_worker() -> None:
    global _worker_task
    if _worker_task and not _worker_task.done():
        return
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

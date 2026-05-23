"""Background worker — publish due scheduled social posts every 60s."""

from __future__ import annotations

import asyncio
import logging

from core.database import db_manager
from services.social_scheduler_service import SocialSchedulerService

logger = logging.getLogger(__name__)

_worker_task: asyncio.Task | None = None
_INTERVAL_SEC = 60
_BACKOFF_BASE = 2


async def _process_due_posts() -> None:
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return

    async with db_manager.async_session_maker() as session:
        svc = SocialSchedulerService(session)
        posts = await svc.fetch_due_scheduled_posts()
        for post in posts:
            post_id = str(post["id"])
            locked = await SocialSchedulerService.acquire_publish_lock(post_id)
            if not locked:
                continue
            try:
                retry = int(post.get("retry_count") or 0)
                if retry > 0:
                    delay = _BACKOFF_BASE**retry
                    await asyncio.sleep(min(delay, 30))
                result = await svc.publish_post_by_id(post_id)
                status = result.get("status")
                if status == "failed":
                    await svc.increment_retry(
                        post_id, result.get("error_message") or "Publish failed"
                    )
            except Exception as exc:
                logger.warning("Social publish failed for %s: %s", post_id, exc)
                try:
                    await svc.increment_retry(post_id, str(exc)[:500])
                except Exception:
                    pass
            finally:
                await SocialSchedulerService.release_publish_lock(post_id)


async def _scheduler_loop() -> None:
    await asyncio.sleep(5)
    while True:
        try:
            await _process_due_posts()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("Social scheduler tick error: %s", exc)
        await asyncio.sleep(_INTERVAL_SEC)


async def start_social_scheduler_worker() -> None:
    global _worker_task
    if _worker_task and not _worker_task.done():
        return
    _worker_task = asyncio.create_task(_scheduler_loop())
    logger.info("Social scheduler worker started (interval=%ss)", _INTERVAL_SEC)


async def stop_social_scheduler_worker() -> None:
    global _worker_task
    if _worker_task is None:
        return
    _worker_task.cancel()
    try:
        await _worker_task
    except asyncio.CancelledError:
        pass
    _worker_task = None
    logger.info("Social scheduler worker stopped")

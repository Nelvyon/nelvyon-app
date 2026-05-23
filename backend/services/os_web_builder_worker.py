"""Background worker — async AI website generation."""

from __future__ import annotations

import asyncio
import logging

from core.database import db_manager
from services.os_web_builder_service import OsWebBuilderService

logger = logging.getLogger(__name__)

_generation_tasks: dict[str, asyncio.Task] = {}


async def _run_generation(project_id: str) -> None:
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        logger.error("OS web generation skipped — DB unavailable")
        return
    try:
        async with db_manager.async_session_maker() as session:
            svc = OsWebBuilderService(session)
            await svc.generate_website_with_ai(project_id)
    except Exception as exc:
        logger.exception("OS web generation failed for %s: %s", project_id, exc)
        try:
            async with db_manager.async_session_maker() as session:
                svc = OsWebBuilderService(session)
                await svc._set_project_status(project_id, "error", str(exc)[:2000])
        except Exception:
            pass
    finally:
        _generation_tasks.pop(project_id, None)


def start_website_generation(project_id: str) -> None:
    existing = _generation_tasks.get(project_id)
    if existing and not existing.done():
        return
    _generation_tasks[project_id] = asyncio.create_task(_run_generation(project_id))
    logger.info("OS web generation task started for project %s", project_id)


async def stop_website_generation_workers() -> None:
    tasks = list(_generation_tasks.values())
    for task in tasks:
        task.cancel()
    for task in tasks:
        try:
            await task
        except asyncio.CancelledError:
            pass
    _generation_tasks.clear()

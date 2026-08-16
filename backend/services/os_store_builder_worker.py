"""Background worker — async AI store generation."""

from __future__ import annotations

import asyncio
import logging

from core.database import db_manager
from core.tenant_context import (
    contexto_de_inquilino,
    get_tenant_context,
    get_tenant_user_id,
)
from services.os_store_builder_service import OsStoreBuilderService

logger = logging.getLogger(__name__)

_generation_tasks: dict[str, asyncio.Task] = {}


async def _run_generation(
    project_id: str, tenant_id: int | None = None, user_id: str | None = None
) -> None:
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        logger.error("OS store generation skipped — DB unavailable")
        return
    try:
        with contexto_de_inquilino(tenant_id, user_id):
            async with db_manager.async_session_maker() as session:
                svc = OsStoreBuilderService(session)
                await svc.generate_store_with_ai(project_id)
    except Exception as exc:
        logger.exception("OS store generation failed for %s: %s", project_id, exc)
        try:
            with contexto_de_inquilino(tenant_id, user_id):
                async with db_manager.async_session_maker() as session:
                    svc = OsStoreBuilderService(session)
                    await svc.mark_error(project_id, str(exc)[:2000])
        except Exception:
            pass
    finally:
        _generation_tasks.pop(project_id, None)


def start_store_generation(project_id: str) -> None:
    """Arranca la generacion llevandose el inquilino de la peticion que la pide.

    Mismo razonamiento que `os_web_builder_worker.start_website_generation`: la
    herencia de ContextVar que hace `create_task` funciona, pero es implicita.
    Se lee aqui, todavia dentro de la peticion, y viaja como argumento.
    """
    existing = _generation_tasks.get(project_id)
    if existing and not existing.done():
        return
    tenant_id = get_tenant_context()
    user_id = get_tenant_user_id()
    _generation_tasks[project_id] = asyncio.create_task(
        _run_generation(project_id, tenant_id, user_id)
    )
    logger.info("OS store generation task started for project %s", project_id)


async def stop_store_generation_workers() -> None:
    tasks = list(_generation_tasks.values())
    for task in tasks:
        task.cancel()
    for task in tasks:
        try:
            await task
        except asyncio.CancelledError:
            pass
    _generation_tasks.clear()

"""Background worker — async AI website generation."""

from __future__ import annotations

import asyncio
import logging

from core.database import db_manager
from core.tenant_context import (
    contexto_de_inquilino,
    get_tenant_context,
    get_tenant_user_id,
)
from services.os_web_builder_service import OsWebBuilderService

logger = logging.getLogger(__name__)

_generation_tasks: dict[str, asyncio.Task] = {}


async def _run_generation(
    project_id: str, tenant_id: int | None = None, user_id: str | None = None
) -> None:
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        logger.error("OS web generation skipped — DB unavailable")
        return
    try:
        with contexto_de_inquilino(tenant_id, user_id):
            async with db_manager.async_session_maker() as session:
                svc = OsWebBuilderService(session)
                await svc.generate_website_with_ai(project_id)
    except Exception as exc:
        logger.exception("OS web generation failed for %s: %s", project_id, exc)
        try:
            with contexto_de_inquilino(tenant_id, user_id):
                async with db_manager.async_session_maker() as session:
                    svc = OsWebBuilderService(session)
                    await svc._set_project_status(project_id, "error", str(exc)[:2000])
        except Exception:
            pass
    finally:
        _generation_tasks.pop(project_id, None)


def start_website_generation(project_id: str) -> None:
    """Arranca la generacion llevandose el inquilino de la peticion que la pide.

    POR QUE SE COPIA A MANO SI `create_task` YA COPIA EL CONTEXTO
    -------------------------------------------------------------
    `asyncio.create_task` congela un `copy_context()`, asi que hoy la tarea si
    hereda el ContextVar de la peticion. Pero esa herencia es implicita y
    fragil: basta con mover la llamada a un hilo, a un `run_in_executor` o a
    otro bucle para que el contexto llegue vacio — y bajo un rol sin BYPASSRLS
    ese cambio no reventaria nada. El proyecto simplemente dejaria de
    encontrarse y la generacion se quedaria en `generating` para siempre, sin un
    solo error en los logs.

    Leer el inquilino AQUI —todavia dentro de la peticion— y pasarlo como
    argumento convierte esa herencia implicita en un dato explicito, visible en
    la firma y comprobable en un test.
    """
    existing = _generation_tasks.get(project_id)
    if existing and not existing.done():
        return
    tenant_id = get_tenant_context()
    user_id = get_tenant_user_id()
    _generation_tasks[project_id] = asyncio.create_task(
        _run_generation(project_id, tenant_id, user_id)
    )
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

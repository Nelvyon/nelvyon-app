"""
NELVYON Fase 5–6 — handlers de job queue con contexto tenant.

- ``nelvyon_workspace_audit``: persiste un evento en ``security_events`` solo si
  el actor tiene acceso real al workspace (owner o miembro activo).
- ``nelvyon_workspace_crm_snapshot``: valida membresía + módulo CRM del plan,
  cuenta contactos del workspace y audita métricas (sin mutar CRM).
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy import select

from core.database import db_manager
from models.workspace_members import Workspace_members
from models.workspaces import Workspaces

from services.audit_events import write_audit_event
from services.plan_quota import (
    count_contacts_in_workspace,
    enforce_contacts_plan_module_for_crm_writes,
    get_active_plan_id_for_workspace,
)

logger = logging.getLogger(__name__)

JOB_TYPE_NELVYON_WORKSPACE_AUDIT = "nelvyon_workspace_audit"
JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT = "nelvyon_workspace_crm_snapshot"


async def _actor_has_workspace_access(
    session, *, user_id: str, workspace_id: int
) -> bool:
    own = await session.execute(
        select(Workspaces).where(
            Workspaces.id == workspace_id,
            Workspaces.user_id == user_id,
        )
    )
    if own.scalar_one_or_none():
        return True
    mem = await session.execute(
        select(Workspace_members)
        .where(
            Workspace_members.workspace_id == workspace_id,
            Workspace_members.user_id == user_id,
            Workspace_members.status == "active",
        )
        .limit(1)
    )
    return mem.scalars().first() is not None


async def handle_nelvyon_workspace_audit(payload: Dict[str, Any]) -> str:
    """
    Payload requerido:
      - workspace_id (int)
      - actor_user_id (str)

    Opcional: actor_email, action, correlation_id, actor_role_in_workspace (solo metadatos de auditoría).
    """
    raw_ws = payload.get("workspace_id")
    actor_user_id = payload.get("actor_user_id")
    if raw_ws is None or not actor_user_id:
        raise ValueError("workspace_id and actor_user_id are required")
    try:
        workspace_id = int(raw_ws)
    except (TypeError, ValueError) as exc:
        raise ValueError("workspace_id must be an integer") from exc
    actor_user_id = str(actor_user_id)
    if workspace_id <= 0:
        raise ValueError("workspace_id must be positive")

    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        raise RuntimeError("Database not initialized for job handler")

    action = str(payload.get("action") or "background_audit")[:120]
    correlation_id = payload.get("correlation_id")
    resource_id = (
        json.dumps(
            {
                "correlation_id": correlation_id,
                "actor_role_in_workspace": payload.get("actor_role_in_workspace"),
            },
            default=str,
        )[:400]
    )

    async with db_manager.async_session_maker() as session:
        if not await _actor_has_workspace_access(
            session, user_id=actor_user_id, workspace_id=workspace_id
        ):
            raise ValueError("Actor is not a member of the target workspace")

        plan_id = await get_active_plan_id_for_workspace(session, workspace_id)

        await write_audit_event(
            session,
            actor_user_id=actor_user_id,
            actor_email=payload.get("actor_email"),
            workspace_id=workspace_id,
            action=action,
            resource_type="job_queue",
            resource_id=resource_id,
            result="ok",
            event_type="saas.job.nelvyon_workspace_audit",
            severity="info",
            commit=True,
        )
        logger.info(
            "nelvyon_workspace_audit job ok workspace_id=%s plan_id=%s",
            workspace_id,
            plan_id,
        )
    return "audit_written"


async def handle_nelvyon_workspace_crm_snapshot(payload: Dict[str, Any]) -> str:
    """
    Job de negocio: valida miembro + módulo CRM del plan, cuenta contactos del workspace
    y persiste un evento de auditoría con métricas (sin mutar contactos).
    """
    raw_ws = payload.get("workspace_id")
    actor_user_id = payload.get("actor_user_id")
    if raw_ws is None or not actor_user_id:
        raise ValueError("workspace_id and actor_user_id are required")
    try:
        workspace_id = int(raw_ws)
    except (TypeError, ValueError) as exc:
        raise ValueError("workspace_id must be an integer") from exc
    actor_user_id = str(actor_user_id)
    if workspace_id <= 0:
        raise ValueError("workspace_id must be positive")

    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        raise RuntimeError("Database not initialized for job handler")

    async with db_manager.async_session_maker() as session:
        if not await _actor_has_workspace_access(
            session, user_id=actor_user_id, workspace_id=workspace_id
        ):
            raise ValueError("Actor is not a member of the target workspace")
        try:
            await enforce_contacts_plan_module_for_crm_writes(session, workspace_id)
        except HTTPException as exc:
            raise ValueError(str(exc.detail)) from exc

        plan_id = await get_active_plan_id_for_workspace(session, workspace_id)
        contact_count = await count_contacts_in_workspace(session, workspace_id)
        meta = json.dumps(
            {"plan_id": plan_id, "contact_count": contact_count},
            default=str,
        )[:400]

        await write_audit_event(
            session,
            actor_user_id=actor_user_id,
            actor_email=payload.get("actor_email"),
            workspace_id=workspace_id,
            action=str(payload.get("action") or "crm_snapshot")[:120],
            resource_type="job_queue",
            resource_id=meta,
            result="ok",
            event_type="saas.job.workspace_crm_snapshot",
            severity="info",
            commit=True,
        )
        logger.info(
            "nelvyon_workspace_crm_snapshot ok workspace_id=%s plan_id=%s contacts=%s",
            workspace_id,
            plan_id,
            contact_count,
        )
    return "crm_snapshot_written"


def register_nelvyon_job_handlers() -> None:
    from core.job_queue import job_queue
    from core.productive_job_handlers import register_contract_job_handlers

    register_contract_job_handlers(job_queue)
    job_queue.register_handler(JOB_TYPE_NELVYON_WORKSPACE_AUDIT, handle_nelvyon_workspace_audit)
    job_queue.register_handler(
        JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT, handle_nelvyon_workspace_crm_snapshot
    )

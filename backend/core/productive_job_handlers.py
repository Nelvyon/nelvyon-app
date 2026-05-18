"""
Fase 10 — handlers reales para jobs contratados (email, report, webhook, cleanup).

Cada handler valida membresía de workspace (actor_user_id + workspace_id),
ejecuta un efecto observable (auditoría, HTTP saliente, SMTP si hay credenciales,
o DELETE acotado por workspace en security_events) y devuelve un resumen corto.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Dict

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from models.workspace_members import Workspace_members
from models.workspaces import Workspaces

logger = logging.getLogger(__name__)


async def _actor_has_workspace_access(
    session: AsyncSession, *, user_id: str, workspace_id: int
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


def _ws_actor(payload: Dict[str, Any]) -> tuple[int, str]:
    raw_ws = payload.get("workspace_id")
    actor = payload.get("actor_user_id")
    if raw_ws is None or not actor:
        raise ValueError("workspace_id and actor_user_id are required")
    try:
        workspace_id = int(raw_ws)
    except (TypeError, ValueError) as exc:
        raise ValueError("workspace_id must be an integer") from exc
    if workspace_id <= 0:
        raise ValueError("workspace_id must be positive")
    return workspace_id, str(actor)


async def handle_contract_email(payload: Dict[str, Any]) -> str:
    workspace_id, actor_user_id = _ws_actor(payload)
    to_addr = str(payload["to"]).strip()
    subject = str(payload["subject"]).strip()
    body = (payload.get("body") or "").strip()
    if not body and payload.get("template_id"):
        body = f"(render template_id={payload.get('template_id')})"

    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        raise RuntimeError("Database not initialized for job handler")

    from services.audit_events import write_audit_event

    smtp_host = (os.environ.get("SMTP_HOST") or "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT") or "587")
    smtp_user = (os.environ.get("SMTP_USER") or "").strip()
    smtp_password = (os.environ.get("SMTP_PASSWORD") or "").strip()
    smtp_from = (os.environ.get("SMTP_FROM") or smtp_user or "noreply@nelvyon.local").strip()

    delivery = "audit_only"
    async with db_manager.async_session_maker() as session:
        if not await _actor_has_workspace_access(
            session, user_id=actor_user_id, workspace_id=workspace_id
        ):
            raise ValueError("Actor is not a member of the target workspace")

        if smtp_host and smtp_from:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = to_addr
            msg.set_content(body or "(empty body)")
            try:

                def _send_sync() -> None:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as smtp:
                        if smtp_user and smtp_password:
                            smtp.starttls()
                            smtp.login(smtp_user, smtp_password)
                        smtp.send_message(msg)

                await asyncio.to_thread(_send_sync)
                delivery = "smtp_sent"
            except Exception as exc:
                logger.warning("SMTP send failed, falling back to audit: %s", exc)
                delivery = "smtp_failed_audit"

        await write_audit_event(
            session,
            actor_user_id=actor_user_id,
            actor_email=payload.get("actor_email"),
            workspace_id=workspace_id,
            action="email_job",
            resource_type="job_queue",
            resource_id=json.dumps(
                {"to_domain": to_addr.split("@")[-1] if "@" in to_addr else "?", "delivery": delivery},
                default=str,
            )[:400],
            result="ok",
            event_type="saas.job.email",
            severity="info",
            commit=True,
        )
    return delivery


async def handle_contract_report(payload: Dict[str, Any]) -> str:
    workspace_id, actor_user_id = _ws_actor(payload)
    report_type = str(payload["report_type"]).strip()

    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        raise RuntimeError("Database not initialized for job handler")

    from services.audit_events import write_audit_event
    from services.plan_quota import count_contacts_in_workspace, get_active_plan_id_for_workspace

    async with db_manager.async_session_maker() as session:
        if not await _actor_has_workspace_access(
            session, user_id=actor_user_id, workspace_id=workspace_id
        ):
            raise ValueError("Actor is not a member of the target workspace")
        plan_id = await get_active_plan_id_for_workspace(session, workspace_id)
        contact_count = await count_contacts_in_workspace(session, workspace_id)
        meta = json.dumps(
            {"report_type": report_type, "plan_id": plan_id, "contact_count": contact_count},
            default=str,
        )[:400]
        await write_audit_event(
            session,
            actor_user_id=actor_user_id,
            actor_email=payload.get("actor_email"),
            workspace_id=workspace_id,
            action="report_job",
            resource_type="job_queue",
            resource_id=meta,
            result="ok",
            event_type="saas.job.report",
            severity="info",
            commit=True,
        )
    return "report_audited"


async def handle_contract_webhook(payload: Dict[str, Any]) -> str:
    workspace_id, actor_user_id = _ws_actor(payload)
    url = str(payload["url"]).strip()
    method = str(payload["method"]).strip().upper()
    body = payload.get("payload")

    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        raise RuntimeError("Database not initialized for job handler")

    from services.audit_events import write_audit_event

    import httpx

    async with db_manager.async_session_maker() as session:
        if not await _actor_has_workspace_access(
            session, user_id=actor_user_id, workspace_id=workspace_id
        ):
            raise ValueError("Actor is not a member of the target workspace")

    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        if method == "GET":
            resp = await client.get(url)
        elif method == "POST":
            resp = await client.post(url, json=body)
        elif method == "PUT":
            resp = await client.put(url, json=body)
        elif method == "PATCH":
            resp = await client.patch(url, json=body)
        else:
            raise ValueError(f"Unsupported HTTP method for webhook job: {method}")
        status = resp.status_code
        if status >= 500:
            raise RuntimeError(f"webhook upstream 5xx: {status}")

    async with db_manager.async_session_maker() as session:
        await write_audit_event(
            session,
            actor_user_id=actor_user_id,
            actor_email=payload.get("actor_email"),
            workspace_id=workspace_id,
            action="webhook_job",
            resource_type="job_queue",
            resource_id=json.dumps({"url": url[:200], "method": method, "status": status}, default=str)[
                :400
            ],
            result="ok",
            event_type="saas.job.webhook",
            severity="info",
            commit=True,
        )
    return f"webhook_http_{status}"


async def handle_contract_cleanup(payload: Dict[str, Any]) -> str:
    workspace_id, actor_user_id = _ws_actor(payload)
    days = int(payload["older_than_days"])
    target = str(payload["target"]).strip()

    if target != "saas_job_audits":
        raise ValueError("cleanup target not implemented for this handler")

    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        raise RuntimeError("Database not initialized for job handler")

    from services.audit_events import write_audit_event

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_naive = cutoff.replace(tzinfo=None)

    async with db_manager.async_session_maker() as session:
        if not await _actor_has_workspace_access(
            session, user_id=actor_user_id, workspace_id=workspace_id
        ):
            raise ValueError("Actor is not a member of the target workspace")

        result = await session.execute(
            text(
                """
                DELETE FROM security_events
                WHERE event_type IN (
                    'saas.job.email', 'saas.job.report', 'saas.job.webhook', 'saas.job.cleanup_run'
                )
                AND created_at < :cutoff
                AND CAST(json_extract(details_json, '$.workspace_id') AS INTEGER) = :ws
                """
            ),
            {"cutoff": cutoff_naive, "ws": workspace_id},
        )
        deleted = result.rowcount or 0
        await write_audit_event(
            session,
            actor_user_id=actor_user_id,
            actor_email=payload.get("actor_email"),
            workspace_id=workspace_id,
            action="cleanup_job",
            resource_type="job_queue",
            resource_id=json.dumps({"deleted": deleted, "older_than_days": days}, default=str)[:400],
            result="ok",
            event_type="saas.job.cleanup_run",
            severity="info",
            commit=True,
        )
    return f"cleanup_deleted_{deleted}"


def register_contract_job_handlers(job_queue: Any) -> None:
    job_queue.register_handler("email", handle_contract_email)
    job_queue.register_handler("report", handle_contract_report)
    job_queue.register_handler("webhook", handle_contract_webhook)
    job_queue.register_handler("cleanup", handle_contract_cleanup)

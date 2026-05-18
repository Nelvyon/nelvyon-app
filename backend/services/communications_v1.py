"""
CANALES Y COMUNICACIONES NELVYON v1 — outbound transactional email hooks.

Uses existing EmailQueue / EmailService (no voice, no mass campaigns).
Failures are logged and never break primary mutations (tickets, projects).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.helpdesk_tickets import Helpdesk_tickets
from models.nelvyon_projects import Nelvyon_projects
from models.workflow_rules import EmailQueue
from services.email_service import EmailService, validate_email

logger = logging.getLogger(__name__)


async def after_ticket_created(
    db: AsyncSession,
    *,
    user_id: str,
    workspace_id: int,
    ticket: Helpdesk_tickets,
    requester_email: Optional[str],
) -> None:
    """Notify client email when present; otherwise the requester (operator) gets a short receipt."""
    try:
        svc = EmailService(db)
        to = (ticket.client_email or "").strip() if ticket.client_email else ""
        if not validate_email(to):
            to = (requester_email or "").strip()
        if not validate_email(to):
            logger.debug("communications_v1: skip ticket email (no valid recipient) ticket_id=%s", ticket.id)
            return
        await svc.send_ticket_notification(
            user_id=user_id,
            to_email=to,
            ticket_subject=ticket.subject or "Ticket",
            ticket_id=int(ticket.id),
            event_type="created",
            workspace_id=workspace_id,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("communications_v1: ticket notify failed ticket_id=%s err=%s", getattr(ticket, "id", "?"), exc)


async def after_project_created(
    db: AsyncSession,
    *,
    user_id: str,
    workspace_id: int,
    project: Nelvyon_projects,
    requester_email: Optional[str],
) -> None:
    """Notify the operator who created the project (workspace-scoped draft signal)."""
    try:
        to = (requester_email or "").strip()
        if not validate_email(to):
            logger.debug("communications_v1: skip project email (no valid recipient) project_id=%s", project.id)
            return
        svc = EmailService(db)
        name = project.name or "Project"
        pid = int(project.id)
        subject = f"[Project #{pid}] New draft recorded: {name}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">New project draft</h2>
            <p><strong>Project:</strong> #{pid} — {name}</p>
            <p><strong>Status:</strong> {project.status or "—"}</p>
            <p style="color:#64748b;font-size:13px;">This is a workspace-scoped transactional notice.
            Mass campaigns and voice are not part of this channel yet.</p>
        </div>
        """
        await svc.send_email(
            user_id=user_id,
            to_email=to,
            subject=subject,
            body_html=body_html,
            body_text=f"New project draft #{pid}: {name}",
            email_type="channels_project_created_v1",
            workspace_id=workspace_id,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("communications_v1: project notify failed project_id=%s err=%s", getattr(project, "id", "?"), exc)


async def send_signup_confirmation_email(
    db: AsyncSession,
    *,
    user_id: str,
    workspace_id: int,
    to_email: str,
    to_name: Optional[str],
    workspace_label: str,
) -> dict:
    """Explicit confirmation-of-access email (transactional)."""
    svc = EmailService(db)
    subject = "Your workspace access is confirmed"
    safe_name = (to_name or to_email.split("@")[0]).strip() or "there"
    body_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Welcome to your workspace</h2>
        <p>Hi {safe_name},</p>
        <p>Your access to <strong>{workspace_label}</strong> is active. You can sign in to NELVYON and continue with projects and support as your role allows.</p>
        <p style="color:#64748b;font-size:13px;">This message is transactional only — not a marketing campaign.</p>
    </div>
    """
    return await svc.send_email(
        user_id=user_id,
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        body_text=f"Hi {safe_name}, your access to {workspace_label} is active.",
        to_name=to_name,
        email_type="channels_signup_confirmation_v1",
        workspace_id=workspace_id,
    )


async def build_workspace_day_summary(
    db: AsyncSession,
    *,
    workspace_id: int,
    stats_user_id: str,
) -> dict[str, Any]:
    """Simple read-only snapshot: today's ticket/project counts + email queue tail."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    tickets_q = select(func.count()).select_from(Helpdesk_tickets).where(
        Helpdesk_tickets.workspace_id == workspace_id,
        Helpdesk_tickets.created_at.isnot(None),
        Helpdesk_tickets.created_at >= start,
    )
    projects_q = select(func.count()).select_from(Nelvyon_projects).where(
        Nelvyon_projects.workspace_id == workspace_id,
        Nelvyon_projects.created_at.isnot(None),
        Nelvyon_projects.created_at >= start,
    )
    tickets_today = int((await db.execute(tickets_q)).scalar() or 0)
    projects_today = int((await db.execute(projects_q)).scalar() or 0)

    svc = EmailService(db)
    email_stats = await svc.get_email_stats(stats_user_id, workspace_id=workspace_id)

    recent_q = (
        select(EmailQueue)
        .where(EmailQueue.workspace_id == workspace_id)
        .order_by(EmailQueue.id.desc())
        .limit(10)
    )
    rows = (await db.execute(recent_q)).scalars().all()
    recent = [
        {
            "id": r.id,
            "to_email": r.to_email,
            "subject": r.subject,
            "status": r.status,
            "email_type": r.email_type,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

    return {
        "period_utc_date": now.date().isoformat(),
        "tickets_created_today": tickets_today,
        "projects_created_today": projects_today,
        "email": email_stats,
        "recent_email_events": recent,
    }

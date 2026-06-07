"""OS transactional emails — portal invites and deliverable lifecycle (SendGrid via EmailService)."""
from __future__ import annotations

import logging
import os
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_clients import Os_clients
from models.os_portal_users import Os_portal_users
from services.email_service import EmailService
from services.os_audit_service import record_os_event

logger = logging.getLogger(__name__)

OS_SYSTEM_USER_ID = "os-notification-system"


def _frontend_base_url() -> str:
    return (
        os.environ.get("FRONTEND_APP_URL", "").strip()
        or os.environ.get("NEXT_PUBLIC_APP_URL", "").strip()
        or "https://nelvyon.com"
    ).rstrip("/")


def _provider_name() -> str:
    return "sendgrid" if os.environ.get("SENDGRID_API_KEY", "").strip() else "none (queued)"


async def _portal_recipients(
    db: AsyncSession, *, workspace_id: int, client_id: str
) -> list[str]:
    q = select(Os_portal_users.email).where(
        Os_portal_users.workspace_id == workspace_id,
        Os_portal_users.client_id == client_id,
        Os_portal_users.status == "active",
    )
    rows = (await db.execute(q)).scalars().all()
    emails = [str(e).strip().lower() for e in rows if e]
    cq = select(Os_clients).where(
        Os_clients.id == client_id,
        Os_clients.workspace_id == workspace_id,
    )
    crow = (await db.execute(cq)).scalar_one_or_none()
    if crow and crow.contact_email:
        ce = str(crow.contact_email).strip().lower()
        if ce and ce not in emails:
            emails.append(ce)
    return emails


async def _send_many(
    db: AsyncSession,
    *,
    workspace_id: int,
    actor_user_id: str,
    recipients: Iterable[str],
    subject: str,
    body_html: str,
    email_type: str,
) -> None:
    unique = []
    seen: set[str] = set()
    for raw in recipients:
        email = str(raw).strip().lower()
        if not email or email in seen:
            continue
        seen.add(email)
        unique.append(email)
    if not unique:
        logger.info("OS notification skipped (%s): no recipients", email_type)
        return

    service = EmailService(db)
    for to in unique:
        try:
            result = await service.send_email(
                user_id=actor_user_id or OS_SYSTEM_USER_ID,
                to_email=to,
                subject=subject,
                body_html=body_html,
                email_type=email_type,
                workspace_id=workspace_id,
            )
            status = str(result.get("status") or "unknown")
            logger.info(
                "OS notification %s to=%s status=%s provider=%s",
                email_type,
                to,
                status,
                _provider_name(),
            )
            await record_os_event(
                db,
                category="email",
                action=email_type,
                resource_type="email",
                resource_id=to,
                result="success" if status not in ("failed", "error") else "error",
                workspace_id=workspace_id,
                actor_user_id=actor_user_id or OS_SYSTEM_USER_ID,
            )
        except Exception as exc:
            logger.warning("OS notification %s failed for %s: %s", email_type, to, exc)
            await record_os_event(
                db,
                category="email",
                action=email_type,
                resource_type="email",
                resource_id=to,
                result="error",
                workspace_id=workspace_id,
                actor_user_id=actor_user_id or OS_SYSTEM_USER_ID,
            )


async def notify_portal_invite_created(
    db: AsyncSession,
    *,
    workspace_id: int,
    email: str,
    token: str,
    client_name: str,
    created_by_user_id: str,
) -> None:
    link = f"{_frontend_base_url()}/client/accept-invite?token={token}"
    subject = f"Invitación al portal de cliente — {client_name}"
    body = (
        f"<p>Has sido invitado al portal de cliente de <strong>{client_name}</strong>.</p>"
        f"<p><a href=\"{link}\">Activar cuenta</a> (válido 7 días).</p>"
        f"<p>Si el enlace no funciona, copia: {link}</p>"
    )
    await _send_many(
        db,
        workspace_id=workspace_id,
        actor_user_id=created_by_user_id,
        recipients=[email],
        subject=subject,
        body_html=body,
        email_type="os_portal_invite",
    )


async def notify_deliverable_published(
    db: AsyncSession,
    *,
    workspace_id: int,
    client_id: str,
    deliverable_title: str,
    actor_user_id: str = OS_SYSTEM_USER_ID,
) -> None:
    recipients = await _portal_recipients(db, workspace_id=workspace_id, client_id=client_id)
    portal_url = f"{_frontend_base_url()}/portal/deliverables"
    subject = f"Nuevo entregable disponible: {deliverable_title}"
    body = (
        f"<p>El entregable <strong>{deliverable_title}</strong> está publicado y listo para tu revisión.</p>"
        f"<p><a href=\"{portal_url}\">Abrir portal</a></p>"
    )
    await _send_many(
        db,
        workspace_id=workspace_id,
        actor_user_id=actor_user_id,
        recipients=recipients,
        subject=subject,
        body_html=body,
        email_type="os_deliverable_published",
    )


async def notify_deliverable_revision_requested(
    db: AsyncSession,
    *,
    workspace_id: int,
    client_id: str,
    deliverable_title: str,
    feedback: str,
    actor_user_id: str = OS_SYSTEM_USER_ID,
) -> None:
    """Cliente solicitó cambios — confirmación al contacto/portal users."""
    recipients = await _portal_recipients(db, workspace_id=workspace_id, client_id=client_id)
    subject = f"Cambios solicitados registrados: {deliverable_title}"
    safe_feedback = (feedback or "").replace("<", "&lt;").replace(">", "&gt;")
    body = (
        f"<p>Hemos registrado tu solicitud de cambios sobre <strong>{deliverable_title}</strong>.</p>"
        f"<p><strong>Comentario:</strong> {safe_feedback or '—'}</p>"
        f"<p>El equipo preparará una nueva versión.</p>"
    )
    await _send_many(
        db,
        workspace_id=workspace_id,
        actor_user_id=actor_user_id,
        recipients=recipients,
        subject=subject,
        body_html=body,
        email_type="os_deliverable_revision_requested",
    )


async def notify_deliverable_revision_started(
    db: AsyncSession,
    *,
    workspace_id: int,
    client_id: str,
    deliverable_title: str,
    version: int,
    actor_user_id: str = OS_SYSTEM_USER_ID,
) -> None:
    recipients = await _portal_recipients(db, workspace_id=workspace_id, client_id=client_id)
    subject = f"Nueva revisión en preparación: {deliverable_title}"
    body = (
        f"<p>Estamos preparando la versión <strong>v{version}</strong> de "
        f"<strong>{deliverable_title}</strong>.</p>"
        f"<p>Te avisaremos cuando esté publicada en el portal.</p>"
    )
    await _send_many(
        db,
        workspace_id=workspace_id,
        actor_user_id=actor_user_id,
        recipients=recipients,
        subject=subject,
        body_html=body,
        email_type="os_deliverable_revision_started",
    )


def email_provider_info() -> dict[str, str]:
    return {
        "provider": _provider_name(),
        "from_email": os.environ.get("SENDGRID_FROM_EMAIL", "nelvyon@noreply.com"),
        "configured": str(bool(os.environ.get("SENDGRID_API_KEY", "").strip())).lower(),
    }

"""
Email Service Router — Send emails, check status, retry failed, and manage email operations.

Production-grade features:
- Send transactional and campaign emails
- Welcome email automation
- Email retry for failed sends
- Comprehensive email statistics
- Helpdesk ticket notification emails
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/email", tags=["email"])


# ─── Schemas ───

class SendEmailRequest(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_html: str
    body_text: Optional[str] = None
    email_type: str = "transactional"


class SendEmailResponse(BaseModel):
    email_id: int
    status: str
    to: str
    message: str


class EmailStatsResponse(BaseModel):
    total: int
    sent: int
    pending: int
    failed: int
    sendgrid_configured: bool
    sdk_available: bool = False


class RetryResponse(BaseModel):
    retried: int
    succeeded: int
    remaining_failed: int
    message: Optional[str] = None


class TicketNotificationRequest(BaseModel):
    to_email: str
    ticket_subject: str
    ticket_id: int
    event_type: str = "created"


# ─── Endpoints ───

@router.post("/send", response_model=SendEmailResponse)
async def send_email(
    data: SendEmailRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send an email or queue it if SendGrid is not configured."""
    service = EmailService(db)
    result = await service.send_email(
        user_id=str(current_user.id),
        to_email=data.to_email,
        subject=data.subject,
        body_html=data.body_html,
        body_text=data.body_text,
        to_name=data.to_name,
        email_type=data.email_type,
        workspace_id=ctx.workspace_id,
    )
    return SendEmailResponse(**result)


@router.post("/welcome")
async def send_welcome(
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a welcome email to the current user."""
    service = EmailService(db)
    result = await service.send_welcome_email(
        user_id=str(current_user.id),
        to_email=current_user.email,
        user_name=current_user.name or current_user.email.split("@")[0],
        workspace_id=ctx.workspace_id,
    )
    return result


@router.post("/ticket-notification", response_model=SendEmailResponse)
async def send_ticket_notification(
    data: TicketNotificationRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a helpdesk ticket notification email."""
    service = EmailService(db)
    result = await service.send_ticket_notification(
        user_id=str(current_user.id),
        to_email=data.to_email,
        ticket_subject=data.ticket_subject,
        ticket_id=data.ticket_id,
        event_type=data.event_type,
        workspace_id=ctx.workspace_id,
    )
    return SendEmailResponse(**result)


@router.post("/retry-failed", response_model=RetryResponse)
async def retry_failed_emails(
    limit: int = Query(50, ge=1, le=500, description="Max emails to retry"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retry sending failed emails. Requires SendGrid to be configured."""
    service = EmailService(db)
    result = await service.retry_failed_emails(str(current_user.id), limit=limit)
    return RetryResponse(**result)


@router.get("/stats", response_model=EmailStatsResponse)
async def get_email_stats(
    ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get email sending statistics."""
    service = EmailService(db)
    stats = await service.get_email_stats(str(current_user.id), workspace_id=ctx.workspace_id)
    return EmailStatsResponse(**stats)


@router.get("/health")
async def email_health(
    db: AsyncSession = Depends(get_db),
):
    """
    Check email service health — verifies SendGrid API key validity
    by calling the SendGrid /v3/user/profile endpoint.
    """
    service = EmailService(db)
    health = await service.health_check()

    # Add feature matrix
    has_key = health.get("sendgrid_api_key_set", False)
    health["features"] = {
        "transactional": True,
        "campaign": True,
        "welcome": True,
        "ticket_notification": True,
        "retry": has_key,
        "unsubscribe_headers_rfc8058": True,
        "open_tracking": has_key,
        "click_tracking": has_key,
        "sdk_integration": health.get("sdk_available", False),
        "http_fallback": True,
        "email_validation": True,
    }
    return health
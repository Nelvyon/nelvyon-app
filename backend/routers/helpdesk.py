"""Multichannel helpdesk API — WhatsApp + email inbox."""

from __future__ import annotations

import logging
from typing import Any, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.i18n import request_language, t
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.helpdesk_service import default_helpdesk_workspace_id, get_helpdesk_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/helpdesk", tags=["helpdesk"])


class ContactData(BaseModel):
    contact_id: Optional[int] = None
    client_name: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None


class CreateTicketBody(BaseModel):
    channel: str = Field(..., pattern="^(whatsapp|email|web)$")
    contact: ContactData = Field(default_factory=ContactData)
    subject: str = Field(..., min_length=1)
    first_message: str = Field(..., min_length=1)
    priority: str = Field("medium", pattern="^(low|medium|high|urgent)$")


class ReplyBody(BaseModel):
    content: str = Field(..., min_length=1)
    channel: Optional[str] = Field(None, pattern="^(whatsapp|email|web)$")


class AssignBody(BaseModel):
    user_id: str = Field(..., min_length=1)


class InboundEmailBody(BaseModel):
    from_email: EmailStr
    subject: str = ""
    body: str = ""
    sender_name: Optional[str] = None


class InboundWhatsAppBody(BaseModel):
    from_phone: str = Field(..., min_length=8)
    message: str = Field(..., min_length=1)
    sender_name: Optional[str] = None


def _svc(db: AsyncSession, ws: WorkspaceContext) -> Any:
    return get_helpdesk_service(db, ws.workspace_id)


def _resolve_inbound_workspace(request: Request) -> int:
    q = request.query_params.get("workspace_id")
    lang = request_language(request)
    if q:
        try:
            return int(q)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=t("invalid_workspace_id_param", lang),
            ) from exc
    ws = default_helpdesk_workspace_id()
    if ws is not None:
        return ws
    raise HTTPException(
        status_code=400,
        detail=t("helpdesk_workspace_required", lang),
    )


@router.post("/inbound/email")
async def inbound_email_webhook(
    request: Request,
    body: InboundEmailBody | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Inbound email (SES SNS notification or direct JSON for testing)."""
    ws_id = _resolve_inbound_workspace(request)
    svc = get_helpdesk_service(db, ws_id)

    content_type = (request.headers.get("content-type") or "").lower()
    try:
        if "application/json" in content_type:
            raw = await request.json()
            if isinstance(raw, dict) and raw.get("Type") == "Notification":
                return await svc.process_ses_sns_payload(raw)
            if body is not None:
                result = await svc.process_inbound_email(
                    str(body.from_email),
                    body.subject,
                    body.body,
                    sender_name=body.sender_name,
                )
                return {"ok": True, **result}
            if isinstance(raw, dict) and raw.get("from_email"):
                result = await svc.process_inbound_email(
                    str(raw.get("from_email")),
                    str(raw.get("subject", "")),
                    str(raw.get("body", raw.get("content", ""))),
                    sender_name=raw.get("sender_name"),
                )
                return {"ok": True, **result}
        raise HTTPException(status_code=400, detail="Expected SNS or inbound email JSON")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/inbound/whatsapp")
async def inbound_whatsapp_webhook(
    request: Request,
    body: InboundWhatsAppBody | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Inbound WhatsApp (Meta webhook payload or simple JSON)."""
    ws_id = _resolve_inbound_workspace(request)
    svc = get_helpdesk_service(db, ws_id)

    try:
        raw = await request.json()
    except Exception:
        raw = {}

    if isinstance(raw, dict) and raw.get("entry"):
        return await svc.process_whatsapp_webhook_payload(raw)

    if body is not None:
        result = await svc.process_inbound_whatsapp(
            body.from_phone, body.message, sender_name=body.sender_name
        )
        return {"ok": True, **result}

    if isinstance(raw, dict) and raw.get("from_phone"):
        result = await svc.process_inbound_whatsapp(
            str(raw["from_phone"]),
            str(raw.get("message", "")),
            sender_name=raw.get("sender_name"),
        )
        return {"ok": True, **result}

    raise HTTPException(status_code=400, detail="Expected Meta webhook or inbound WhatsApp JSON")


@router.get("/stats")
async def helpdesk_stats(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws_ctx).get_stats()


@router.get("/tickets")
async def list_tickets(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    channel: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws_ctx).list_tickets(
        status=status,
        priority=priority,
        channel=channel,
        skip=skip,
        limit=limit,
    )


@router.post("/tickets", status_code=201)
async def create_ticket(
    body: CreateTicketBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).create_ticket(
            body.channel,
            body.contact.model_dump(),
            body.subject,
            body.first_message,
            priority=body.priority,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).get_ticket(ticket_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Ticket not found")


@router.post("/tickets/{ticket_id}/reply")
async def reply_ticket(
    ticket_id: int,
    body: ReplyBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).reply_to_ticket(
            ticket_id,
            body.content,
            body.channel,
            agent_name=ws_ctx.user_email or "NELVYON Support",
        )
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))
    except Exception as e:
        logger.error("reply_ticket %s: %s", ticket_id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to send reply")


@router.patch("/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: int,
    body: AssignBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).assign_ticket(ticket_id, body.user_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.patch("/tickets/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).resolve_ticket(ticket_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Ticket not found")


@router.patch("/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).close_ticket(ticket_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Ticket not found")


@router.get("/agents")
async def list_agents(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return {"agents": await _svc(db, ws_ctx).get_agents()}


@router.get("/categories")
async def list_categories(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return {"categories": await _svc(db, ws_ctx).get_categories()}

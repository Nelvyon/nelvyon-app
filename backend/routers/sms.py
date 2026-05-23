"""NELVYON SMS Marketing API — Twilio send, campaigns, webhooks."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.sms_service import SmsService, get_sms_service

logger = logging.getLogger(__name__)

sms_router = APIRouter(prefix="/api/sms", tags=["sms"])
router = sms_router


class SendSmsBody(BaseModel):
    to_number: str = Field(..., min_length=8)
    message: str = Field(..., min_length=1, max_length=1600)


class CreateCampaignBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=1600)
    scheduled_at: Optional[datetime] = None


class SendCampaignBody(BaseModel):
    contact_ids: list[str] = Field(default_factory=list)


class OptOutBody(BaseModel):
    phone_number: str = Field(..., min_length=8)


def _svc(db: AsyncSession, ws: WorkspaceContext) -> SmsService:
    return get_sms_service(db, ws.workspace_id)


@sms_router.get("/stats")
async def sms_global_stats(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await SmsService.ensure_schema()
    return await _svc(db, ws).get_global_stats()


@sms_router.post("/send")
async def send_single_sms(
    body: SendSmsBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await SmsService.ensure_schema()
    try:
        return await _svc(db, ws).send_sms(body.to_number, body.message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@sms_router.post("/campaigns", status_code=201)
async def create_sms_campaign(
    body: CreateCampaignBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await SmsService.ensure_schema()
    try:
        return await _svc(db, ws).create_campaign(body.name, body.message, body.scheduled_at)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@sms_router.get("/campaigns")
async def list_sms_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await SmsService.ensure_schema()
    return await _svc(db, ws).list_campaigns(skip=skip, limit=limit)


@sms_router.get("/campaigns/{campaign_id}")
async def get_sms_campaign(
    campaign_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await SmsService.ensure_schema()
    try:
        campaign = await _svc(db, ws).get_campaign(campaign_id)
        stats = await _svc(db, ws).get_campaign_stats(campaign_id)
        return {**campaign, "stats": stats}
    except ValueError:
        raise HTTPException(status_code=404, detail="Campaign not found") from None


@sms_router.post("/campaigns/{campaign_id}/send")
async def send_sms_campaign(
    campaign_id: str,
    body: SendCampaignBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await SmsService.ensure_schema()
    try:
        return await _svc(db, ws).send_campaign(campaign_id, body.contact_ids)
    except ValueError as exc:
        status = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@sms_router.post("/optout")
async def register_optout(
    body: OptOutBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await SmsService.ensure_schema()
    try:
        return await _svc(db, ws).opt_out(body.phone_number)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@sms_router.post("/webhook/twilio")
async def twilio_inbound_webhook(
    request: Request,
    workspace_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Twilio inbound SMS webhook (no auth). Pass ?workspace_id= for multi-tenant routing."""
    await SmsService.ensure_schema()

    content_type = (request.headers.get("content-type") or "").lower()
    from_number = ""
    body_text = ""
    message_sid = None

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        from_number = str(form.get("From") or "")
        body_text = str(form.get("Body") or "")
        message_sid = str(form.get("MessageSid") or "") or None
    else:
        try:
            payload = await request.json()
            if isinstance(payload, dict):
                from_number = str(payload.get("From") or payload.get("from") or "")
                body_text = str(payload.get("Body") or payload.get("body") or "")
                message_sid = payload.get("MessageSid") or payload.get("message_sid")
        except Exception:
            pass

    if not from_number:
        raise HTTPException(status_code=400, detail="Missing From field")

    ws_id = workspace_id
    if ws_id is None:
        default_ws = os.environ.get("TWILIO_DEFAULT_WORKSPACE_ID", "").strip()
        if default_ws.isdigit():
            ws_id = int(default_ws)
    if ws_id is None:
        raise HTTPException(status_code=400, detail="workspace_id query parameter required")

    svc = get_sms_service(db, ws_id)
    try:
        result = await svc.handle_reply(from_number, body_text, twilio_sid=message_sid, workspace_id=ws_id)
        return {"ok": True, **result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

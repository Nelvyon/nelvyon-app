"""Frente 54 — Stripe-style public REST API (X-API-Key auth)."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.public_api import PublicAPIContext, get_public_api_context, require_public_scope
from services.analytics_service import get_workspace_metrics
from services.campaign_service import CampaignService
from services.chatbot_service import get_chatbot_service
from services.crm_service import CRMService
from services.forms_service import get_forms_service
from services.webhook_service import schedule_webhook_event
from services.workflow_service import WorkflowService, dispatch_workflow_trigger

logger = logging.getLogger(__name__)

public_api_router = APIRouter(prefix="/api/public/v1", tags=["public-api"])
router = public_api_router

_SCHEMA_READY = False


async def _ensure_public_schema() -> None:
    global _SCHEMA_READY
    if _SCHEMA_READY:
        return
    from pathlib import Path

    from core.database import db_manager

    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return
    for name in ("api_keys.sql", "webhooks_public.sql"):
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / name
        if not sql_path.is_file():
            continue
        raw = sql_path.read_text(encoding="utf-8")
        async with db_manager.async_session_maker() as session:
            bind = session.get_bind()
            dialect = bind.dialect.name if bind is not None else "postgresql"
            if dialect == "sqlite":
                raw = raw.replace("JSONB", "TEXT").replace("::jsonb", "")
                raw = raw.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', "")
                raw = raw.replace("ADD COLUMN IF NOT EXISTS", "ADD COLUMN")
            for stmt in raw.split(";"):
                s = stmt.strip()
                if s:
                    try:
                        await session.execute(text(s))
                    except Exception:
                        pass
            await session.commit()
    _SCHEMA_READY = True


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ContactCreateBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CampaignSendBody(BaseModel):
    campaign_id: int


class ChatbotMessageBody(BaseModel):
    chatbot_id: str
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=4000)
    visitor_info: dict[str, Any] = Field(default_factory=dict)


class FormSubmitBody(BaseModel):
    form_id: str
    responses: dict[str, Any] = Field(default_factory=dict)
    visitor_info: dict[str, Any] = Field(default_factory=dict)


class AnalyticsEventBody(BaseModel):
    event: str = Field(..., min_length=1, max_length=128)
    properties: dict[str, Any] = Field(default_factory=dict)


class WorkflowTriggerBody(BaseModel):
    trigger_type: str = Field(..., min_length=1, max_length=64)
    trigger_data: dict[str, Any] = Field(default_factory=dict)


# ─── Contacts ─────────────────────────────────────────────────────────────────

@public_api_router.post("/contacts")
async def create_contact(
    body: ContactCreateBody,
    ctx: PublicAPIContext = Depends(require_public_scope("contacts")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    crm = CRMService(db, ctx.workspace_id)
    contact = await crm.create_contact(
        name=body.name,
        email=str(body.email) if body.email else None,
        phone=body.phone,
        company=body.company,
        tags=body.tags,
        metadata=body.metadata,
    )
    schedule_webhook_event(ctx.workspace_id, "contact.created", contact)
    return {"contact": contact}


@public_api_router.get("/contacts")
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    ctx: PublicAPIContext = Depends(require_public_scope("contacts")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    crm = CRMService(db, ctx.workspace_id)
    return await crm.list_contacts(skip=skip, limit=limit, status=status)


# ─── Campaigns ────────────────────────────────────────────────────────────────

@public_api_router.post("/campaigns/send")
async def send_campaign(
    body: CampaignSendBody,
    ctx: PublicAPIContext = Depends(require_public_scope("campaigns")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    svc = CampaignService(db, ctx.workspace_id)
    try:
        result = await svc.send_campaign(body.campaign_id)
        schedule_webhook_event(
            ctx.workspace_id,
            "campaign.sent",
            {"campaign_id": body.campaign_id, **result},
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ─── Chatbot ──────────────────────────────────────────────────────────────────

@public_api_router.post("/chatbot/message")
async def chatbot_message(
    body: ChatbotMessageBody,
    ctx: PublicAPIContext = Depends(require_public_scope("chatbot")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    svc = get_chatbot_service(db, ctx.workspace_id)
    session_id = body.session_id or str(uuid.uuid4())
    try:
        bot = await svc.get_chatbot(body.chatbot_id)
        if int(bot.get("workspace_id") or 0) != ctx.workspace_id:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        result = await svc.chat(body.chatbot_id, session_id, body.message, body.visitor_info)
        schedule_webhook_event(
            ctx.workspace_id,
            "chatbot.message",
            {
                "chatbot_id": body.chatbot_id,
                "session_id": session_id,
                "message": body.message,
                "reply": result.get("reply"),
            },
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ─── Forms ──────────────────────────────────────────────────────────────────────

@public_api_router.post("/forms/submit")
async def submit_form(
    body: FormSubmitBody,
    ctx: PublicAPIContext = Depends(require_public_scope("forms")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    svc = get_forms_service(db, ctx.workspace_id)
    try:
        result = await svc.submit_form(
            body.form_id,
            body.responses,
            visitor_info=body.visitor_info,
        )
        schedule_webhook_event(
            ctx.workspace_id,
            "form.submitted",
            {"form_id": body.form_id, "submission_id": result.get("id"), **result},
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ─── Analytics ────────────────────────────────────────────────────────────────

@public_api_router.post("/events")
async def track_event(
    body: AnalyticsEventBody,
    ctx: PublicAPIContext = Depends(require_public_scope("analytics")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    await db.execute(
        text(
            """
            INSERT INTO public_analytics_events (id, workspace_id, event_name, properties, created_at)
            VALUES (:id, :ws, :name, :props, :now)
            """
        ),
        {
            "id": event_id,
            "ws": ctx.workspace_id,
            "name": body.event.strip(),
            "props": json.dumps(body.properties or {}, ensure_ascii=False),
            "now": now,
        },
    )
    await db.commit()
    return {"id": event_id, "event": body.event, "recorded_at": now.isoformat()}


@public_api_router.get("/analytics/summary")
async def analytics_summary(
    ctx: PublicAPIContext = Depends(require_public_scope("analytics")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    metrics = await get_workspace_metrics(db, ctx.workspace_id)
    try:
        cnt = await db.execute(
            text(
                """
                SELECT COUNT(*) FROM public_analytics_events
                WHERE workspace_id = :ws AND created_at >= NOW() - INTERVAL '7 days'
                """
            ),
            {"ws": ctx.workspace_id},
        )
    except Exception:
        cnt = await db.execute(
            text(
                """
                SELECT COUNT(*) FROM public_analytics_events
                WHERE workspace_id = :ws
                """
            ),
            {"ws": ctx.workspace_id},
        )
    events_7d = int(cnt.scalar() or 0)
    return {"workspace_id": ctx.workspace_id, "metrics": metrics, "events_last_7d": events_7d}


# ─── Workflows ────────────────────────────────────────────────────────────────

@public_api_router.post("/workflows/trigger")
async def trigger_workflow(
    body: WorkflowTriggerBody,
    ctx: PublicAPIContext = Depends(require_public_scope("workflows")),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_public_schema()
    await WorkflowService.ensure_schema()
    results = await dispatch_workflow_trigger(
        db,
        ctx.workspace_id,
        body.trigger_type,
        body.trigger_data,
    )
    schedule_webhook_event(
        ctx.workspace_id,
        "workflow.triggered",
        {"trigger_type": body.trigger_type, "executions": len(results)},
    )
    return {"trigger_type": body.trigger_type, "executions": results}

"""Frente 52 — Unified omnichannel inbox API."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.omnichannel_service import OmnichannelService, get_omnichannel_service

logger = logging.getLogger(__name__)

omnichannel_router = APIRouter(prefix="/api/omnichannel", tags=["omnichannel"])
router = omnichannel_router


class ReplyBody(BaseModel):
    content: str = Field(..., min_length=1)
    channel: Optional[str] = None


class StatusBody(BaseModel):
    status: str = Field(..., pattern="^(open|pending|resolved)$")


class AutoReplyBody(BaseModel):
    enabled: bool = True


def _svc(db: AsyncSession, ws: WorkspaceContext) -> OmnichannelService:
    return get_omnichannel_service(db, ws.workspace_id)


@omnichannel_router.get("/inbox")
async def unified_inbox(
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).get_unified_inbox(
        ws.workspace_id, channel=channel, status=status, search=search, skip=skip, limit=limit
    )


@omnichannel_router.get("/conversations/{conversation_id}/messages")
async def conversation_messages(
    conversation_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return {"items": await _svc(db, ws).get_messages(conversation_id, ws.workspace_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@omnichannel_router.get("/conversations/{conversation_id}/context")
async def conversation_context(
    conversation_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).get_contact_context(conversation_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@omnichannel_router.post("/conversations/{conversation_id}/reply")
async def send_reply(
    conversation_id: str,
    body: ReplyBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).send_reply(
            conversation_id, ws.workspace_id, body.content, channel=body.channel
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@omnichannel_router.post("/conversations/{conversation_id}/suggest")
async def suggest_reply(
    conversation_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).suggest_reply(conversation_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@omnichannel_router.post("/conversations/{conversation_id}/auto-reply")
async def trigger_auto_reply(
    conversation_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).auto_reply(conversation_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@omnichannel_router.put("/conversations/{conversation_id}/status")
async def update_status(
    conversation_id: str,
    body: StatusBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).update_status(conversation_id, ws.workspace_id, body.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@omnichannel_router.put("/conversations/{conversation_id}/auto-reply")
async def toggle_auto_reply(
    conversation_id: str,
    body: AutoReplyBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).set_auto_reply(conversation_id, ws.workspace_id, body.enabled)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@omnichannel_router.get("/stats")
async def inbox_stats(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).get_stats(ws.workspace_id)

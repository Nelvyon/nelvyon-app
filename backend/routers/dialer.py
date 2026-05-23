"""NELVYON Dialer VoIP API."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.list_cache import list_cached
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.dialer_service import DialerService, get_dialer_service

logger = logging.getLogger(__name__)

dialer_router = APIRouter(prefix="/api/dialer", tags=["dialer"])
router = dialer_router


class MakeCallBody(BaseModel):
    to_number: str = Field(..., min_length=5)
    from_number: Optional[str] = None
    agent_id: Optional[str] = None
    contact_id: Optional[str] = None


class LogCallBody(BaseModel):
    contact_id: Optional[str] = None
    call_sid: Optional[str] = None
    duration: int = Field(default=0, ge=0)
    outcome: str = Field(default="connected")
    notes: str = ""


class TranscribeBody(BaseModel):
    recording_url: Optional[str] = None


def _svc(db: AsyncSession, ws: WorkspaceContext) -> DialerService:
    return get_dialer_service(db, ws.workspace_id)


@dialer_router.post("/call")
async def make_call(
    body: MakeCallBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await DialerService.ensure_schema()
    try:
        return await _svc(db, ws).make_call(
            body.to_number, body.from_number, body.agent_id, body.contact_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@dialer_router.post("/call/{call_sid}/end")
async def end_call(
    call_sid: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await DialerService.ensure_schema()
    return await _svc(db, ws).end_call(call_sid)


@dialer_router.get("/call/{call_sid}/status")
async def call_status(
    call_sid: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await DialerService.ensure_schema()
    return await _svc(db, ws).get_call_status(call_sid)


@dialer_router.get("/call/{call_sid}/recording")
async def call_recording(
    call_sid: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await DialerService.ensure_schema()
    return await _svc(db, ws).get_call_recording(call_sid)


@dialer_router.post("/call/{call_sid}/transcribe")
async def transcribe_call(
    call_sid: str,
    body: TranscribeBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await DialerService.ensure_schema()
    try:
        return await _svc(db, ws).transcribe_call(call_sid, body.recording_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@dialer_router.post("/calls/log")
async def log_call(
    body: LogCallBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await DialerService.ensure_schema()
    return await _svc(db, ws).log_call(
        body.contact_id, body.call_sid, body.duration, body.outcome, body.notes
    )


@dialer_router.get("/calls")
@list_cached("dialer:calls")
async def call_history(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await DialerService.ensure_schema()
    items = await _svc(db, ws).get_call_history()
    return {"items": items}


@dialer_router.get("/stats")
async def dialer_stats(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await DialerService.ensure_schema()
    return await _svc(db, ws).get_stats()


@dialer_router.post("/webhook/twilio")
async def twilio_webhook(
    CallSid: str = Form(""),
    CallStatus: str = Form(""),
    CallDuration: str = Form("0"),
    RecordingUrl: str = Form(""),
    workspace_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    await DialerService.ensure_schema()
    ws = int(workspace_id or 1)
    svc = get_dialer_service(db, ws)
    duration = int(CallDuration or 0)
    return await svc.handle_webhook(
        CallSid, CallStatus, duration, RecordingUrl or None, workspace_id=ws
    )

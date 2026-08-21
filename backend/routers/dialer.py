"""NELVYON Dialer VoIP API."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.inquilino_de_webhook import (
    InquilinoNoAtribuible,
    respuesta_no_atribuible,
    sesion_de_webhook,
    workspace_de_fila,
)
from core.twilio_webhook_signature import verificar_firma_twilio
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
    request: Request,
    CallSid: str = Form(""),
    CallStatus: str = Form(""),
    CallDuration: str = Form("0"),
    RecordingUrl: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    # La firma se comprueba ANTES de tocar la base. Sin ella cualquiera podia
    # inventar llamadas y marcarlas completadas — y elegir el inquilino, porque
    # `workspace_id` viaja en el query string.
    await verificar_firma_twilio(request)

    await DialerService.ensure_schema()

    # ANTES: `int(workspace_id or 1)`, con `workspace_id` viajando en el query
    # string. El UPDATE si filtraba por `call_sid AND workspace_id`, asi que no
    # habia escritura cruzada — pero el `or 1` hacia que las llamadas de
    # cualquier inquilino distinto del 1 dejaran de actualizarse EN SILENCIO, que
    # es la clase de fallo que no produce ningun sintoma.
    #
    # La llamada la creo NELVYON y su fila sabe de quien es. `CallSid` viene en
    # el cuerpo que Twilio firmo.
    duration = int(CallDuration or 0)
    async with await sesion_de_webhook() as sesion:
        try:
            ws = await workspace_de_fila(
                sesion, "dialer_calls", "call_sid", CallSid, "twilio")
        except InquilinoNoAtribuible as exc:
            return respuesta_no_atribuible(exc)
        return await get_dialer_service(sesion, ws).handle_webhook(
            CallSid, CallStatus, duration, RecordingUrl or None, workspace_id=ws
        )

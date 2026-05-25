"""F62 — Advanced dialer API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.dialer_advanced_service import DialerAdvancedService, get_dialer_advanced_service

router = APIRouter(prefix="/api/dialer-advanced", tags=["dialer-advanced"])


class QueueItem(BaseModel):
    phone: str = Field(..., min_length=5)
    contact_id: str | None = None
    use_voicemail: bool = False


class PowerDialBody(BaseModel):
    client_id: str = "default"
    queue: list[QueueItem] = Field(..., min_length=1)
    voicemail_url: str | None = None
    max_calls: int = Field(10, ge=1, le=50)


class ParallelDialBody(BaseModel):
    client_id: str = "default"
    queue: list[QueueItem] = Field(..., min_length=1)
    parallel_limit: int = Field(3, ge=2, le=5)
    voicemail_url: str | None = None


class VoicemailDropBody(BaseModel):
    call_sid: str | None = None
    to_number: str | None = None
    voicemail_url: str = Field(..., min_length=8)


@router.post("/power-dial")
async def power_dial(
    body: PowerDialBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await DialerAdvancedService.ensure_schema(db)
    try:
        return await get_dialer_advanced_service(db, ws.workspace_id).start_power_dial(
            client_id=body.client_id,
            queue=[q.model_dump() for q in body.queue],
            voicemail_url=body.voicemail_url,
            max_calls=body.max_calls,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/parallel-dial")
async def parallel_dial(
    body: ParallelDialBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await DialerAdvancedService.ensure_schema(db)
    try:
        return await get_dialer_advanced_service(db, ws.workspace_id).start_parallel_dial(
            client_id=body.client_id,
            queue=[q.model_dump() for q in body.queue],
            parallel_limit=body.parallel_limit,
            voicemail_url=body.voicemail_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/voicemail-drop")
async def voicemail_drop(
    body: VoicemailDropBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await DialerAdvancedService.ensure_schema(db)
    try:
        return await get_dialer_advanced_service(db, ws.workspace_id).voicemail_drop(
            call_sid=body.call_sid,
            to_number=body.to_number,
            voicemail_url=body.voicemail_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/session/{session_id}/stats")
async def session_stats(
    session_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await DialerAdvancedService.ensure_schema(db)
    try:
        return await get_dialer_advanced_service(db, ws.workspace_id).get_session_stats(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/calls/{client_id}")
async def calls_history(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await DialerAdvancedService.ensure_schema(db)
    return await get_dialer_advanced_service(db, ws.workspace_id).get_calls_for_client(client_id)

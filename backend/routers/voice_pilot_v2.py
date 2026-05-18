"""
VOZ NELVYON v2 pilot API — inbound audio → ticket + disk storage; governance; synth quota consume.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.quota_guards import enforce_helpdesk_module_allowed
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from models.voice_pilot import Voice_pilot_inbound
from schemas.auth import UserResponse
from services.helpdesk_tickets import Helpdesk_ticketsService
from services.voice_pilot_v2 import (
    MAX_INBOUND_BYTES,
    assert_allowed_mime,
    assert_quota_headroom,
    assert_voice_plan_allowed,
    get_governance_snapshot,
    increment_inbound,
    increment_synth,
    inbound_file_path,
    new_storage_key,
    voice_ticket_description,
    write_inbound_file,
)
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/voice/v2", tags=["voice_pilot_v2"])


async def _read_upload_limited(upload: UploadFile, limit: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        block = await upload.read(65536)
        if not block:
            break
        total += len(block)
        if total > limit:
            raise HTTPException(status_code=400, detail=f"Audio clip exceeds maximum size ({limit} bytes).")
        chunks.append(block)
    return b"".join(chunks)


class GovernanceResponse(BaseModel):
    plan_id: str
    plan_allowed: bool
    period_yyyymm: int
    monthly_cap: int
    inbound_used: int
    synth_used: int
    actions_used: int
    actions_remaining: int


class InboundCreateResponse(BaseModel):
    ticket_id: int
    inbound_id: int
    storage_key: str
    size_bytes: int
    content_type: str


class SynthConsumeResponse(BaseModel):
    ok: bool = True
    synth_used: int
    actions_remaining: int


@router.get("/governance", response_model=GovernanceResponse)
async def get_voice_v2_governance(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    _user: UserResponse = Depends(get_current_user),
):
    return await get_governance_snapshot(db, ws_ctx.workspace_id)


@router.post("/inbound", response_model=InboundCreateResponse, status_code=201)
async def post_voice_inbound(
    file: UploadFile = File(..., description="Short audio clip (voice note)"),
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
    _user: UserResponse = Depends(get_current_user),
):
    await assert_voice_plan_allowed(db, ws_ctx.workspace_id)
    await assert_quota_headroom(db, ws_ctx.workspace_id, need=1)
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)

    raw = await _read_upload_limited(file, MAX_INBOUND_BYTES)
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio upload.")
    ct = assert_allowed_mime(file.content_type)
    storage_key = new_storage_key()
    write_inbound_file(ws_ctx.workspace_id, storage_key, raw, ct)

    ticket_service = Helpdesk_ticketsService(db)
    ticket = await ticket_service.create(
        {
            "subject": "Voice note (VOZ v2 pilot)",
            "description": "[VOZ_V2_INBOUND]\n(pending attachment metadata)",
            "channel": "voice_v2_pilot",
            "category": "voice_pilot",
        },
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
    )
    if not ticket:
        raise HTTPException(status_code=500, detail="Failed to create ticket for voice note.")

    inbound = Voice_pilot_inbound(
        workspace_id=ws_ctx.workspace_id,
        ticket_id=int(ticket.id),
        storage_key=storage_key,
        content_type=ct,
        size_bytes=len(raw),
        created_at=datetime.now(timezone.utc),
    )
    db.add(inbound)
    await db.commit()
    await db.refresh(inbound)

    await ticket_service.update(
        int(ticket.id),
        {"description": voice_ticket_description(inbound_db_id=int(inbound.id), storage_key=storage_key)},
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
    )

    await increment_inbound(db, ws_ctx.workspace_id)
    await db.commit()

    return InboundCreateResponse(
        ticket_id=int(ticket.id),
        inbound_id=int(inbound.id),
        storage_key=storage_key,
        size_bytes=len(raw),
        content_type=ct,
    )


@router.get("/inbound/{inbound_id}/audio")
async def download_voice_inbound_audio(
    inbound_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    _user: UserResponse = Depends(get_current_user),
):
    await assert_voice_plan_allowed(db, ws_ctx.workspace_id)
    r = await db.execute(
        select(Voice_pilot_inbound).where(
            Voice_pilot_inbound.id == inbound_id,
            Voice_pilot_inbound.workspace_id == ws_ctx.workspace_id,
        )
    )
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Voice inbound clip not found in this workspace.")
    path = inbound_file_path(ws_ctx.workspace_id, row.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Audio file missing on server.")
    return FileResponse(
        path=str(path),
        media_type=row.content_type or "application/octet-stream",
        filename=f"voice-inbound-{inbound_id}",
    )


class SynthConsumeBody(BaseModel):
    char_count: int = Field(default=0, ge=0, le=10_000)


@router.post("/synth/consume", response_model=SynthConsumeResponse)
async def post_synth_consume(
    body: SynthConsumeBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
    _user: UserResponse = Depends(get_current_user),
):
    await assert_voice_plan_allowed(db, ws_ctx.workspace_id)
    await assert_quota_headroom(db, ws_ctx.workspace_id, need=1)
    if body.char_count < 1:
        raise HTTPException(status_code=400, detail="char_count must be at least 1 to consume a synth slot.")
    await increment_synth(db, ws_ctx.workspace_id)
    await db.commit()
    snap = await get_governance_snapshot(db, ws_ctx.workspace_id)
    return SynthConsumeResponse(
        ok=True,
        synth_used=int(snap["synth_used"]),
        actions_remaining=int(snap["actions_remaining"]),
    )

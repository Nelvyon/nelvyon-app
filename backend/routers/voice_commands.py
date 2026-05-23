"""Voice commands API — transcribe audio and return parsed actions."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.voice_commands_service import VoiceCommandsService, get_voice_commands_service

logger = logging.getLogger(__name__)

voice_commands_router = APIRouter(prefix="/api/voice-commands", tags=["voice_commands"])
router = voice_commands_router

MAX_AUDIO_BYTES = 10 * 1024 * 1024


async def _read_upload(upload: UploadFile, limit: int = MAX_AUDIO_BYTES) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        block = await upload.read(65536)
        if not block:
            break
        total += len(block)
        if total > limit:
            raise HTTPException(status_code=400, detail=f"Audio exceeds maximum size ({limit} bytes).")
        chunks.append(block)
    return b"".join(chunks)


def _svc(db: AsyncSession, ws: WorkspaceContext) -> VoiceCommandsService:
    return get_voice_commands_service(db, ws.workspace_id)


@voice_commands_router.post("/transcribe")
async def transcribe_voice_command(
    audio: UploadFile = File(...),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await VoiceCommandsService.ensure_schema()
    blob = await _read_upload(audio)
    filename = audio.filename or "command.webm"
    try:
        return await _svc(db, ws).process_audio(blob, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@voice_commands_router.get("/history")
async def voice_command_history(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await VoiceCommandsService.ensure_schema()
    items = await _svc(db, ws).get_voice_history(ws.workspace_id)
    return {"items": items}

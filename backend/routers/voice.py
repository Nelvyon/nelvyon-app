"""Voice API — ElevenLabs text-to-speech."""

from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.voice_service import ElevenLabsService, get_voice_dashboard_service
from core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/voice", tags=["voice"])


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: Optional[str] = None


class TtsBase64Response(BaseModel):
    audio_base64: str
    format: str = "mp3"


@router.post("/tts")
async def text_to_speech(
    body: TtsRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
):
    """Synthesize speech and return MP3 audio stream."""
    service = ElevenLabsService()
    try:
        audio = await service.text_to_speech(body.text.strip(), voice_id=body.voice_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs TTS failed: {e}",
        ) from e

    return StreamingResponse(
        iter([audio]),
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="speech.mp3"'},
    )


@router.post("/tts-base64", response_model=TtsBase64Response)
async def text_to_speech_base64(
    body: TtsRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
):
    """Synthesize speech and return base64-encoded MP3."""
    service = ElevenLabsService()
    try:
        audio_b64 = await service.text_to_speech_base64(body.text.strip(), voice_id=body.voice_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs TTS failed: {e}",
        ) from e

    return TtsBase64Response(audio_base64=audio_b64, format="mp3")


@router.get("/voices")
async def list_voices(
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> dict:
    """List available ElevenLabs voices (empty if API key not configured)."""
    service = ElevenLabsService()
    voices: List[dict] = await service.get_voices()
    return {"voices": voices, "default_voice_id": service.default_voice_id}


@router.post("/stream")
async def stream_text_to_speech(
    body: TtsRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
):
    """Stream MP3 audio in real time from ElevenLabs."""
    service = ElevenLabsService()
    if not service.api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ELEVENLABS_API_KEY not configured",
        )

    async def audio_generator() -> AsyncGenerator[bytes, None]:
        async for chunk in service.stream_audio(body.text.strip(), voice_id=body.voice_id):
            yield chunk

    return StreamingResponse(audio_generator(), media_type="audio/mpeg")


@router.get("/calls")
async def list_voice_calls(
    limit: int = 50,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List recent dialer calls for the workspace."""
    svc = get_voice_dashboard_service(db, ctx.workspace_id)
    return {"calls": await svc.list_calls(limit=min(limit, 100))}


@router.get("/stats")
async def voice_stats(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Voice/dialer statistics for the workspace."""
    svc = get_voice_dashboard_service(db, ctx.workspace_id)
    return await svc.get_stats()


@router.get("/config")
async def voice_config(
    ctx: WorkspaceContext = Depends(require_workspace),
):
    """Voice provider configuration status."""
    svc = get_voice_dashboard_service(None, ctx.workspace_id)
    return svc.get_config()

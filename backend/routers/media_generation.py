"""Media generation API — Runway video and Suno music."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, HttpUrl

from core.rate_limiter import endpoint_rate_limit
from dependencies.workspace import WorkspaceContext, require_workspace
from services.runway_service import get_runway_service
from services.suno_service import get_suno_service

router = APIRouter(prefix="/api/media", tags=["media-generation"])


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    image_url: Optional[HttpUrl] = None
    duration: int = Field(5, ge=2, le=10)
    ratio: str = Field("1280:768", description="1280:768, 768:1280, or aliases 16:9 / 9:16")


class MusicGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=5000)
    style: str = Field("", max_length=1000)
    duration: int = Field(30, ge=10, le=480)
    instrumental: bool = True


@router.post(
    "/video/generate",
    dependencies=[Depends(endpoint_rate_limit(10, 3600, "media_video_generate"))],
)
async def generate_video(
    body: VideoGenerateRequest,
    response: Response,
    wait: bool = Query(False, description="Poll Runway until SUCCEEDED/FAILED (max 300s)"),
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Start Runway image-to-video generation (optionally wait for completion)."""
    service = get_runway_service()
    try:
        result = await service.generate_video(
            prompt=body.prompt,
            image_url=str(body.image_url) if body.image_url else None,
            duration=body.duration,
            ratio=body.ratio,
        )
        if not result.get("ok", True) and not result.get("mock"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=result.get("error", "Runway video generation failed"),
            )
        if wait and result.get("task_id"):
            polled = await service.poll_until_complete(result["task_id"])
            return {"started": result, "final": polled}
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Runway video generate failed: {e}",
        ) from e


@router.get("/video/status/{task_id}")
async def video_status(
    task_id: str,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Get Runway video task status."""
    service = get_runway_service()
    try:
        return await service.get_task_status(task_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Runway status failed: {e}",
        ) from e


@router.post("/music/generate")
async def generate_music(
    body: MusicGenerateRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Start Suno music generation."""
    service = get_suno_service()
    try:
        result = await service.generate_music(
            prompt=body.prompt,
            style=body.style,
            duration=body.duration,
            instrumental=body.instrumental,
        )
        if not result.get("ok", True) and not result.get("mock"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=result.get("error", "Suno music generation failed"),
            )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Suno music generate failed: {e}",
        ) from e


@router.get("/music/status/{task_id}")
async def music_status(
    task_id: str,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Get Suno music generation status."""
    service = get_suno_service()
    try:
        return await service.get_generation_status(task_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Suno status failed: {e}",
        ) from e

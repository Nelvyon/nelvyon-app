"""DALL·E 3 API — generate, variations, edit, history."""

from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, HttpUrl

from dependencies.workspace import WorkspaceContext, require_workspace
from services.dalle_service import get_dalle_service

router = APIRouter(prefix="/api/dalle", tags=["dalle"])


class GenerateImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    size: Literal["1024x1024", "1792x1024", "1024x1792"] = "1024x1024"
    quality: Literal["standard", "hd"] = "standard"
    style: Literal["vivid", "natural"] = "vivid"


class VariationsRequest(BaseModel):
    image_url: HttpUrl
    n: int = Field(1, ge=1, le=10)


class EditImageRequest(BaseModel):
    image_url: HttpUrl
    mask_url: HttpUrl
    prompt: str = Field(..., min_length=1, max_length=4000)


@router.post("/generate")
async def generate_image(
    body: GenerateImageRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Generate an image with DALL·E 3 and persist to Supabase agent-results."""
    service = get_dalle_service()
    try:
        return await service.generate_image(
            prompt=body.prompt,
            size=body.size,
            quality=body.quality,
            style=body.style,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"DALL·E generate failed: {e}",
        ) from e


@router.post("/variations")
async def generate_variations(
    body: VariationsRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Create variations from an existing image URL (DALL·E 2 variations API)."""
    service = get_dalle_service()
    try:
        return await service.generate_variations(str(body.image_url), n=body.n)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"DALL·E variations failed: {e}",
        ) from e


@router.post("/edit")
async def edit_image(
    body: EditImageRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Edit an image with mask and prompt (DALL·E 2 edit API)."""
    service = get_dalle_service()
    try:
        return await service.edit_image(
            str(body.image_url),
            str(body.mask_url),
            body.prompt,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"DALL·E edit failed: {e}",
        ) from e


@router.get("/history")
async def get_history(
    limit: int = Query(50, ge=1, le=200),
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """List generated images metadata from Supabase agent-results bucket."""
    service = get_dalle_service()
    try:
        return await service.get_history(limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"DALL·E history failed: {e}",
        ) from e

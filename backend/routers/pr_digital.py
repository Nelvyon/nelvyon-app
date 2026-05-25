"""F65 — PR Digital IA API."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.pr_digital_service import get_pr_digital_service

router = APIRouter(prefix="/api/pr", tags=["pr-digital"])


class GenerateReleaseBody(BaseModel):
    client_id: str = "default"
    company: str = Field(..., min_length=2)
    sector: str = Field(..., min_length=2)
    news: str = Field(..., min_length=10)
    tone: str = "profesional"
    type: str = "press_release"


class HeadlinesBody(BaseModel):
    company: str = Field(..., min_length=2)
    sector: str = Field(..., min_length=2)
    news: str = Field(..., min_length=10)


class CrisisBody(BaseModel):
    client_id: str = "default"
    company: str = Field(..., min_length=2)
    sector: str = Field(..., min_length=2)
    situation: str = Field(..., min_length=10)
    tone: str = "empático y transparente"


@router.post("/generate")
async def generate_release(
    body: GenerateReleaseBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_pr_digital_service(db, ws.workspace_id).generate_release(
        client_id=body.client_id,
        company=body.company,
        sector=body.sector,
        news=body.news,
        tone=body.tone,
        release_type=body.type,
    )


@router.post("/headlines")
async def generate_headlines(
    body: HeadlinesBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_pr_digital_service(db, ws.workspace_id).generate_headlines(
        company=body.company, sector=body.sector, news=body.news
    )


@router.post("/crisis")
async def generate_crisis(
    body: CrisisBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_pr_digital_service(db, ws.workspace_id).generate_crisis(
        client_id=body.client_id,
        company=body.company,
        sector=body.sector,
        situation=body.situation,
        tone=body.tone,
    )


@router.get("/releases")
async def list_releases(
    client_id: str | None = None,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_pr_digital_service(db, ws.workspace_id).list_releases(client_id)


@router.get("/media-list/{sector}")
async def media_list(
    sector: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return get_pr_digital_service(db, ws.workspace_id).media_list(sector)

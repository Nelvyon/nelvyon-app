"""Social auto-publish API (F61)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.social_auto_publish_service import get_social_auto_publish_service

router = APIRouter(prefix="/api/social-publish", tags=["social-publish"])


class SettingsBody(BaseModel):
    client_id: str = Field(..., min_length=1)
    enabled: bool = False
    frequency: str = Field("weekly", pattern="^(daily|3x_week|weekly)$")
    sector: str = "servicios"


class ScheduleBody(BaseModel):
    client_id: str
    sector: str = "servicios"
    platforms: list[str] = Field(default_factory=lambda: ["instagram", "twitter", "linkedin"])
    scheduled_at: Optional[datetime] = None
    frequency: str = "weekly"


class PublishNowBody(BaseModel):
    client_id: str
    sector: str = "servicios"
    platforms: list[str] | None = None


class PreviewBody(BaseModel):
    client_id: str
    sector: str = "servicios"
    platform: str = "instagram"
    topic: str = ""


@router.get("/settings/{client_id}")
async def get_settings(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_social_auto_publish_service(db, ws.workspace_id).get_settings(client_id)


@router.put("/settings")
async def put_settings(
    body: SettingsBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_social_auto_publish_service(db, ws.workspace_id).update_settings(
        body.client_id, enabled=body.enabled, frequency=body.frequency, sector=body.sector
    )


@router.post("/preview")
async def preview_post(
    body: PreviewBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_social_auto_publish_service(db, ws.workspace_id).generate_preview(
        body.client_id, sector=body.sector, platform=body.platform, topic=body.topic
    )


@router.post("/schedule")
async def schedule_posts(
    body: ScheduleBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_social_auto_publish_service(db, ws.workspace_id).schedule(
        body.client_id,
        sector=body.sector,
        platforms=body.platforms,
        scheduled_at=body.scheduled_at,
        frequency=body.frequency,
    )


@router.post("/publish-now")
async def publish_now(
    body: PublishNowBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_social_auto_publish_service(db, ws.workspace_id).publish_now(
        body.client_id, sector=body.sector, platforms=body.platforms
    )


@router.get("/calendar/{client_id}")
async def publication_calendar(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_social_auto_publish_service(db, ws.workspace_id).calendar(client_id)


@router.get("/analytics/{client_id}")
async def publication_analytics(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_social_auto_publish_service(db, ws.workspace_id).analytics(client_id)

"""Web Builder OS API (F61)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.web_builder_service import get_web_builder_service
from services.web_publisher_service import get_web_publisher_service

router = APIRouter(prefix="/api/web-builder", tags=["web-builder"])


class GenerateBody(BaseModel):
    client_id: str = Field(..., min_length=1, max_length=128)
    business_name: str = Field(..., min_length=1)
    sector: str = Field("servicios", max_length=64)
    primary_color: str = Field("#0066FF", max_length=32)
    secondary_color: str = Field("#050505", max_length=32)
    description: str = ""
    city: str = ""
    services: list[str] = Field(default_factory=list)
    regenerate_section: str | None = None
    website_id: int | None = None


class PublishBody(BaseModel):
    website_id: int


class RestoreBody(BaseModel):
    client_id: str
    website_id: int


@router.post("/generate")
async def generate_website(
    body: GenerateBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = get_web_builder_service(db, ws.workspace_id)
        return await svc.generate(
            client_id=body.client_id,
            briefing=body.model_dump(exclude={"client_id", "regenerate_section", "website_id"}),
            regenerate_section=body.regenerate_section,
            website_id=body.website_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/publish")
async def publish_website(
    body: PublishBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_web_publisher_service(db, ws.workspace_id).publish(body.website_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/preview/{website_id}", response_class=HTMLResponse)
async def preview_website(
    website_id: int,
    _ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await get_web_builder_service(db).get_preview(website_id)
        return HTMLResponse(content=data["html"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/history/{client_id}")
async def website_history(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_web_builder_service(db, ws.workspace_id).history(client_id)


@router.post("/restore")
async def restore_website_version(
    body: RestoreBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_web_builder_service(db, ws.workspace_id).restore_version(
            body.client_id, body.website_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

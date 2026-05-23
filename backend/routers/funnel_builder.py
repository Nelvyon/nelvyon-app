"""NELVYON visual funnel builder API."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.funnel_builder_service import get_funnel_builder_service

logger = logging.getLogger(__name__)

funnel_router = APIRouter(prefix="/api/funnels", tags=["funnel-builder"])


class FunnelStepInput(BaseModel):
    name: Optional[str] = None
    landing_page_id: Optional[str] = None
    next_step_id: Optional[str] = None
    exit_url: Optional[str] = None


class CreateFunnelBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    steps: list[FunnelStepInput] = Field(default_factory=list)
    status: str = "draft"


class UpdateFunnelBody(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    steps: Optional[list[FunnelStepInput]] = None


class AttachCampaignBody(BaseModel):
    campaign_id: int


@funnel_router.post("", status_code=201)
async def create_funnel(
    body: CreateFunnelBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_funnel_builder_service(db, ws.workspace_id)
    steps = [s.model_dump(exclude_unset=True) for s in body.steps]
    return await svc.create_funnel(ws.workspace_id, body.name, steps, status=body.status)


@funnel_router.get("")
async def list_funnels(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_funnel_builder_service(db, ws.workspace_id)
    return {"items": await svc.list_funnels(ws.workspace_id)}


@funnel_router.get("/{funnel_id}")
async def get_funnel(
    funnel_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_funnel_builder_service(db, ws.workspace_id)
    funnel = await svc.get_funnel(funnel_id, ws.workspace_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return funnel


@funnel_router.put("/{funnel_id}")
async def update_funnel(
    funnel_id: str,
    body: UpdateFunnelBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_funnel_builder_service(db, ws.workspace_id)
    updates = body.model_dump(exclude_unset=True)
    if "steps" in updates and updates["steps"] is not None:
        updates["steps"] = [s.model_dump(exclude_unset=True) for s in body.steps or []]
    try:
        return await svc.update_funnel(funnel_id, ws.workspace_id, updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@funnel_router.delete("/{funnel_id}")
async def delete_funnel(
    funnel_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_funnel_builder_service(db, ws.workspace_id)
    ok = await svc.delete_funnel(funnel_id, ws.workspace_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Funnel not found")
    return {"deleted": True}


@funnel_router.get("/{funnel_id}/analytics")
async def funnel_analytics(
    funnel_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_funnel_builder_service(db, ws.workspace_id)
    try:
        return await svc.get_funnel_analytics(funnel_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@funnel_router.post("/{funnel_id}/campaign")
async def attach_campaign(
    funnel_id: str,
    body: AttachCampaignBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_funnel_builder_service(db, ws.workspace_id)
    try:
        return await svc.attach_campaign(funnel_id, ws.workspace_id, body.campaign_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

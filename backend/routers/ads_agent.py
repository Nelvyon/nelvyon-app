"""Unified paid media agent — briefing, launch, optimize (F60)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.ads_agent_service import get_ads_agent_service

router = APIRouter(prefix="/api/ads-agent", tags=["ads-agent"])


class BriefingBody(BaseModel):
    product: str = Field("NELVYON", min_length=1, max_length=120)
    audience: str = Field("", max_length=500)
    goal: str = Field("conversions", max_length=64)
    daily_budget_eur: float = Field(80, ge=10, le=100_000)
    creative_image_url: str | None = None
    notes: str = ""
    launch: bool = False


@router.post("/briefing")
async def ads_agent_briefing(
    body: BriefingBody,
    ws: WorkspaceContext = Depends(require_workspace),
):
    briefing: dict[str, Any] = body.model_dump()
    return await get_ads_agent_service().run_briefing(
        workspace_id=ws.workspace_id,
        briefing=briefing,
        launch=body.launch,
    )


@router.get("/reporting/unified")
async def ads_unified_reporting(_ws: WorkspaceContext = Depends(require_workspace)):
    return await get_ads_agent_service().unified_reporting()


@router.post("/optimize")
async def ads_optimize(
    roas_threshold: float = Query(1.5, ge=0.5, le=20),
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return await get_ads_agent_service().optimize_all(roas_threshold=roas_threshold)


@router.get("/alerts/roas")
async def ads_roas_alerts(
    threshold: float = Query(1.5, ge=0.5, le=20),
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return await get_ads_agent_service().roas_alerts(threshold=threshold)

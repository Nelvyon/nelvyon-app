"""F63 — TikTok Ads API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.tiktok_ads_service import get_tiktok_ads_service

router = APIRouter(prefix="/api/tiktok-ads", tags=["tiktok-ads"])


class CreateTikTokCampaignBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    objective: str = "CONVERSIONS"
    daily_budget_eur: float = Field(50, ge=5, le=50_000)
    hook: str = ""
    primary_text: str = ""


class SuggestCreativeBody(BaseModel):
    product: str = "NELVYON"
    audience: str = "founders y marketing managers"
    goal: str = "conversiones"


@router.get("/status")
async def tiktok_ads_status(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_tiktok_ads_service(db, ws.workspace_id)
    return {"mock": svc.is_mock, "advertiser_id": svc.advertiser_id if not svc.is_mock else None}


@router.post("/campaigns")
async def create_campaign(
    body: CreateTikTokCampaignBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_tiktok_ads_service(db, ws.workspace_id).create_campaign(
        name=body.name,
        objective=body.objective,
        daily_budget_eur=body.daily_budget_eur,
        hook=body.hook,
        primary_text=body.primary_text,
    )


@router.get("/campaigns")
async def list_campaigns(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_tiktok_ads_service(db, ws.workspace_id).list_campaigns()


@router.get("/metrics")
async def campaign_metrics(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_tiktok_ads_service(db, ws.workspace_id).get_metrics()


@router.post("/suggest")
async def suggest_creative(
    body: SuggestCreativeBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_tiktok_ads_service(db, ws.workspace_id).suggest_creative(
        product=body.product, audience=body.audience, goal=body.goal
    )

"""F65 — Snapchat Ads API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.snapchat_ads_service import get_snapchat_ads_service

router = APIRouter(prefix="/api/snapchat-ads", tags=["snapchat-ads"])


class CreateSnapCampaignBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    objective: str = "conversions"
    daily_budget_eur: float = Field(50, ge=5, le=50_000)
    headline: str = ""
    visual_description: str = ""


class SuggestCreativeBody(BaseModel):
    product: str = "NELVYON"
    audience: str = "Gen Z y millennials"
    goal: str = "conversiones"


@router.get("/status")
async def snapchat_ads_status(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_snapchat_ads_service(db, ws.workspace_id)
    return {
        "mock": svc.is_mock,
        "ad_account_id": svc.ad_account_id if not svc.is_mock else None,
    }


@router.post("/campaigns")
async def create_campaign(
    body: CreateSnapCampaignBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_snapchat_ads_service(db, ws.workspace_id).create_campaign(
            name=body.name,
            objective=body.objective,
            daily_budget_eur=body.daily_budget_eur,
            headline=body.headline,
            visual_description=body.visual_description,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/campaigns")
async def list_campaigns(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_snapchat_ads_service(db, ws.workspace_id).list_campaigns()


@router.get("/metrics")
async def campaign_metrics(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_snapchat_ads_service(db, ws.workspace_id).get_metrics()


@router.post("/suggest")
async def suggest_creative(
    body: SuggestCreativeBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_snapchat_ads_service(db, ws.workspace_id).suggest_creative(
        product=body.product, audience=body.audience, goal=body.goal
    )

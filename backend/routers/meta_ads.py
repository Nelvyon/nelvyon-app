"""Meta Marketing API — Facebook + Instagram campaigns (F60)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.meta_ads_service import get_meta_ads_service

router = APIRouter(prefix="/api/meta-ads", tags=["meta-ads"])


class CreateMetaCampaignBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    objective: str = "OUTCOME_SALES"
    daily_budget_eur: float = Field(50, ge=5, le=50_000)
    primary_text: str = ""
    headline: str = ""
    creative_image_url: str | None = None
    targeting: dict[str, Any] | None = None


class UploadMetaCreativeBody(BaseModel):
    image_url: str
    primary_text: str
    headline: str
    link_url: str = "https://nelvyon.com"


@router.get("/status")
async def meta_ads_status(_ws: WorkspaceContext = Depends(require_workspace)):
    svc = get_meta_ads_service()
    _ = svc.is_mock
    return {"mock": svc.is_mock, "ad_account_id": svc.ad_account_id}


@router.get("/campaigns")
async def list_meta_campaigns(
    ad_account_id: str | None = Query(None),
    _ws: WorkspaceContext = Depends(require_workspace),
):
    try:
        return await get_meta_ads_service().get_campaigns(ad_account_id)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/reporting")
async def meta_ads_reporting(_ws: WorkspaceContext = Depends(require_workspace)):
    data = await get_meta_ads_service().get_campaigns()
    campaigns = data.get("campaigns", [])
    impressions = sum(int(c.get("impressions", 0)) for c in campaigns)
    clicks = sum(int(c.get("clicks", 0)) for c in campaigns)
    spend = round(sum(float(c.get("spend", 0)) for c in campaigns), 2)
    return {
        **data,
        "summary": {
            "reach": sum(int(c.get("reach", 0)) for c in campaigns),
            "impressions": impressions,
            "clicks": clicks,
            "ctr": round((clicks / impressions) * 100, 2) if impressions else 0,
            "cpm": round((spend / impressions) * 1000, 2) if impressions else 0,
            "spend": spend,
            "roas": round(
                sum(float(c.get("roas", 0)) for c in campaigns) / max(len(campaigns), 1),
                2,
            ),
        },
    }


@router.post("/campaigns")
async def create_meta_campaign(
    body: CreateMetaCampaignBody,
    _ws: WorkspaceContext = Depends(require_workspace),
):
    try:
        return await get_meta_ads_service().create_campaign(
            name=body.name,
            objective=body.objective,
            daily_budget_eur=body.daily_budget_eur,
            targeting=body.targeting,
            creative_image_url=body.creative_image_url,
            primary_text=body.primary_text,
            headline=body.headline,
        )
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/creatives")
async def upload_meta_creative(
    body: UploadMetaCreativeBody,
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return await get_meta_ads_service().upload_creative(
        image_url=body.image_url,
        primary_text=body.primary_text,
        headline=body.headline,
        link_url=body.link_url,
    )

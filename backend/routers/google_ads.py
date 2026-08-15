"""Google Ads API — OAuth, campaigns, creatives, reporting (F60)."""

from __future__ import annotations

import os

from dependencies.auth import get_super_admin_user
from schemas.auth import UserResponse
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from services.google_ads_service import get_google_ads_service

# AUTORIDAD DE PLATAFORMA, NO DE WORKSPACE
# ----------------------------------------
# El servicio de este router no acepta workspace ni tenant (cero referencias) y
# resuelve UNA sola cuenta publicitaria desde variables de entorno globales. Todo
# lo que se lee o crea aqui es de la cuenta corporativa de NELVYON, no de un
# cliente. `require_workspace` autorizaba correctamente el recurso EQUIVOCADO:
# bastaba pertenecer a cualquier workspace para leer el gasto corporativo o crear
# campanas facturadas a NELVYON.

router = APIRouter(prefix="/api/google-ads", tags=["google-ads"])


class CreateGoogleCampaignBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    campaign_type: str = Field("SEARCH", description="SEARCH | DISPLAY | PERFORMANCE_MAX")
    daily_budget_eur: float = Field(50, ge=5, le=50_000)
    headlines: list[str] = Field(default_factory=list, max_length=15)
    descriptions: list[str] = Field(default_factory=list, max_length=4)
    final_url: str = "https://nelvyon.com"


class UploadAdCopyBody(BaseModel):
    campaign_id: str
    headlines: list[str] = Field(..., min_length=1, max_length=15)
    descriptions: list[str] = Field(default_factory=list, max_length=4)
    final_url: str = "https://nelvyon.com"


@router.get("/status")
async def google_ads_status(_admin: UserResponse = Depends(get_super_admin_user)):
    svc = get_google_ads_service()
    svc._ensure_config()
    oauth = bool(
        os.environ.get("GOOGLE_ADS_CLIENT_ID", "").strip()
        and os.environ.get("GOOGLE_ADS_CLIENT_SECRET", "").strip()
        and os.environ.get("GOOGLE_ADS_REFRESH_TOKEN", "").strip()
        and svc.developer_token
    )
    return {
        "mock": svc.is_mock,
        "oauth_configured": oauth,
        "customer_id": svc.default_customer_id(),
    }


@router.get("/campaigns")
async def list_google_campaigns(
    customer_id: str | None = Query(None),
    _admin: UserResponse = Depends(get_super_admin_user),
):
    try:
        return await get_google_ads_service().get_campaigns(customer_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/reporting")
async def google_ads_reporting(
    customer_id: str | None = Query(None),
    _admin: UserResponse = Depends(get_super_admin_user),
):
    try:
        return await get_google_ads_service().get_reporting_summary(customer_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/campaigns")
async def create_google_campaign(
    body: CreateGoogleCampaignBody,
    _admin: UserResponse = Depends(get_super_admin_user),
):
    try:
        return await get_google_ads_service().create_campaign(
            name=body.name,
            campaign_type=body.campaign_type.upper(),
            daily_budget_eur=body.daily_budget_eur,
            headlines=body.headlines,
            descriptions=body.descriptions,
            final_url=body.final_url,
        )
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/creatives/ad-copy")
async def upload_google_ad_copy(
    body: UploadAdCopyBody,
    _admin: UserResponse = Depends(get_super_admin_user),
):
    try:
        return await get_google_ads_service().upload_ad_copy(
            campaign_id=body.campaign_id,
            headlines=body.headlines,
            descriptions=body.descriptions,
            final_url=body.final_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

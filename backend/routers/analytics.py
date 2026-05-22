"""Analytics API — GA4 traffic + Google Ads performance."""

from __future__ import annotations

import logging
from datetime import date

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.analytics_service import default_date_range, get_analytics_service
from services.google_ads_service import get_google_ads_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
async def analytics_overview(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    property_id: str | None = Query(None),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    start, end = default_date_range() if not start_date or not end_date else (
        start_date.isoformat(),
        end_date.isoformat(),
    )
    service = get_analytics_service()
    try:
        return await service.get_traffic_overview(property_id, start, end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pages")
async def analytics_pages(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    property_id: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    start, end = default_date_range() if not start_date or not end_date else (
        start_date.isoformat(),
        end_date.isoformat(),
    )
    service = get_analytics_service()
    try:
        return await service.get_top_pages(property_id, start, end, limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sources")
async def analytics_sources(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    property_id: str | None = Query(None),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    start, end = default_date_range() if not start_date or not end_date else (
        start_date.isoformat(),
        end_date.isoformat(),
    )
    service = get_analytics_service()
    try:
        return await service.get_traffic_sources(property_id, start, end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/conversions")
async def analytics_conversions(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    property_id: str | None = Query(None),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    start, end = default_date_range() if not start_date or not end_date else (
        start_date.isoformat(),
        end_date.isoformat(),
    )
    service = get_analytics_service()
    try:
        return await service.get_conversions(property_id, start, end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/realtime")
async def analytics_realtime(
    property_id: str | None = Query(None),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    service = get_analytics_service()
    try:
        return await service.get_realtime(property_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ads/campaigns")
async def ads_campaigns(
    customer_id: str | None = Query(None),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    service = get_google_ads_service()
    try:
        return await service.get_campaigns(customer_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("ads_campaigns: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/ads/campaigns/{campaign_id}/stats")
async def ads_campaign_stats(
    campaign_id: str,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    customer_id: str | None = Query(None),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    start, end = default_date_range() if not start_date or not end_date else (
        start_date.isoformat(),
        end_date.isoformat(),
    )
    service = get_google_ads_service()
    try:
        return await service.get_campaign_stats(customer_id, campaign_id, start, end)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.get("/ads/keywords")
async def ads_keywords(
    campaign_id: str = Query(..., description="Google Ads campaign ID"),
    customer_id: str | None = Query(None),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
    _db: AsyncSession = Depends(get_db),
):
    service = get_google_ads_service()
    try:
        return await service.get_keywords(customer_id, campaign_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

"""
CRM Analytics Router — Pipeline metrics, contact segmentation, data integrity.

Endpoints:
- GET /api/v1/crm/analytics/pipeline       → Pipeline summary by stage
- GET /api/v1/crm/analytics/velocity        → Deal velocity and win rate
- GET /api/v1/crm/analytics/segmentation    → Contact segmentation
- GET /api/v1/crm/analytics/growth          → Contact growth over time
- GET /api/v1/crm/analytics/integrity       → Data integrity health check
- GET /api/v1/crm/analytics/overview        → Combined CRM overview
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.crm_analytics import CRMAnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/crm/analytics", tags=["crm-analytics"])


@router.get("/pipeline")
async def pipeline_summary(
    pipeline: Optional[str] = Query(None, description="Filter by pipeline name"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get deal pipeline summary with value by stage and weighted forecast."""
    svc = CRMAnalyticsService(db)
    return await svc.get_pipeline_summary(
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
        pipeline=pipeline,
    )


@router.get("/velocity")
async def deal_velocity(
    days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get deal velocity metrics: win rate, revenue, creation rate."""
    svc = CRMAnalyticsService(db)
    return await svc.get_deal_velocity(
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
        days=days,
    )


@router.get("/segmentation")
async def contact_segmentation(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get contact segmentation by status, source, and engagement score."""
    svc = CRMAnalyticsService(db)
    return await svc.get_contact_segmentation(
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
    )


@router.get("/growth")
async def contact_growth(
    days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get contact growth metrics over time."""
    svc = CRMAnalyticsService(db)
    return await svc.get_contact_growth(
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
        days=days,
    )


@router.get("/integrity")
async def data_integrity(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Run CRM data integrity checks and return health score."""
    svc = CRMAnalyticsService(db)
    return await svc.check_data_integrity(
        user_id=ws_ctx.user_id,
        workspace_id=ws_ctx.workspace_id,
    )


@router.get("/overview")
async def crm_overview(
    days: int = Query(30, ge=1, le=365),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Combined CRM overview: pipeline + velocity + segmentation + integrity."""
    svc = CRMAnalyticsService(db)

    pipeline = await svc.get_pipeline_summary(ws_ctx.user_id, ws_ctx.workspace_id)
    velocity = await svc.get_deal_velocity(ws_ctx.user_id, ws_ctx.workspace_id, days)
    segmentation = await svc.get_contact_segmentation(ws_ctx.user_id, ws_ctx.workspace_id)
    integrity = await svc.check_data_integrity(ws_ctx.user_id, ws_ctx.workspace_id)

    return {
        "pipeline": pipeline,
        "velocity": velocity,
        "segmentation": segmentation,
        "integrity": integrity,
    }
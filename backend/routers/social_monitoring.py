"""Social monitoring API — alerts, mentions, dashboard."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.social_monitoring_service import SocialMonitoringService, get_social_monitoring_service

logger = logging.getLogger(__name__)

social_monitoring_router = APIRouter(prefix="/api/social-monitoring", tags=["social_monitoring"])
router = social_monitoring_router


class CreateAlertBody(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255)
    platforms: list[str] = Field(default_factory=lambda: ["web", "news"])
    notify_email: Optional[str] = None


def _svc(db: AsyncSession, ws: WorkspaceContext) -> SocialMonitoringService:
    return get_social_monitoring_service(db, ws.workspace_id)


@social_monitoring_router.post("/alerts", status_code=201)
async def create_social_alert(
    body: CreateAlertBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await SocialMonitoringService.ensure_schema()
    try:
        return await _svc(db, ws).create_alert(ws.workspace_id, body.keyword, body.platforms, body.notify_email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@social_monitoring_router.get("/alerts")
async def list_social_alerts(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await SocialMonitoringService.ensure_schema()
    items = await _svc(db, ws).get_alerts(ws.workspace_id)
    return {"items": items}


@social_monitoring_router.delete("/alerts/{alert_id}")
async def delete_social_alert(
    alert_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await SocialMonitoringService.ensure_schema()
    ok = await _svc(db, ws).delete_alert(alert_id, ws.workspace_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True}


@social_monitoring_router.get("/mentions")
async def list_social_mentions(
    alert_id: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    since: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await SocialMonitoringService.ensure_schema()
    items = await _svc(db, ws).list_mentions(
        alert_id=alert_id,
        sentiment=sentiment,
        platform=platform,
        since=since,
        limit=limit,
    )
    return {"items": items}


@social_monitoring_router.post("/mentions/{mention_id}/handle")
async def handle_social_mention(
    mention_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await SocialMonitoringService.ensure_schema()
    row = await _svc(db, ws).mark_handled(mention_id)
    if not row:
        raise HTTPException(status_code=404, detail="Mention not found")
    return row


@social_monitoring_router.get("/dashboard")
async def social_monitoring_dashboard(
    refresh: bool = Query(False),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await SocialMonitoringService.ensure_schema()
    svc = _svc(db, ws)
    if refresh:
        try:
            await svc.refresh_alerts()
        except Exception as exc:
            logger.warning("social refresh: %s", exc)
    return await svc.get_dashboard(ws.workspace_id)

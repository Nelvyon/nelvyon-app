"""F64 — Intent data API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.intent_data_service import get_intent_data_service

router = APIRouter(prefix="/api/intent", tags=["intent"])


class TrackEventBody(BaseModel):
    lead_id: str = Field(..., min_length=1)
    event_type: str = Field(..., min_length=1)
    page: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    lead_name: str | None = None
    company: str | None = None


class AlertSettingsBody(BaseModel):
    alerts_enabled: bool = True


@router.post("/track")
async def track_event(
    body: TrackEventBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_intent_data_service(db, ws.workspace_id).track_event(
        lead_id=body.lead_id,
        event_type=body.event_type,
        page=body.page,
        metadata=body.metadata,
        lead_name=body.lead_name,
        company=body.company,
    )


@router.get("/score/{lead_id}")
async def get_intent_score(
    lead_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_intent_data_service(db, ws.workspace_id).get_score(lead_id)


@router.get("/hot-leads")
async def hot_leads(
    min_score: int = 70,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_intent_data_service(db, ws.workspace_id).hot_leads(min_score)


@router.get("/distribution")
async def score_distribution(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_intent_data_service(db, ws.workspace_id).score_distribution()


@router.post("/trigger-sequence/{lead_id}")
async def trigger_sequence(
    lead_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await get_intent_data_service(db, ws.workspace_id).trigger_sequence(lead_id)


@router.get("/settings/alerts")
async def get_alerts(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_intent_data_service(db, ws.workspace_id).get_alert_settings()


@router.put("/settings/alerts")
@router.patch("/settings/alerts")
async def patch_alerts(
    body: AlertSettingsBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await get_intent_data_service(db, ws.workspace_id).set_alert_settings(body.alerts_enabled)

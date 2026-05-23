"""NELVYON CDP API."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.cdp_service import CdpService, get_cdp_service

logger = logging.getLogger(__name__)

cdp_router = APIRouter(prefix="/api/cdp", tags=["cdp"])
router = cdp_router


class IngestEventBody(BaseModel):
    workspace_id: int = Field(..., ge=1)
    source: str = "web"
    event_type: str
    properties: dict[str, Any] = Field(default_factory=dict)
    user_id: Optional[str] = None
    anonymous_id: Optional[str] = None


class IdentifyBody(BaseModel):
    workspace_id: int = Field(..., ge=1)
    anonymous_id: str
    user_id: str
    traits: dict[str, Any] = Field(default_factory=dict)


class CreateSegmentBody(BaseModel):
    name: str = Field(..., min_length=1)
    conditions: list[dict[str, Any]] = Field(default_factory=list)


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> CdpService:
    return get_cdp_service(db, ws.workspace_id if ws else None)


@cdp_router.post("/events")
async def ingest_event(body: IngestEventBody, db: AsyncSession = Depends(get_db)):
    await CdpService.ensure_schema()
    try:
        return await get_cdp_service(db).ingest_event(
            body.workspace_id,
            body.source,
            body.event_type,
            body.properties,
            body.user_id,
            body.anonymous_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@cdp_router.post("/identify")
async def identify_user(body: IdentifyBody, db: AsyncSession = Depends(get_db)):
    await CdpService.ensure_schema()
    try:
        return await get_cdp_service(db).identify_user(
            body.workspace_id, body.anonymous_id, body.user_id, body.traits
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@cdp_router.get("/profiles")
async def list_profiles(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    await CdpService.ensure_schema()
    items = await _svc(db, ws).list_profiles(ws.workspace_id, limit)
    return {"items": items}


@cdp_router.get("/profiles/{user_id}")
async def get_profile(
    user_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await CdpService.ensure_schema()
    return await _svc(db, ws).get_unified_profile(ws.workspace_id, user_id)


@cdp_router.get("/events")
async def list_events(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    await CdpService.ensure_schema()
    items = await _svc(db, ws).list_recent_events(ws.workspace_id, limit)
    return {"items": items}


@cdp_router.post("/segments", status_code=201)
async def create_segment(
    body: CreateSegmentBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await CdpService.ensure_schema()
    return await _svc(db, ws).create_segment(ws.workspace_id, body.name, body.conditions)


@cdp_router.get("/segments")
async def list_segments(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await CdpService.ensure_schema()
    items = await _svc(db, ws).list_segments(ws.workspace_id)
    return {"items": items}


@cdp_router.post("/segments/{segment_id}/evaluate")
async def evaluate_segment(
    segment_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await CdpService.ensure_schema()
    try:
        return await _svc(db, ws).evaluate_segment(segment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@cdp_router.post("/segments/{segment_id}/sync-crm")
async def sync_segment(
    segment_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await CdpService.ensure_schema()
    try:
        return await _svc(db, ws).sync_segment_to_crm(segment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@cdp_router.get("/stats")
async def cdp_stats(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await CdpService.ensure_schema()
    return await _svc(db, ws).get_cdp_stats(ws.workspace_id)

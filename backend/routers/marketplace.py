"""Agency marketplace API — listings, profiles, reviews, AI matching."""

from __future__ import annotations

import logging
from typing import Any, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.list_cache import list_cached
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin
from services.marketplace_service import get_marketplace_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


class RegisterAgencyBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    services: List[str] = Field(default_factory=list)
    countries: List[str] = Field(default_factory=list)
    pricing: dict[str, Any] = Field(default_factory=dict)
    location: Optional[str] = None
    min_budget: Optional[float] = Field(None, ge=0)
    max_budget: Optional[float] = Field(None, ge=0)
    verified: bool = False


class ReviewAgencyBody(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = Field(None, max_length=2000)


class MatchClientBody(BaseModel):
    client_needs: str = Field(..., min_length=10, max_length=4000)
    location: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    limit: int = Field(5, ge=1, le=10)


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None):
    ws_id = int(ws.workspace_id) if ws and ws.workspace_id else None
    return get_marketplace_service(db, ws_id)


@router.get("/agencies")
@list_cached("marketplace:agencies")
async def list_marketplace_agencies(
    country: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    verified_only: bool = Query(True),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    agencies = await _svc(db).list_agencies(
        country=country,
        service=service,
        min_rating=min_rating,
        verified_only=verified_only,
        limit=limit,
        offset=offset,
    )
    return {"agencies": agencies, "count": len(agencies)}


@router.post("/agencies/register", status_code=201)
async def register_marketplace_agency(
    body: RegisterAgencyBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).register_agency(
            int(ws.workspace_id),
            body.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/agencies/{agency_id}")
async def get_marketplace_agency(
    agency_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db).get_agency_profile(agency_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/agencies/{agency_id}/review", status_code=201)
async def review_marketplace_agency(
    agency_id: str,
    body: ReviewAgencyBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).rate_agency(
            agency_id,
            int(ws.workspace_id),
            body.rating,
            review=body.review,
        )
    except ValueError as exc:
        status = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.post("/match")
async def match_client_to_agency(
    body: MatchClientBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).match_client_to_agency(
            body.client_needs,
            location=body.location,
            budget=body.budget,
            limit=body.limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("marketplace match: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=503, detail="Matching service unavailable") from exc


class ItemReviewBody(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = Field(None, max_length=2000)


@router.get("/items")
@list_cached("marketplace:items")
async def list_marketplace_items(
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items = await _svc(db).list_items(category=category, limit=limit, offset=offset)
    return {"items": items, "count": len(items)}


@router.post("/items/{item_id}/purchase", status_code=201)
async def purchase_marketplace_item(
    item_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).purchase_item(item_id, int(ws.workspace_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/purchases")
@list_cached("marketplace:purchases")
async def list_my_marketplace_purchases(
    limit: int = Query(50, ge=1, le=100),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    purchases = await _svc(db, ws).list_my_purchases(int(ws.workspace_id), limit=limit)
    return {"purchases": purchases, "count": len(purchases)}


@router.post("/items/{item_id}/review", status_code=201)
async def review_marketplace_item(
    item_id: str,
    body: ItemReviewBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).rate_item(
            item_id, int(ws.workspace_id), body.rating, review=body.review
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

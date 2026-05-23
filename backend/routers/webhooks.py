"""Outbound webhooks API — endpoint CRUD, deliveries, test."""

from __future__ import annotations

import logging
from typing import Any, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.list_cache import list_cached
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin
from services.webhook_service import SUPPORTED_EVENTS, get_webhook_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


class RegisterWebhookBody(BaseModel):
    url: HttpUrl
    events: List[str] = Field(..., min_length=1)
    secret: Optional[str] = Field(None, min_length=8)


class UpdateWebhookBody(BaseModel):
    url: Optional[HttpUrl] = None
    events: Optional[List[str]] = None
    active: Optional[bool] = None


class TestWebhookBody(BaseModel):
    event: str = Field("contact.created")
    payload: dict[str, Any] = Field(default_factory=dict)


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_webhook_service(db, int(ws.workspace_id))


@router.get("/events")
async def list_supported_events(
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return {"events": sorted(SUPPORTED_EVENTS)}


@router.get("/endpoints")
@list_cached("webhooks:endpoints")
async def list_webhook_endpoints(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    return {"endpoints": await _svc(db, ws).list_endpoints()}


@router.post("/endpoints", status_code=201)
async def register_webhook_endpoint(
    body: RegisterWebhookBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        row = await _svc(db, ws).register_webhook(
            str(body.url),
            body.events,
            secret=body.secret,
        )
        return row
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/endpoints/{endpoint_id}")
async def get_webhook_endpoint(
    endpoint_id: str,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    ep = await _svc(db, ws).get_endpoint(endpoint_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return {k: v for k, v in ep.items() if k != "secret"}


@router.patch("/endpoints/{endpoint_id}")
async def update_webhook_endpoint(
    endpoint_id: str,
    body: UpdateWebhookBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).update_endpoint(
            endpoint_id,
            url=str(body.url) if body.url else None,
            events=body.events,
            active=body.active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/endpoints/{endpoint_id}", status_code=204)
async def delete_webhook_endpoint(
    endpoint_id: str,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    if not await _svc(db, ws).delete_endpoint(endpoint_id):
        raise HTTPException(status_code=404, detail="Endpoint not found")


@router.get("/deliveries")
async def list_webhook_deliveries(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    endpoint_id: Optional[str] = Query(None),
):
    items = await _svc(db, ws).list_deliveries(limit=limit, endpoint_id=endpoint_id)
    return {"deliveries": items, "count": len(items)}


@router.post("/test")
async def test_webhook(
    body: TestWebhookBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send a test webhook to all matching endpoints."""
    if body.event not in SUPPORTED_EVENTS:
        raise HTTPException(status_code=400, detail=f"Unsupported event: {body.event}")
    try:
        results = await _svc(db, ws).trigger_webhook(
            body.event,
            body.payload or {"test": True, "workspace_id": ws.workspace_id},
        )
        return {"delivered": len(results), "results": results}
    except Exception as exc:
        logger.error("webhook test: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=502, detail="Webhook test failed") from exc


@router.post("/retry")
async def retry_failed_webhooks(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).retry_failed_webhooks()

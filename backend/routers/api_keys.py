"""Developer API — API keys and OpenAPI documentation links."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace_admin
from services.api_keys_service import VALID_SCOPES, get_api_keys_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/developer", tags=["developer-api"])


class CreateAPIKeyBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    scopes: List[str] = Field(..., min_length=1)
    expires_at: Optional[datetime] = None


@router.get("/docs")
async def developer_docs(request: Request):
    """Link to OpenAPI documentation for the public API."""
    base = str(request.base_url).rstrip("/")
    return {
        "openapi_url": f"{base}/openapi.json",
        "swagger_ui": f"{base}/docs",
        "redoc": f"{base}/redoc",
        "authentication": {
            "type": "bearer",
            "header": "Authorization: Bearer nlv_<your_api_key>",
            "workspace_header": "X-Workspace-Id: <workspace_id>",
        },
        "webhooks_docs": f"{base}/api/webhooks/events",
        "portal": os.environ.get("NELVYON_DEVELOPER_PORTAL_URL", "https://docs.nelvyon.com/api"),
    }


@router.get("/scopes")
async def list_scopes(_ws: WorkspaceContext = Depends(require_workspace_admin)):
    return {"scopes": sorted(VALID_SCOPES)}


@router.get("/api-keys")
async def list_api_keys(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = get_api_keys_service(db, ws.workspace_id)
    keys = await svc.list_api_keys(int(ws.workspace_id))
    return {"api_keys": keys, "count": len(keys)}


@router.post("/api-keys", status_code=201)
async def create_api_key(
    body: CreateAPIKeyBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = get_api_keys_service(db, ws.workspace_id)
    try:
        return await svc.create_api_key(
            int(ws.workspace_id),
            body.name,
            body.scopes,
            expires_at=body.expires_at,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("create_api_key: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create API key") from exc


@router.get("/api-keys/{key_id}")
async def get_api_key(
    key_id: str,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = get_api_keys_service(db, ws.workspace_id)
    row = await svc.get_api_key(key_id, int(ws.workspace_id))
    if not row:
        raise HTTPException(status_code=404, detail="API key not found")
    return row


@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: str,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = get_api_keys_service(db, ws.workspace_id)
    if not await svc.revoke_api_key(key_id, int(ws.workspace_id)):
        raise HTTPException(status_code=404, detail="API key not found")

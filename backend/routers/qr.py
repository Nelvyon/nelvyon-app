"""NELVYON QR Code API."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.list_cache import list_cached
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.qr_service import QrService, get_qr_service

logger = logging.getLogger(__name__)

qr_router = APIRouter(prefix="/api/qr", tags=["qr"])
qr_public_router = APIRouter(tags=["qr-public"])
router = qr_router


class GenerateQrBody(BaseModel):
    content: str = Field(..., min_length=1)
    qr_type: str = "url"
    config: dict[str, Any] = Field(default_factory=dict)
    name: str = ""


class DynamicQrBody(BaseModel):
    destination_url: str = Field(..., min_length=1)
    name: str = ""


class UpdateDynamicBody(BaseModel):
    destination_url: str = Field(..., min_length=1)


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> QrService:
    return get_qr_service(db, ws.workspace_id if ws else None)


@qr_public_router.get("/qr/{short_code}")
async def public_qr_redirect(short_code: str, request: Request, db: AsyncSession = Depends(get_db)):
    await QrService.ensure_schema()
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")
    try:
        result = await get_qr_service(db).track_scan(short_code, ip, ua)
        dest = result.get("destination_url")
        if not dest:
            raise HTTPException(status_code=404, detail="No destination")
        if not dest.startswith("http"):
            dest = f"https://{dest.lstrip('/')}"
        return RedirectResponse(url=dest, status_code=302)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@qr_router.post("/generate")
async def generate_qr(
    body: GenerateQrBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await QrService.ensure_schema()
    try:
        return await _svc(db, ws).generate_qr(
            ws.workspace_id, body.content, body.qr_type, body.config, body.name
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@qr_router.post("/dynamic")
async def create_dynamic(
    body: DynamicQrBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await QrService.ensure_schema()
    return await _svc(db, ws).create_dynamic_qr(ws.workspace_id, body.destination_url, body.name)


@qr_router.put("/dynamic/{qr_id}")
async def update_dynamic(
    qr_id: str,
    body: UpdateDynamicBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await QrService.ensure_schema()
    try:
        return await _svc(db, ws).update_dynamic_qr(qr_id, body.destination_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@qr_router.get("/list")
@list_cached("qr:list")
async def list_qrs(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await QrService.ensure_schema()
    items = await _svc(db, ws).list_qrs(ws.workspace_id)
    return {"items": items}


@qr_router.get("/{qr_id}/stats")
async def qr_stats(
    qr_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await QrService.ensure_schema()
    try:
        return await _svc(db, ws).get_qr_stats(qr_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

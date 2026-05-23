"""NELVYON landing page builder API."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.landing_builder_service import get_landing_builder_service

logger = logging.getLogger(__name__)

landing_router = APIRouter(prefix="/api/landing", tags=["landing"])
public_page_router = APIRouter(tags=["landing-public"])


class CreatePageBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    blocks: list[dict[str, Any]] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    form_fields: list[dict[str, Any]] = Field(default_factory=list)


class UpdatePageBody(BaseModel):
    name: Optional[str] = None
    blocks: Optional[list[dict[str, Any]]] = None
    meta: Optional[dict[str, Any]] = None
    ab_config: Optional[dict[str, Any]] = None
    custom_domain: Optional[str] = None
    form_fields: Optional[list[dict[str, Any]]] = None
    status: Optional[str] = None


class VariantBody(BaseModel):
    variant_name: str = Field(..., min_length=1, max_length=100)


class TrackImpressionBody(BaseModel):
    visitor_id: Optional[str] = None
    variant: Optional[str] = None
    referrer: Optional[str] = None


class TrackConversionBody(BaseModel):
    variant: str = "control"
    goal: Optional[str] = None
    revenue: Optional[float] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FormSubmitBody(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)
    visitor_id: Optional[str] = None
    variant: Optional[str] = None


class FromTemplateBody(BaseModel):
    name: Optional[str] = None


@landing_router.post("/pages", status_code=201)
async def create_page(
    body: CreatePageBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    try:
        return await svc.create_page(
            ws.workspace_id,
            body.name,
            blocks=body.blocks,
            meta=body.meta,
            form_fields=body.form_fields,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@landing_router.get("/pages")
async def list_pages(
    status: Optional[str] = Query(None),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    items = await svc.list_pages(ws.workspace_id, status=status)
    return {"items": items}


@landing_router.get("/pages/{page_id}")
async def get_page(
    page_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    page = await svc.get_page(page_id, ws.workspace_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@landing_router.put("/pages/{page_id}")
async def update_page(
    page_id: str,
    body: UpdatePageBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    updates = body.model_dump(exclude_unset=True)
    try:
        return await svc.update_page(page_id, ws.workspace_id, updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@landing_router.delete("/pages/{page_id}")
async def delete_page(
    page_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    ok = await svc.delete_page(page_id, ws.workspace_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"deleted": True}


@landing_router.post("/pages/{page_id}/publish")
async def publish_page(
    page_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    try:
        return await svc.publish_page(page_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@landing_router.post("/pages/{page_id}/unpublish")
async def unpublish_page(
    page_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    page = await svc.get_page(page_id, ws.workspace_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return await svc.unpublish_page(page_id, ws.workspace_id)


@landing_router.get("/pages/{page_id}/analytics")
async def page_analytics(
    page_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    try:
        return await svc.get_analytics(page_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@landing_router.post("/pages/{page_id}/variants", status_code=201)
async def create_variant(
    page_id: str,
    body: VariantBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    try:
        return await svc.create_variant(page_id, ws.workspace_id, body.variant_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@landing_router.post("/track/{page_id}/impression")
async def track_impression(
    page_id: str,
    body: TrackImpressionBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db)
    meta: dict[str, Any] = {}
    if body.referrer:
        meta["referrer"] = body.referrer
    elif request.headers.get("referer"):
        meta["referrer"] = request.headers.get("referer")
    try:
        return await svc.track_impression(
            page_id,
            variant=body.variant,
            visitor_id=body.visitor_id,
            metadata=meta,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@landing_router.post("/track/{page_id}/conversion")
async def track_conversion(
    page_id: str,
    body: TrackConversionBody,
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db)
    meta = {**body.metadata}
    if body.revenue is not None:
        meta["revenue"] = body.revenue
    try:
        return await svc.track_conversion(
            page_id,
            variant=body.variant,
            goal=body.goal,
            metadata=meta,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@landing_router.post("/forms/{page_id}/submit")
async def submit_form(
    page_id: str,
    body: FormSubmitBody,
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db)
    payload = {**body.data}
    if body.variant:
        payload["variant"] = body.variant
    try:
        return await svc.submit_form(page_id, payload, visitor_id=body.visitor_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@landing_router.get("/templates")
async def list_templates(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    return {"templates": await svc.list_templates()}


@landing_router.post("/pages/from-template/{template_id}", status_code=201)
async def create_from_template(
    template_id: str,
    body: FromTemplateBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_landing_builder_service(db, ws.workspace_id)
    try:
        return await svc.create_page_from_template(
            ws.workspace_id, template_id, name=body.name
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@public_page_router.get("/p/{slug}")
async def public_page(slug: str, db: AsyncSession = Depends(get_db)):
    svc = get_landing_builder_service(db)
    page = await svc.get_public_page(slug)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return {
        "slug": page.get("slug"),
        "name": page.get("name"),
        "blocks": page.get("blocks"),
        "meta": page.get("meta"),
        "form_fields": page.get("form_fields"),
        "custom_domain": page.get("custom_domain"),
    }

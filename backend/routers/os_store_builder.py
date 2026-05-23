"""NELVYON OS Store Builder API."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.os_store_builder_service import get_os_store_builder_service
from services.os_store_builder_worker import start_store_generation

logger = logging.getLogger(__name__)

os_store_router = APIRouter(prefix="/api/os/store", tags=["os-store-builder"])
store_public_router = APIRouter(tags=["os-store-public"])


class StoreInfoBody(BaseModel):
    store_name: str = Field(..., min_length=1, max_length=200)
    sector: Optional[str] = None
    description: Optional[str] = None
    brand_colors: dict[str, Any] = Field(default_factory=dict)
    logo_url: Optional[str] = None
    language: str = "es"
    currency: str = "EUR"
    country_code: str = "ES"
    productos_iniciales: list[dict[str, Any]] = Field(default_factory=list)
    payment_methods: list[str] = Field(default_factory=lambda: ["stripe"])
    subdomain: Optional[str] = None


class CreateProjectBody(BaseModel):
    store_info: StoreInfoBody


class ProductBody(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    price_cents: Optional[int] = None
    category: Optional[str] = None
    stock: Optional[int] = 100
    images: list[str] = Field(default_factory=list)


class UpdateProductBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    images: Optional[list[str]] = None
    regenerate_ai: bool = False


class DiscountBody(BaseModel):
    code: str = Field(..., min_length=2, max_length=32)
    type: str = Field(default="percent", pattern="^(percent|fixed)$")
    value: float = Field(..., gt=0)
    max_uses: Optional[int] = None


class CheckoutBody(BaseModel):
    items: list[dict[str, Any]] = Field(..., min_length=1)
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    discount_code: Optional[str] = None


@os_store_router.post("/projects", status_code=201)
async def create_project(
    body: CreateProjectBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    return await svc.create_store_project(ws.workspace_id, body.store_info.model_dump())


@os_store_router.get("/projects")
async def list_projects(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    return {"items": await svc.list_projects(ws.workspace_id)}


@os_store_router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    project = await svc.get_project(project_id, ws.workspace_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@os_store_router.post("/projects/{project_id}/generate")
async def generate_store(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    project = await svc.get_project(project_id, ws.workspace_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("status") == "generating":
        return {"project_id": project_id, "status": "generating"}
    await svc.mark_generating(project_id)
    start_store_generation(project_id)
    return {"project_id": project_id, "status": "generating", "message": "AI store generation started"}


@os_store_router.post("/projects/{project_id}/publish")
async def publish_store(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    try:
        return await svc.publish_store(project_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_store_router.post("/projects/{project_id}/products", status_code=201)
async def add_product(
    project_id: str,
    body: ProductBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    try:
        return await svc.add_product(project_id, ws.workspace_id, body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_store_router.put("/projects/{project_id}/products/{product_id}")
async def update_product(
    project_id: str,
    product_id: str,
    body: UpdateProductBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    try:
        return await svc.update_product(
            project_id, ws.workspace_id, product_id, body.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@os_store_router.delete("/projects/{project_id}/products/{product_id}")
async def delete_product(
    project_id: str,
    product_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    ok = await svc.delete_product(project_id, ws.workspace_id, product_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}


@os_store_router.get("/projects/{project_id}/analytics")
async def store_analytics(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    project = await svc.get_project(project_id, ws.workspace_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await svc.get_store_analytics(project_id, ws.workspace_id)


@os_store_router.post("/projects/{project_id}/discounts", status_code=201)
async def create_discount(
    project_id: str,
    body: DiscountBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    try:
        return await svc.apply_discount(project_id, ws.workspace_id, body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_store_router.get("/templates")
async def list_templates(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    return {"templates": await svc.list_templates()}


@os_store_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db, ws.workspace_id)
    ok = await svc.delete_project(project_id, ws.workspace_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


@store_public_router.get("/store/{subdomain}")
async def public_store_home(subdomain: str, db: AsyncSession = Depends(get_db)):
    svc = get_os_store_builder_service(db)
    page = await svc.get_public_store_home(subdomain.lower())
    if not page:
        raise HTTPException(status_code=404, detail="Store not found")
    return page


@store_public_router.get("/store/{subdomain}/productos")
async def public_catalog(subdomain: str, db: AsyncSession = Depends(get_db)):
    svc = get_os_store_builder_service(db)
    page = await svc.get_public_catalog(subdomain.lower())
    if not page:
        raise HTTPException(status_code=404, detail="Store not found")
    return page


@store_public_router.get("/store/{subdomain}/producto/{slug}")
async def public_product(
    subdomain: str, slug: str, db: AsyncSession = Depends(get_db)
):
    svc = get_os_store_builder_service(db)
    data = await svc.get_public_product(subdomain.lower(), slug)
    if not data:
        raise HTTPException(status_code=404, detail="Product not found")
    return data


@store_public_router.post("/store/{subdomain}/checkout")
async def public_checkout(
    subdomain: str,
    body: CheckoutBody,
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db)
    try:
        return await svc.process_order(subdomain.lower(), body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@store_public_router.post("/store/{subdomain}/webhook/stripe")
async def stripe_webhook(
    subdomain: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_store_builder_service(db)
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        return await svc.handle_stripe_webhook(subdomain.lower(), payload, sig)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@store_public_router.get("/store/{subdomain}/sitemap.xml")
async def store_sitemap(subdomain: str, db: AsyncSession = Depends(get_db)):
    svc = get_os_store_builder_service(db)
    xml = await svc.get_seo_artifact(subdomain.lower(), "sitemap")
    if not xml:
        raise HTTPException(status_code=404, detail="Store not found")
    return Response(content=xml, media_type="application/xml")


@store_public_router.get("/store/{subdomain}/robots.txt")
async def store_robots(subdomain: str, db: AsyncSession = Depends(get_db)):
    svc = get_os_store_builder_service(db)
    robots = await svc.get_seo_artifact(subdomain.lower(), "robots")
    if not robots:
        raise HTTPException(status_code=404, detail="Store not found")
    return PlainTextResponse(robots)

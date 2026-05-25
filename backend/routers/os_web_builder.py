"""NELVYON OS Web Builder API."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, RedirectResponse, Response

from services.web_cache_service import CACHE_HEADERS_ASSET, CACHE_HEADERS_WEBSITE
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.os_web_builder_service import get_os_web_builder_service
from services.os_web_builder_worker import start_website_generation

logger = logging.getLogger(__name__)

os_web_router = APIRouter(prefix="/api/os/web", tags=["os-web-builder"])
site_router = APIRouter(tags=["os-web-public"])


class BusinessInfoBody(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    sector: Optional[str] = None
    description: Optional[str] = None
    brand_colors: dict[str, Any] = Field(default_factory=dict)
    logo_url: Optional[str] = None
    language: str = "es"
    pages: list[str] = Field(default_factory=lambda: ["home", "about", "services", "contact"])
    primary_goal: str = Field(default="leads", pattern="^(leads|ventas|branding|info)$")
    subdomain: Optional[str] = None


class CreateProjectBody(BaseModel):
    business_info: BusinessInfoBody


class FromTemplateBody(BaseModel):
    business_info: Optional[BusinessInfoBody] = None


class UpdatePageBody(BaseModel):
    new_content: dict[str, Any] = Field(default_factory=dict)


class AddPageBody(BaseModel):
    page_type: str = Field(..., pattern="^(home|about|services|pricing|contact|blog|faq|custom)$")


class WebsiteIdBody(BaseModel):
    website_id: str = Field(..., min_length=1, description="OS website project UUID")


@os_web_router.post("/projects", status_code=201)
async def create_project(
    body: CreateProjectBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    try:
        return await svc.create_website_project(
            ws.workspace_id, body.business_info.model_dump()
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_web_router.get("/projects")
async def list_projects(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    return {"items": await svc.list_projects(ws.workspace_id)}


@os_web_router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    project = await svc.get_project(project_id, ws.workspace_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@os_web_router.post("/projects/{project_id}/generate")
async def generate_website(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    project = await svc.get_project(project_id, ws.workspace_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("status") == "generating":
        return {"project_id": project_id, "status": "generating", "message": "Already in progress"}
    await svc.mark_generating(project_id)
    start_website_generation(project_id)
    return {"project_id": project_id, "status": "generating", "message": "AI generation started"}


@os_web_router.post("/projects/{project_id}/publish")
async def publish_website(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    try:
        return await svc.publish_website(project_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_web_router.put("/projects/{project_id}/pages/{page_id}")
async def update_page(
    project_id: str,
    page_id: str,
    body: UpdatePageBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    try:
        return await svc.update_page_content(
            project_id, ws.workspace_id, page_id, new_content=body.new_content
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@os_web_router.post("/projects/{project_id}/pages", status_code=201)
async def add_page(
    project_id: str,
    body: AddPageBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    try:
        return await svc.add_page(project_id, ws.workspace_id, body.page_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_web_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    ok = await svc.delete_project(project_id, ws.workspace_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


@os_web_router.get("/templates")
async def list_templates(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    return {"templates": await svc.list_templates()}


@os_web_router.post("/projects/from-template/{template_id}", status_code=201)
async def create_from_template(
    template_id: str,
    body: FromTemplateBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    info = body.business_info.model_dump() if body.business_info else None
    try:
        return await svc.create_project_from_template(ws.workspace_id, template_id, business_info=info)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_web_router.post("/score")
async def score_website(
    body: WebsiteIdBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Score website design quality (typography, colors, hierarchy, CTA, mobile)."""
    svc = get_os_web_builder_service(db, ws.workspace_id)
    project = await svc.get_project(body.website_id, ws.workspace_id)
    if not project:
        raise HTTPException(status_code=404, detail="Website not found")
    try:
        return await svc.score_website_design(body.website_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@os_web_router.get("/projects/{website_id}/static")
async def get_static_cdn(
    website_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    try:
        data = await svc.get_static_urls(website_id, ws.workspace_id)
        return Response(
            content=json.dumps(data),
            media_type="application/json",
            headers={"Cache-Control": CACHE_HEADERS_WEBSITE},
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@os_web_router.get("/{website_id}/static")
async def get_static_cdn_alias(
    website_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_static_cdn(website_id, ws, db)


@os_web_router.get("/projects/{website_id}/performance")
async def get_website_performance(
    website_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    try:
        return await svc.get_website_performance(website_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@os_web_router.post("/projects/{website_id}/performance/measure")
async def measure_website_performance(
    website_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db, ws.workspace_id)
    try:
        return await svc.measure_website_performance(website_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@os_web_router.get("/{website_id}/performance")
async def get_website_performance_alias(
    website_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_website_performance(website_id, ws, db)


@os_web_router.post("/improve")
async def improve_website(
    body: WebsiteIdBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Run design scorer agent (up to 3 iterations) and persist improvements."""
    svc = get_os_web_builder_service(db, ws.workspace_id)
    project = await svc.get_project(body.website_id, ws.workspace_id)
    if not project:
        raise HTTPException(status_code=404, detail="Website not found")
    try:
        return await svc.improve_website_design(body.website_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@site_router.get("/site/{subdomain}")
async def public_site_home(subdomain: str, db: AsyncSession = Depends(get_db)):
    svc = get_os_web_builder_service(db)
    sub = subdomain.lower()
    static_url = await svc.get_static_page_url(sub, None)
    if static_url:
        return RedirectResponse(
            static_url,
            status_code=302,
            headers={"Cache-Control": CACHE_HEADERS_WEBSITE},
        )
    page = await svc.get_public_site_page(sub, None)
    if not page:
        raise HTTPException(status_code=404, detail="Site not found")
    return Response(
        content=json.dumps(page),
        media_type="application/json",
        headers={"Cache-Control": CACHE_HEADERS_WEBSITE},
    )


@site_router.get("/site/{subdomain}/{page_slug}")
async def public_site_page(
    subdomain: str,
    page_slug: str,
    db: AsyncSession = Depends(get_db),
):
    svc = get_os_web_builder_service(db)
    sub = subdomain.lower()

    if page_slug == "sitemap.xml":
        xml = await svc.get_seo_artifact(sub, "sitemap")
        if not xml:
            raise HTTPException(status_code=404, detail="Site not found")
        return Response(content=xml, media_type="application/xml")

    if page_slug == "robots.txt":
        robots = await svc.get_seo_artifact(sub, "robots")
        if not robots:
            raise HTTPException(status_code=404, detail="Site not found")
        return PlainTextResponse(robots)

    static_url = await svc.get_static_page_url(sub, page_slug)
    if static_url:
        return RedirectResponse(
            static_url,
            status_code=302,
            headers={"Cache-Control": CACHE_HEADERS_WEBSITE},
        )

    page = await svc.get_public_site_page(sub, page_slug)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return Response(
        content=json.dumps(page),
        media_type="application/json",
        headers={"Cache-Control": CACHE_HEADERS_ASSET},
    )

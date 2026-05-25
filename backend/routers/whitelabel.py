"""White-label branding API — config, domain verification, preview."""

from __future__ import annotations

import logging
from typing import Any, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin
from services.whitelabel_service import EMAIL_TEMPLATE_TYPES, WhitelabelService, get_whitelabel_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whitelabel", tags=["whitelabel"])


class WhitelabelConfigBody(BaseModel):
    custom_domain: Optional[str] = None
    brand_name: Optional[str] = Field(None, max_length=120)
    company_name: Optional[str] = Field(None, max_length=120)
    logo_url: Optional[HttpUrl] = None
    favicon_url: Optional[HttpUrl] = None
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    font: Optional[str] = Field(None, max_length=40)
    support_email: Optional[str] = Field(None, max_length=254)
    custom_email_from_name: Optional[str] = Field(None, max_length=120)
    custom_email_from_address: Optional[str] = Field(None, max_length=254)
    hide_nelvyon_branding: bool = False
    custom_css: Optional[str] = Field(None, max_length=50000)


class SubworkspaceBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    admin_email: str = Field(..., min_length=3, max_length=254)


class VerifyDomainBody(BaseModel):
    domain: str = Field(..., min_length=3, max_length=253)


class EmailTemplateBody(BaseModel):
    template_type: str = Field("notification")
    variables: dict[str, Any] = Field(default_factory=dict)


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_whitelabel_service(db, int(ws.workspace_id))


@router.get("/resolve")
async def resolve_whitelabel_by_host(host: str, db: AsyncSession = Depends(get_db)):
    """Public — resolve white-label config by request Host header."""
    await WhitelabelService.ensure_schema()
    svc = get_whitelabel_service(db, 0)
    cfg = await svc.get_config_by_domain(host)
    if not cfg:
        return {"found": False}
    apply = await get_whitelabel_service(db, int(cfg["workspace_id"])).apply_whitelabel()
    return {"found": True, **apply}


@router.get("/apply")
async def apply_whitelabel_config(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).apply_whitelabel()


@router.get("/dns-instructions")
async def dns_instructions(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).get_dns_instructions()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/subworkspace")
async def create_subworkspace(
    body: SubworkspaceBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).create_subworkspace(body.name, body.admin_email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/clients")
async def list_partner_clients(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    clients = await _svc(db, ws).list_partner_clients()
    return {"clients": clients, "count": len(clients)}


@router.get("/config")
async def get_whitelabel_config(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).get_whitelabel_config()


@router.put("/config")
async def configure_whitelabel(
    body: WhitelabelConfigBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = body.model_dump(exclude_none=True)
        if body.logo_url is not None:
            payload["logo_url"] = str(body.logo_url)
        if body.favicon_url is not None:
            payload["favicon_url"] = str(body.favicon_url)
        return await _svc(db, ws).configure_whitelabel(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("whitelabel configure: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save white-label config") from exc


@router.post("/verify-domain")
async def verify_custom_domain(
    body: VerifyDomainBody | None = None,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws)
    try:
        if body and body.domain:
            await svc.configure_whitelabel({"custom_domain": body.domain})
        return await svc.verify_domain()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/preview")
async def preview_whitelabel(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws)
    config = await svc.get_whitelabel_config()
    return svc.build_preview(config)


@router.get("/email-templates/types")
async def list_email_template_types(
    _ws: WorkspaceContext = Depends(require_workspace),
):
    return {"types": sorted(EMAIL_TEMPLATE_TYPES)}


@router.post("/email-templates/render")
async def render_whitelabel_email(
    body: EmailTemplateBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    if body.template_type not in EMAIL_TEMPLATE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported template type: {body.template_type}")
    try:
        return await _svc(db, ws).generate_whitelabel_email_template(
            body.template_type,
            variables=body.variables,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

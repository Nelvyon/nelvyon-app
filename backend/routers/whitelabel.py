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
from services.whitelabel_service import EMAIL_TEMPLATE_TYPES, get_whitelabel_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whitelabel", tags=["whitelabel"])


class WhitelabelConfigBody(BaseModel):
    custom_domain: Optional[str] = None
    brand_name: Optional[str] = Field(None, max_length=120)
    logo_url: Optional[HttpUrl] = None
    favicon_url: Optional[HttpUrl] = None
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    custom_email_from_name: Optional[str] = Field(None, max_length=120)
    custom_email_from_address: Optional[str] = Field(None, max_length=254)
    hide_nelvyon_branding: bool = False
    custom_css: Optional[str] = Field(None, max_length=50000)


class VerifyDomainBody(BaseModel):
    domain: str = Field(..., min_length=3, max_length=253)


class EmailTemplateBody(BaseModel):
    template_type: str = Field("notification")
    variables: dict[str, Any] = Field(default_factory=dict)


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_whitelabel_service(db, int(ws.workspace_id))


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
    body: VerifyDomainBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws)
    try:
        check = await svc.validate_custom_domain(body.domain)
        if check.get("verified"):
            await svc.mark_domain_verified(body.domain)
        return check
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

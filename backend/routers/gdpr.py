"""GDPR API — consent, export, deletion (right to be forgotten)."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.i18n import request_language, t
from core.tenant_context import get_tenant_context
from dependencies.auth import get_admin_user, get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin, require_workspace_operator
from schemas.auth import UserResponse
from services.audit_service import log_critical_audit
from services.gdpr_service import get_gdpr_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gdpr", tags=["gdpr"])


class ConsentBody(BaseModel):
    contact_id: str | None = Field(None, min_length=1)
    user_id: str | None = None
    consent_type: str = Field(..., min_length=1, max_length=64)
    granted: bool = True


class UserConsentBody(BaseModel):
    consent_type: str = Field(..., min_length=1, max_length=64)
    granted: bool = True
    user_id: str | None = None


class DPABody(BaseModel):
    workspace_name: str | None = None
    accept: bool = False


class ExportBody(BaseModel):
    user_id: Optional[str] = Field(
        None,
        description="Data subject user id; defaults to authenticated user",
    )


class DeleteBody(BaseModel):
    user_id: Optional[str] = Field(
        None,
        description="Data subject user id; defaults to authenticated user",
    )


def _lang(request: Request) -> str:
    return request_language(request)


def _tenant_id(ws: WorkspaceContext) -> int:
    tid = get_tenant_context()
    return int(tid if tid is not None else ws.workspace_id)


@router.post("/consent")
async def record_consent(
    body: ConsentBody,
    request: Request,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lang = _lang(request)
    tid = _tenant_id(ws)
    await TenantService(db).set_tenant_context(tid)
    svc = get_gdpr_service(db, tid)
    subject = body.user_id or body.contact_id or str(current_user.id)
    if not subject:
        raise HTTPException(status_code=400, detail="user_id or contact_id required")
    row = await svc.consent_record(
        tid,
        subject,
        body.consent_type,
        body.granted,
        ip_address=request.client.host if request.client else None,
    )
    if body.contact_id:
        await svc.record_consent(
            contact_id=body.contact_id,
            consent_type=body.consent_type,
            granted=body.granted,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    return {
        "message": t("gdpr_consent_recorded", lang),
        "consent": row,
    }


@router.get("/consent")
async def get_user_consents(
    user_id: str | None = None,
    ws: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = _tenant_id(ws)
    subject = (user_id or str(current_user.id)).strip()
    svc = get_gdpr_service(db, tid)
    return await svc.get_active_consents(tid, subject)


@router.get("/consent/{contact_id}")
async def get_consent_status(
    contact_id: str,
    request: Request,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_gdpr_service(db, ws.workspace_id)
    return await svc.get_consent(contact_id)


@router.post("/export")
async def export_user_data(
    body: ExportBody,
    request: Request,
    ws: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lang = _lang(request)
    subject_id = (body.user_id or str(current_user.id)).strip()
    if body.user_id and body.user_id != str(current_user.id):
        if current_user.role not in ("admin", "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=t("admin_required", lang),
            )
    tid = _tenant_id(ws)
    await TenantService(db).set_tenant_context(tid)
    svc = get_gdpr_service(db, tid)
    try:
        payload = await svc.export_user_data(subject_id)
        await log_critical_audit(
            db,
            tenant_id=tid,
            user_id=str(current_user.id),
            action="export",
            resource_type="gdpr",
            resource_id=subject_id,
            ip_address=request.client.host if request.client else None,
        )
    except Exception as exc:
        logger.error("GDPR export failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=t("internal_server_error", lang),
        ) from None
    if not payload.get("user") and not payload.get("legacy_contacts") and not payload.get("crm_contacts"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=t("gdpr_subject_not_found", lang),
        )
    return {
        "message": t("gdpr_export_success", lang),
        "data": payload,
    }


@router.post("/delete")
async def request_data_deletion(
    body: DeleteBody,
    request: Request,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lang = _lang(request)
    subject_id = (body.user_id or str(current_user.id)).strip()
    if body.user_id and body.user_id != str(current_user.id):
        if current_user.role not in ("admin", "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=t("admin_required", lang),
            )
    tid = _tenant_id(ws)
    svc = get_gdpr_service(db, tid)
    try:
        result = await svc.delete_user_data(subject_id)
        await log_critical_audit(
            db,
            tenant_id=tid,
            user_id=str(current_user.id),
            action="delete",
            resource_type="gdpr",
            resource_id=subject_id,
            ip_address=request.client.host if request.client else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    except Exception as exc:
        logger.error("GDPR delete failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=t("internal_server_error", lang),
        ) from None
    return {
        "message": t("gdpr_delete_requested", lang),
        **result,
    }


@router.get("/deletions")
async def list_pending_deletions(
    request: Request,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list pending data deletion requests across workspaces."""
    lang = _lang(request)
    svc = get_gdpr_service(db, 0)
    try:
        rows = await svc.get_pending_deletions()
    except Exception as exc:
        logger.error("GDPR pending deletions failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=t("internal_server_error", lang),
        ) from None
    return {"pending": rows, "count": len(rows)}


@router.get("/data-map")
async def get_gdpr_data_map(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    tid = _tenant_id(ws)
    svc = get_gdpr_service(db, tid)
    return svc.get_data_map(tid)


@router.post("/dpa")
async def generate_gdpr_dpa(
    body: DPABody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = _tenant_id(ws)
    svc = get_gdpr_service(db, tid)
    accepted_by = str(current_user.id) if body.accept else None
    pdf_bytes, meta = await svc.generate_dpa(
        tid,
        accepted_by=accepted_by,
        workspace_name=body.workspace_name,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="dpa-tenant-{tid}.pdf"',
            "X-DPA-Id": meta.get("dpa_id", ""),
        },
    )

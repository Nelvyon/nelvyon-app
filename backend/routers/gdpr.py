"""GDPR API — consent, export, deletion (right to be forgotten)."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from core.database import get_db
from core.i18n import request_language, t
from dependencies.auth import get_admin_user, get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.gdpr_service import get_gdpr_service
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gdpr", tags=["gdpr"])


class ConsentBody(BaseModel):
    contact_id: str = Field(..., min_length=1)
    consent_type: str = Field(..., min_length=1, max_length=64)
    granted: bool = True


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


@router.post("/consent")
async def record_consent(
    body: ConsentBody,
    request: Request,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    lang = _lang(request)
    svc = get_gdpr_service(db, ws.workspace_id)
    row = await svc.record_consent(
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
    svc = get_gdpr_service(db, ws.workspace_id)
    try:
        payload = await svc.export_user_data(subject_id)
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
    svc = get_gdpr_service(db, ws.workspace_id)
    try:
        result = await svc.delete_user_data(subject_id)
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

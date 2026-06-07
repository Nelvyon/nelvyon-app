"""OS-1-09 — Portal cliente: auth, invites y lectura de proyectos/entregables."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.portal import PortalContext, require_portal_user
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from services.portal_auth_service import PortalAuthService
from services.portal_data_service import PortalDataService
from services.portal_deliverable_download_service import PortalDeliverableDownloadService
from services.portal_deliverable_review_service import PortalDeliverableReviewService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/portal", tags=["os_portal_client"])


# --- Auth bodies ---


class PortalInviteCreateBody(BaseModel):
    client_id: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)


class PortalAcceptInviteBody(BaseModel):
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    name: Optional[str] = None


class PortalLoginBody(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class PortalUserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    client_id: str
    workspace_id: int


class PortalAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PortalUserResponse


class PortalMeResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    client_id: str
    workspace_id: int


class PortalProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    updated_at: Optional[str] = None


class PortalDeliverableResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str] = None
    type: Optional[str] = None
    status: str
    file_url: Optional[str] = None
    has_file: bool = False
    version: int
    published_at: Optional[str] = None
    client_reviewed_at: Optional[str] = None
    client_feedback: Optional[str] = None
    client_review_decision: Optional[str] = None
    updated_at: Optional[str] = None


class PortalDeliverableRejectBody(BaseModel):
    feedback: str = Field(..., min_length=1)


class PortalDeliverableApproveBody(BaseModel):
    feedback: Optional[str] = None


class PortalDeliverableReviewResponse(BaseModel):
    id: str
    project_id: str
    title: str
    status: str
    client_reviewed_at: Optional[str] = None
    client_feedback: Optional[str] = None
    client_review_decision: Optional[str] = None


class PortalListResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int


# --- Auth (public + operator invite) ---


@router.post("/invites", status_code=201)
async def create_portal_invite(
    body: PortalInviteCreateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Crea invitación portal para un cliente OS (operator+). Devuelve token raw una vez."""
    service = PortalAuthService(db)
    try:
        result = await service.create_invite(
            workspace_id=ws_ctx.workspace_id,
            client_id=body.client_id,
            email=body.email,
            created_by_user_id=ws_ctx.user_id,
        )
        return {
            "invite_id": result["invite_id"],
            "email": result["email"],
            "client_id": result["client_id"],
            "expires_at": result["expires_at"],
            "token": result["token"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/accept-invite", response_model=PortalAuthResponse)
async def accept_portal_invite(
    body: PortalAcceptInviteBody,
    db: AsyncSession = Depends(get_db),
):
    service = PortalAuthService(db)
    try:
        return await service.accept_invite(
            token=body.token,
            password=body.password,
            name=body.name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/login", response_model=PortalAuthResponse)
async def portal_login(
    body: PortalLoginBody,
    db: AsyncSession = Depends(get_db),
):
    service = PortalAuthService(db)
    try:
        return await service.login(email=body.email, password=body.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


# --- Portal read API ---


@router.get("/me", response_model=PortalMeResponse)
async def portal_me(
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    service = PortalAuthService(db)
    user = await service.get_portal_user(
        portal.portal_user_id,
        workspace_id=portal.workspace_id,
        client_id=portal.client_id,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Portal user not found or inactive")
    return PortalMeResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        client_id=user.client_id,
        workspace_id=user.workspace_id,
    )


@router.get("/projects", response_model=PortalListResponse)
async def portal_list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None),
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    service = PortalDataService(db)
    try:
        result = await service.list_projects(
            workspace_id=portal.workspace_id,
            client_id=portal.client_id,
            page=page,
            page_size=page_size,
            q=q,
        )
        return PortalListResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/projects/{project_id}", response_model=PortalProjectResponse)
async def portal_get_project(
    project_id: str,
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    service = PortalDataService(db)
    row = await service.get_project(
        project_id,
        workspace_id=portal.workspace_id,
        client_id=portal.client_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return PortalProjectResponse(**row)


@router.get("/deliverables", response_model=PortalListResponse)
async def portal_list_deliverables(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    service = PortalDataService(db)
    try:
        result = await service.list_deliverables(
            workspace_id=portal.workspace_id,
            client_id=portal.client_id,
            page=page,
            page_size=page_size,
            q=q,
            project_id=project_id,
        )
        return PortalListResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/deliverables/{deliverable_id}", response_model=PortalDeliverableResponse)
async def portal_get_deliverable(
    deliverable_id: str,
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    service = PortalDataService(db)
    row = await service.get_deliverable(
        deliverable_id,
        workspace_id=portal.workspace_id,
        client_id=portal.client_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    return PortalDeliverableResponse(**row)


@router.get("/deliverables/{deliverable_id}/download")
async def portal_download_deliverable(
    deliverable_id: str,
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    """Secure download: portal JWT, same client/workspace, client_visible + published/approved."""
    service = PortalDeliverableDownloadService(db)
    url = await service.resolve_download_url(
        deliverable_id,
        workspace_id=portal.workspace_id,
        client_id=portal.client_id,
    )
    if not url:
        raise HTTPException(status_code=404, detail="No file attached to this deliverable")
    return RedirectResponse(url=url, status_code=302)


@router.post("/deliverables/{deliverable_id}/approve", response_model=PortalDeliverableReviewResponse)
async def portal_approve_deliverable(
    deliverable_id: str,
    body: PortalDeliverableApproveBody = PortalDeliverableApproveBody(),
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    service = PortalDeliverableReviewService(db)
    try:
        result = await service.approve(
            deliverable_id,
            workspace_id=portal.workspace_id,
            client_id=portal.client_id,
            portal_user_id=portal.portal_user_id,
            feedback=body.feedback,
        )
        return PortalDeliverableReviewResponse(**result)
    except ValueError as e:
        msg = str(e)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg) from e


@router.post("/deliverables/{deliverable_id}/reject", response_model=PortalDeliverableReviewResponse)
async def portal_reject_deliverable(
    deliverable_id: str,
    body: PortalDeliverableRejectBody,
    portal: PortalContext = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    service = PortalDeliverableReviewService(db)
    try:
        result = await service.reject(
            deliverable_id,
            workspace_id=portal.workspace_id,
            client_id=portal.client_id,
            portal_user_id=portal.portal_user_id,
            feedback=body.feedback,
        )
        return PortalDeliverableReviewResponse(**result)
    except ValueError as e:
        msg = str(e)
        if "feedback is required" in msg:
            raise HTTPException(status_code=400, detail=msg) from e
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg) from e

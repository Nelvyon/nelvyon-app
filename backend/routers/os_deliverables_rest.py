"""OS-1-08 — REST API for canonical NELVYON OS deliverables (os_deliverables)."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
from models.os_deliverables import Os_deliverables
from services.os_deliverables_service import OsDeliverablesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/os/deliverables", tags=["os_deliverables_canonical"])


class OsDeliverableCreateBody(BaseModel):
    client_id: str = Field(..., min_length=1)
    project_id: str = Field(..., min_length=1)
    task_id: Optional[str] = None
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = "draft"
    visibility: Optional[str] = "internal"
    file_url: Optional[str] = None
    storage_key: Optional[str] = None
    version: Optional[int] = 1
    review_notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class OsDeliverableUpdateBody(BaseModel):
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    file_url: Optional[str] = None
    storage_key: Optional[str] = None
    version: Optional[int] = None
    review_notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class OsDeliverableRejectBody(BaseModel):
    review_notes: Optional[str] = None


class OsDeliverableResponse(BaseModel):
    id: str
    workspace_id: int
    client_id: str
    project_id: str
    task_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    type: Optional[str] = None
    status: str
    visibility: str
    file_url: Optional[str] = None
    storage_key: Optional[str] = None
    version: int
    review_notes: Optional[str] = None
    delivered_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    client_reviewed_at: Optional[datetime] = None
    approved_by_portal_user_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    archived_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OsDeliverableListResponse(BaseModel):
    items: List[OsDeliverableResponse]
    total: int
    page: int
    page_size: int


def _to_response(row: Os_deliverables) -> OsDeliverableResponse:
    return OsDeliverableResponse(
        id=row.id,
        workspace_id=row.workspace_id,
        client_id=row.client_id,
        project_id=row.project_id,
        task_id=row.task_id,
        title=row.title,
        description=row.description,
        type=row.type,
        status=row.status,
        visibility=row.visibility,
        file_url=row.file_url,
        storage_key=row.storage_key,
        version=row.version,
        review_notes=row.review_notes,
        delivered_at=row.delivered_at,
        approved_at=row.approved_at,
        published_at=row.published_at,
        client_reviewed_at=row.client_reviewed_at,
        approved_by_portal_user_id=row.approved_by_portal_user_id,
        metadata=row.deliverable_metadata if isinstance(row.deliverable_metadata, dict) else {},
        archived_at=row.archived_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _handle_value_error(e: ValueError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=OsDeliverableListResponse)
async def list_os_deliverables(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    task_id: Optional[str] = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsDeliverablesService(db)
    try:
        result = await service.list_deliverables(
            workspace_id=ws_ctx.workspace_id,
            page=page,
            page_size=page_size,
            q=q,
            status=status,
            visibility=visibility,
            type=type,
            client_id=client_id,
            project_id=project_id,
            task_id=task_id,
        )
        return OsDeliverableListResponse(
            items=[_to_response(row) for row in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
        )
    except ValueError as e:
        raise _handle_value_error(e) from e
    except Exception as e:
        logger.error("Error listing os_deliverables: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/{deliverable_id}", response_model=OsDeliverableResponse)
async def get_os_deliverable(
    deliverable_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsDeliverablesService(db)
    row = await service.get_by_id(deliverable_id, workspace_id=ws_ctx.workspace_id)
    if not row:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    return _to_response(row)


@router.get("/{deliverable_id}/client-reviews")
async def list_os_deliverable_client_reviews(
    deliverable_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Historial de revisiones cliente portal (solo lectura, equipo interno)."""
    from services.portal_deliverable_review_service import PortalDeliverableReviewService

    deliverable_service = OsDeliverablesService(db)
    row = await deliverable_service.get_by_id(deliverable_id, workspace_id=ws_ctx.workspace_id)
    if not row:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    review_service = PortalDeliverableReviewService(db)
    items = await review_service.list_reviews_for_deliverable(
        deliverable_id, workspace_id=ws_ctx.workspace_id
    )
    return {"items": items, "total": len(items)}


@router.post("", response_model=OsDeliverableResponse, status_code=201)
async def create_os_deliverable(
    body: OsDeliverableCreateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsDeliverablesService(db)
    try:
        row = await service.create(body.model_dump(), workspace_id=ws_ctx.workspace_id)
        return _to_response(row)
    except ValueError as e:
        raise _handle_value_error(e) from e
    except Exception as e:
        logger.error("Error creating os_deliverable: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.patch("/{deliverable_id}", response_model=OsDeliverableResponse)
async def patch_os_deliverable(
    deliverable_id: str,
    body: OsDeliverableUpdateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsDeliverablesService(db)
    update_dict = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        row = await service.update(
            deliverable_id, update_dict, workspace_id=ws_ctx.workspace_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Deliverable not found")
        return _to_response(row)
    except HTTPException:
        raise
    except ValueError as e:
        raise _handle_value_error(e) from e
    except Exception as e:
        logger.error("Error updating os_deliverable %s: %s", deliverable_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/{deliverable_id}")
async def delete_os_deliverable(
    deliverable_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsDeliverablesService(db)
    success = await service.delete(deliverable_id, workspace_id=ws_ctx.workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    return {
        "message": "Deliverable archived successfully",
        "id": deliverable_id,
        "status": "archived",
    }


async def _workflow_action(
    deliverable_id: str,
    ws_ctx: WorkspaceContext,
    db: AsyncSession,
    action: str,
):
    service = OsDeliverablesService(db)
    try:
        handler = getattr(service, action)
        row = await handler(deliverable_id, workspace_id=ws_ctx.workspace_id)
        if not row:
            raise HTTPException(status_code=404, detail="Deliverable not found")
        return _to_response(row)
    except HTTPException:
        raise
    except ValueError as e:
        raise _handle_value_error(e) from e
    except Exception as e:
        logger.error("Workflow %s on %s failed: %s", action, deliverable_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/{deliverable_id}/submit-review", response_model=OsDeliverableResponse)
async def submit_review_os_deliverable(
    deliverable_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await _workflow_action(deliverable_id, ws_ctx, db, "submit_review")


@router.post("/{deliverable_id}/deliver", response_model=OsDeliverableResponse)
async def deliver_os_deliverable(
    deliverable_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await _workflow_action(deliverable_id, ws_ctx, db, "deliver")


@router.post("/{deliverable_id}/approve", response_model=OsDeliverableResponse)
async def approve_os_deliverable(
    deliverable_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await _workflow_action(deliverable_id, ws_ctx, db, "approve")


@router.post("/{deliverable_id}/publish", response_model=OsDeliverableResponse)
async def publish_os_deliverable(
    deliverable_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await _workflow_action(deliverable_id, ws_ctx, db, "publish")


@router.post("/{deliverable_id}/reject", response_model=OsDeliverableResponse)
async def reject_os_deliverable(
    deliverable_id: str,
    body: OsDeliverableRejectBody = OsDeliverableRejectBody(),
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsDeliverablesService(db)
    try:
        row = await service.reject(
            deliverable_id,
            workspace_id=ws_ctx.workspace_id,
            review_notes=body.review_notes,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Deliverable not found")
        return _to_response(row)
    except HTTPException:
        raise
    except ValueError as e:
        raise _handle_value_error(e) from e
    except Exception as e:
        logger.error("Reject on %s failed: %s", deliverable_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e

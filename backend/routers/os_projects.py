"""OS-1-06 — REST API for canonical NELVYON OS projects (os_projects)."""
from __future__ import annotations

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
from models.os_projects import Os_projects
from services.os_projects import OsProjectsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/os/projects", tags=["os_projects"])


class OsProjectCreateBody(BaseModel):
    client_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: Optional[str] = "draft"
    priority: Optional[str] = "medium"
    start_date: Optional[Union[str, date]] = None
    due_date: Optional[Union[str, date]] = None
    budget: Optional[Union[float, str]] = None
    metadata: Optional[Dict[str, Any]] = None


class OsProjectUpdateBody(BaseModel):
    client_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[Union[str, date]] = None
    due_date: Optional[Union[str, date]] = None
    budget: Optional[Union[float, str]] = None
    metadata: Optional[Dict[str, Any]] = None


class OsProjectResponse(BaseModel):
    id: str
    workspace_id: int
    client_id: str
    name: str
    description: Optional[str] = None
    status: str
    priority: str
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    budget: Optional[Decimal] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    archived_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OsProjectListResponse(BaseModel):
    items: List[OsProjectResponse]
    total: int
    page: int
    page_size: int


def _to_response(row: Os_projects) -> OsProjectResponse:
    return OsProjectResponse(
        id=row.id,
        workspace_id=row.workspace_id,
        client_id=row.client_id,
        name=row.name,
        description=row.description,
        status=row.status,
        priority=row.priority,
        start_date=row.start_date,
        due_date=row.due_date,
        budget=row.budget,
        metadata=row.project_metadata if isinstance(row.project_metadata, dict) else {},
        archived_at=row.archived_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=OsProjectListResponse)
async def list_os_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search name, description"),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsProjectsService(db)
    try:
        result = await service.list_projects(
            workspace_id=ws_ctx.workspace_id,
            page=page,
            page_size=page_size,
            q=q,
            status=status,
            priority=priority,
            client_id=client_id,
        )
        return OsProjectListResponse(
            items=[_to_response(row) for row in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error listing os_projects: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/{project_id}", response_model=OsProjectResponse)
async def get_os_project(
    project_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsProjectsService(db)
    row = await service.get_by_id(project_id, workspace_id=ws_ctx.workspace_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return _to_response(row)


@router.post("", response_model=OsProjectResponse, status_code=201)
async def create_os_project(
    body: OsProjectCreateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsProjectsService(db)
    try:
        row = await service.create(body.model_dump(), workspace_id=ws_ctx.workspace_id)
        return _to_response(row)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating os_project: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.patch("/{project_id}", response_model=OsProjectResponse)
async def patch_os_project(
    project_id: str,
    body: OsProjectUpdateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsProjectsService(db)
    update_dict = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        row = await service.update(project_id, update_dict, workspace_id=ws_ctx.workspace_id)
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return _to_response(row)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error updating os_project %s: %s", project_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/{project_id}")
async def delete_os_project(
    project_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsProjectsService(db)
    success = await service.delete(project_id, workspace_id=ws_ctx.workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "message": "Project archived successfully",
        "id": project_id,
        "status": "archived",
    }

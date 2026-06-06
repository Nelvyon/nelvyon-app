"""OS-1-07 — REST API for canonical NELVYON OS tasks (os_tasks)."""
from __future__ import annotations

import logging
from datetime import date, datetime
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
from models.os_tasks import Os_tasks
from services.os_tasks_service import OsTasksService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/os/tasks", tags=["os_tasks_canonical"])


class OsTaskCreateBody(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: Optional[str] = "pending"
    priority: Optional[str] = "medium"
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[Union[str, date]] = None
    metadata: Optional[Dict[str, Any]] = None


class OsTaskUpdateBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[Union[str, date]] = None
    metadata: Optional[Dict[str, Any]] = None


class OsTaskResponse(BaseModel):
    id: str
    workspace_id: int
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assignee: Optional[str] = None
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    archived_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OsTaskListResponse(BaseModel):
    items: List[OsTaskResponse]
    total: int
    page: int
    page_size: int


def _to_response(row: Os_tasks) -> OsTaskResponse:
    return OsTaskResponse(
        id=row.id,
        workspace_id=row.workspace_id,
        project_id=row.project_id,
        client_id=row.client_id,
        title=row.title,
        description=row.description,
        status=row.status,
        priority=row.priority,
        assignee=row.assignee,
        due_date=row.due_date,
        completed_at=row.completed_at,
        metadata=row.task_metadata if isinstance(row.task_metadata, dict) else {},
        archived_at=row.archived_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=OsTaskListResponse)
async def list_os_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsTasksService(db)
    try:
        result = await service.list_tasks(
            workspace_id=ws_ctx.workspace_id,
            page=page,
            page_size=page_size,
            q=q,
            status=status,
            priority=priority,
            project_id=project_id,
            client_id=client_id,
            assignee=assignee,
        )
        return OsTaskListResponse(
            items=[_to_response(row) for row in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error listing os_tasks: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/{task_id}", response_model=OsTaskResponse)
async def get_os_task(
    task_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsTasksService(db)
    row = await service.get_by_id(task_id, workspace_id=ws_ctx.workspace_id)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_response(row)


@router.post("", response_model=OsTaskResponse, status_code=201)
async def create_os_task(
    body: OsTaskCreateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsTasksService(db)
    try:
        row = await service.create(body.model_dump(), workspace_id=ws_ctx.workspace_id)
        return _to_response(row)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating os_task: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.patch("/{task_id}", response_model=OsTaskResponse)
async def patch_os_task(
    task_id: str,
    body: OsTaskUpdateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsTasksService(db)
    update_dict = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        row = await service.update(task_id, update_dict, workspace_id=ws_ctx.workspace_id)
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        return _to_response(row)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error updating os_task %s: %s", task_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/{task_id}")
async def delete_os_task(
    task_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsTasksService(db)
    success = await service.delete(task_id, workspace_id=ws_ctx.workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task archived successfully", "id": task_id, "status": "archived"}

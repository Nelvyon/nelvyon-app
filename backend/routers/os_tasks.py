import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
from services.os_tasks import Os_tasksService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/os_tasks", tags=["os_tasks"])


class Os_tasksData(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pendiente"
    priority: str = "media"
    due_date: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assignee: Optional[str] = None


class Os_tasksUpdateData(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assignee: Optional[str] = None


class Os_tasksResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: Optional[str] = None
    due_date: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assignee: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Os_tasksListResponse(BaseModel):
    items: List[Os_tasksResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=Os_tasksListResponse)
async def query_os_tasks(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Os_tasksService(db)
    query_dict = None
    if query:
        try:
            query_dict = json.loads(query)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid query JSON format") from exc
    try:
        return await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
    except Exception as e:
        logger.error(f"Error querying os_tasks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") from e


@router.get("/{id}", response_model=Os_tasksResponse)
async def get_os_tasks(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Os_tasksService(db)
    result = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
    if not result:
        raise HTTPException(status_code=404, detail="Os_tasks not found")
    return result


@router.post("", response_model=Os_tasksResponse, status_code=201)
async def create_os_tasks(
    data: Os_tasksData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Os_tasksService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create os_tasks")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{id}", response_model=Os_tasksResponse)
async def update_os_tasks(
    id: int,
    data: Os_tasksUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Os_tasksService(db)
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    try:
        result = await service.update(
            id,
            update_dict,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Os_tasks not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{id}")
async def delete_os_tasks(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Os_tasksService(db)
    success = await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Os_tasks not found")
    return {"message": "Os_tasks deleted successfully", "id": id}

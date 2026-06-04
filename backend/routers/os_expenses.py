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
from services.os_expenses import Os_expensesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/os_expenses", tags=["os_expenses"])


class Os_expensesData(BaseModel):
    title: str
    amount: float
    currency: str = "EUR"
    status: str = "pendiente"
    category: Optional[str] = None
    vendor: Optional[str] = None
    expense_date: Optional[str] = None
    paid_at: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assignee: Optional[str] = None
    notes: Optional[str] = None


class Os_expensesUpdateData(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    vendor: Optional[str] = None
    expense_date: Optional[str] = None
    paid_at: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assignee: Optional[str] = None
    notes: Optional[str] = None


class Os_expensesResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    title: str
    amount: float
    currency: str
    status: str
    category: Optional[str] = None
    vendor: Optional[str] = None
    expense_date: Optional[str] = None
    paid_at: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assignee: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Os_expensesListResponse(BaseModel):
    items: List[Os_expensesResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=Os_expensesListResponse)
async def query_os_expenses(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Os_expensesService(db)
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
        logger.error(f"Error querying os_expenses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") from e


@router.get("/{id}", response_model=Os_expensesResponse)
async def get_os_expenses(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Os_expensesService(db)
    result = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
    if not result:
        raise HTTPException(status_code=404, detail="Os_expenses not found")
    return result


@router.post("", response_model=Os_expensesResponse, status_code=201)
async def create_os_expenses(
    data: Os_expensesData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Os_expensesService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create os_expenses")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{id}", response_model=Os_expensesResponse)
async def update_os_expenses(
    id: int,
    data: Os_expensesUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Os_expensesService(db)
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    try:
        result = await service.update(
            id,
            update_dict,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Os_expenses not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{id}")
async def delete_os_expenses(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Os_expensesService(db)
    success = await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Os_expenses not found")
    return {"message": "Os_expenses deleted successfully", "id": id}

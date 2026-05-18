import json
import logging
from typing import List, Optional

from datetime import datetime

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import enforce_contacts_plan_module_for_crm_writes
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.revenue_records import Revenue_recordsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/revenue_records", tags=["revenue_records"])


class Revenue_recordsData(BaseModel):
    workspace_id: int = None
    source: str = None
    amount: float
    currency: str = None
    period: str = None
    period_type: str = None
    client_name: str = None
    plan_id: str = None
    notes: str = None
    recorded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class Revenue_recordsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    source: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    period: Optional[str] = None
    period_type: Optional[str] = None
    client_name: Optional[str] = None
    plan_id: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class Revenue_recordsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    source: Optional[str] = None
    amount: float
    currency: Optional[str] = None
    period: Optional[str] = None
    period_type: Optional[str] = None
    client_name: Optional[str] = None
    plan_id: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Revenue_recordsListResponse(BaseModel):
    items: List[Revenue_recordsResponse]
    total: int
    skip: int
    limit: int


class Revenue_recordsBatchCreateRequest(BaseModel):
    items: List[Revenue_recordsData]


class Revenue_recordsBatchUpdateItem(BaseModel):
    id: int
    updates: Revenue_recordsUpdateData


class Revenue_recordsBatchUpdateRequest(BaseModel):
    items: List[Revenue_recordsBatchUpdateItem]


class Revenue_recordsBatchDeleteRequest(BaseModel):
    ids: List[int]


@router.get("", response_model=Revenue_recordsListResponse)
async def query_revenue_recordss(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Revenue_recordsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        return await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error querying revenue_recordss: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Revenue_recordsResponse)
async def get_revenue_records(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Revenue_recordsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Revenue_records not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching revenue_records %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Revenue_recordsResponse, status_code=201)
async def create_revenue_records(
    data: Revenue_recordsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Revenue_recordsService(db)
    try:
        result = await service.create(
            data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create revenue_records")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating revenue_records: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Revenue_recordsResponse], status_code=201)
async def create_revenue_recordss_batch(
    request: Revenue_recordsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Revenue_recordsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(
                item_data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error("Batch create revenue_records: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Revenue_recordsResponse])
async def update_revenue_recordss_batch(
    request: Revenue_recordsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Revenue_recordsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error("Batch update revenue_records: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Revenue_recordsResponse)
async def update_revenue_records(
    id: int,
    data: Revenue_recordsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Revenue_recordsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Revenue_records not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error updating revenue_records %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_revenue_recordss_batch(
    request: Revenue_recordsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Revenue_recordsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            if await service.delete(
                item_id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            ):
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} revenue_recordss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error("Batch delete revenue_records: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_revenue_records(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Revenue_recordsService(db)
    try:
        if not await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id):
            raise HTTPException(status_code=404, detail="Revenue_records not found")
        return {"message": "Revenue_records deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting revenue_records %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

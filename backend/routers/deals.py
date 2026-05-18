import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.exc import IntegrityError

from core.database import get_db
from routers.crm_http_helpers import raise_deals_value_error, raise_internal, warn_integrity_conflict
from services.deals import DealsService
from dependencies.quota_guards import enforce_contacts_plan_module_for_crm_writes
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/deals", tags=["deals"])


# ---------- Pydantic Schemas ----------
class DealsData(BaseModel):
    workspace_id: int = None
    contact_id: int = None
    title: str
    value: float = None
    currency: str = None
    stage: str = "lead"
    pipeline: str = None
    probability: int = None
    expected_close: Optional[datetime] = None
    assigned_to: str = None
    tags: str = None
    notes: str = None
    days_in_stage: int = 0
    # E2E relationship fields
    client_id: int = None
    project_id: int = None
    campaign_id: int = None
    contract_id: int = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DealsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    stage: Optional[str] = None
    pipeline: Optional[str] = None
    probability: Optional[int] = None
    expected_close: Optional[datetime] = None
    assigned_to: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    days_in_stage: Optional[int] = None
    # E2E relationship fields
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    campaign_id: Optional[int] = None
    contract_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DealsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: str
    value: Optional[float] = None
    currency: Optional[str] = None
    stage: Optional[str] = None
    pipeline: Optional[str] = None
    probability: Optional[int] = None
    expected_close: Optional[datetime] = None
    assigned_to: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    days_in_stage: Optional[int] = None
    # E2E relationship fields
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    campaign_id: Optional[int] = None
    contract_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DealsListResponse(BaseModel):
    items: List[DealsResponse]
    total: int
    skip: int
    limit: int


class DealsBatchCreateRequest(BaseModel):
    items: List[DealsData]


class DealsBatchUpdateItem(BaseModel):
    id: int
    updates: DealsUpdateData


class DealsBatchUpdateRequest(BaseModel):
    items: List[DealsBatchUpdateItem]


class DealsBatchDeleteRequest(BaseModel):
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=DealsListResponse)
async def query_deals(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query deals with workspace isolation."""
    service = DealsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                logger.warning("deals list: invalid query JSON")
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying deals", e)


@router.get("/all", response_model=DealsListResponse)
async def query_deals_all(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query all deals within workspace."""
    service = DealsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                logger.warning("deals list /all: invalid query JSON")
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying deals (all)", e)


@router.get("/{id}", response_model=DealsResponse)
async def get_deal(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single deal by ID with workspace isolation."""
    service = DealsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Deal not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, f"Error fetching deal id={id}", e)


@router.post("", response_model=DealsResponse, status_code=201)
async def create_deal(
    data: DealsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new deal stamped with the active workspace."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = DealsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create deal")
        return result
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, "create deal", e)
    except ValueError as e:
        raise_deals_value_error(logger, e)
    except Exception as e:
        raise_internal(logger, "Error creating deal", e)


@router.post("/batch", response_model=List[DealsResponse], status_code=201)
async def create_deals_batch(
    request: DealsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch create deals with workspace isolation."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = DealsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch create deals", e)
    except ValueError as e:
        await db.rollback()
        raise_deals_value_error(logger, e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch create deals", e)


@router.put("/batch", response_model=List[DealsResponse])
async def update_deals_batch(
    request: DealsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch update deals with workspace isolation."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = DealsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch update deals", e)
    except ValueError as e:
        await db.rollback()
        raise_deals_value_error(logger, e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch update deals", e)


@router.put("/{id}", response_model=DealsResponse)
async def update_deal(
    id: int,
    data: DealsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update deal with workspace isolation."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = DealsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Deal not found")
        return result
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"update deal id={id}", e)
    except ValueError as e:
        raise_deals_value_error(logger, e)
    except Exception as e:
        raise_internal(logger, f"Error updating deal id={id}", e)


@router.delete("/batch")
async def delete_deals_batch(
    request: DealsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch delete deals with workspace isolation."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = DealsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if success:
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} deals", "deleted_count": deleted_count}
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch delete deals", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch delete deals", e)


@router.delete("/{id}")
async def delete_deal(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete deal with workspace isolation."""
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = DealsService(db)
    try:
        success = await service.delete(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deal not found")
        return {"message": "Deal deleted successfully", "id": id}
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"delete deal id={id}", e)
    except Exception as e:
        raise_internal(logger, f"Error deleting deal id={id}", e)
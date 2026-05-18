import json
import logging
from typing import List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import enforce_contacts_plan_module_for_crm_writes
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.activities import ActivitiesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/activities", tags=["activities"])


# ---------- Pydantic Schemas ----------
class ActivitiesData(BaseModel):
    """Entity data schema (for create/update)"""

    workspace_id: int = None
    contact_id: int = None
    deal_id: int = None
    type: str
    title: str
    description: str = None
    is_completed: bool = None
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ActivitiesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""

    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    deal_id: Optional[int] = None
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ActivitiesResponse(BaseModel):
    """Entity response schema"""

    id: int
    user_id: str
    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    deal_id: Optional[int] = None
    type: str
    title: str
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ActivitiesListResponse(BaseModel):
    """List response schema"""

    items: List[ActivitiesResponse]
    total: int
    skip: int
    limit: int


class ActivitiesBatchCreateRequest(BaseModel):
    """Batch create request"""

    items: List[ActivitiesData]


class ActivitiesBatchUpdateItem(BaseModel):
    """Batch update item"""

    id: int
    updates: ActivitiesUpdateData


class ActivitiesBatchUpdateRequest(BaseModel):
    """Batch update request"""

    items: List[ActivitiesBatchUpdateItem]


class ActivitiesBatchDeleteRequest(BaseModel):
    """Batch delete request"""

    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=ActivitiesListResponse)
async def query_activitiess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query activities scoped to active workspace."""
    logger.debug(f"Querying activitiess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = ActivitiesService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        logger.debug(f"Found {result['total']} activitiess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying activitiess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=ActivitiesListResponse)
async def query_activitiess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Workspace-wide activity listing (operator + módulo CRM contactos)."""
    logger.debug(f"Querying activitiess /all: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)

    service = ActivitiesService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        logger.debug(f"Found {result['total']} activitiess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying activitiess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=ActivitiesResponse)
async def get_activities(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single activity by ID (workspace-scoped)."""
    logger.debug(f"Fetching activities with id: {id}, fields={fields}")

    service = ActivitiesService(db)
    try:
        result = await service.get_by_id(
            id,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            logger.warning(f"Activities with id {id} not found")
            raise HTTPException(status_code=404, detail="Activities not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching activities {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=ActivitiesResponse, status_code=201)
async def create_activities(
    data: ActivitiesData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create activity (operator + módulo CRM)."""
    logger.debug(f"Creating new activities with data: {data}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)

    service = ActivitiesService(db)
    try:
        payload = data.model_dump()
        result = await service.create(
            payload,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create activities")

        logger.info(f"Activities created successfully with id: {result.id}")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error creating activities: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating activities: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[ActivitiesResponse], status_code=201)
async def create_activitiess_batch(
    request: ActivitiesBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch create activities."""
    logger.debug(f"Batch creating {len(request.items)} activitiess")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)

    service = ActivitiesService(db)
    results = []

    try:
        for item_data in request.items:
            result = await service.create(
                item_data.model_dump(),
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)

        logger.info(f"Batch created {len(results)} activitiess successfully")
        return results
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[ActivitiesResponse])
async def update_activitiess_batch(
    request: ActivitiesBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch update activities."""
    logger.debug(f"Batch updating {len(request.items)} activitiess")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)

    service = ActivitiesService(db)
    results = []

    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id,
                update_dict,
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)

        logger.info(f"Batch updated {len(results)} activitiess successfully")
        return results
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=ActivitiesResponse)
async def update_activities(
    id: int,
    data: ActivitiesUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing activity."""
    logger.debug(f"Updating activities {id} with data: {data}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)

    service = ActivitiesService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id,
            update_dict,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            logger.warning(f"Activities with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Activities not found")

        logger.info(f"Activities {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating activities {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating activities {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_activitiess_batch(
    request: ActivitiesBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch delete activities."""
    logger.debug(f"Batch deleting {len(request.ids)} activitiess")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)

    service = ActivitiesService(db)
    deleted_count = 0

    try:
        for item_id in request.ids:
            success = await service.delete(
                item_id,
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if success:
                deleted_count += 1

        logger.info(f"Batch deleted {deleted_count} activitiess successfully")
        return {"message": f"Successfully deleted {deleted_count} activitiess", "deleted_count": deleted_count}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_activities(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single activity."""
    logger.debug(f"Deleting activities with id: {id}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)

    service = ActivitiesService(db)
    try:
        success = await service.delete(
            id,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not success:
            logger.warning(f"Activities with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Activities not found")

        logger.info(f"Activities {id} deleted successfully")
        return {"message": "Activities deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting activities {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

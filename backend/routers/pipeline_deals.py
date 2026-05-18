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
from services.pipeline_deals import Pipeline_dealsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/pipeline_deals", tags=["pipeline_deals"])


# ---------- Pydantic Schemas ----------
class Pipeline_dealsData(BaseModel):
    """Entity data schema (for create/update)"""

    workspace_id: Optional[int] = None
    name: str
    company: str = None
    value: float = None
    probability: int = None
    stage: str
    owner: str = None
    tags: str = None
    days_in_stage: int = None
    last_activity: str = None
    created_at: Optional[datetime] = None


class Pipeline_dealsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""

    workspace_id: Optional[int] = None
    name: Optional[str] = None
    company: Optional[str] = None
    value: Optional[float] = None
    probability: Optional[int] = None
    stage: Optional[str] = None
    owner: Optional[str] = None
    tags: Optional[str] = None
    days_in_stage: Optional[int] = None
    last_activity: Optional[str] = None
    created_at: Optional[datetime] = None


class Pipeline_dealsResponse(BaseModel):
    """Entity response schema"""

    id: int
    user_id: str
    workspace_id: Optional[int] = None
    name: str
    company: Optional[str] = None
    value: Optional[float] = None
    probability: Optional[int] = None
    stage: str
    owner: Optional[str] = None
    tags: Optional[str] = None
    days_in_stage: Optional[int] = None
    last_activity: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Pipeline_dealsListResponse(BaseModel):
    """List response schema"""

    items: List[Pipeline_dealsResponse]
    total: int
    skip: int
    limit: int


class Pipeline_dealsBatchCreateRequest(BaseModel):
    """Batch create request"""

    items: List[Pipeline_dealsData]


class Pipeline_dealsBatchUpdateItem(BaseModel):
    """Batch update item"""

    id: int
    updates: Pipeline_dealsUpdateData


class Pipeline_dealsBatchUpdateRequest(BaseModel):
    """Batch update request"""

    items: List[Pipeline_dealsBatchUpdateItem]


class Pipeline_dealsBatchDeleteRequest(BaseModel):
    """Batch delete request"""

    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Pipeline_dealsListResponse)
async def query_pipeline_dealss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query pipeline deals with workspace + user isolation."""
    logger.debug(
        f"Querying pipeline_dealss: ws={ws_ctx.workspace_id}, query={query}, sort={sort}, "
        f"skip={skip}, limit={limit}, fields={fields}"
    )

    service = Pipeline_dealsService(db)
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
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
        )
        logger.debug(f"Found {result['total']} pipeline_dealss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying pipeline_dealss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Pipeline_dealsListResponse)
async def query_pipeline_dealss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query all pipeline deals within the active workspace (auth required)."""
    logger.debug(
        f"Querying pipeline_dealss /all: ws={ws_ctx.workspace_id}, query={query}, sort={sort}"
    )

    service = Pipeline_dealsService(db)
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
            workspace_id=ws_ctx.workspace_id,
        )
        logger.debug(f"Found {result['total']} pipeline_dealss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying pipeline_dealss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Pipeline_dealsResponse)
async def get_pipeline_deals(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single pipeline deal by ID with workspace isolation."""
    logger.debug(f"Fetching pipeline_deals id={id} ws={ws_ctx.workspace_id}, fields={fields}")

    service = Pipeline_dealsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Pipeline_deals with id {id} not found")
            raise HTTPException(status_code=404, detail="Pipeline_deals not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pipeline_deals {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Pipeline_dealsResponse, status_code=201)
async def create_pipeline_deals(
    data: Pipeline_dealsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a pipeline deal stamped with the active workspace."""
    logger.debug(f"Creating pipeline_deals ws={ws_ctx.workspace_id}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Pipeline_dealsService(db)
    try:
        result = await service.create(
            data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create pipeline_deals")

        logger.info(f"Pipeline_deals created id={result.id} ws={ws_ctx.workspace_id}")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error creating pipeline_deals: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating pipeline_deals: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Pipeline_dealsResponse], status_code=201)
async def create_pipeline_dealss_batch(
    request: Pipeline_dealsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch create pipeline deals with workspace isolation."""
    logger.debug(f"Batch creating {len(request.items)} pipeline_dealss ws={ws_ctx.workspace_id}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Pipeline_dealsService(db)
    results = []

    try:
        for item_data in request.items:
            result = await service.create(
                item_data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)

        logger.info(f"Batch created {len(results)} pipeline_dealss successfully")
        return results
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Pipeline_dealsResponse])
async def update_pipeline_dealss_batch(
    request: Pipeline_dealsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch update pipeline deals (workspace-scoped)."""
    logger.debug(f"Batch updating {len(request.items)} pipeline_dealss ws={ws_ctx.workspace_id}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Pipeline_dealsService(db)
    results = []

    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)

        logger.info(f"Batch updated {len(results)} pipeline_dealss successfully")
        return results
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Pipeline_dealsResponse)
async def update_pipeline_deals(
    id: int,
    data: Pipeline_dealsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update a pipeline deal (workspace-scoped)."""
    logger.debug(f"Updating pipeline_deals {id} ws={ws_ctx.workspace_id}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Pipeline_dealsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Pipeline_deals with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Pipeline_deals not found")

        logger.info(f"Pipeline_deals {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating pipeline_deals {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating pipeline_deals {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_pipeline_dealss_batch(
    request: Pipeline_dealsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch delete pipeline deals (workspace-scoped)."""
    logger.debug(f"Batch deleting {len(request.ids)} pipeline_dealss ws={ws_ctx.workspace_id}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Pipeline_dealsService(db)
    deleted_count = 0

    try:
        for item_id in request.ids:
            success = await service.delete(
                item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id
            )
            if success:
                deleted_count += 1

        logger.info(f"Batch deleted {deleted_count} pipeline_dealss successfully")
        return {
            "message": f"Successfully deleted {deleted_count} pipeline_dealss",
            "deleted_count": deleted_count,
        }
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_pipeline_deals(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a pipeline deal by ID (workspace-scoped)."""
    logger.debug(f"Deleting pipeline_deals id={id} ws={ws_ctx.workspace_id}")

    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Pipeline_dealsService(db)
    try:
        success = await service.delete(
            id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Pipeline_deals with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Pipeline_deals not found")

        logger.info(f"Pipeline_deals {id} deleted successfully")
        return {"message": "Pipeline_deals deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pipeline_deals {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

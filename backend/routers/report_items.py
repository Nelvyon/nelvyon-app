import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.report_items import Report_itemsService
from dependencies.auth import get_super_admin_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/report_items", tags=["report_items"])


# ---------- Pydantic Schemas ----------
class Report_itemsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    report_type: str = None
    status: str = None
    data_json: str = None
    metrics_json: str = None
    period: str = None
    generated_by: str = None
    created_at: Optional[datetime] = None


class Report_itemsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    report_type: Optional[str] = None
    status: Optional[str] = None
    data_json: Optional[str] = None
    metrics_json: Optional[str] = None
    period: Optional[str] = None
    generated_by: Optional[str] = None
    created_at: Optional[datetime] = None


class Report_itemsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    name: str
    report_type: Optional[str] = None
    status: Optional[str] = None
    data_json: Optional[str] = None
    metrics_json: Optional[str] = None
    period: Optional[str] = None
    generated_by: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Report_itemsListResponse(BaseModel):
    """List response schema"""
    items: List[Report_itemsResponse]
    total: int
    skip: int
    limit: int


class Report_itemsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Report_itemsData]


class Report_itemsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Report_itemsUpdateData


class Report_itemsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Report_itemsBatchUpdateItem]


class Report_itemsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Report_itemsListResponse)
async def query_report_itemss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query report_itemss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying report_itemss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Report_itemsService(db)
    try:
        # Parse query JSON if provided
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
        logger.debug(f"Found {result['total']} report_itemss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying report_itemss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Report_itemsListResponse)
async def query_report_itemss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _sa: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Query report_itemss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying report_itemss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Report_itemsService(db)
    try:
        # Parse query JSON if provided
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
            user_id=None,
            workspace_id=None,
        )
        logger.debug(f"Found {result['total']} report_itemss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying report_itemss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Report_itemsResponse)
async def get_report_items(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single report_items by ID (user can only see their own records)"""
    logger.debug(f"Fetching report_items with id: {id}, fields={fields}")
    
    service = Report_itemsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Report_items with id {id} not found")
            raise HTTPException(status_code=404, detail="Report_items not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Report_itemsResponse, status_code=201)
async def create_report_items(
    data: Report_itemsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new report_items"""
    logger.debug(f"Creating new report_items with data: {data}")
    
    service = Report_itemsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create report_items")
        
        logger.info(f"Report_items created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating report_items: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating report_items: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Report_itemsResponse], status_code=201)
async def create_report_itemss_batch(
    request: Report_itemsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple report_itemss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} report_itemss")
    
    service = Report_itemsService(db)
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
        
        logger.info(f"Batch created {len(results)} report_itemss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Report_itemsResponse])
async def update_report_itemss_batch(
    request: Report_itemsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple report_itemss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} report_itemss")
    
    service = Report_itemsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id,
                update_dict,
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} report_itemss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Report_itemsResponse)
async def update_report_items(
    id: int,
    data: Report_itemsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing report_items (requires ownership)"""
    logger.debug(f"Updating report_items {id} with data: {data}")

    service = Report_itemsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id,
            update_dict,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            logger.warning(f"Report_items with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Report_items not found")
        
        logger.info(f"Report_items {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating report_items {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating report_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_report_itemss_batch(
    request: Report_itemsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple report_itemss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} report_itemss")
    
    service = Report_itemsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} report_itemss successfully")
        return {"message": f"Successfully deleted {deleted_count} report_itemss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_report_items(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single report_items by ID (requires ownership)"""
    logger.debug(f"Deleting report_items with id: {id}")
    
    service = Report_itemsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Report_items with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Report_items not found")
        
        logger.info(f"Report_items {id} deleted successfully")
        return {"message": "Report_items deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
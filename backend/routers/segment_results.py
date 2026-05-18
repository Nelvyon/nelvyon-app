import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.segment_results import Segment_resultsService
from dependencies.auth import get_super_admin_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/segment_results", tags=["segment_results"])


# ---------- Pydantic Schemas ----------
class Segment_resultsData(BaseModel):
    """Entity data schema (for create/update)"""
    total_contacts: int = None
    segments_count: int = None
    top_segment: str = None
    data_quality_score: int = None
    result_json: str = None
    contacts_json: str = None
    status: str = None
    created_at: Optional[datetime] = None


class Segment_resultsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    total_contacts: Optional[int] = None
    segments_count: Optional[int] = None
    top_segment: Optional[str] = None
    data_quality_score: Optional[int] = None
    result_json: Optional[str] = None
    contacts_json: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None


class Segment_resultsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    total_contacts: Optional[int] = None
    segments_count: Optional[int] = None
    top_segment: Optional[str] = None
    data_quality_score: Optional[int] = None
    result_json: Optional[str] = None
    contacts_json: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Segment_resultsListResponse(BaseModel):
    """List response schema"""
    items: List[Segment_resultsResponse]
    total: int
    skip: int
    limit: int


class Segment_resultsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Segment_resultsData]


class Segment_resultsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Segment_resultsUpdateData


class Segment_resultsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Segment_resultsBatchUpdateItem]


class Segment_resultsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Segment_resultsListResponse)
async def query_segment_resultss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query segment_resultss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying segment_resultss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Segment_resultsService(db)
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
        logger.debug(f"Found {result['total']} segment_resultss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying segment_resultss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Segment_resultsListResponse)
async def query_segment_resultss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _sa: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Query segment_resultss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying segment_resultss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Segment_resultsService(db)
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
        logger.debug(f"Found {result['total']} segment_resultss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying segment_resultss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Segment_resultsResponse)
async def get_segment_results(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single segment_results by ID (user can only see their own records)"""
    logger.debug(f"Fetching segment_results with id: {id}, fields={fields}")
    
    service = Segment_resultsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Segment_results with id {id} not found")
            raise HTTPException(status_code=404, detail="Segment_results not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching segment_results {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Segment_resultsResponse, status_code=201)
async def create_segment_results(
    data: Segment_resultsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new segment_results"""
    logger.debug(f"Creating new segment_results with data: {data}")
    
    service = Segment_resultsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create segment_results")
        
        logger.info(f"Segment_results created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating segment_results: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating segment_results: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Segment_resultsResponse], status_code=201)
async def create_segment_resultss_batch(
    request: Segment_resultsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple segment_resultss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} segment_resultss")
    
    service = Segment_resultsService(db)
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
        
        logger.info(f"Batch created {len(results)} segment_resultss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Segment_resultsResponse])
async def update_segment_resultss_batch(
    request: Segment_resultsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple segment_resultss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} segment_resultss")
    
    service = Segment_resultsService(db)
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
        
        logger.info(f"Batch updated {len(results)} segment_resultss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Segment_resultsResponse)
async def update_segment_results(
    id: int,
    data: Segment_resultsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing segment_results (requires ownership)"""
    logger.debug(f"Updating segment_results {id} with data: {data}")

    service = Segment_resultsService(db)
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
            logger.warning(f"Segment_results with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Segment_results not found")
        
        logger.info(f"Segment_results {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating segment_results {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating segment_results {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_segment_resultss_batch(
    request: Segment_resultsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple segment_resultss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} segment_resultss")
    
    service = Segment_resultsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} segment_resultss successfully")
        return {"message": f"Successfully deleted {deleted_count} segment_resultss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_segment_results(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single segment_results by ID (requires ownership)"""
    logger.debug(f"Deleting segment_results with id: {id}")
    
    service = Segment_resultsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Segment_results with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Segment_results not found")
        
        logger.info(f"Segment_results {id} deleted successfully")
        return {"message": "Segment_results deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting segment_results {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
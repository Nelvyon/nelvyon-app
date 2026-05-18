import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.form_items import Form_itemsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/form_items", tags=["form_items"])


# ---------- Pydantic Schemas ----------
class Form_itemsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    form_type: str
    status: str = None
    fields_count: int = None
    responses_count: int = None
    completion_rate: int = None
    conversion_rate: float = None
    avg_time_seconds: int = None
    fields_json: str = None
    ai_optimized: bool = None
    created_at: Optional[datetime] = None


class Form_itemsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    form_type: Optional[str] = None
    status: Optional[str] = None
    fields_count: Optional[int] = None
    responses_count: Optional[int] = None
    completion_rate: Optional[int] = None
    conversion_rate: Optional[float] = None
    avg_time_seconds: Optional[int] = None
    fields_json: Optional[str] = None
    ai_optimized: Optional[bool] = None
    created_at: Optional[datetime] = None


class Form_itemsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    name: str
    form_type: str
    status: Optional[str] = None
    fields_count: Optional[int] = None
    responses_count: Optional[int] = None
    completion_rate: Optional[int] = None
    conversion_rate: Optional[float] = None
    avg_time_seconds: Optional[int] = None
    fields_json: Optional[str] = None
    ai_optimized: Optional[bool] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Form_itemsListResponse(BaseModel):
    """List response schema"""
    items: List[Form_itemsResponse]
    total: int
    skip: int
    limit: int


class Form_itemsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Form_itemsData]


class Form_itemsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Form_itemsUpdateData


class Form_itemsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Form_itemsBatchUpdateItem]


class Form_itemsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Form_itemsListResponse)
async def query_form_itemss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query form_itemss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying form_itemss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Form_itemsService(db)
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
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} form_itemss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying form_itemss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Form_itemsListResponse)
async def query_form_itemss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query form_itemss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying form_itemss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Form_itemsService(db)
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
            sort=sort
        )
        logger.debug(f"Found {result['total']} form_itemss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying form_itemss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Form_itemsResponse)
async def get_form_items(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single form_items by ID (user can only see their own records)"""
    logger.debug(f"Fetching form_items with id: {id}, fields={fields}")
    
    service = Form_itemsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Form_items with id {id} not found")
            raise HTTPException(status_code=404, detail="Form_items not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching form_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Form_itemsResponse, status_code=201)
async def create_form_items(
    data: Form_itemsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new form_items"""
    logger.debug(f"Creating new form_items with data: {data}")
    
    service = Form_itemsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create form_items")
        
        logger.info(f"Form_items created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating form_items: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating form_items: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Form_itemsResponse], status_code=201)
async def create_form_itemss_batch(
    request: Form_itemsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple form_itemss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} form_itemss")
    
    service = Form_itemsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} form_itemss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Form_itemsResponse])
async def update_form_itemss_batch(
    request: Form_itemsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple form_itemss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} form_itemss")
    
    service = Form_itemsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} form_itemss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Form_itemsResponse)
async def update_form_items(
    id: int,
    data: Form_itemsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing form_items (requires ownership)"""
    logger.debug(f"Updating form_items {id} with data: {data}")

    service = Form_itemsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Form_items with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Form_items not found")
        
        logger.info(f"Form_items {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating form_items {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating form_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_form_itemss_batch(
    request: Form_itemsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple form_itemss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} form_itemss")
    
    service = Form_itemsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} form_itemss successfully")
        return {"message": f"Successfully deleted {deleted_count} form_itemss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_form_items(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single form_items by ID (requires ownership)"""
    logger.debug(f"Deleting form_items with id: {id}")
    
    service = Form_itemsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Form_items with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Form_items not found")
        
        logger.info(f"Form_items {id} deleted successfully")
        return {"message": "Form_items deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting form_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
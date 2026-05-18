import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.website_items import Website_itemsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/website_items", tags=["website_items"])


# ---------- Pydantic Schemas ----------
class Website_itemsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    domain: str = None
    template: str = None
    status: str = None
    pages_count: int = None
    visits: int = None
    ssl_enabled: bool = None
    seo_score: int = None
    performance_score: int = None
    created_at: Optional[datetime] = None


class Website_itemsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    domain: Optional[str] = None
    template: Optional[str] = None
    status: Optional[str] = None
    pages_count: Optional[int] = None
    visits: Optional[int] = None
    ssl_enabled: Optional[bool] = None
    seo_score: Optional[int] = None
    performance_score: Optional[int] = None
    created_at: Optional[datetime] = None


class Website_itemsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    name: str
    domain: Optional[str] = None
    template: Optional[str] = None
    status: Optional[str] = None
    pages_count: Optional[int] = None
    visits: Optional[int] = None
    ssl_enabled: Optional[bool] = None
    seo_score: Optional[int] = None
    performance_score: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Website_itemsListResponse(BaseModel):
    """List response schema"""
    items: List[Website_itemsResponse]
    total: int
    skip: int
    limit: int


class Website_itemsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Website_itemsData]


class Website_itemsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Website_itemsUpdateData


class Website_itemsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Website_itemsBatchUpdateItem]


class Website_itemsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Website_itemsListResponse)
async def query_website_itemss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query website_itemss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying website_itemss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Website_itemsService(db)
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
        logger.debug(f"Found {result['total']} website_itemss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying website_itemss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Website_itemsListResponse)
async def query_website_itemss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query website_itemss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying website_itemss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Website_itemsService(db)
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
        logger.debug(f"Found {result['total']} website_itemss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying website_itemss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Website_itemsResponse)
async def get_website_items(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single website_items by ID (user can only see their own records)"""
    logger.debug(f"Fetching website_items with id: {id}, fields={fields}")
    
    service = Website_itemsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Website_items with id {id} not found")
            raise HTTPException(status_code=404, detail="Website_items not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching website_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Website_itemsResponse, status_code=201)
async def create_website_items(
    data: Website_itemsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new website_items"""
    logger.debug(f"Creating new website_items with data: {data}")
    
    service = Website_itemsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create website_items")
        
        logger.info(f"Website_items created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating website_items: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating website_items: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Website_itemsResponse], status_code=201)
async def create_website_itemss_batch(
    request: Website_itemsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple website_itemss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} website_itemss")
    
    service = Website_itemsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} website_itemss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Website_itemsResponse])
async def update_website_itemss_batch(
    request: Website_itemsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple website_itemss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} website_itemss")
    
    service = Website_itemsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} website_itemss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Website_itemsResponse)
async def update_website_items(
    id: int,
    data: Website_itemsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing website_items (requires ownership)"""
    logger.debug(f"Updating website_items {id} with data: {data}")

    service = Website_itemsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Website_items with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Website_items not found")
        
        logger.info(f"Website_items {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating website_items {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating website_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_website_itemss_batch(
    request: Website_itemsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple website_itemss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} website_itemss")
    
    service = Website_itemsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} website_itemss successfully")
        return {"message": f"Successfully deleted {deleted_count} website_itemss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_website_items(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single website_items by ID (requires ownership)"""
    logger.debug(f"Deleting website_items with id: {id}")
    
    service = Website_itemsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Website_items with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Website_items not found")
        
        logger.info(f"Website_items {id} deleted successfully")
        return {"message": "Website_items deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting website_items {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
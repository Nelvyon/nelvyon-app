import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.website_pages import Website_pagesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/website_pages", tags=["website_pages"])


# ---------- Pydantic Schemas ----------
class Website_pagesData(BaseModel):
    """Entity data schema (for create/update)"""
    website_id: int
    page_name: str
    slug: str = None
    sections_json: str = None
    seo_title: str = None
    seo_description: str = None
    seo_keywords: str = None
    is_published: bool = None
    sort_order: int = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Website_pagesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    website_id: Optional[int] = None
    page_name: Optional[str] = None
    slug: Optional[str] = None
    sections_json: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    is_published: Optional[bool] = None
    sort_order: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Website_pagesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    website_id: int
    page_name: str
    slug: Optional[str] = None
    sections_json: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    is_published: Optional[bool] = None
    sort_order: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Website_pagesListResponse(BaseModel):
    """List response schema"""
    items: List[Website_pagesResponse]
    total: int
    skip: int
    limit: int


class Website_pagesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Website_pagesData]


class Website_pagesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Website_pagesUpdateData


class Website_pagesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Website_pagesBatchUpdateItem]


class Website_pagesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Website_pagesListResponse)
async def query_website_pagess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query website_pagess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying website_pagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Website_pagesService(db)
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
        logger.debug(f"Found {result['total']} website_pagess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying website_pagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Website_pagesListResponse)
async def query_website_pagess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query website_pagess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying website_pagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Website_pagesService(db)
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
        logger.debug(f"Found {result['total']} website_pagess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying website_pagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Website_pagesResponse)
async def get_website_pages(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single website_pages by ID (user can only see their own records)"""
    logger.debug(f"Fetching website_pages with id: {id}, fields={fields}")
    
    service = Website_pagesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Website_pages with id {id} not found")
            raise HTTPException(status_code=404, detail="Website_pages not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching website_pages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Website_pagesResponse, status_code=201)
async def create_website_pages(
    data: Website_pagesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new website_pages"""
    logger.debug(f"Creating new website_pages with data: {data}")
    
    service = Website_pagesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create website_pages")
        
        logger.info(f"Website_pages created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating website_pages: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating website_pages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Website_pagesResponse], status_code=201)
async def create_website_pagess_batch(
    request: Website_pagesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple website_pagess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} website_pagess")
    
    service = Website_pagesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} website_pagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Website_pagesResponse])
async def update_website_pagess_batch(
    request: Website_pagesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple website_pagess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} website_pagess")
    
    service = Website_pagesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} website_pagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Website_pagesResponse)
async def update_website_pages(
    id: int,
    data: Website_pagesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing website_pages (requires ownership)"""
    logger.debug(f"Updating website_pages {id} with data: {data}")

    service = Website_pagesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Website_pages with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Website_pages not found")
        
        logger.info(f"Website_pages {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating website_pages {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating website_pages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_website_pagess_batch(
    request: Website_pagesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple website_pagess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} website_pagess")
    
    service = Website_pagesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} website_pagess successfully")
        return {"message": f"Successfully deleted {deleted_count} website_pagess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_website_pages(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single website_pages by ID (requires ownership)"""
    logger.debug(f"Deleting website_pages with id: {id}")
    
    service = Website_pagesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Website_pages with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Website_pages not found")
        
        logger.info(f"Website_pages {id} deleted successfully")
        return {"message": "Website_pages deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting website_pages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
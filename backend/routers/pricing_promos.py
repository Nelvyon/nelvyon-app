import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.pricing_promos import Pricing_promosService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/pricing_promos", tags=["pricing_promos"])


# ---------- Pydantic Schemas ----------
class Pricing_promosData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    promo_type: str = None
    discount_percent: int = None
    code: str = None
    plan_id: str = None
    billing_cycle: str = None
    active: bool = None
    valid_from: str = None
    valid_until: str = None
    created_at: str = None


class Pricing_promosUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    promo_type: Optional[str] = None
    discount_percent: Optional[int] = None
    code: Optional[str] = None
    plan_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    active: Optional[bool] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    created_at: Optional[str] = None


class Pricing_promosResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    name: str
    promo_type: Optional[str] = None
    discount_percent: Optional[int] = None
    code: Optional[str] = None
    plan_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    active: Optional[bool] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Pricing_promosListResponse(BaseModel):
    """List response schema"""
    items: List[Pricing_promosResponse]
    total: int
    skip: int
    limit: int


class Pricing_promosBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Pricing_promosData]


class Pricing_promosBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Pricing_promosUpdateData


class Pricing_promosBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Pricing_promosBatchUpdateItem]


class Pricing_promosBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Pricing_promosListResponse)
async def query_pricing_promoss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query pricing_promoss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying pricing_promoss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Pricing_promosService(db)
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
        logger.debug(f"Found {result['total']} pricing_promoss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying pricing_promoss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Pricing_promosListResponse)
async def query_pricing_promoss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query pricing_promoss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying pricing_promoss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Pricing_promosService(db)
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
        logger.debug(f"Found {result['total']} pricing_promoss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying pricing_promoss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Pricing_promosResponse)
async def get_pricing_promos(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single pricing_promos by ID (user can only see their own records)"""
    logger.debug(f"Fetching pricing_promos with id: {id}, fields={fields}")
    
    service = Pricing_promosService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Pricing_promos with id {id} not found")
            raise HTTPException(status_code=404, detail="Pricing_promos not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pricing_promos {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Pricing_promosResponse, status_code=201)
async def create_pricing_promos(
    data: Pricing_promosData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new pricing_promos"""
    logger.debug(f"Creating new pricing_promos with data: {data}")
    
    service = Pricing_promosService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create pricing_promos")
        
        logger.info(f"Pricing_promos created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating pricing_promos: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating pricing_promos: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Pricing_promosResponse], status_code=201)
async def create_pricing_promoss_batch(
    request: Pricing_promosBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple pricing_promoss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} pricing_promoss")
    
    service = Pricing_promosService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} pricing_promoss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Pricing_promosResponse])
async def update_pricing_promoss_batch(
    request: Pricing_promosBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple pricing_promoss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} pricing_promoss")
    
    service = Pricing_promosService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} pricing_promoss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Pricing_promosResponse)
async def update_pricing_promos(
    id: int,
    data: Pricing_promosUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing pricing_promos (requires ownership)"""
    logger.debug(f"Updating pricing_promos {id} with data: {data}")

    service = Pricing_promosService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Pricing_promos with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Pricing_promos not found")
        
        logger.info(f"Pricing_promos {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating pricing_promos {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating pricing_promos {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_pricing_promoss_batch(
    request: Pricing_promosBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple pricing_promoss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} pricing_promoss")
    
    service = Pricing_promosService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} pricing_promoss successfully")
        return {"message": f"Successfully deleted {deleted_count} pricing_promoss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_pricing_promos(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single pricing_promos by ID (requires ownership)"""
    logger.debug(f"Deleting pricing_promos with id: {id}")
    
    service = Pricing_promosService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Pricing_promos with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Pricing_promos not found")
        
        logger.info(f"Pricing_promos {id} deleted successfully")
        return {"message": "Pricing_promos deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pricing_promos {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_admin_user
from services.platform_metrics import Platform_metricsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/entities/platform_metrics",
    tags=["platform_metrics"],
    dependencies=[Depends(get_admin_user)],
)


# ---------- Pydantic Schemas ----------
class Platform_metricsData(BaseModel):
    """Entity data schema (for create/update)"""
    user_id: str
    metric_type: str
    module_name: str
    endpoint: str = None
    latency_ms: int = None
    status: str = None
    status_code: int = None
    is_ai: bool = None
    extra_data: str = None
    created_at: Optional[datetime] = None


class Platform_metricsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    user_id: Optional[str] = None
    metric_type: Optional[str] = None
    module_name: Optional[str] = None
    endpoint: Optional[str] = None
    latency_ms: Optional[int] = None
    status: Optional[str] = None
    status_code: Optional[int] = None
    is_ai: Optional[bool] = None
    extra_data: Optional[str] = None
    created_at: Optional[datetime] = None


class Platform_metricsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    metric_type: str
    module_name: str
    endpoint: Optional[str] = None
    latency_ms: Optional[int] = None
    status: Optional[str] = None
    status_code: Optional[int] = None
    is_ai: Optional[bool] = None
    extra_data: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Platform_metricsListResponse(BaseModel):
    """List response schema"""
    items: List[Platform_metricsResponse]
    total: int
    skip: int
    limit: int


class Platform_metricsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Platform_metricsData]


class Platform_metricsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Platform_metricsUpdateData


class Platform_metricsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Platform_metricsBatchUpdateItem]


class Platform_metricsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Platform_metricsListResponse)
async def query_platform_metricss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query platform_metricss with filtering, sorting, and pagination"""
    logger.debug(f"Querying platform_metricss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Platform_metricsService(db)
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
        )
        logger.debug(f"Found {result['total']} platform_metricss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying platform_metricss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Platform_metricsListResponse)
async def query_platform_metricss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query platform_metricss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying platform_metricss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Platform_metricsService(db)
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
        logger.debug(f"Found {result['total']} platform_metricss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying platform_metricss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Platform_metricsResponse)
async def get_platform_metrics(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single platform_metrics by ID"""
    logger.debug(f"Fetching platform_metrics with id: {id}, fields={fields}")
    
    service = Platform_metricsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Platform_metrics with id {id} not found")
            raise HTTPException(status_code=404, detail="Platform_metrics not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching platform_metrics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Platform_metricsResponse, status_code=201)
async def create_platform_metrics(
    data: Platform_metricsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new platform_metrics"""
    logger.debug(f"Creating new platform_metrics with data: {data}")
    
    service = Platform_metricsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create platform_metrics")
        
        logger.info(f"Platform_metrics created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating platform_metrics: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating platform_metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Platform_metricsResponse], status_code=201)
async def create_platform_metricss_batch(
    request: Platform_metricsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple platform_metricss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} platform_metricss")
    
    service = Platform_metricsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} platform_metricss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Platform_metricsResponse])
async def update_platform_metricss_batch(
    request: Platform_metricsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple platform_metricss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} platform_metricss")
    
    service = Platform_metricsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} platform_metricss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Platform_metricsResponse)
async def update_platform_metrics(
    id: int,
    data: Platform_metricsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing platform_metrics"""
    logger.debug(f"Updating platform_metrics {id} with data: {data}")

    service = Platform_metricsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Platform_metrics with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Platform_metrics not found")
        
        logger.info(f"Platform_metrics {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating platform_metrics {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating platform_metrics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_platform_metricss_batch(
    request: Platform_metricsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple platform_metricss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} platform_metricss")
    
    service = Platform_metricsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} platform_metricss successfully")
        return {"message": f"Successfully deleted {deleted_count} platform_metricss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_platform_metrics(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single platform_metrics by ID"""
    logger.debug(f"Deleting platform_metrics with id: {id}")
    
    service = Platform_metricsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Platform_metrics with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Platform_metrics not found")
        
        logger.info(f"Platform_metrics {id} deleted successfully")
        return {"message": "Platform_metrics deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting platform_metrics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
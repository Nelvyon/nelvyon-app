import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.nelvyon_quality_metrics import Nelvyon_quality_metricsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nelvyon_quality_metrics", tags=["nelvyon_quality_metrics"])


def _parse_query_with_workspace(query: str, workspace_id: int) -> dict:
    query_dict = {}
    if query:
        try:
            parsed = json.loads(query)
            if not isinstance(parsed, dict):
                raise ValueError("Query must be a JSON object")
            query_dict.update(parsed)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid query JSON format") from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    query_dict["workspace_id"] = workspace_id
    return query_dict


# ---------- Pydantic Schemas ----------
class Nelvyon_quality_metricsData(BaseModel):
    """Entity data schema (for create/update)"""
    service_id: str
    workspace_id: Optional[int] = None
    service_name: str
    category: str = None
    score: int = None
    has_backend: bool = None
    has_ai: bool = None
    has_crud: bool = None
    has_real_data: bool = None
    uptime: float = None
    response_time: int = None
    description: str = None
    real_features: str = None
    limitations: str = None
    route: str = None
    last_checked: str = None


class Nelvyon_quality_metricsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    service_id: Optional[str] = None
    workspace_id: Optional[int] = None
    service_name: Optional[str] = None
    category: Optional[str] = None
    score: Optional[int] = None
    has_backend: Optional[bool] = None
    has_ai: Optional[bool] = None
    has_crud: Optional[bool] = None
    has_real_data: Optional[bool] = None
    uptime: Optional[float] = None
    response_time: Optional[int] = None
    description: Optional[str] = None
    real_features: Optional[str] = None
    limitations: Optional[str] = None
    route: Optional[str] = None
    last_checked: Optional[str] = None


class Nelvyon_quality_metricsResponse(BaseModel):
    """Entity response schema"""
    id: int
    service_id: str
    workspace_id: Optional[int] = None
    service_name: str
    category: Optional[str] = None
    score: Optional[int] = None
    has_backend: Optional[bool] = None
    has_ai: Optional[bool] = None
    has_crud: Optional[bool] = None
    has_real_data: Optional[bool] = None
    uptime: Optional[float] = None
    response_time: Optional[int] = None
    description: Optional[str] = None
    real_features: Optional[str] = None
    limitations: Optional[str] = None
    route: Optional[str] = None
    last_checked: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_quality_metricsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_quality_metricsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_quality_metricsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_quality_metricsData]


class Nelvyon_quality_metricsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_quality_metricsUpdateData


class Nelvyon_quality_metricsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_quality_metricsBatchUpdateItem]


class Nelvyon_quality_metricsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_quality_metricsListResponse)
async def query_nelvyon_quality_metricss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_quality_metricss with filtering, sorting, and pagination"""
    logger.debug(f"Querying nelvyon_quality_metricss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_quality_metricsService(db)
    try:
        query_dict = _parse_query_with_workspace(query, ws_ctx.workspace_id)
        result = await service.get_list(
            skip=skip,
            limit=limit,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} nelvyon_quality_metricss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_quality_metricss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nelvyon_quality_metricsResponse)
async def get_nelvyon_quality_metrics(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_quality_metrics by ID"""
    logger.debug(f"Fetching nelvyon_quality_metrics with id: {id}, fields={fields}")
    
    service = Nelvyon_quality_metricsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Nelvyon_quality_metrics with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_quality_metrics not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_quality_metrics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_quality_metricsResponse, status_code=201)
async def create_nelvyon_quality_metrics(
    data: Nelvyon_quality_metricsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_quality_metrics"""
    logger.debug(f"Creating new nelvyon_quality_metrics with data: {data}")
    
    service = Nelvyon_quality_metricsService(db)
    try:
        payload = data.model_dump()
        result = await service.create(
            payload,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_quality_metrics")
        
        logger.info(f"Nelvyon_quality_metrics created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_quality_metrics: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_quality_metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_quality_metricsResponse], status_code=201)
async def create_nelvyon_quality_metricss_batch(
    request: Nelvyon_quality_metricsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_quality_metricss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_quality_metricss")
    
    service = Nelvyon_quality_metricsService(db)
    results = []
    
    try:
        for item_data in request.items:
            payload = item_data.model_dump()
            result = await service.create(
                payload,
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nelvyon_quality_metricss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_quality_metricsResponse])
async def update_nelvyon_quality_metricss_batch(
    request: Nelvyon_quality_metricsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_quality_metricss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_quality_metricss")
    
    service = Nelvyon_quality_metricsService(db)
    results = []
    
    try:
        for item in request.items:
            existing = await service.get_by_id(
                item.id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if not existing:
                raise HTTPException(status_code=404, detail=f"Nelvyon_quality_metrics {item.id} not found")
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id,
                update_dict,
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nelvyon_quality_metricss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_quality_metricsResponse)
async def update_nelvyon_quality_metrics(
    id: int,
    data: Nelvyon_quality_metricsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_quality_metrics"""
    logger.debug(f"Updating nelvyon_quality_metrics {id} with data: {data}")

    service = Nelvyon_quality_metricsService(db)
    try:
        existing = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Nelvyon_quality_metrics not found")
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id,
            update_dict,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            logger.warning(f"Nelvyon_quality_metrics with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_quality_metrics not found")
        
        logger.info(f"Nelvyon_quality_metrics {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_quality_metrics {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_quality_metrics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_quality_metricss_batch(
    request: Nelvyon_quality_metricsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_quality_metricss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_quality_metricss")
    
    service = Nelvyon_quality_metricsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            existing = await service.get_by_id(
                item_id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if not existing:
                continue
            success = await service.delete(
                item_id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_quality_metricss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_quality_metricss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_quality_metrics(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_quality_metrics by ID"""
    logger.debug(f"Deleting nelvyon_quality_metrics with id: {id}")
    
    service = Nelvyon_quality_metricsService(db)
    try:
        existing = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Nelvyon_quality_metrics not found")
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Nelvyon_quality_metrics with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_quality_metrics not found")
        
        logger.info(f"Nelvyon_quality_metrics {id} deleted successfully")
        return {"message": "Nelvyon_quality_metrics deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_quality_metrics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

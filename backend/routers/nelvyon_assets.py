import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nelvyon_assets import Nelvyon_assetsService
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nelvyon_assets", tags=["nelvyon_assets"])


# ---------- Pydantic Schemas ----------
class Nelvyon_assetsData(BaseModel):
    """Entity data schema (for create/update)"""
    client_id: int
    asset_type: str
    file_name: str
    object_key: str = None
    file_size: int = None
    mime_type: str = None
    classification: str = None
    dimensions: str = None
    tags: str = None
    visibility: str = None
    # E2E relationship fields
    project_id: int = None
    output_id: int = None
    created_at: Optional[datetime] = None


class Nelvyon_assetsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    client_id: Optional[int] = None
    asset_type: Optional[str] = None
    file_name: Optional[str] = None
    object_key: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    classification: Optional[str] = None
    dimensions: Optional[str] = None
    tags: Optional[str] = None
    visibility: Optional[str] = None
    # E2E relationship fields
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    created_at: Optional[datetime] = None


class Nelvyon_assetsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    client_id: int
    asset_type: str
    file_name: str
    object_key: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    classification: Optional[str] = None
    dimensions: Optional[str] = None
    tags: Optional[str] = None
    visibility: Optional[str] = None
    # E2E relationship fields
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_assetsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_assetsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_assetsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_assetsData]


class Nelvyon_assetsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_assetsUpdateData


class Nelvyon_assetsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_assetsBatchUpdateItem]


class Nelvyon_assetsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_assetsListResponse)
async def query_nelvyon_assetss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_assetss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nelvyon_assetss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_assetsService(db)
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
        logger.debug(f"Found {result['total']} nelvyon_assetss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_assetss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")




@router.get("/{id}", response_model=Nelvyon_assetsResponse)
async def get_nelvyon_assets(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_assets by ID (user can only see their own records)"""
    logger.debug(f"Fetching nelvyon_assets with id: {id}, fields={fields}")
    
    service = Nelvyon_assetsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_assets with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_assets not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_assets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_assetsResponse, status_code=201)
async def create_nelvyon_assets(
    data: Nelvyon_assetsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_assets"""
    logger.debug(f"Creating new nelvyon_assets with data: {data}")
    
    service = Nelvyon_assetsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_assets")
        
        logger.info(f"Nelvyon_assets created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_assets: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_assets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_assetsResponse], status_code=201)
async def create_nelvyon_assetss_batch(
    request: Nelvyon_assetsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_assetss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_assetss")
    
    service = Nelvyon_assetsService(db)
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
        
        logger.info(f"Batch created {len(results)} nelvyon_assetss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_assetsResponse])
async def update_nelvyon_assetss_batch(
    request: Nelvyon_assetsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_assetss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_assetss")
    
    service = Nelvyon_assetsService(db)
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
        
        logger.info(f"Batch updated {len(results)} nelvyon_assetss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_assetsResponse)
async def update_nelvyon_assets(
    id: int,
    data: Nelvyon_assetsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_assets (requires ownership)"""
    logger.debug(f"Updating nelvyon_assets {id} with data: {data}")

    service = Nelvyon_assetsService(db)
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
            logger.warning(f"Nelvyon_assets with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_assets not found")
        
        logger.info(f"Nelvyon_assets {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_assets {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_assets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_assetss_batch(
    request: Nelvyon_assetsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_assetss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_assetss")
    
    service = Nelvyon_assetsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_assetss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_assetss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_assets(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_assets by ID (requires ownership)"""
    logger.debug(f"Deleting nelvyon_assets with id: {id}")
    
    service = Nelvyon_assetsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Nelvyon_assets with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_assets not found")
        
        logger.info(f"Nelvyon_assets {id} deleted successfully")
        return {"message": "Nelvyon_assets deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_assets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

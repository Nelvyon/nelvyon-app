import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nelvyon_products import Nelvyon_productsService
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nelvyon_products", tags=["nelvyon_products"])


# ---------- Pydantic Schemas ----------
class Nelvyon_productsData(BaseModel):
    """Entity data schema (for create/update)"""
    project_id: int
    client_id: int = None
    name: str
    description: str = None
    benefits: str = None
    specs: str = None
    price: float = None
    currency: str = None
    category: str = None
    images: str = None
    status: str = None
    created_at: Optional[datetime] = None


class Nelvyon_productsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[str] = None
    specs: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    images: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None


class Nelvyon_productsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    project_id: int
    client_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    benefits: Optional[str] = None
    specs: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    images: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_productsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_productsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_productsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_productsData]


class Nelvyon_productsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_productsUpdateData


class Nelvyon_productsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_productsBatchUpdateItem]


class Nelvyon_productsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_productsListResponse)
async def query_nelvyon_productss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_productss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nelvyon_productss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_productsService(db)
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
        logger.debug(f"Found {result['total']} nelvyon_productss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_productss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")




@router.get("/{id}", response_model=Nelvyon_productsResponse)
async def get_nelvyon_products(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_products by ID (user can only see their own records)"""
    logger.debug(f"Fetching nelvyon_products with id: {id}, fields={fields}")
    
    service = Nelvyon_productsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_products with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_products not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_products {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_productsResponse, status_code=201)
async def create_nelvyon_products(
    data: Nelvyon_productsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_products"""
    logger.debug(f"Creating new nelvyon_products with data: {data}")
    
    service = Nelvyon_productsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_products")
        
        logger.info(f"Nelvyon_products created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_products: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_products: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_productsResponse], status_code=201)
async def create_nelvyon_productss_batch(
    request: Nelvyon_productsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_productss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_productss")
    
    service = Nelvyon_productsService(db)
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
        
        logger.info(f"Batch created {len(results)} nelvyon_productss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_productsResponse])
async def update_nelvyon_productss_batch(
    request: Nelvyon_productsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_productss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_productss")
    
    service = Nelvyon_productsService(db)
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
        
        logger.info(f"Batch updated {len(results)} nelvyon_productss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_productsResponse)
async def update_nelvyon_products(
    id: int,
    data: Nelvyon_productsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_products (requires ownership)"""
    logger.debug(f"Updating nelvyon_products {id} with data: {data}")

    service = Nelvyon_productsService(db)
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
            logger.warning(f"Nelvyon_products with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_products not found")
        
        logger.info(f"Nelvyon_products {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_products {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_products {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_productss_batch(
    request: Nelvyon_productsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_productss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_productss")
    
    service = Nelvyon_productsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_productss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_productss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_products(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_products by ID (requires ownership)"""
    logger.debug(f"Deleting nelvyon_products with id: {id}")
    
    service = Nelvyon_productsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Nelvyon_products with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_products not found")
        
        logger.info(f"Nelvyon_products {id} deleted successfully")
        return {"message": "Nelvyon_products deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_products {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

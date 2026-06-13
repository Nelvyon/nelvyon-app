import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nelvyon_clients import Nelvyon_clientsService
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nelvyon_clients", tags=["nelvyon_clients"])


# ---------- Pydantic Schemas ----------
class Nelvyon_clientsData(BaseModel):
    """Entity data schema (for create/update)"""
    business_name: str
    sector: str
    country: str = None
    city: str = None
    ideal_customer: str = None
    value_proposition: str = None
    differentiator: str = None
    services: str = None
    objectives: str = None
    brand_tone: str = None
    visual_style: str = None
    brand_colors: str = None
    logo_url: str = None
    competition: str = None
    testimonials: str = None
    case_studies: str = None
    budget: str = None
    language: str = None
    market: str = None
    website_url: str = None


class Nelvyon_clientsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    business_name: Optional[str] = None
    sector: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    ideal_customer: Optional[str] = None
    value_proposition: Optional[str] = None
    differentiator: Optional[str] = None
    services: Optional[str] = None
    objectives: Optional[str] = None
    brand_tone: Optional[str] = None
    visual_style: Optional[str] = None
    brand_colors: Optional[str] = None
    logo_url: Optional[str] = None
    competition: Optional[str] = None
    testimonials: Optional[str] = None
    case_studies: Optional[str] = None
    budget: Optional[str] = None
    language: Optional[str] = None
    market: Optional[str] = None
    website_url: Optional[str] = None


class Nelvyon_clientsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    business_name: str
    sector: str
    country: Optional[str] = None
    city: Optional[str] = None
    ideal_customer: Optional[str] = None
    value_proposition: Optional[str] = None
    differentiator: Optional[str] = None
    services: Optional[str] = None
    objectives: Optional[str] = None
    brand_tone: Optional[str] = None
    visual_style: Optional[str] = None
    brand_colors: Optional[str] = None
    logo_url: Optional[str] = None
    competition: Optional[str] = None
    testimonials: Optional[str] = None
    case_studies: Optional[str] = None
    budget: Optional[str] = None
    language: Optional[str] = None
    market: Optional[str] = None
    website_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_clientsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_clientsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_clientsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_clientsData]


class Nelvyon_clientsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_clientsUpdateData


class Nelvyon_clientsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_clientsBatchUpdateItem]


class Nelvyon_clientsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_clientsListResponse)
async def query_nelvyon_clientss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_clientss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nelvyon_clientss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_clientsService(db)
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
        logger.debug(f"Found {result['total']} nelvyon_clientss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_clientss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")




@router.get("/{id}", response_model=Nelvyon_clientsResponse)
async def get_nelvyon_clients(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_clients by ID (user can only see their own records)"""
    logger.debug(f"Fetching nelvyon_clients with id: {id}, fields={fields}")
    
    service = Nelvyon_clientsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_clients with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_clients not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_clients {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_clientsResponse, status_code=201)
async def create_nelvyon_clients(
    data: Nelvyon_clientsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_clients (any workspace member)."""
    logger.debug(f"Creating new nelvyon_clients with data: {data}")
    
    service = Nelvyon_clientsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_clients")
        
        logger.info(f"Nelvyon_clients created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_clients: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_clients: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_clientsResponse], status_code=201)
async def create_nelvyon_clientss_batch(
    request: Nelvyon_clientsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_clientss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_clientss")
    
    service = Nelvyon_clientsService(db)
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
        
        logger.info(f"Batch created {len(results)} nelvyon_clientss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_clientsResponse])
async def update_nelvyon_clientss_batch(
    request: Nelvyon_clientsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_clientss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_clientss")
    
    service = Nelvyon_clientsService(db)
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
        
        logger.info(f"Batch updated {len(results)} nelvyon_clientss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_clientsResponse)
async def update_nelvyon_clients(
    id: int,
    data: Nelvyon_clientsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_clients (requires ownership)"""
    logger.debug(f"Updating nelvyon_clients {id} with data: {data}")

    service = Nelvyon_clientsService(db)
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
            logger.warning(f"Nelvyon_clients with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_clients not found")
        
        logger.info(f"Nelvyon_clients {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_clients {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_clients {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_clientss_batch(
    request: Nelvyon_clientsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_clientss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_clientss")
    
    service = Nelvyon_clientsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_clientss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_clientss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_clients(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_clients by ID (requires ownership)"""
    logger.debug(f"Deleting nelvyon_clients with id: {id}")
    
    service = Nelvyon_clientsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Nelvyon_clients with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_clients not found")
        
        logger.info(f"Nelvyon_clients {id} deleted successfully")
        return {"message": "Nelvyon_clients deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_clients {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

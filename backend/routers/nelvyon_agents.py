import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nelvyon_agents import Nelvyon_agentsService
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nelvyon_agents", tags=["nelvyon_agents"])


# ---------- Pydantic Schemas ----------
class Nelvyon_agentsData(BaseModel):
    """Entity data schema (for create/update)"""
    agent_id: str
    name: str
    codename: str = None
    description: str = None
    long_description: str = None
    color: str = None
    gradient: str = None
    icon_name: str = None
    status: str = None
    uptime: str = None
    tasks_completed: int = None
    tasks_today: int = None
    success_rate: float = None
    functionality_level: str = None
    functionality_note: str = None
    capabilities: str = None
    metrics: str = None
    recent_tasks: str = None
    logs: str = None


class Nelvyon_agentsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    agent_id: Optional[str] = None
    name: Optional[str] = None
    codename: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    color: Optional[str] = None
    gradient: Optional[str] = None
    icon_name: Optional[str] = None
    status: Optional[str] = None
    uptime: Optional[str] = None
    tasks_completed: Optional[int] = None
    tasks_today: Optional[int] = None
    success_rate: Optional[float] = None
    functionality_level: Optional[str] = None
    functionality_note: Optional[str] = None
    capabilities: Optional[str] = None
    metrics: Optional[str] = None
    recent_tasks: Optional[str] = None
    logs: Optional[str] = None


class Nelvyon_agentsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    agent_id: str
    name: str
    codename: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    color: Optional[str] = None
    gradient: Optional[str] = None
    icon_name: Optional[str] = None
    status: Optional[str] = None
    uptime: Optional[str] = None
    tasks_completed: Optional[int] = None
    tasks_today: Optional[int] = None
    success_rate: Optional[float] = None
    functionality_level: Optional[str] = None
    functionality_note: Optional[str] = None
    capabilities: Optional[str] = None
    metrics: Optional[str] = None
    recent_tasks: Optional[str] = None
    logs: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_agentsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_agentsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_agentsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_agentsData]


class Nelvyon_agentsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_agentsUpdateData


class Nelvyon_agentsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_agentsBatchUpdateItem]


class Nelvyon_agentsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_agentsListResponse)
async def query_nelvyon_agentss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_agentss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nelvyon_agentss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_agentsService(db)
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
        logger.debug(f"Found {result['total']} nelvyon_agentss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_agentss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nelvyon_agentsResponse)
async def get_nelvyon_agents(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_agents by ID (user can only see their own records)"""
    logger.debug(f"Fetching nelvyon_agents with id: {id}, fields={fields}")
    
    service = Nelvyon_agentsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Nelvyon_agents with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_agents not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_agents {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_agentsResponse, status_code=201)
async def create_nelvyon_agents(
    data: Nelvyon_agentsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_agents"""
    logger.debug(f"Creating new nelvyon_agents with data: {data}")
    
    service = Nelvyon_agentsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_agents")
        
        logger.info(f"Nelvyon_agents created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_agents: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_agents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_agentsResponse], status_code=201)
async def create_nelvyon_agentss_batch(
    request: Nelvyon_agentsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_agentss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_agentss")
    
    service = Nelvyon_agentsService(db)
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
        
        logger.info(f"Batch created {len(results)} nelvyon_agentss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_agentsResponse])
async def update_nelvyon_agentss_batch(
    request: Nelvyon_agentsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_agentss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_agentss")
    
    service = Nelvyon_agentsService(db)
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
        
        logger.info(f"Batch updated {len(results)} nelvyon_agentss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_agentsResponse)
async def update_nelvyon_agents(
    id: int,
    data: Nelvyon_agentsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_agents (requires ownership)"""
    logger.debug(f"Updating nelvyon_agents {id} with data: {data}")

    service = Nelvyon_agentsService(db)
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
            logger.warning(f"Nelvyon_agents with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_agents not found")
        
        logger.info(f"Nelvyon_agents {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_agents {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_agents {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_agentss_batch(
    request: Nelvyon_agentsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_agentss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_agentss")
    
    service = Nelvyon_agentsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_agentss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_agentss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_agents(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_agents by ID (requires ownership)"""
    logger.debug(f"Deleting nelvyon_agents with id: {id}")
    
    service = Nelvyon_agentsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Nelvyon_agents with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_agents not found")
        
        logger.info(f"Nelvyon_agents {id} deleted successfully")
        return {"message": "Nelvyon_agents deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_agents {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

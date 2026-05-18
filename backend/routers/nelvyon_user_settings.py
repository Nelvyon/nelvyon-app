import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nelvyon_user_settings import Nelvyon_user_settingsService
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nelvyon_user_settings", tags=["nelvyon_user_settings"])


# ---------- Pydantic Schemas ----------
class Nelvyon_user_settingsData(BaseModel):
    """Entity data schema (for create/update)"""
    display_name: str = None
    role: str = None
    two_fa_enabled: bool = None
    notification_new_clients: bool = None
    notification_qa_complete: bool = None
    notification_deploys: bool = None
    notification_errors: bool = None
    notification_weekly_email: bool = None
    theme_id: str = None
    custom_theme_json: str = None


class Nelvyon_user_settingsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    display_name: Optional[str] = None
    role: Optional[str] = None
    two_fa_enabled: Optional[bool] = None
    notification_new_clients: Optional[bool] = None
    notification_qa_complete: Optional[bool] = None
    notification_deploys: Optional[bool] = None
    notification_errors: Optional[bool] = None
    notification_weekly_email: Optional[bool] = None
    theme_id: Optional[str] = None
    custom_theme_json: Optional[str] = None


class Nelvyon_user_settingsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    display_name: Optional[str] = None
    role: Optional[str] = None
    two_fa_enabled: Optional[bool] = None
    notification_new_clients: Optional[bool] = None
    notification_qa_complete: Optional[bool] = None
    notification_deploys: Optional[bool] = None
    notification_errors: Optional[bool] = None
    notification_weekly_email: Optional[bool] = None
    theme_id: Optional[str] = None
    custom_theme_json: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_user_settingsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_user_settingsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_user_settingsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_user_settingsData]


class Nelvyon_user_settingsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_user_settingsUpdateData


class Nelvyon_user_settingsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_user_settingsBatchUpdateItem]


class Nelvyon_user_settingsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_user_settingsListResponse)
async def query_nelvyon_user_settingss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_user_settingss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nelvyon_user_settingss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_user_settingsService(db)
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
        logger.debug(f"Found {result['total']} nelvyon_user_settingss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_user_settingss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")




@router.get("/{id}", response_model=Nelvyon_user_settingsResponse)
async def get_nelvyon_user_settings(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_user_settings by ID (user can only see their own records)"""
    logger.debug(f"Fetching nelvyon_user_settings with id: {id}, fields={fields}")
    
    service = Nelvyon_user_settingsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_user_settings with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_user_settings not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_user_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_user_settingsResponse, status_code=201)
async def create_nelvyon_user_settings(
    data: Nelvyon_user_settingsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_user_settings"""
    logger.debug(f"Creating new nelvyon_user_settings with data: {data}")
    
    service = Nelvyon_user_settingsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_user_settings")
        
        logger.info(f"Nelvyon_user_settings created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_user_settings: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_user_settings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_user_settingsResponse], status_code=201)
async def create_nelvyon_user_settingss_batch(
    request: Nelvyon_user_settingsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_user_settingss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_user_settingss")
    
    service = Nelvyon_user_settingsService(db)
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
        
        logger.info(f"Batch created {len(results)} nelvyon_user_settingss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_user_settingsResponse])
async def update_nelvyon_user_settingss_batch(
    request: Nelvyon_user_settingsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_user_settingss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_user_settingss")
    
    service = Nelvyon_user_settingsService(db)
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
        
        logger.info(f"Batch updated {len(results)} nelvyon_user_settingss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_user_settingsResponse)
async def update_nelvyon_user_settings(
    id: int,
    data: Nelvyon_user_settingsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_user_settings (requires ownership)"""
    logger.debug(f"Updating nelvyon_user_settings {id} with data: {data}")

    service = Nelvyon_user_settingsService(db)
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
            logger.warning(f"Nelvyon_user_settings with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_user_settings not found")
        
        logger.info(f"Nelvyon_user_settings {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_user_settings {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_user_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_user_settingss_batch(
    request: Nelvyon_user_settingsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_user_settingss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_user_settingss")
    
    service = Nelvyon_user_settingsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_user_settingss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_user_settingss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_user_settings(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_user_settings by ID (requires ownership)"""
    logger.debug(f"Deleting nelvyon_user_settings with id: {id}")
    
    service = Nelvyon_user_settingsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Nelvyon_user_settings with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_user_settings not found")
        
        logger.info(f"Nelvyon_user_settings {id} deleted successfully")
        return {"message": "Nelvyon_user_settings deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_user_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.nelvyon_bot_templates import Nelvyon_bot_templatesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nelvyon_bot_templates", tags=["nelvyon_bot_templates"])


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
class Nelvyon_bot_templatesData(BaseModel):
    """Entity data schema (for create/update)"""
    template_id: str
    workspace_id: Optional[int] = None
    name: str
    description: str = None
    category: str = None
    channels: str = None
    rating: float = None
    uses: int = None
    icon_name: str = None
    color: str = None
    features: str = None
    is_active: bool = None


class Nelvyon_bot_templatesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    template_id: Optional[str] = None
    workspace_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    channels: Optional[str] = None
    rating: Optional[float] = None
    uses: Optional[int] = None
    icon_name: Optional[str] = None
    color: Optional[str] = None
    features: Optional[str] = None
    is_active: Optional[bool] = None


class Nelvyon_bot_templatesResponse(BaseModel):
    """Entity response schema"""
    id: int
    template_id: str
    workspace_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    channels: Optional[str] = None
    rating: Optional[float] = None
    uses: Optional[int] = None
    icon_name: Optional[str] = None
    color: Optional[str] = None
    features: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_bot_templatesListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_bot_templatesResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_bot_templatesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_bot_templatesData]


class Nelvyon_bot_templatesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_bot_templatesUpdateData


class Nelvyon_bot_templatesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_bot_templatesBatchUpdateItem]


class Nelvyon_bot_templatesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_bot_templatesListResponse)
async def query_nelvyon_bot_templatess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_bot_templatess with filtering, sorting, and pagination"""
    logger.debug(f"Querying nelvyon_bot_templatess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_bot_templatesService(db)
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
        logger.debug(f"Found {result['total']} nelvyon_bot_templatess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_bot_templatess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nelvyon_bot_templatesResponse)
async def get_nelvyon_bot_templates(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_bot_templates by ID"""
    logger.debug(f"Fetching nelvyon_bot_templates with id: {id}, fields={fields}")
    
    service = Nelvyon_bot_templatesService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Nelvyon_bot_templates with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_bot_templates not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_bot_templates {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_bot_templatesResponse, status_code=201)
async def create_nelvyon_bot_templates(
    data: Nelvyon_bot_templatesData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_bot_templates"""
    logger.debug(f"Creating new nelvyon_bot_templates with data: {data}")
    
    service = Nelvyon_bot_templatesService(db)
    try:
        payload = data.model_dump()
        result = await service.create(
            payload,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_bot_templates")
        
        logger.info(f"Nelvyon_bot_templates created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_bot_templates: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_bot_templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_bot_templatesResponse], status_code=201)
async def create_nelvyon_bot_templatess_batch(
    request: Nelvyon_bot_templatesBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_bot_templatess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_bot_templatess")
    
    service = Nelvyon_bot_templatesService(db)
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
        
        logger.info(f"Batch created {len(results)} nelvyon_bot_templatess successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_bot_templatesResponse])
async def update_nelvyon_bot_templatess_batch(
    request: Nelvyon_bot_templatesBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_bot_templatess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_bot_templatess")
    
    service = Nelvyon_bot_templatesService(db)
    results = []
    
    try:
        for item in request.items:
            existing = await service.get_by_id(
                item.id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if not existing:
                raise HTTPException(status_code=404, detail=f"Nelvyon_bot_templates {item.id} not found")
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id,
                update_dict,
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nelvyon_bot_templatess successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_bot_templatesResponse)
async def update_nelvyon_bot_templates(
    id: int,
    data: Nelvyon_bot_templatesUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_bot_templates"""
    logger.debug(f"Updating nelvyon_bot_templates {id} with data: {data}")

    service = Nelvyon_bot_templatesService(db)
    try:
        existing = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Nelvyon_bot_templates not found")
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id,
            update_dict,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            logger.warning(f"Nelvyon_bot_templates with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_bot_templates not found")
        
        logger.info(f"Nelvyon_bot_templates {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_bot_templates {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_bot_templates {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_bot_templatess_batch(
    request: Nelvyon_bot_templatesBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_bot_templatess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_bot_templatess")
    
    service = Nelvyon_bot_templatesService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_bot_templatess successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_bot_templatess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_bot_templates(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_bot_templates by ID"""
    logger.debug(f"Deleting nelvyon_bot_templates with id: {id}")
    
    service = Nelvyon_bot_templatesService(db)
    try:
        existing = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Nelvyon_bot_templates not found")
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Nelvyon_bot_templates with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_bot_templates not found")
        
        logger.info(f"Nelvyon_bot_templates {id} deleted successfully")
        return {"message": "Nelvyon_bot_templates deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_bot_templates {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

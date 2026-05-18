import json
import logging
from typing import List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_super_admin_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.social_posts import Social_postsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/social_posts", tags=["social_posts"])


# ---------- Pydantic Schemas ----------
class Social_postsData(BaseModel):
    """Entity data schema (for create/update)"""
    platform: str
    content: str
    format_type: str = None
    status: str
    scheduled_at: str = None
    published_at: str = None
    impressions: int = None
    clicks: int = None
    likes: int = None
    comments: int = None
    shares: int = None
    error_message: str = None
    retry_count: int = None
    hashtags: str = None
    media_url: str = None
    campaign_name: str = None
    client_id: int = None
    project_id: int = None
    output_id: int = None
    contract_id: int = None
    created_at: Optional[datetime] = None


class Social_postsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    platform: Optional[str] = None
    content: Optional[str] = None
    format_type: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[str] = None
    published_at: Optional[str] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = None
    hashtags: Optional[str] = None
    media_url: Optional[str] = None
    campaign_name: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    contract_id: Optional[int] = None
    created_at: Optional[datetime] = None


class Social_postsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    platform: str
    content: str
    format_type: Optional[str] = None
    status: str
    scheduled_at: Optional[str] = None
    published_at: Optional[str] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = None
    hashtags: Optional[str] = None
    media_url: Optional[str] = None
    campaign_name: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    contract_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Social_postsListResponse(BaseModel):
    """List response schema"""
    items: List[Social_postsResponse]
    total: int
    skip: int
    limit: int


class Social_postsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Social_postsData]


class Social_postsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Social_postsUpdateData


class Social_postsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Social_postsBatchUpdateItem]


class Social_postsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Social_postsListResponse)
async def query_social_postss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query social_postss acotados al workspace (cliente/proyecto o borrador huérfano propio)."""
    logger.debug(f"Querying social_postss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Social_postsService(db)
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
        logger.debug(f"Found {result['total']} social_postss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying social_postss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Social_postsListResponse)
async def query_social_postss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _sa: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Listado global solo super_admin
    logger.debug(f"Querying social_postss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Social_postsService(db)
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
            user_id=None,
            workspace_id=None,
        )
        logger.debug(f"Found {result['total']} social_postss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying social_postss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Social_postsResponse)
async def get_social_posts(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single social_posts by ID (user can only see their own records)"""
    logger.debug(f"Fetching social_posts with id: {id}, fields={fields}")
    
    service = Social_postsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Social_posts with id {id} not found")
            raise HTTPException(status_code=404, detail="Social_posts not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching social_posts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Social_postsResponse, status_code=201)
async def create_social_posts(
    data: Social_postsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new social_posts"""
    logger.debug(f"Creating new social_posts with data: {data}")
    
    service = Social_postsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create social_posts")
        
        logger.info(f"Social_posts created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating social_posts: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating social_posts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Social_postsResponse], status_code=201)
async def create_social_postss_batch(
    request: Social_postsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple social_postss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} social_postss")
    
    service = Social_postsService(db)
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
        
        logger.info(f"Batch created {len(results)} social_postss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Social_postsResponse])
async def update_social_postss_batch(
    request: Social_postsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple social_postss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} social_postss")
    
    service = Social_postsService(db)
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
        
        logger.info(f"Batch updated {len(results)} social_postss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Social_postsResponse)
async def update_social_posts(
    id: int,
    data: Social_postsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing social_posts (requires ownership)"""
    logger.debug(f"Updating social_posts {id} with data: {data}")

    service = Social_postsService(db)
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
            logger.warning(f"Social_posts with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Social_posts not found")
        
        logger.info(f"Social_posts {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating social_posts {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating social_posts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_social_postss_batch(
    request: Social_postsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple social_postss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} social_postss")
    
    service = Social_postsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} social_postss successfully")
        return {"message": f"Successfully deleted {deleted_count} social_postss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_social_posts(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single social_posts by ID (requires ownership)"""
    logger.debug(f"Deleting social_posts with id: {id}")
    
    service = Social_postsService(db)
    try:
        success = await service.delete(
            id,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not success:
            logger.warning(f"Social_posts with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Social_posts not found")
        
        logger.info(f"Social_posts {id} deleted successfully")
        return {"message": "Social_posts deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting social_posts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
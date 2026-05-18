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
from services.partner_records import Partner_recordsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/partner_records", tags=["partner_records"])


# ---------- Pydantic Schemas ----------
class Partner_recordsData(BaseModel):
    """Entity data schema (for create/update)"""
    partner_name: str
    company: str = None
    email: str = None
    tier: str = None
    status: str = None
    referrals_count: int = None
    conversions_count: int = None
    revenue_generated: float = None
    commission_rate: float = None
    commission_earned: float = None
    joined_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class Partner_recordsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    partner_name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    tier: Optional[str] = None
    status: Optional[str] = None
    referrals_count: Optional[int] = None
    conversions_count: Optional[int] = None
    revenue_generated: Optional[float] = None
    commission_rate: Optional[float] = None
    commission_earned: Optional[float] = None
    joined_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class Partner_recordsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    partner_name: str
    company: Optional[str] = None
    email: Optional[str] = None
    tier: Optional[str] = None
    status: Optional[str] = None
    referrals_count: Optional[int] = None
    conversions_count: Optional[int] = None
    revenue_generated: Optional[float] = None
    commission_rate: Optional[float] = None
    commission_earned: Optional[float] = None
    joined_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Partner_recordsListResponse(BaseModel):
    """List response schema"""
    items: List[Partner_recordsResponse]
    total: int
    skip: int
    limit: int


class Partner_recordsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Partner_recordsData]


class Partner_recordsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Partner_recordsUpdateData


class Partner_recordsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Partner_recordsBatchUpdateItem]


class Partner_recordsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Partner_recordsListResponse)
async def query_partner_recordss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query partner_recordss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying partner_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Partner_recordsService(db)
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
        logger.debug(f"Found {result['total']} partner_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying partner_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Partner_recordsListResponse)
async def query_partner_recordss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _sa: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Query partner_recordss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying partner_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Partner_recordsService(db)
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
        logger.debug(f"Found {result['total']} partner_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying partner_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Partner_recordsResponse)
async def get_partner_records(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single partner_records by ID (user can only see their own records)"""
    logger.debug(f"Fetching partner_records with id: {id}, fields={fields}")
    
    service = Partner_recordsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Partner_records with id {id} not found")
            raise HTTPException(status_code=404, detail="Partner_records not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching partner_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Partner_recordsResponse, status_code=201)
async def create_partner_records(
    data: Partner_recordsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new partner_records"""
    logger.debug(f"Creating new partner_records with data: {data}")
    
    service = Partner_recordsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create partner_records")
        
        logger.info(f"Partner_records created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating partner_records: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating partner_records: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Partner_recordsResponse], status_code=201)
async def create_partner_recordss_batch(
    request: Partner_recordsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple partner_recordss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} partner_recordss")
    
    service = Partner_recordsService(db)
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
        
        logger.info(f"Batch created {len(results)} partner_recordss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Partner_recordsResponse])
async def update_partner_recordss_batch(
    request: Partner_recordsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple partner_recordss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} partner_recordss")
    
    service = Partner_recordsService(db)
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
        
        logger.info(f"Batch updated {len(results)} partner_recordss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Partner_recordsResponse)
async def update_partner_records(
    id: int,
    data: Partner_recordsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing partner_records (requires ownership)"""
    logger.debug(f"Updating partner_records {id} with data: {data}")

    service = Partner_recordsService(db)
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
            logger.warning(f"Partner_records with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Partner_records not found")
        
        logger.info(f"Partner_records {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating partner_records {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating partner_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_partner_recordss_batch(
    request: Partner_recordsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple partner_recordss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} partner_recordss")
    
    service = Partner_recordsService(db)
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
        
        logger.info(f"Batch deleted {deleted_count} partner_recordss successfully")
        return {"message": f"Successfully deleted {deleted_count} partner_recordss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_partner_records(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single partner_records by ID (requires ownership)"""
    logger.debug(f"Deleting partner_records with id: {id}")
    
    service = Partner_recordsService(db)
    try:
        success = await service.delete(
            id,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not success:
            logger.warning(f"Partner_records with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Partner_records not found")
        
        logger.info(f"Partner_records {id} deleted successfully")
        return {"message": "Partner_records deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting partner_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
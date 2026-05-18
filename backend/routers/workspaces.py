import json
import logging
from typing import List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.workspaces import WorkspacesService
from dependencies.auth import get_current_user, get_super_admin_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/workspaces", tags=["workspaces"])


# ---------- Pydantic Schemas ----------
class WorkspacesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    slug: str = None
    logo_url: str = None
    primary_color: str = None
    domain: str = None
    plan: str = None
    status: str = None
    created_at: Optional[datetime] = None


class WorkspacesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None


class WorkspacesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class WorkspacesListResponse(BaseModel):
    """List response schema"""
    items: List[WorkspacesResponse]
    total: int
    skip: int
    limit: int


class WorkspacesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[WorkspacesData]


class WorkspacesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: WorkspacesUpdateData


class WorkspacesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[WorkspacesBatchUpdateItem]


class WorkspacesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


def _parse_query_dict(query: Optional[str]) -> Optional[dict]:
    if not query:
        return None
    try:
        return json.loads(query)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid query JSON format")


# ---------- Routes ----------
@router.get("", response_model=WorkspacesListResponse)
async def query_workspacess(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Active workspace row for the caller (X-Workspace-Id); members and operators can read."""
    logger.debug("Querying active workspace list scoped to header workspace_id=%s", ctx.workspace_id)

    service = WorkspacesService(db)
    try:
        ws = await service.get_by_id(ctx.workspace_id, user_id=None)
        if not ws:
            return {"items": [], "total": 0, "skip": skip, "limit": limit}
        return {"items": [ws], "total": 1, "skip": skip, "limit": limit}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying workspacess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=WorkspacesListResponse)
async def query_workspacess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _admin: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Platform super-admin listing only (no tenant header semantics)."""
    logger.debug(f"Querying all workspacess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = WorkspacesService(db)
    try:
        query_dict = _parse_query_dict(query)
        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} workspacess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying workspacess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=WorkspacesResponse)
async def get_workspaces(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the active workspace by id (must match X-Workspace-Id)."""
    if id != ctx.workspace_id:
        raise HTTPException(
            status_code=403,
            detail="Workspace id does not match active workspace header",
        )
    logger.debug(f"Fetching workspaces with id: {id}, fields={fields}")

    service = WorkspacesService(db)
    try:
        result = await service.get_by_id(id, user_id=None)
        if not result:
            logger.warning(f"Workspaces with id {id} not found")
            raise HTTPException(status_code=404, detail="Workspaces not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching workspaces {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=WorkspacesResponse, status_code=201)
async def create_workspaces(
    data: WorkspacesData,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspaces (operator on active workspace)."""
    logger.debug(f"Creating new workspaces with data: {data}")

    service = WorkspacesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create workspaces")

        logger.info(f"Workspaces created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating workspaces: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating workspaces: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[WorkspacesResponse], status_code=201)
async def create_workspacess_batch(
    request: WorkspacesBatchCreateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple workspacess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} workspacess")

    service = WorkspacesService(db)
    results = []

    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)

        logger.info(f"Batch created {len(results)} workspacess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[WorkspacesResponse])
async def update_workspacess_batch(
    request: WorkspacesBatchUpdateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update rows only for the active workspace id."""
    logger.debug(f"Batch updating {len(request.items)} workspacess")

    service = WorkspacesService(db)
    results = []

    try:
        for item in request.items:
            if item.id != ctx.workspace_id:
                raise HTTPException(
                    status_code=400,
                    detail="Batch update must target only the active workspace",
                )
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)

        logger.info(f"Batch updated {len(results)} workspacess successfully")
        return results
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=WorkspacesResponse)
async def update_workspaces(
    id: int,
    data: WorkspacesUpdateData,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the active workspace only."""
    if id != ctx.workspace_id:
        raise HTTPException(
            status_code=403,
            detail="Workspace id does not match active workspace header",
        )
    logger.debug(f"Updating workspaces {id} with data: {data}")

    service = WorkspacesService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Workspaces with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Workspaces not found")

        logger.info(f"Workspaces {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating workspaces {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating workspaces {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_workspacess_batch(
    request: WorkspacesBatchDeleteRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete only the active workspace id when listed in the batch."""
    logger.debug(f"Batch deleting {len(request.ids)} workspacess")

    for item_id in request.ids:
        if item_id != ctx.workspace_id:
            raise HTTPException(
                status_code=400,
                detail="Batch delete must target only the active workspace",
            )

    service = WorkspacesService(db)
    deleted_count = 0

    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1

        logger.info(f"Batch deleted {deleted_count} workspacess successfully")
        return {"message": f"Successfully deleted {deleted_count} workspacess", "deleted_count": deleted_count}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_workspaces(
    id: int,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the active workspace only."""
    if id != ctx.workspace_id:
        raise HTTPException(
            status_code=403,
            detail="Workspace id does not match active workspace header",
        )
    logger.debug(f"Deleting workspaces with id: {id}")

    service = WorkspacesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Workspaces with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Workspaces not found")

        logger.info(f"Workspaces {id} deleted successfully")
        return {"message": "Workspaces deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workspaces {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

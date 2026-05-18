import json
import logging
from typing import Dict, List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.communications_v1 import after_project_created
from services.nelvyon_projects import Nelvyon_projectsService
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator

# Set up logging
logger = logging.getLogger(__name__)


def _parse_query_with_workspace(query: Optional[str], workspace_id: int) -> Dict:
    query_dict: Dict = {}
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


def _mark_legacy_nelvyon_projects(response: Response):
    """
    nelvyon_projects remains available for internal/legacy use.
    Legacy OS projects; prefer workspace-scoped CRM where applicable.
    """
    response.headers["X-Nelvyon-Projects-Domain"] = "legacy_nelvyon_projects"
    response.headers["X-Projects-Official-Domain"] = "deals"
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Wed, 31 Dec 2026 23:59:59 GMT"
    response.headers["Link"] = '</api/v1/entities/deals>; rel="successor-version"'


router = APIRouter(
    prefix="/api/v1/entities/nelvyon_projects",
    tags=["nelvyon_projects"],
    dependencies=[Depends(_mark_legacy_nelvyon_projects)],
)


# ---------- Pydantic Schemas ----------
class Nelvyon_projectsData(BaseModel):
    """Entity data schema (for create/update)"""
    workspace_id: int = None
    client_id: int
    name: str
    project_type: str
    status: str = None
    progress: int = None
    brief: str = None
    deliverables: str = None
    deadline: str = None
    priority: str = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Nelvyon_projectsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    workspace_id: Optional[int] = None
    client_id: Optional[int] = None
    name: Optional[str] = None
    project_type: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    brief: Optional[str] = None
    deliverables: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Nelvyon_projectsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    client_id: int
    name: str
    project_type: str
    status: Optional[str] = None
    progress: Optional[int] = None
    brief: Optional[str] = None
    deliverables: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_projectsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_projectsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_projectsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_projectsData]


class Nelvyon_projectsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_projectsUpdateData


class Nelvyon_projectsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_projectsBatchUpdateItem]


class Nelvyon_projectsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_projectsListResponse)
async def query_nelvyon_projectss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_projectss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nelvyon_projectss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_projectsService(db)
    try:
        query_dict = _parse_query_with_workspace(query, ws_ctx.workspace_id)
        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
        )
        logger.debug(f"Found {result['total']} nelvyon_projectss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_projectss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nelvyon_projectsResponse)
async def get_nelvyon_projects(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_projects by ID (user can only see their own records)"""
    logger.debug(f"Fetching nelvyon_projects with id: {id}, fields={fields}")
    
    service = Nelvyon_projectsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_projects with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_projects not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_projects {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_projectsResponse, status_code=201)
async def create_nelvyon_projects(
    data: Nelvyon_projectsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_projects"""
    logger.debug(f"Creating new nelvyon_projects with data: {data}")
    
    service = Nelvyon_projectsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_projects")
        await after_project_created(
            db,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            project=result,
            requester_email=current_user.email,
        )
        logger.info(f"Nelvyon_projects created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_projects: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_projects: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_projectsResponse], status_code=201)
async def create_nelvyon_projectss_batch(
    request: Nelvyon_projectsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_projectss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_projectss")
    
    service = Nelvyon_projectsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                await after_project_created(
                    db,
                    user_id=ws_ctx.user_id,
                    workspace_id=ws_ctx.workspace_id,
                    project=result,
                    requester_email=current_user.email,
                )
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nelvyon_projectss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_projectsResponse])
async def update_nelvyon_projectss_batch(
    request: Nelvyon_projectsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_projectss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_projectss")
    
    service = Nelvyon_projectsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nelvyon_projectss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_projectsResponse)
async def update_nelvyon_projects(
    id: int,
    data: Nelvyon_projectsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_projects (requires ownership)"""
    logger.debug(f"Updating nelvyon_projects {id} with data: {data}")

    service = Nelvyon_projectsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_projects with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_projects not found")
        
        logger.info(f"Nelvyon_projects {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_projects {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_projects {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_projectss_batch(
    request: Nelvyon_projectsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_projectss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_projectss")
    
    service = Nelvyon_projectsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_projectss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_projectss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_projects(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_projects by ID (requires ownership)"""
    logger.debug(f"Deleting nelvyon_projects with id: {id}")
    
    service = Nelvyon_projectsService(db)
    try:
        success = await service.delete(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not success:
            logger.warning(f"Nelvyon_projects with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_projects not found")
        
        logger.info(f"Nelvyon_projects {id} deleted successfully")
        return {"message": "Nelvyon_projects deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_projects {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
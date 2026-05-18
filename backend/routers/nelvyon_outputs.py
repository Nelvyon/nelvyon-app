import json
import logging
from typing import Dict, List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nelvyon_outputs import Nelvyon_outputsService
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


def _mark_legacy_nelvyon_outputs(response: Response):
    """
    nelvyon_outputs remains available for internal/legacy use.
    Legacy OS deliverables; workspace-scoped.
    """
    response.headers["X-Nelvyon-Outputs-Domain"] = "legacy_nelvyon_outputs"
    response.headers["X-Outputs-Official-Domain"] = "deals"
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Wed, 31 Dec 2026 23:59:59 GMT"
    response.headers["Link"] = '</api/v1/entities/deals>; rel="successor-version"'


router = APIRouter(
    prefix="/api/v1/entities/nelvyon_outputs",
    tags=["nelvyon_outputs"],
    dependencies=[Depends(_mark_legacy_nelvyon_outputs)],
)


# ---------- Pydantic Schemas ----------
class Nelvyon_outputsData(BaseModel):
    """Entity data schema (for create/update)"""
    workspace_id: int = None
    project_id: int
    client_id: int = None
    output_type: str
    title: str = None
    content: str = None
    qa_score: int = None
    qa_status: str = None
    qa_feedback: str = None
    qa_attempts: int = None
    version: int = None
    extra_data: str = None
    created_at: Optional[datetime] = None


class Nelvyon_outputsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    workspace_id: Optional[int] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    output_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    qa_score: Optional[int] = None
    qa_status: Optional[str] = None
    qa_feedback: Optional[str] = None
    qa_attempts: Optional[int] = None
    version: Optional[int] = None
    extra_data: Optional[str] = None
    created_at: Optional[datetime] = None


class Nelvyon_outputsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    project_id: int
    client_id: Optional[int] = None
    output_type: str
    title: Optional[str] = None
    content: Optional[str] = None
    qa_score: Optional[int] = None
    qa_status: Optional[str] = None
    qa_feedback: Optional[str] = None
    qa_attempts: Optional[int] = None
    version: Optional[int] = None
    extra_data: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Nelvyon_outputsListResponse(BaseModel):
    """List response schema"""
    items: List[Nelvyon_outputsResponse]
    total: int
    skip: int
    limit: int


class Nelvyon_outputsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nelvyon_outputsData]


class Nelvyon_outputsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nelvyon_outputsUpdateData


class Nelvyon_outputsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nelvyon_outputsBatchUpdateItem]


class Nelvyon_outputsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nelvyon_outputsListResponse)
async def query_nelvyon_outputss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query nelvyon_outputss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nelvyon_outputss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nelvyon_outputsService(db)
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
        logger.debug(f"Found {result['total']} nelvyon_outputss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying nelvyon_outputss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nelvyon_outputsResponse)
async def get_nelvyon_outputs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nelvyon_outputs by ID (user can only see their own records)"""
    logger.debug(f"Fetching nelvyon_outputs with id: {id}, fields={fields}")
    
    service = Nelvyon_outputsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_outputs with id {id} not found")
            raise HTTPException(status_code=404, detail="Nelvyon_outputs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nelvyon_outputs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nelvyon_outputsResponse, status_code=201)
async def create_nelvyon_outputs(
    data: Nelvyon_outputsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nelvyon_outputs"""
    logger.debug(f"Creating new nelvyon_outputs with data: {data}")
    
    service = Nelvyon_outputsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nelvyon_outputs")
        
        logger.info(f"Nelvyon_outputs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nelvyon_outputs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nelvyon_outputs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nelvyon_outputsResponse], status_code=201)
async def create_nelvyon_outputss_batch(
    request: Nelvyon_outputsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nelvyon_outputss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nelvyon_outputss")
    
    service = Nelvyon_outputsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nelvyon_outputss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nelvyon_outputsResponse])
async def update_nelvyon_outputss_batch(
    request: Nelvyon_outputsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nelvyon_outputss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nelvyon_outputss")
    
    service = Nelvyon_outputsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nelvyon_outputss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nelvyon_outputsResponse)
async def update_nelvyon_outputs(
    id: int,
    data: Nelvyon_outputsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nelvyon_outputs (requires ownership)"""
    logger.debug(f"Updating nelvyon_outputs {id} with data: {data}")

    service = Nelvyon_outputsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Nelvyon_outputs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nelvyon_outputs not found")
        
        logger.info(f"Nelvyon_outputs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nelvyon_outputs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nelvyon_outputs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nelvyon_outputss_batch(
    request: Nelvyon_outputsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nelvyon_outputss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nelvyon_outputss")
    
    service = Nelvyon_outputsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nelvyon_outputss successfully")
        return {"message": f"Successfully deleted {deleted_count} nelvyon_outputss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nelvyon_outputs(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nelvyon_outputs by ID (requires ownership)"""
    logger.debug(f"Deleting nelvyon_outputs with id: {id}")
    
    service = Nelvyon_outputsService(db)
    try:
        success = await service.delete(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not success:
            logger.warning(f"Nelvyon_outputs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nelvyon_outputs not found")
        
        logger.info(f"Nelvyon_outputs {id} deleted successfully")
        return {"message": "Nelvyon_outputs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nelvyon_outputs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
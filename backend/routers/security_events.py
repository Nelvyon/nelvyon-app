import json
import logging
from typing import Dict, List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.security_events import Security_eventsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/security_events", tags=["security_events"])


def _parse_query(query: Optional[str]) -> Optional[Dict]:
    if not query:
        return None
    try:
        parsed = json.loads(query)
        if not isinstance(parsed, dict):
            raise ValueError("Query must be a JSON object")
        out = dict(parsed)
        out.pop("workspace_id", None)
        return out
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid query JSON format") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------- Pydantic Schemas ----------
class Security_eventsData(BaseModel):
    """Entity data schema (for create/update)"""
    event_type: str
    severity: str = None
    source: str = None
    description: str = None
    status: str = None
    details_json: str = None
    created_at: Optional[datetime] = None


class Security_eventsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    event_type: Optional[str] = None
    severity: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    details_json: Optional[str] = None
    created_at: Optional[datetime] = None


class Security_eventsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    event_type: str
    severity: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    details_json: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Security_eventsListResponse(BaseModel):
    """List response schema"""
    items: List[Security_eventsResponse]
    total: int
    skip: int
    limit: int


class Security_eventsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Security_eventsData]


class Security_eventsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Security_eventsUpdateData


class Security_eventsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Security_eventsBatchUpdateItem]


class Security_eventsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Security_eventsListResponse)
async def query_security_eventss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Lista eventos del workspace (actor o JSON details.workspace_id)."""
    logger.debug("Querying security_eventss workspace_id=%s", ws_ctx.workspace_id)
    service = Security_eventsService(db)
    try:
        qd = _parse_query(query)
        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=qd,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying security_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Security_eventsResponse)
async def get_security_events(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Security_eventsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Security_events not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching security_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Security_eventsResponse, status_code=201)
async def create_security_events(
    data: Security_eventsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Security_eventsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(ws_ctx.user_id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create security_events")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating security_events: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Security_eventsResponse], status_code=201)
async def create_security_eventss_batch(
    request: Security_eventsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Security_eventsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(ws_ctx.user_id))
            if result:
                results.append(result)
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Security_eventsResponse])
async def update_security_eventss_batch(
    request: Security_eventsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Security_eventsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id,
                update_dict,
                user_id=str(ws_ctx.user_id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Security_eventsResponse)
async def update_security_events(
    id: int,
    data: Security_eventsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Security_eventsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Security_events not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating security_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_security_eventss_batch(
    request: Security_eventsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Security_eventsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            if await service.delete(
                item_id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            ):
                deleted_count += 1
        return {
            "message": f"Successfully deleted {deleted_count} security_eventss",
            "deleted_count": deleted_count,
        }
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_security_events(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Security_eventsService(db)
    try:
        ok = await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Security_events not found")
        return {"message": "Security_events deleted successfully", "id": id}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting security_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
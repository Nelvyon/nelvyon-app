import json
import logging
from typing import List, Optional

from datetime import datetime

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import enforce_contacts_plan_module_for_crm_writes
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.calendar_events import Calendar_eventsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/calendar_events", tags=["calendar_events"])


class Calendar_eventsData(BaseModel):
    workspace_id: int = None
    title: str
    client_name: str = None
    event_type: str = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: int = None
    status: str = None
    channel: str = None
    notes: str = None
    created_at: Optional[datetime] = None


class Calendar_eventsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    title: Optional[str] = None
    client_name: Optional[str] = None
    event_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    channel: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class Calendar_eventsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    title: str
    client_name: Optional[str] = None
    event_type: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    channel: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Calendar_eventsListResponse(BaseModel):
    items: List[Calendar_eventsResponse]
    total: int
    skip: int
    limit: int


class Calendar_eventsBatchCreateRequest(BaseModel):
    items: List[Calendar_eventsData]


class Calendar_eventsBatchUpdateItem(BaseModel):
    id: int
    updates: Calendar_eventsUpdateData


class Calendar_eventsBatchUpdateRequest(BaseModel):
    items: List[Calendar_eventsBatchUpdateItem]


class Calendar_eventsBatchDeleteRequest(BaseModel):
    ids: List[int]


@router.get("", response_model=Calendar_eventsListResponse)
async def query_calendar_eventss(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Calendar_eventsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        return await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error querying calendar_eventss: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Calendar_eventsResponse)
async def get_calendar_events(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Calendar_eventsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Calendar_events not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching calendar_events %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Calendar_eventsResponse, status_code=201)
async def create_calendar_events(
    data: Calendar_eventsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Calendar_eventsService(db)
    try:
        result = await service.create(
            data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create calendar_events")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating calendar_events: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Calendar_eventsResponse], status_code=201)
async def create_calendar_eventss_batch(
    request: Calendar_eventsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Calendar_eventsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(
                item_data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error("Batch create calendar_events: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Calendar_eventsResponse])
async def update_calendar_eventss_batch(
    request: Calendar_eventsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Calendar_eventsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error("Batch update calendar_events: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Calendar_eventsResponse)
async def update_calendar_events(
    id: int,
    data: Calendar_eventsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Calendar_eventsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Calendar_events not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error updating calendar_events %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_calendar_eventss_batch(
    request: Calendar_eventsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Calendar_eventsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            if await service.delete(
                item_id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            ):
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} calendar_eventss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error("Batch delete calendar_events: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_calendar_events(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = Calendar_eventsService(db)
    try:
        if not await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id):
            raise HTTPException(status_code=404, detail="Calendar_events not found")
        return {"message": "Calendar_events deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting calendar_events %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

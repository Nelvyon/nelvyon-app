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
from services.appointments import AppointmentsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/appointments", tags=["appointments"])


class AppointmentsData(BaseModel):
    workspace_id: int = None
    contact_id: int = None
    contact_name: str = None
    title: str
    description: str = None
    type: str = None
    start_time: datetime
    end_time: datetime
    status: str = None
    location: str = None
    reminder_sent: bool = None
    created_at: Optional[datetime] = None


class AppointmentsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    contact_name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    location: Optional[str] = None
    reminder_sent: Optional[bool] = None
    created_at: Optional[datetime] = None


class AppointmentsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    contact_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    type: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: Optional[str] = None
    location: Optional[str] = None
    reminder_sent: Optional[bool] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AppointmentsListResponse(BaseModel):
    items: List[AppointmentsResponse]
    total: int
    skip: int
    limit: int


class AppointmentsBatchCreateRequest(BaseModel):
    items: List[AppointmentsData]


class AppointmentsBatchUpdateItem(BaseModel):
    id: int
    updates: AppointmentsUpdateData


class AppointmentsBatchUpdateRequest(BaseModel):
    items: List[AppointmentsBatchUpdateItem]


class AppointmentsBatchDeleteRequest(BaseModel):
    ids: List[int]


@router.get("", response_model=AppointmentsListResponse)
async def query_appointmentss(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("Querying appointmentss: query=%s sort=%s skip=%s limit=%s", query, sort, skip, limit)
    service = AppointmentsService(db)
    try:
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
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error querying appointmentss: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=AppointmentsResponse)
async def get_appointments(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = AppointmentsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Appointments not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching appointments %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=AppointmentsResponse, status_code=201)
async def create_appointments(
    data: AppointmentsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = AppointmentsService(db)
    try:
        result = await service.create(
            data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create appointments")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating appointments: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[AppointmentsResponse], status_code=201)
async def create_appointmentss_batch(
    request: AppointmentsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = AppointmentsService(db)
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
        logger.error("Batch create appointments: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[AppointmentsResponse])
async def update_appointmentss_batch(
    request: AppointmentsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = AppointmentsService(db)
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
        logger.error("Batch update appointments: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=AppointmentsResponse)
async def update_appointments(
    id: int,
    data: AppointmentsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = AppointmentsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=404, detail="Appointments not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error updating appointments %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_appointmentss_batch(
    request: AppointmentsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = AppointmentsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            if await service.delete(
                item_id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            ):
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} appointmentss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error("Batch delete appointments: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_appointments(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    service = AppointmentsService(db)
    try:
        if not await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id):
            raise HTTPException(status_code=404, detail="Appointments not found")
        return {"message": "Appointments deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting appointments %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

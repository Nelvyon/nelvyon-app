import json
import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.automation_jobs import Automation_jobsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/automation_jobs", tags=["automation_jobs"])


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


class Automation_jobsData(BaseModel):
    client_id: int = None
    client_name: str = None
    job_type: str
    status: str
    input_data: str = None
    output_data: str = None
    output_id: int = None
    project_id: int = None
    source: str = None
    webhook_id: str = None
    priority: str = None
    error_message: str = None
    processing_time_ms: int = None
    delivered_at: str = None
    created_at: str = None


class Automation_jobsUpdateData(BaseModel):
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    job_type: Optional[str] = None
    status: Optional[str] = None
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    output_id: Optional[int] = None
    project_id: Optional[int] = None
    source: Optional[str] = None
    webhook_id: Optional[str] = None
    priority: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    delivered_at: Optional[str] = None
    created_at: Optional[str] = None


class Automation_jobsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    job_type: str
    status: str
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    output_id: Optional[int] = None
    project_id: Optional[int] = None
    source: Optional[str] = None
    webhook_id: Optional[str] = None
    priority: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    delivered_at: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Automation_jobsListResponse(BaseModel):
    items: List[Automation_jobsResponse]
    total: int
    skip: int
    limit: int


class Automation_jobsBatchCreateRequest(BaseModel):
    items: List[Automation_jobsData]


class Automation_jobsBatchUpdateItem(BaseModel):
    id: int
    updates: Automation_jobsUpdateData


class Automation_jobsBatchUpdateRequest(BaseModel):
    items: List[Automation_jobsBatchUpdateItem]


class Automation_jobsBatchDeleteRequest(BaseModel):
    ids: List[int]


@router.get("", response_model=Automation_jobsListResponse)
async def query_automation_jobss(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    try:
        qd = _parse_query(query)
        return await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=qd,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Automation_jobsResponse)
async def get_automation_jobs(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    try:
        row = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not row:
            raise HTTPException(status_code=404, detail="Automation_jobs not found")
        return row
    except HTTPException:
        raise
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Automation_jobsResponse, status_code=201)
async def create_automation_jobs(
    data: Automation_jobsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    try:
        r = await service.create(
            data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not r:
            raise HTTPException(status_code=400, detail="Failed to create automation_jobs")
        return r
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Automation_jobsResponse], status_code=201)
async def create_automation_jobss_batch(
    request: Automation_jobsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    out = []
    try:
        for item in request.items:
            r = await service.create(
                item.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if r:
                out.append(r)
        return out
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Automation_jobsResponse])
async def update_automation_jobss_batch(
    request: Automation_jobsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    out = []
    try:
        for item in request.items:
            ud = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            r = await service.update(
                item.id, ud, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if r:
                out.append(r)
        return out
    except Exception as e:
        await db.rollback()
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Automation_jobsResponse)
async def update_automation_jobs(
    id: int,
    data: Automation_jobsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    try:
        ud = {k: v for k, v in data.model_dump().items() if v is not None}
        r = await service.update(id, ud, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not r:
            raise HTTPException(status_code=404, detail="Automation_jobs not found")
        return r
    except HTTPException:
        raise
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_automation_jobss_batch(
    request: Automation_jobsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    n = 0
    try:
        for i in request.ids:
            if await service.delete(i, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id):
                n += 1
        return {"message": f"Successfully deleted {n} automation_jobss", "deleted_count": n}
    except Exception as e:
        await db.rollback()
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_automation_jobs(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Automation_jobsService(db)
    try:
        if not await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id):
            raise HTTPException(status_code=404, detail="Automation_jobs not found")
        return {"message": "Automation_jobs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

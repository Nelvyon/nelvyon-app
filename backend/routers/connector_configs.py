import json
import logging
from typing import Dict, List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.connector_configs import Connector_configsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/connector_configs", tags=["connector_configs"])


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


class Connector_configsData(BaseModel):
    workspace_id: Optional[int] = None
    connector_name: str
    display_name: str = None
    status: str = None
    config_json: str = None
    last_sync_at: Optional[datetime] = None
    sync_status: str = None
    events_count: int = None
    created_at: Optional[datetime] = None


class Connector_configsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    connector_name: Optional[str] = None
    display_name: Optional[str] = None
    status: Optional[str] = None
    config_json: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    sync_status: Optional[str] = None
    events_count: Optional[int] = None
    created_at: Optional[datetime] = None


class Connector_configsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    connector_name: str
    display_name: Optional[str] = None
    status: Optional[str] = None
    config_json: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    sync_status: Optional[str] = None
    events_count: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Connector_configsListResponse(BaseModel):
    items: List[Connector_configsResponse]
    total: int
    skip: int
    limit: int


class Connector_configsBatchCreateRequest(BaseModel):
    items: List[Connector_configsData]


class Connector_configsBatchUpdateItem(BaseModel):
    id: int
    updates: Connector_configsUpdateData


class Connector_configsBatchUpdateRequest(BaseModel):
    items: List[Connector_configsBatchUpdateItem]


class Connector_configsBatchDeleteRequest(BaseModel):
    ids: List[int]


@router.get("", response_model=Connector_configsListResponse)
async def query_connector_configss(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
    try:
        return await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=_parse_query(query),
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Connector_configsResponse)
async def get_connector_configs(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
    try:
        row = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not row:
            raise HTTPException(status_code=404, detail="Connector_configs not found")
        return row
    except HTTPException:
        raise
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Connector_configsResponse, status_code=201)
async def create_connector_configs(
    data: Connector_configsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
    try:
        r = await service.create(
            data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not r:
            raise HTTPException(status_code=400, detail="Failed to create connector_configs")
        return r
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Connector_configsResponse], status_code=201)
async def create_connector_configss_batch(
    request: Connector_configsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
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


@router.put("/batch", response_model=List[Connector_configsResponse])
async def update_connector_configss_batch(
    request: Connector_configsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
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
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Connector_configsResponse)
async def update_connector_configs(
    id: int,
    data: Connector_configsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
    try:
        ud = {k: v for k, v in data.model_dump().items() if v is not None}
        r = await service.update(id, ud, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not r:
            raise HTTPException(status_code=404, detail="Connector_configs not found")
        return r
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_connector_configss_batch(
    request: Connector_configsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
    n = 0
    try:
        for i in request.ids:
            if await service.delete(i, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id):
                n += 1
        return {"message": f"Successfully deleted {n} connector_configss", "deleted_count": n}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_connector_configs(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = Connector_configsService(db)
    try:
        if not await service.delete(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id):
            raise HTTPException(status_code=404, detail="Connector_configs not found")
        return {"message": "Connector_configs deleted successfully", "id": id}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_super_admin_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.automation_webhooks import Automation_webhooksService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/automation_webhooks", tags=["automation_webhooks"])


class Automation_webhooksData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    webhook_key: str
    job_type: str = None
    is_active: bool = None
    total_calls: int = None
    last_called_at: str = None
    created_at: str = None


class Automation_webhooksUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    webhook_key: Optional[str] = None
    job_type: Optional[str] = None
    is_active: Optional[bool] = None
    total_calls: Optional[int] = None
    last_called_at: Optional[str] = None
    created_at: Optional[str] = None


class Automation_webhooksResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    name: str
    webhook_key: str
    job_type: Optional[str] = None
    is_active: Optional[bool] = None
    total_calls: Optional[int] = None
    last_called_at: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Automation_webhooksListResponse(BaseModel):
    """List response schema"""
    items: List[Automation_webhooksResponse]
    total: int
    skip: int
    limit: int


class Automation_webhooksBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Automation_webhooksData]


class Automation_webhooksBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Automation_webhooksUpdateData


class Automation_webhooksBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Automation_webhooksBatchUpdateItem]


class Automation_webhooksBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


@router.get("", response_model=Automation_webhooksListResponse)
async def query_automation_webhookss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(
        f"Querying automation_webhookss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}"
    )

    service = Automation_webhooksService(db)
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
        logger.debug(f"Found {result['total']} automation_webhookss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying automation_webhookss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Automation_webhooksListResponse)
async def query_automation_webhookss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _sa: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(
        f"Querying automation_webhookss (super_admin): query={query}, sort={sort}, skip={skip}, limit={limit}"
    )

    service = Automation_webhooksService(db)
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
            user_id=None,
            workspace_id=None,
        )
        logger.debug(f"Found {result['total']} automation_webhookss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying automation_webhookss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Automation_webhooksResponse)
async def get_automation_webhooks(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Fetching automation_webhooks with id: {id}, fields={fields}")

    service = Automation_webhooksService(db)
    try:
        result = await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Automation_webhooks with id {id} not found")
            raise HTTPException(status_code=404, detail="Automation_webhooks not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching automation_webhooks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Automation_webhooksResponse, status_code=201)
async def create_automation_webhooks(
    data: Automation_webhooksData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Creating new automation_webhooks with data: {data}")

    service = Automation_webhooksService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create automation_webhooks")

        logger.info(f"Automation_webhooks created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating automation_webhooks: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating automation_webhooks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Automation_webhooksResponse], status_code=201)
async def create_automation_webhookss_batch(
    request: Automation_webhooksBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Batch creating {len(request.items)} automation_webhookss")

    service = Automation_webhooksService(db)
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

        logger.info(f"Batch created {len(results)} automation_webhookss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Automation_webhooksResponse])
async def update_automation_webhookss_batch(
    request: Automation_webhooksBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Batch updating {len(request.items)} automation_webhookss")

    service = Automation_webhooksService(db)
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

        logger.info(f"Batch updated {len(results)} automation_webhookss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Automation_webhooksResponse)
async def update_automation_webhooks(
    id: int,
    data: Automation_webhooksUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Updating automation_webhooks {id} with data: {data}")

    service = Automation_webhooksService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id,
            update_dict,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            logger.warning(f"Automation_webhooks with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Automation_webhooks not found")

        logger.info(f"Automation_webhooks {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating automation_webhooks {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating automation_webhooks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_automation_webhookss_batch(
    request: Automation_webhooksBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Batch deleting {len(request.ids)} automation_webhookss")

    service = Automation_webhooksService(db)
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

        logger.info(f"Batch deleted {deleted_count} automation_webhookss successfully")
        return {
            "message": f"Successfully deleted {deleted_count} automation_webhookss",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_automation_webhooks(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Deleting automation_webhooks with id: {id}")

    service = Automation_webhooksService(db)
    try:
        success = await service.delete(
            id,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not success:
            logger.warning(f"Automation_webhooks with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Automation_webhooks not found")

        logger.info(f"Automation_webhooks {id} deleted successfully")
        return {"message": "Automation_webhooks deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting automation_webhooks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import enforce_helpdesk_module_allowed
from routers.crm_http_helpers import raise_internal, warn_and_bad_request, warn_integrity_conflict
from services.conversations import ConversationsService
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/conversations", tags=["conversations"])


# ---------- Pydantic Schemas ----------
class ConversationsData(BaseModel):
    workspace_id: int = None
    contact_id: int = None
    contact_name: Optional[str] = None
    channel: str = None
    status: str = None
    subject: str = None
    last_message: str = None
    unread_count: int = None
    priority: str = None
    last_message_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ConversationsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    contact_name: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[str] = None
    subject: Optional[str] = None
    last_message: Optional[str] = None
    unread_count: Optional[int] = None
    priority: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ConversationsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    contact_id: Optional[int] = None
    channel: Optional[str] = None
    status: Optional[str] = None
    subject: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: Optional[int] = None
    contact_name: Optional[str] = None
    priority: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationsListResponse(BaseModel):
    items: List[ConversationsResponse]
    total: int
    skip: int
    limit: int


class ConversationsBatchCreateRequest(BaseModel):
    items: List[ConversationsData]


class ConversationsBatchUpdateItem(BaseModel):
    id: int
    updates: ConversationsUpdateData


class ConversationsBatchUpdateRequest(BaseModel):
    items: List[ConversationsBatchUpdateItem]


class ConversationsBatchDeleteRequest(BaseModel):
    ids: List[int]


# ---------- Routes (workspace-aware — Sprint 2.5) ----------
@router.get("", response_model=ConversationsListResponse)
async def query_conversations(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query conversations with workspace isolation."""
    service = ConversationsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying conversations", e)


@router.get("/all", response_model=ConversationsListResponse)
async def query_conversations_all(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query all conversations within workspace (auth required, workspace-scoped)."""
    service = ConversationsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying conversations (all)", e)


@router.get("/{id}", response_model=ConversationsResponse)
async def get_conversations(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = ConversationsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, f"Error fetching conversation id={id}", e)


@router.post("", response_model=ConversationsResponse, status_code=201)
async def create_conversations(
    data: ConversationsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create conversation")
        return result
    except IntegrityError as e:
        warn_integrity_conflict(logger, "create conversation", e)
    except ValueError as e:
        warn_and_bad_request(logger, "create conversation", e)
    except Exception as e:
        raise_internal(logger, "Error creating conversation", e)


@router.post("/batch", response_model=List[ConversationsResponse], status_code=201)
async def create_conversations_batch(
    request: ConversationsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch create conversations", e)
    except ValueError as e:
        await db.rollback()
        warn_and_bad_request(logger, "batch create conversations", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch create conversations", e)


@router.put("/batch", response_model=List[ConversationsResponse])
async def update_conversations_batch(
    request: ConversationsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch update conversations", e)
    except ValueError as e:
        await db.rollback()
        warn_and_bad_request(logger, "batch update conversations", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch update conversations", e)


@router.put("/{id}", response_model=ConversationsResponse)
async def update_conversations(
    id: int,
    data: ConversationsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return result
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"update conversation id={id}", e)
    except ValueError as e:
        warn_and_bad_request(logger, f"update conversation id={id}", e)
    except Exception as e:
        raise_internal(logger, f"Error updating conversation id={id}", e)


@router.delete("/batch")
async def delete_conversations_batch(
    request: ConversationsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if success:
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} conversations", "deleted_count": deleted_count}
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch delete conversations", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch delete conversations", e)


@router.delete("/{id}")
async def delete_conversations(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = ConversationsService(db)
    try:
        success = await service.delete(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"message": "Conversation deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, f"Error deleting conversation id={id}", e)
import json
import logging
from typing import List, Optional

from datetime import datetime, date

from core.secrets import sanitize_text
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.quota_guards import enforce_helpdesk_module_allowed
from schemas.auth import UserResponse
from services.audit_events import write_audit_event
from services.communications_v1 import after_ticket_created
from services.helpdesk_tickets import Helpdesk_ticketsService
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/helpdesk_tickets", tags=["helpdesk_tickets"])


def _http_exc_from_ticket_value_error(exc: ValueError) -> HTTPException:
    msg = str(exc)
    if msg.startswith("Contact not found"):
        return HTTPException(status_code=404, detail=msg)
    return HTTPException(status_code=400, detail=msg)


# ---------- Pydantic Schemas ----------
class Helpdesk_ticketsData(BaseModel):
    workspace_id: int = None
    subject: str
    description: str = None
    status: str = None
    priority: str = None
    category: str = None
    assigned_to: str = None
    channel: str = None
    resolution_notes: str = None
    satisfaction_score: int = None
    first_response_minutes: int = None
    client_name: str = None
    client_email: str = None
    # E2E relationship fields
    client_id: int = None
    project_id: int = None
    output_id: int = None
    contract_id: int = None
    social_post_id: int = None
    campaign_name: str = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


class Helpdesk_ticketsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    channel: Optional[str] = None
    resolution_notes: Optional[str] = None
    satisfaction_score: Optional[int] = None
    first_response_minutes: Optional[int] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    contract_id: Optional[int] = None
    social_post_id: Optional[int] = None
    campaign_name: Optional[str] = None
    resolved_at: Optional[datetime] = None


class Helpdesk_ticketsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    subject: str
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    channel: Optional[str] = None
    resolution_notes: Optional[str] = None
    satisfaction_score: Optional[int] = None
    first_response_minutes: Optional[int] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    # E2E relationship fields
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    contract_id: Optional[int] = None
    social_post_id: Optional[int] = None
    campaign_name: Optional[str] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Helpdesk_ticketsListResponse(BaseModel):
    items: List[Helpdesk_ticketsResponse]
    total: int
    skip: int
    limit: int


class Helpdesk_ticketsBatchCreateRequest(BaseModel):
    items: List[Helpdesk_ticketsData]


class Helpdesk_ticketsBatchUpdateItem(BaseModel):
    id: int
    updates: Helpdesk_ticketsUpdateData


class Helpdesk_ticketsBatchUpdateRequest(BaseModel):
    items: List[Helpdesk_ticketsBatchUpdateItem]


class Helpdesk_ticketsBatchDeleteRequest(BaseModel):
    ids: List[int]


# ---------- Routes (workspace-aware — Sprint 2.5) ----------
@router.get("", response_model=Helpdesk_ticketsListResponse)
async def query_helpdesk_tickets(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query helpdesk tickets with workspace isolation."""
    service = Helpdesk_ticketsService(db)
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
        logger.error("Error querying helpdesk_tickets: %s", sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/all", response_model=Helpdesk_ticketsListResponse)
async def query_helpdesk_tickets_all(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query all helpdesk tickets within workspace (auth required, workspace-scoped)."""
    service = Helpdesk_ticketsService(db)
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
        logger.error("Error querying helpdesk_tickets: %s", sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{id}", response_model=Helpdesk_ticketsResponse)
async def get_helpdesk_tickets(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = Helpdesk_ticketsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching ticket %s: %s", id, sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=Helpdesk_ticketsResponse, status_code=201)
async def create_helpdesk_tickets(
    data: Helpdesk_ticketsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = Helpdesk_ticketsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create ticket")
        await after_ticket_created(
            db,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
            ticket=result,
            requester_email=current_user.email,
        )
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise _http_exc_from_ticket_value_error(e)
    except Exception as e:
        logger.error("Error creating ticket: %s", sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=List[Helpdesk_ticketsResponse], status_code=201)
async def create_helpdesk_tickets_batch(
    request: Helpdesk_ticketsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = Helpdesk_ticketsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                await after_ticket_created(
                    db,
                    user_id=ws_ctx.user_id,
                    workspace_id=ws_ctx.workspace_id,
                    ticket=result,
                    requester_email=current_user.email,
                )
                results.append(result)
        return results
    except HTTPException:
        await db.rollback()
        raise
    except ValueError as e:
        await db.rollback()
        raise _http_exc_from_ticket_value_error(e)
    except Exception as e:
        await db.rollback()
        logger.error("Batch create ticket failed: %s", sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Batch create failed")


@router.put("/batch", response_model=List[Helpdesk_ticketsResponse])
async def update_helpdesk_tickets_batch(
    request: Helpdesk_ticketsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = Helpdesk_ticketsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        await db.rollback()
        raise
    except ValueError as e:
        await db.rollback()
        raise _http_exc_from_ticket_value_error(e)
    except Exception as e:
        await db.rollback()
        logger.error("Batch update ticket failed: %s", sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Batch update failed")


@router.put("/{id}", response_model=Helpdesk_ticketsResponse)
async def update_helpdesk_tickets(
    id: int,
    data: Helpdesk_ticketsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = Helpdesk_ticketsService(db)
    action: Optional[str] = None
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if "assigned_to" in update_dict:
            action = "assign_ticket"
        elif "status" in update_dict:
            action = "transition_ticket"
        result = await service.update(id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
        if action in ("assign_ticket", "transition_ticket"):
            await write_audit_event(
                db,
                actor_user_id=ws_ctx.user_id,
                actor_email=ws_ctx.user_email,
                workspace_id=ws_ctx.workspace_id,
                action=action,
                resource_type="ticket",
                resource_id=str(id),
                result="ok",
                event_type=f"saas.helpdesk.{action}",
                commit=True,
            )
        return result
    except HTTPException:
        if action in ("assign_ticket", "transition_ticket"):
            await write_audit_event(
                db,
                actor_user_id=ws_ctx.user_id,
                actor_email=ws_ctx.user_email,
                workspace_id=ws_ctx.workspace_id,
                action=action,
                resource_type="ticket",
                resource_id=str(id),
                result="error",
                event_type=f"saas.helpdesk.{action}",
                commit=True,
            )
        raise
    except ValueError as e:
        if action in ("assign_ticket", "transition_ticket"):
            await write_audit_event(
                db,
                actor_user_id=ws_ctx.user_id,
                actor_email=ws_ctx.user_email,
                workspace_id=ws_ctx.workspace_id,
                action=action,
                resource_type="ticket",
                resource_id=str(id),
                result="error",
                event_type=f"saas.helpdesk.{action}",
                commit=True,
            )
        raise _http_exc_from_ticket_value_error(e)
    except Exception as e:
        if action in ("assign_ticket", "transition_ticket"):
            await write_audit_event(
                db,
                actor_user_id=ws_ctx.user_id,
                actor_email=ws_ctx.user_email,
                workspace_id=ws_ctx.workspace_id,
                action=action,
                resource_type="ticket",
                resource_id=str(id),
                result="error",
                event_type=f"saas.helpdesk.{action}",
                commit=True,
            )
        logger.error("Error updating ticket %s: %s", id, sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/batch")
async def delete_helpdesk_tickets_batch(
    request: Helpdesk_ticketsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = Helpdesk_ticketsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if success:
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} tickets", "deleted_count": deleted_count}
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Batch delete ticket failed: %s", sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Batch delete failed")


@router.delete("/{id}")
async def delete_helpdesk_tickets(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_helpdesk_module_allowed(db, ws_ctx.workspace_id)
    service = Helpdesk_ticketsService(db)
    try:
        success = await service.delete(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not success:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {"message": "Ticket deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting ticket %s: %s", id, sanitize_text(str(e)))
        raise HTTPException(status_code=500, detail="Internal server error")
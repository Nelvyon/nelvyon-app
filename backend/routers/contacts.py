import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.exc import IntegrityError

from core.database import get_db
from routers.crm_http_helpers import raise_internal, warn_and_bad_request, warn_integrity_conflict
from services.contacts import ContactsService
from services.audit_events import write_audit_event
from services.workflow_engine import WorkflowEngineService
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from dependencies.quota_guards import enforce_contact_headroom
from services.plan_quota import enforce_contact_create_quota

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/contacts", tags=["contacts"])


# ---------- Pydantic Schemas ----------
class ContactsData(BaseModel):
    """Entity data schema (for create/update)"""
    workspace_id: int = None
    first_name: str
    last_name: str = None
    email: str
    phone: str = None
    company_name: str = None
    tags: str = None
    status: str = None
    source: str = None
    score: int = None
    avatar_url: str = None
    notes: str = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ContactsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    workspace_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    score: Optional[int] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ContactsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    company_name: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    score: Optional[int] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ContactsListResponse(BaseModel):
    """List response schema"""
    items: List[ContactsResponse]
    total: int
    skip: int
    limit: int


class ContactsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[ContactsData]


class ContactsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: ContactsUpdateData


class ContactsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[ContactsBatchUpdateItem]


class ContactsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes (workspace-aware — Sprint 2.5) ----------
@router.get("", response_model=ContactsListResponse)
async def query_contactss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query contacts with workspace isolation."""
    logger.debug(f"Querying contacts: ws={ws_ctx.workspace_id}, query={query}, sort={sort}")

    service = ContactsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                logger.warning("contacts list: invalid query JSON")
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying contacts", e)


@router.get("/all", response_model=ContactsListResponse)
async def query_contactss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query all contacts within the workspace (auth required, workspace-scoped)."""
    logger.debug(f"Querying all contacts: ws={ws_ctx.workspace_id}")

    service = ContactsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                logger.warning("contacts list /all: invalid query JSON")
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying contacts (all)", e)


@router.get("/{id}", response_model=ContactsResponse)
async def get_contacts(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single contact by ID with workspace isolation."""
    service = ContactsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Contacts not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, f"Error fetching contacts id={id}", e)


@router.post("", response_model=ContactsResponse, status_code=201)
async def create_contacts(
    data: ContactsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new contact stamped with the active workspace."""
    await enforce_contact_create_quota(db, ws_ctx.workspace_id)
    service = ContactsService(db)
    try:
        result = await service.create(
            data.model_dump(),
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create contacts")

        # Auto-trigger workflow rules in the same workspace.
        try:
            wf = WorkflowEngineService(db)
            await wf.trigger(
                "contact_created",
                {
                    "contact_id": result.id,
                    "workspace_id": ws_ctx.workspace_id,
                    "first_name": result.first_name,
                    "last_name": result.last_name,
                    "email": result.email,
                },
                ws_ctx.user_id,
                ws_ctx.workspace_id,
            )
        except Exception as wf_err:
            logger.warning(
                "Auto workflow trigger failed for contact_created: contact_id=%s ws=%s err=%s",
                result.id,
                ws_ctx.workspace_id,
                str(wf_err),
                exc_info=True,
            )

        logger.info(f"Contacts created id={result.id} ws={ws_ctx.workspace_id}")
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="contact",
            resource_id=str(result.id),
            result="ok",
            event_type="saas.contact.create",
            commit=True,
        )
        return result
    except HTTPException:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="contact",
            resource_id=None,
            result="error",
            event_type="saas.contact.create",
            commit=True,
        )
        raise
    except IntegrityError as e:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="contact",
            resource_id=None,
            result="error",
            event_type="saas.contact.create",
            commit=True,
        )
        warn_integrity_conflict(logger, "create contact", e)
    except ValueError as e:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="contact",
            resource_id=None,
            result="error",
            event_type="saas.contact.create",
            commit=True,
        )
        warn_and_bad_request(logger, "create contact", e)
    except Exception as e:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="contact",
            resource_id=None,
            result="error",
            event_type="saas.contact.create",
            commit=True,
        )
        raise_internal(logger, "Error creating contacts", e)


@router.post("/batch", response_model=List[ContactsResponse], status_code=201)
async def create_contactss_batch(
    request: ContactsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch create contacts with workspace isolation."""
    await enforce_contact_headroom(db, ws_ctx.workspace_id, len(request.items))
    service = ContactsService(db)
    wf = WorkflowEngineService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(
                item_data.model_dump(),
                user_id=ws_ctx.user_id,
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)
                try:
                    await wf.trigger(
                        "contact_created",
                        {
                            "contact_id": result.id,
                            "workspace_id": ws_ctx.workspace_id,
                            "first_name": result.first_name,
                            "last_name": result.last_name,
                            "email": result.email,
                        },
                        ws_ctx.user_id,
                        ws_ctx.workspace_id,
                    )
                except Exception as wf_err:
                    logger.warning(
                        "Auto workflow trigger failed for batched contact_created: contact_id=%s ws=%s err=%s",
                        result.id,
                        ws_ctx.workspace_id,
                        str(wf_err),
                        exc_info=True,
                    )
        return results
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch create contacts", e)
    except ValueError as e:
        await db.rollback()
        warn_and_bad_request(logger, "batch create contacts", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch create contacts", e)


@router.put("/batch", response_model=List[ContactsResponse])
async def update_contactss_batch(
    request: ContactsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch update contacts with workspace isolation."""
    service = ContactsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id, update_dict,
                user_id=ws_ctx.user_id,
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch update contacts", e)
    except ValueError as e:
        await db.rollback()
        warn_and_bad_request(logger, "batch update contacts", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch update contacts", e)


@router.put("/{id}", response_model=ContactsResponse)
async def update_contacts(
    id: int,
    data: ContactsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update contact with workspace isolation."""
    service = ContactsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id, update_dict,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Contacts not found")
        return result
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"update contact id={id}", e)
    except ValueError as e:
        warn_and_bad_request(logger, f"update contact id={id}", e)
    except Exception as e:
        raise_internal(logger, f"Error updating contacts id={id}", e)


@router.delete("/batch")
async def delete_contactss_batch(
    request: ContactsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Batch delete contacts with workspace isolation."""
    service = ContactsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            success = await service.delete(
                item_id,
                user_id=ws_ctx.user_id,
                workspace_id=ws_ctx.workspace_id,
            )
            if success:
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} contacts", "deleted_count": deleted_count}
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch delete contacts", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch delete contacts", e)


@router.delete("/{id}")
async def delete_contacts(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete contact with workspace isolation."""
    service = ContactsService(db)
    try:
        success = await service.delete(
            id,
            user_id=ws_ctx.user_id,
            workspace_id=ws_ctx.workspace_id,
        )
        if not success:
            raise HTTPException(status_code=404, detail="Contacts not found")
        return {"message": "Contacts deleted successfully", "id": id}
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"delete contact id={id}", e)
    except Exception as e:
        raise_internal(logger, f"Error deleting contacts id={id}", e)
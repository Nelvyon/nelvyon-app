import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from routers.crm_http_helpers import raise_internal, warn_and_bad_request, warn_integrity_conflict
from services.audit_events import write_audit_event
from services.workflows import WorkflowsService
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from dependencies.quota_guards import (
    count_workflow_batch_active_additions,
    enforce_workflow_active_headroom,
    enforce_workflow_activation_transition,
)
from services.plan_quota import enforce_workflow_create_quota

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/workflows", tags=["workflows"])


# ---------- Pydantic Schemas ----------
class WorkflowsData(BaseModel):
    workspace_id: int = None
    name: str
    description: str = None
    trigger_type: str = None
    trigger_config: str = None
    actions: str = None
    status: str = None
    executions_count: int = None
    last_executed: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WorkflowsUpdateData(BaseModel):
    workspace_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[str] = None
    actions: Optional[str] = None
    status: Optional[str] = None
    executions_count: Optional[int] = None
    last_executed: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WorkflowsResponse(BaseModel):
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[str] = None
    actions: Optional[str] = None
    status: Optional[str] = None
    executions_count: Optional[int] = None
    last_executed: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class WorkflowsListResponse(BaseModel):
    items: List[WorkflowsResponse]
    total: int
    skip: int
    limit: int


class WorkflowsBatchCreateRequest(BaseModel):
    items: List[WorkflowsData]


class WorkflowsBatchUpdateItem(BaseModel):
    id: int
    updates: WorkflowsUpdateData


class WorkflowsBatchUpdateRequest(BaseModel):
    items: List[WorkflowsBatchUpdateItem]


class WorkflowsBatchDeleteRequest(BaseModel):
    ids: List[int]


# ---------- Routes (workspace-aware — Sprint 2.5) ----------
@router.get("", response_model=WorkflowsListResponse)
async def query_workflows(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query workflows with workspace isolation."""
    service = WorkflowsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                logger.warning("workflows list: invalid query JSON")
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying workflows", e)


@router.get("/all", response_model=WorkflowsListResponse)
async def query_workflows_all(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query all workflows within workspace (auth required, workspace-scoped)."""
    service = WorkflowsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                logger.warning("workflows list /all: invalid query JSON")
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        result = await service.get_list(
            skip=skip, limit=limit, query_dict=query_dict, sort=sort,
            workspace_id=ws_ctx.workspace_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "Error querying workflows (all)", e)


@router.get("/{id}", response_model=WorkflowsResponse)
async def get_workflows(
    id: int,
    fields: str = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowsService(db)
    try:
        result = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, f"Error fetching workflow id={id}", e)


@router.post("", response_model=WorkflowsResponse, status_code=201)
async def create_workflows(
    data: WorkflowsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_workflow_create_quota(db, ws_ctx.workspace_id)
    service = WorkflowsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create workflow")
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="workflow",
            resource_id=str(result.id),
            result="ok",
            event_type="saas.workflow.create",
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
            resource_type="workflow",
            resource_id=None,
            result="error",
            event_type="saas.workflow.create",
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
            resource_type="workflow",
            resource_id=None,
            result="error",
            event_type="saas.workflow.create",
            commit=True,
        )
        warn_integrity_conflict(logger, "create workflow", e)
    except ValueError as e:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="workflow",
            resource_id=None,
            result="error",
            event_type="saas.workflow.create",
            commit=True,
        )
        warn_and_bad_request(logger, "create workflow", e)
    except Exception as e:
        await write_audit_event(
            db,
            actor_user_id=ws_ctx.user_id,
            actor_email=ws_ctx.user_email,
            workspace_id=ws_ctx.workspace_id,
            action="create",
            resource_type="workflow",
            resource_id=None,
            result="error",
            event_type="saas.workflow.create",
            commit=True,
        )
        raise_internal(logger, "Error creating workflow", e)


@router.post("/batch", response_model=List[WorkflowsResponse], status_code=201)
async def create_workflows_batch(
    request: WorkflowsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    add_active = count_workflow_batch_active_additions(request.items)
    await enforce_workflow_active_headroom(db, ws_ctx.workspace_id, add_active)
    service = WorkflowsService(db)
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
        warn_integrity_conflict(logger, "batch create workflows", e)
    except ValueError as e:
        await db.rollback()
        warn_and_bad_request(logger, "batch create workflows", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch create workflows", e)


@router.put("/batch", response_model=List[WorkflowsResponse])
async def update_workflows_batch(
    request: WorkflowsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowsService(db)
    results = []
    try:
        for item in request.items:
            existing = await service.get_by_id(item.id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if not existing:
                continue
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            new_status = update_dict["status"] if "status" in update_dict else existing.status
            await enforce_workflow_activation_transition(
                db, ws_ctx.workspace_id, existing.status, new_status
            )
            result = await service.update(item.id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if result:
                results.append(result)
        return results
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch update workflows", e)
    except ValueError as e:
        await db.rollback()
        warn_and_bad_request(logger, "batch update workflows", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch update workflows", e)


@router.put("/{id}", response_model=WorkflowsResponse)
async def update_workflows(
    id: int,
    data: WorkflowsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowsService(db)
    try:
        existing = await service.get_by_id(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Workflow not found")
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        new_status = update_dict["status"] if "status" in update_dict else existing.status
        await enforce_workflow_activation_transition(db, ws_ctx.workspace_id, existing.status, new_status)
        result = await service.update(id, update_dict, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not result:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return result
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"update workflow id={id}", e)
    except ValueError as e:
        warn_and_bad_request(logger, f"update workflow id={id}", e)
    except Exception as e:
        raise_internal(logger, f"Error updating workflow id={id}", e)


@router.delete("/batch")
async def delete_workflows_batch(
    request: WorkflowsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
            if success:
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} workflows", "deleted_count": deleted_count}
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        warn_integrity_conflict(logger, "batch delete workflows", e)
    except Exception as e:
        await db.rollback()
        raise_internal(logger, "Batch delete workflows", e)


@router.delete("/{id}")
async def delete_workflows(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowsService(db)
    try:
        success = await service.delete(id, user_id=ws_ctx.user_id, workspace_id=ws_ctx.workspace_id)
        if not success:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return {"message": "Workflow deleted successfully", "id": id}
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"delete workflow id={id}", e)
    except Exception as e:
        raise_internal(logger, f"Error deleting workflow id={id}", e)
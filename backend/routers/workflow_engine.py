"""
Workflow Engine Router — Real workflow triggers and actions.
Separate from the CRUD workflows router; this handles execution logic.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import (
    enforce_workflow_engine_rules_write_allowed,
    enforce_workflow_engine_trigger_execute_allowed,
)
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from routers.crm_http_helpers import raise_internal, warn_and_bad_request, warn_integrity_conflict, warn_unprocessable
from services.workflow_engine import WorkflowEngineService

logger = logging.getLogger(__name__)


def _validate_optional_json_string_fields(payload: Dict[str, Any], field_names: tuple[str, ...]) -> None:
    """422 if trigger_config / action_config are non-empty strings but not valid JSON."""
    for key in field_names:
        val = payload.get(key)
        if val is None or val == "":
            continue
        if not isinstance(val, str):
            continue
        try:
            json.loads(val)
        except json.JSONDecodeError:
            warn_unprocessable(logger, "workflow rule payload", f"{key} must be valid JSON")

router = APIRouter(prefix="/api/v1/workflow-engine", tags=["workflow-engine"])


# ─── Schemas ───

class RuleCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str  # deal_created, deal_stage_changed, contact_created, manual
    trigger_config: Optional[str] = None  # JSON string
    action_type: str  # move_deal, create_activity, create_notification, send_email, create_contact
    action_config: Optional[str] = None  # JSON string
    is_active: bool = True


class RuleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[str] = None
    action_type: Optional[str] = None
    action_config: Optional[str] = None
    is_active: Optional[bool] = None


class RuleResponse(BaseModel):
    id: int
    user_id: str
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Optional[str] = None
    action_type: str
    action_config: Optional[str] = None
    is_active: bool
    runs_count: int
    last_run_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RuleListResponse(BaseModel):
    items: List[RuleResponse]
    total: int
    skip: int
    limit: int


class TriggerRequest(BaseModel):
    trigger_type: str
    trigger_data: Dict[str, Any] = Field(default_factory=dict)


class ExecutionResponse(BaseModel):
    id: int
    user_id: str
    rule_id: int
    rule_name: Optional[str] = None
    trigger_type: str
    trigger_data: Optional[str] = None
    action_type: str
    action_result: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ExecutionListResponse(BaseModel):
    items: List[ExecutionResponse]
    total: int
    skip: int
    limit: int


class TriggerResultItem(BaseModel):
    rule_id: int
    rule_name: str
    action_type: str
    status: str
    result: Dict[str, Any] = {}
    error: Optional[str] = None


class TriggerResponse(BaseModel):
    triggered: int
    executions: List[TriggerResultItem]


# ─── Rule CRUD ───

@router.get("/rules", response_model=RuleListResponse)
async def list_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowEngineService(db)
    try:
        return await service.list_rules(ws_ctx.user_id, ws_ctx.workspace_id, skip, limit)
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "workflow-engine list_rules", e)


@router.get("/rules/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowEngineService(db)
    try:
        rule = await service.get_rule(rule_id, ws_ctx.user_id, ws_ctx.workspace_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        return rule
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, f"workflow-engine get_rule id={rule_id}", e)


@router.post("/rules", response_model=RuleResponse, status_code=201)
async def create_rule(
    data: RuleCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_workflow_engine_rules_write_allowed(db, ws_ctx.workspace_id)
    service = WorkflowEngineService(db)
    payload = data.model_dump()
    _validate_optional_json_string_fields(payload, ("trigger_config", "action_config"))
    try:
        return await service.create_rule(payload, ws_ctx.user_id, ws_ctx.workspace_id)
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, "workflow-engine create_rule", e)
    except ValueError as e:
        warn_and_bad_request(logger, "workflow-engine create_rule", e)
    except Exception as e:
        raise_internal(logger, "workflow-engine create_rule", e)


@router.put("/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: int,
    data: RuleUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_workflow_engine_rules_write_allowed(db, ws_ctx.workspace_id)
    service = WorkflowEngineService(db)
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    _validate_optional_json_string_fields(update_dict, ("trigger_config", "action_config"))
    try:
        rule = await service.update_rule(rule_id, update_dict, ws_ctx.user_id, ws_ctx.workspace_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        return rule
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"workflow-engine update_rule id={rule_id}", e)
    except ValueError as e:
        warn_and_bad_request(logger, f"workflow-engine update_rule id={rule_id}", e)
    except Exception as e:
        raise_internal(logger, f"workflow-engine update_rule id={rule_id}", e)


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await enforce_workflow_engine_rules_write_allowed(db, ws_ctx.workspace_id)
    service = WorkflowEngineService(db)
    try:
        success = await service.delete_rule(rule_id, ws_ctx.user_id, ws_ctx.workspace_id)
        if not success:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"message": "Rule deleted", "id": rule_id}
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"workflow-engine delete_rule id={rule_id}", e)
    except Exception as e:
        raise_internal(logger, f"workflow-engine delete_rule id={rule_id}", e)


# ─── Trigger Endpoint ───

@router.post("/trigger", response_model=TriggerResponse)
async def trigger_workflow(
    data: TriggerRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Fire a trigger event. The engine evaluates all active rules matching
    the trigger_type and executes their actions.
    """
    await enforce_workflow_engine_trigger_execute_allowed(db, ws_ctx.workspace_id)
    service = WorkflowEngineService(db)
    try:
        results = await service.trigger(data.trigger_type, data.trigger_data, ws_ctx.user_id, ws_ctx.workspace_id)
        return TriggerResponse(
            triggered=len(results),
            executions=[TriggerResultItem(**r) for r in results],
        )
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, "workflow-engine trigger", e)
    except ValueError as e:
        warn_and_bad_request(logger, "workflow-engine trigger", e)
    except Exception as e:
        raise_internal(logger, "workflow-engine trigger", e)


# ─── Manual Execute ───

@router.post("/execute/{rule_id}", response_model=TriggerResultItem)
async def execute_rule_manually(
    rule_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
    trigger_data: Dict[str, Any] = Body(default_factory=dict),
):
    """Manually execute a specific rule with provided trigger data."""
    await enforce_workflow_engine_trigger_execute_allowed(db, ws_ctx.workspace_id)
    service = WorkflowEngineService(db)
    try:
        rule = await service.get_rule(rule_id, ws_ctx.user_id, ws_ctx.workspace_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")

        results = await service.trigger(
            rule.trigger_type, {**trigger_data, "manual": True}, ws_ctx.user_id, ws_ctx.workspace_id
        )
        matching = [r for r in results if r["rule_id"] == rule_id]
        if not matching:
            return TriggerResultItem(
                rule_id=rule_id,
                rule_name=rule.name,
                action_type=rule.action_type,
                status="skipped",
                result={},
                error="Rule conditions not met",
            )
        return TriggerResultItem(**matching[0])
    except HTTPException:
        raise
    except IntegrityError as e:
        warn_integrity_conflict(logger, f"workflow-engine execute id={rule_id}", e)
    except ValueError as e:
        warn_and_bad_request(logger, f"workflow-engine execute id={rule_id}", e)
    except Exception as e:
        raise_internal(logger, f"workflow-engine execute id={rule_id}", e)


# ─── Execution History ───

@router.get("/executions", response_model=ExecutionListResponse)
async def list_executions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowEngineService(db)
    try:
        return await service.list_executions(ws_ctx.user_id, ws_ctx.workspace_id, skip, limit)
    except HTTPException:
        raise
    except Exception as e:
        raise_internal(logger, "workflow-engine list_executions", e)
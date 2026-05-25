"""Frente 51 — Visual workflow automation API."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.workflow_service import WorkflowService, get_workflow_service

logger = logging.getLogger(__name__)

workflows_visual_router = APIRouter(prefix="/api/workflows", tags=["workflows-visual"])
router = workflows_visual_router


class WorkflowNodeModel(BaseModel):
    id: str
    nodeType: Optional[str] = None
    node_type: Optional[str] = None
    category: str = "action"
    label: str = ""
    config: dict[str, Any] = Field(default_factory=dict)
    data: dict[str, Any] = Field(default_factory=dict)
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})
    type: Optional[str] = None


class WorkflowEdgeModel(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class CreateWorkflowBody(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)


class UpdateWorkflowBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[list[dict[str, Any]]] = None
    edges: Optional[list[dict[str, Any]]] = None


class TriggerWorkflowBody(BaseModel):
    trigger_data: dict[str, Any] = Field(default_factory=dict)


def _svc(db: AsyncSession, ws: WorkspaceContext) -> WorkflowService:
    return get_workflow_service(db, ws.workspace_id)


@workflows_visual_router.post("", status_code=201)
async def create_workflow(
    body: CreateWorkflowBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).create_workflow(
            user_id=ws.user_id,
            workspace_id=ws.workspace_id,
            name=body.name,
            description=body.description,
            nodes=body.nodes,
            edges=body.edges,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@workflows_visual_router.get("")
async def list_workflows(
    skip: int = 0,
    limit: int = 50,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).list_workflows(ws.user_id, ws.workspace_id, skip=skip, limit=limit)


@workflows_visual_router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: int,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).get_workflow(workflow_id, ws.user_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@workflows_visual_router.put("/{workflow_id}")
async def update_workflow(
    workflow_id: int,
    body: UpdateWorkflowBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).update_workflow(
            workflow_id,
            ws.user_id,
            ws.workspace_id,
            name=body.name,
            description=body.description,
            nodes=body.nodes,
            edges=body.edges,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@workflows_visual_router.post("/{workflow_id}/activate")
async def activate_workflow(
    workflow_id: int,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).activate_workflow(workflow_id, ws.user_id, ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@workflows_visual_router.post("/{workflow_id}/trigger")
async def trigger_workflow(
    workflow_id: int,
    body: TriggerWorkflowBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = {**body.trigger_data, "_manual": True, "trigger_type": "manual"}
        return await _svc(db, ws).execute_workflow(
            workflow_id, data, user_id=ws.user_id, workspace_id=ws.workspace_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@workflows_visual_router.get("/{workflow_id}/executions")
async def list_executions(
    workflow_id: int,
    skip: int = 0,
    limit: int = 50,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).list_executions(
            workflow_id, ws.user_id, ws.workspace_id, skip=skip, limit=limit
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

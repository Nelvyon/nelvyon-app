"""Workspace plan, usage, billing, and enterprise administration."""

from __future__ import annotations

import logging

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_admin,
)
from schemas.auth import UserResponse
from services.workspace_service import get_workspace_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workspace", tags=["workspace-admin"])


class UpgradePlanBody(BaseModel):
    plan: str = Field(..., min_length=1)
    billing_cycle: str = Field("monthly")
    success_url: HttpUrl
    cancel_url: HttpUrl


class SuspendBody(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_workspace_service(db, int(ws.workspace_id))


@router.get("/plan")
async def get_workspace_plan(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws)
    plan = await svc.get_current_plan()
    return svc.get_plan_limits(plan)


@router.get("/usage")
async def get_workspace_usage(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).get_usage_stats()
    except Exception as exc:
        logger.error("workspace usage: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to load usage stats") from exc


@router.post("/upgrade")
async def upgrade_workspace_plan(
    body: UpgradePlanBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).upgrade_plan(
            body.plan,
            billing_cycle=body.billing_cycle,
            success_url=str(body.success_url),
            cancel_url=str(body.cancel_url),
            user_id=str(current_user.id),
            user_email=current_user.email or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("workspace upgrade: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=502, detail="Plan upgrade failed") from exc


@router.get("/billing")
async def workspace_billing_history(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).get_billing_history()
    except Exception as exc:
        logger.error("workspace billing: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to load billing history") from exc


@router.post("/suspend")
async def suspend_workspace(
    body: SuspendBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).suspend_workspace(body.reason)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/restore")
async def restore_workspace(
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).restore_workspace()
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/limit/{resource}")
async def check_resource_limit(
    resource: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).check_plan_limit(resource)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

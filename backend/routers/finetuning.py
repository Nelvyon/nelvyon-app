"""Frente 53 — Workspace fine-tuning API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.finetuning_service import FineTuningService, get_finetuning_service

logger = logging.getLogger(__name__)

finetuning_router = APIRouter(prefix="/api/finetuning", tags=["finetuning"])
router = finetuning_router


def _svc(db: AsyncSession, ws: WorkspaceContext) -> FineTuningService:
    return get_finetuning_service(db, ws.workspace_id)


@finetuning_router.post("/start")
async def start_finetuning(
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Collect training data and start OpenAI fine-tuning job."""
    try:
        return await _svc(db, ws).start_finetuning(ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@finetuning_router.get("/status")
async def finetuning_status(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).check_finetuning_status(ws.workspace_id)


@finetuning_router.get("/model")
async def finetuned_model(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _svc(db, ws).get_finetuned_model(ws.workspace_id)


@finetuning_router.post("/collect")
async def collect_only(
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Preview dataset collection without starting training."""
    try:
        return await _svc(db, ws).collect_training_data(ws.workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

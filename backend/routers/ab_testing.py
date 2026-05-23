"""NELVYON A/B Testing API — experiments, variants, tracking, results."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.ab_testing_service import AbTestingService, get_ab_testing_service

logger = logging.getLogger(__name__)

ab_router = APIRouter(prefix="/api/ab", tags=["ab-testing"])
router = ab_router


class VariantBody(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    changes: dict[str, Any] = Field(default_factory=dict)
    is_control: bool = False


class CreateExperimentBody(BaseModel):
    name: str = Field(..., min_length=1)
    hypothesis: str = ""
    variants: list[VariantBody] = Field(..., min_length=2)
    metric_goal: str = Field(default="conversion")
    traffic_split: Optional[dict[str, Any]] = None


class UpdateExperimentBody(BaseModel):
    name: Optional[str] = None
    hypothesis: Optional[str] = None
    metric_goal: Optional[str] = None
    traffic_split: Optional[dict[str, Any]] = None


class TrackEventBody(BaseModel):
    experiment_id: str
    variant_id: str
    session_id: str = "anonymous"
    event_type: str = "impression"
    value: float = 0


class DeclareWinnerBody(BaseModel):
    variant_id: str


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> AbTestingService:
    return get_ab_testing_service(db, ws.workspace_id if ws else None)


@ab_router.post("/track")
async def track_event(body: TrackEventBody, db: AsyncSession = Depends(get_db)):
    await AbTestingService.ensure_schema()
    try:
        return await get_ab_testing_service(db).track_event(
            body.experiment_id,
            body.variant_id,
            body.session_id,
            body.event_type,
            body.value,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@ab_router.post("/experiments", status_code=201)
async def create_experiment(
    body: CreateExperimentBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).create_experiment(
            ws.workspace_id,
            body.name,
            body.hypothesis,
            [v.model_dump() for v in body.variants],
            body.metric_goal,
            body.traffic_split,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@ab_router.get("/experiments")
async def list_experiments(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await AbTestingService.ensure_schema()
    items = await _svc(db, ws).list_experiments(ws.workspace_id)
    return {"items": items}


@ab_router.get("/experiments/{experiment_id}")
async def get_experiment(
    experiment_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).get_experiment(experiment_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@ab_router.put("/experiments/{experiment_id}")
async def update_experiment(
    experiment_id: str,
    body: UpdateExperimentBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).update_experiment(experiment_id, **body.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@ab_router.delete("/experiments/{experiment_id}")
async def delete_experiment(
    experiment_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    ok = await _svc(db, ws).delete_experiment(experiment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {"ok": True}


@ab_router.post("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).start_experiment(experiment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@ab_router.post("/experiments/{experiment_id}/pause")
async def pause_experiment(
    experiment_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).pause_experiment(experiment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@ab_router.post("/experiments/{experiment_id}/end")
async def end_experiment(
    experiment_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).end_experiment(experiment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@ab_router.get("/experiments/{experiment_id}/results")
async def experiment_results(
    experiment_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).get_results(experiment_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@ab_router.post("/experiments/{experiment_id}/winner")
async def declare_winner(
    experiment_id: str,
    body: DeclareWinnerBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await AbTestingService.ensure_schema()
    try:
        return await _svc(db, ws).declare_winner(experiment_id, body.variant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

"""SaaS intelligence — benchmarks, lead scoring, churn prediction."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.benchmarking_service import get_benchmarking_service
from services.churn_prediction_service import get_churn_prediction_service
from services.lead_scoring_service import get_lead_scoring_service

router = APIRouter(prefix="/api/saas", tags=["saas-intelligence"])


class ClientMetricsBody(BaseModel):
    email_open_rate: float = Field(0, ge=0, le=100)
    email_ctr: float = Field(0, ge=0, le=100)
    conversion_rate: float = Field(0, ge=0, le=100)
    cac_eur: float = Field(0, ge=0)
    churn_rate: float = Field(0, ge=0, le=100)
    sector: str = "startup"


class ScoreLeadBody(BaseModel):
    contact_id: str


@router.get("/benchmarks/sectors")
async def list_benchmark_sectors():
    return {"items": get_benchmarking_service().list_sectors()}


@router.get("/benchmarks/industry/{sector}")
async def industry_benchmarks(sector: str):
    return get_benchmarking_service().get_industry_benchmarks(sector)


@router.post("/benchmarks/compare")
async def compare_benchmarks(
    body: ClientMetricsBody,
    ws: WorkspaceContext = Depends(require_workspace),
    user: UserResponse = Depends(get_current_user),
):
    metrics = body.model_dump(exclude={"sector"})
    return get_benchmarking_service().compare_client_vs_industry(str(user.id), metrics, sector=body.sector)


@router.post("/leads/score")
async def score_lead(
    body: ScoreLeadBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = get_lead_scoring_service(db, ws.workspace_id)
    try:
        result = await svc.score_contact(body.contact_id)
        await db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/leads/ranking")
async def leads_ranking(
    limit: int = Query(50, ge=1, le=200),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_lead_scoring_service(db, ws.workspace_id).list_ranking(limit=limit)


@router.get("/churn/risk/{workspace_id}")
async def churn_risk(
    workspace_id: int,
    ws: WorkspaceContext = Depends(require_workspace),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if ws.workspace_id != workspace_id and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Workspace access denied")
    return await get_churn_prediction_service(db).predict_churn(str(user.id), workspace_id)


@router.get("/churn/at-risk")
async def churn_at_risk(
    threshold: int = Query(60, ge=0, le=100),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_churn_prediction_service(db).list_at_risk(str(user.id), threshold=threshold)

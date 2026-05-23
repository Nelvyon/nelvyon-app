"""NELVYON Loyalty API — points programs, earn/redeem, leaderboard."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.loyalty_service import LoyaltyService, get_loyalty_service

logger = logging.getLogger(__name__)

loyalty_router = APIRouter(prefix="/api/loyalty", tags=["loyalty"])
router = loyalty_router


class RewardRuleBody(BaseModel):
    trigger: str
    points: int = 0
    description: str = ""


class CreateProgramBody(BaseModel):
    name: str = Field(..., min_length=1)
    points_per_euro: float = Field(default=1.0, ge=0)
    reward_rules: Optional[list[RewardRuleBody]] = None


class UpdateProgramBody(BaseModel):
    name: Optional[str] = None
    points_per_euro: Optional[float] = Field(None, ge=0)
    reward_rules: Optional[list[RewardRuleBody]] = None
    is_active: Optional[bool] = None


class AwardPointsBody(BaseModel):
    customer_email: str = Field(..., min_length=3)
    trigger: str = "purchase"
    amount_euros: float = Field(default=0, ge=0)


class RedeemPointsBody(BaseModel):
    customer_email: str = Field(..., min_length=3)
    points_to_redeem: int = Field(..., gt=0)


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> LoyaltyService:
    return get_loyalty_service(db, ws.workspace_id if ws else None)


@loyalty_router.get("/public/{program_id}/customer/{email}")
async def public_customer_points(program_id: str, email: str, db: AsyncSession = Depends(get_db)):
    await LoyaltyService.ensure_schema()
    try:
        return await get_loyalty_service(db).get_customer_points(program_id, email)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@loyalty_router.post("/programs", status_code=201)
async def create_program(
    body: CreateProgramBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LoyaltyService.ensure_schema()
    rules = [r.model_dump() for r in body.reward_rules] if body.reward_rules else None
    return await _svc(db, ws).create_program(ws.workspace_id, body.name, body.points_per_euro, rules)


@loyalty_router.get("/programs")
async def list_programs(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await LoyaltyService.ensure_schema()
    items = await _svc(db, ws).list_programs(ws.workspace_id)
    return {"items": items}


@loyalty_router.get("/programs/{program_id}")
async def get_program(
    program_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await LoyaltyService.ensure_schema()
    try:
        return await _svc(db, ws).get_program(program_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@loyalty_router.put("/programs/{program_id}")
async def update_program(
    program_id: str,
    body: UpdateProgramBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LoyaltyService.ensure_schema()
    try:
        return await _svc(db, ws).update_program(program_id, **body.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@loyalty_router.post("/programs/{program_id}/award")
async def award_points(
    program_id: str,
    body: AwardPointsBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LoyaltyService.ensure_schema()
    try:
        return await _svc(db, ws).award_points(
            program_id, body.customer_email, body.trigger, body.amount_euros
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@loyalty_router.post("/programs/{program_id}/redeem")
async def redeem_points(
    program_id: str,
    body: RedeemPointsBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await LoyaltyService.ensure_schema()
    try:
        return await _svc(db, ws).redeem_points(program_id, body.customer_email, body.points_to_redeem)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@loyalty_router.get("/programs/{program_id}/customer/{email}")
async def customer_points(
    program_id: str,
    email: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await LoyaltyService.ensure_schema()
    try:
        return await _svc(db, ws).get_customer_points(program_id, email)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@loyalty_router.get("/programs/{program_id}/leaderboard")
async def leaderboard(
    program_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    limit: int = 10,
):
    await LoyaltyService.ensure_schema()
    items = await _svc(db, ws).get_leaderboard(program_id, limit)
    return {"items": items}


@loyalty_router.get("/programs/{program_id}/stats")
async def program_stats(
    program_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await LoyaltyService.ensure_schema()
    try:
        return await _svc(db, ws).get_program_stats(program_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@loyalty_router.get("/summary")
async def workspace_summary(ws: WorkspaceContext = Depends(require_workspace), db: AsyncSession = Depends(get_db)):
    await LoyaltyService.ensure_schema()
    return await _svc(db, ws).get_workspace_summary(ws.workspace_id)

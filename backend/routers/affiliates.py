"""Affiliate program API — register, stats, payouts, public tracking."""

from __future__ import annotations

import hashlib
import logging
from decimal import Decimal
from typing import Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin
from schemas.auth import UserResponse
from services.affiliate_service import get_affiliate_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/affiliates", tags=["affiliates"])


class RegisterAffiliateBody(BaseModel):
    commission_rate: Optional[float] = Field(None, ge=0, le=1)
    stripe_connect_id: Optional[str] = None


class TrackReferralBody(BaseModel):
    referred_workspace_id: Optional[int] = None
    subscription_amount: float = Field(0, ge=0)
    is_recurring: bool = False
    track_click_only: bool = False


class PayoutBody(BaseModel):
    amount: float = Field(..., gt=0)


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None):
    ws_id = int(ws.workspace_id) if ws and ws.workspace_id else None
    return get_affiliate_service(db, ws_id)


@router.post("/register", status_code=201)
async def register_affiliate(
    body: RegisterAffiliateBody,
    ws: WorkspaceContext = Depends(require_workspace),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws).register_affiliate(
            int(ws.workspace_id),
            user.id,
            commission_rate=body.commission_rate,
            stripe_connect_id=body.stripe_connect_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/stats")
async def get_affiliate_stats(
    ws: WorkspaceContext = Depends(require_workspace),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws)
    affiliate = await svc.get_affiliate_for_workspace(int(ws.workspace_id), user.id)
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not registered")
    try:
        return await svc.get_affiliate_stats(str(affiliate["id"]))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/payouts")
async def list_affiliate_payouts(
    ws: WorkspaceContext = Depends(require_workspace),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws)
    affiliate = await svc.get_affiliate_for_workspace(int(ws.workspace_id), user.id)
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not registered")
    payouts = await svc.list_payouts(str(affiliate["id"]))
    return {"payouts": payouts}


@router.post("/payouts", status_code=201)
async def request_affiliate_payout(
    body: PayoutBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _svc(db, ws)
    affiliate = await svc.get_affiliate_for_workspace(int(ws.workspace_id), user.id)
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not registered")
    try:
        return await svc.payout_affiliate(str(affiliate["id"]), Decimal(str(body.amount)))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("affiliate payout: %s", sanitize_text(str(exc)), exc_info=True)
        raise HTTPException(status_code=500, detail="Payout failed") from exc


@router.post("/track/{code}")
async def track_affiliate(
    code: str,
    body: TrackReferralBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — track click or referral conversion."""
    svc = get_affiliate_service(db)
    try:
        if body.track_click_only or body.referred_workspace_id is None:
            ip = request.client.host if request.client else ""
            ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16] if ip else None
            return await svc.track_click(
                code,
                ip_hash=ip_hash,
                user_agent=request.headers.get("user-agent"),
                referrer=request.headers.get("referer"),
            )
        return await svc.track_referral(
            code,
            body.referred_workspace_id,
            subscription_amount=body.subscription_amount,
            is_recurring=body.is_recurring,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

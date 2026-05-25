"""F65 — Text-2-Pay API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.text2pay_service import get_text2pay_service

router = APIRouter(prefix="/api/text2pay", tags=["text2pay"])


class CreatePaymentBody(BaseModel):
    client_id: str = "default"
    lead_phone: str = Field(..., min_length=8)
    amount: float = Field(..., gt=0, le=1_000_000)
    currency: str = "eur"
    description: str = Field(..., min_length=3, max_length=500)
    channel: str = Field("sms", pattern="^(sms|whatsapp)$")


@router.post("/create")
async def create_payment(
    body: CreatePaymentBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_text2pay_service(db, ws.workspace_id).create_and_send(
            client_id=body.client_id,
            lead_phone=body.lead_phone,
            amount=body.amount,
            currency=body.currency,
            description=body.description,
            channel=body.channel,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/payments")
async def list_payments(
    client_id: str | None = None,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_text2pay_service(db, ws.workspace_id).list_payments(client_id)


@router.get("/payments/{payment_id}")
async def get_payment(
    payment_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_text2pay_service(db, ws.workspace_id).get_payment(payment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Stripe webhook — public, updates payment status."""
    try:
        payload: dict[str, Any] = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc
    # Workspace 1 default for webhook rows without tenant header
    return await get_text2pay_service(db, 1).handle_webhook(payload)

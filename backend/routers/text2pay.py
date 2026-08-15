"""F65 — Text-2-Pay API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

import json
import logging
import os

import stripe
from stripe import SignatureVerificationError

from core.config import settings
from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.text2pay_service import get_text2pay_service

logger = logging.getLogger(__name__)


def _secreto_de_webhook() -> str:
    return (
        getattr(settings, "stripe_webhook_secret", None)
        or os.environ.get("STRIPE_WEBHOOK_SECRET")
        or ""
    ).strip()

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
    """
    Stripe webhook — publico, marca pagos como cobrados.

    Aceptaba el cuerpo SIN verificar la firma. Un POST con
    `{"type": "payment_intent.succeeded", "data": {"object": {"metadata":
    {"text2pay_id": "<id>"}}}}` ponia ese pago en `paid` sin que nadie hubiese
    pagado. `routers/stripe_webhook.py` ya verificaba la firma sobre el cuerpo
    CRUDO; aqui se hace lo mismo, y por eso se lee `request.body()` y no
    `request.json()`: reserializar el JSON cambia los bytes y la firma deja de
    casar.
    """
    cuerpo = await request.body()
    firma = request.headers.get("stripe-signature") or ""
    secreto = _secreto_de_webhook()

    if settings.is_production and not secreto:
        logger.error("text2pay.webhook STRIPE_WEBHOOK_SECRET missing in production")
        raise HTTPException(status_code=503, detail="Stripe webhook not configured")
    if not secreto:
        if (settings.environment or "").lower() in ("test", "development", "dev"):
            secreto = "whsec_test_placeholder"
        else:
            raise HTTPException(status_code=400, detail="STRIPE_WEBHOOK_SECRET is required")

    try:
        # `construct_event` valida la firma; su valor es un objeto del SDK, y el
        # servicio espera un dict plano. Como la firma se comprobo sobre estos
        # bytes exactos, el JSON que contienen es autentico.
        stripe.Webhook.construct_event(cuerpo, firma, secreto)
        payload: dict[str, Any] = json.loads(cuerpo)
    except SignatureVerificationError as exc:
        logger.warning("text2pay.webhook signature verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc

    # Workspace 1 default for webhook rows without tenant header
    return await get_text2pay_service(db, 1).handle_webhook(payload)

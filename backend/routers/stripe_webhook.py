"""
Stripe Webhook — signature verification (raw body), idempotency (stripe_webhook_events), HTTP semantics.

- Production: STRIPE_WEBHOOK_SECRET required (503 if missing).
- 2xx: success, duplicate, or unhandled type (logged).
- 4xx: invalid signature / payload.
- 503: Stripe not configured, concurrent claim on same event, or checkout handler could not apply (retry).
- 5xx: transient processing failure (Stripe retries).

ACTOR DE SISTEMA
----------------
Este webhook llega sin JWT y sin usuario, y aun asi tiene que escribir
`subscriptions`, que bajo RLS concede por titular o por pertenencia al
workspace (migracion 543). No tiene ninguna de las dos cosas.

Por eso —y SOLO despues de verificar la firma— se abre una sesion de
`core.database.sesion_de_barrido()`, ligada al rol `nelvyon_jobs`, y se pasa
unicamente a la escritura de suscripciones. La idempotencia y el resto del
handler siguen con la sesion normal.
"""
import logging
import os
from typing import Any, Dict

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from stripe import SignatureVerificationError

from core.config import settings
from core.database import get_db, sesion_de_barrido
from services.stripe_webhook_processor import process_stripe_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stripe", tags=["stripe-webhook"])


def _webhook_secret() -> str:
    return (getattr(settings, "stripe_webhook_secret", None) or os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature") or ""

    secret = _webhook_secret()
    if settings.is_production and not secret:
        logger.error("stripe.webhook STRIPE_WEBHOOK_SECRET missing in production")
        raise HTTPException(status_code=503, detail="Stripe webhook not configured")

    if not secret:
        if (settings.environment or "").lower() in ("test", "development", "dev"):
            secret = "whsec_test_placeholder"
        else:
            raise HTTPException(status_code=400, detail="STRIPE_WEBHOOK_SECRET is required")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except SignatureVerificationError as e:
        logger.warning("stripe.webhook signature verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature") from e
    except ValueError as e:
        logger.warning("stripe.webhook invalid payload: %s", e)
        raise HTTPException(status_code=400, detail="Invalid payload") from e

    event_id = event.get("id", "")
    event_type = event.get("type", "")
    logger.info(
        "stripe.webhook received",
        extra={"stripe_event_id": event_id, "event_type": event_type},
    )

    # La sesion privilegiada se abre AQUI y no antes: por encima de esta linea
    # solo hay verificacion de firma, y una peticion con firma invalida no debe
    # llegar siquiera a tocar una credencial que evita RLS.
    #
    # Sin `NELVYON_JOBS_DATABASE_URL`, `sesion_de_barrido()` devuelve una sesion
    # del motor de siempre: misma conexion, mismo rol, conducta identica a la de
    # antes de este cambio.
    try:
        async with await sesion_de_barrido() as db_suscripciones:
            outcome, body = await process_stripe_event(
                db, event, db_suscripciones=db_suscripciones
            )
    except Exception as e:
        logger.exception("stripe.webhook processing failed event_id=%s", event_id)
        raise HTTPException(status_code=500, detail="Webhook processing failed") from e

    if outcome == "error":
        raise HTTPException(status_code=400, detail=body.get("detail", "Invalid event"))

    if outcome == "retry":
        raise HTTPException(
            status_code=503,
            detail=body.get("detail", "Webhook event in progress; retry later"),
        )

    return body

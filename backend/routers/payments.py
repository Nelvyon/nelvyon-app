import logging
from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.billing_catalog import (
    estimated_display_total_eur,
    build_plans_payload,
    resolve_stripe_price_id,
    VALID_BILLING_CYCLES,
    VALID_PLAN_IDS,
)
from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_admin,
    require_workspace_operator,
)
from schemas.auth import UserResponse
from services.billing_sync import apply_verified_checkout_session
from services.payment import PaymentService, CheckoutSessionRequest, CheckoutError
from services.subscriptions import SubscriptionsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payment", tags=["payment"])


class SubscriptionCheckoutRequest(BaseModel):
    plan_id: str
    billing_cycle: str
    promo_code: Optional[str] = None
    success_url: str
    cancel_url: str


class SubscriptionCheckoutResponse(BaseModel):
    session_id: str
    url: str
    amount: float
    currency: str


class VerifyPaymentRequest(BaseModel):
    session_id: str


class VerifyPaymentResponse(BaseModel):
    status: str
    plan_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    payment_status: str
    subscription_id: Optional[int] = None


class ActiveSubscriptionResponse(BaseModel):
    has_subscription: bool
    plan_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    status: Optional[str] = None
    amount_paid: Optional[float] = None
    started_at: Optional[str] = None
    expires_at: Optional[str] = Field(None, description="Legacy mirror; prefer current_period_end.")
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None


async def _get_or_create_stripe_customer(
    db: AsyncSession,
    workspace_id: int,
    user_email: str,
) -> str:
    """Reuse Stripe Customer from a prior subscription row for this workspace, or create one."""
    sub_service = SubscriptionsService(db)
    subs = await sub_service.get_list(workspace_id=workspace_id, limit=50, sort="-id")
    for row in subs["items"]:
        cid = getattr(row, "stripe_customer_id", None)
        if cid:
            return str(cid)

    await PaymentService._auto_reload_stripe_config()
    cust = await stripe.Customer.create_async(
        email=user_email or None,
        metadata={"workspace_id": str(workspace_id)},
    )
    return str(cust.id)


@router.post("/create_payment_session", response_model=SubscriptionCheckoutResponse)
async def create_payment_session(
    data: SubscriptionCheckoutRequest,
    request: Request,
    ws_ctx: WorkspaceContext = Depends(require_workspace_admin),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session (subscription mode) for the billing workspace."""
    try:
        if data.plan_id not in VALID_PLAN_IDS:
            raise HTTPException(status_code=400, detail=f"Plan inválido: {data.plan_id}")
        if data.billing_cycle not in VALID_BILLING_CYCLES:
            raise HTTPException(status_code=400, detail=f"Ciclo inválido: {data.billing_cycle}")

        try:
            stripe_price_id = resolve_stripe_price_id(data.plan_id, data.billing_cycle)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        workspace_id = ws_ctx.workspace_id
        assert workspace_id is not None

        stripe_customer_id = await _get_or_create_stripe_customer(
            db, workspace_id, current_user.email
        )

        display_amount = estimated_display_total_eur(
            data.plan_id, data.billing_cycle, data.promo_code
        )

        frontend_host = request.headers.get("App-Host")
        if frontend_host and not frontend_host.startswith(("http://", "https://")):
            frontend_host = f"https://{frontend_host}"

        success_url = data.success_url
        cancel_url = data.cancel_url
        if frontend_host:
            if not success_url.startswith("http"):
                success_url = f"{frontend_host}{success_url}"
            if not cancel_url.startswith("http"):
                cancel_url = f"{frontend_host}{cancel_url}"

        sub_service = SubscriptionsService(db)
        now = datetime.now()
        sub_record = await sub_service.create(
            {
                "workspace_id": workspace_id,
                "plan_id": data.plan_id,
                "billing_cycle": data.billing_cycle,
                "status": "pending",
                "amount_paid": display_amount,
                "currency": "eur",
                "promo_code": data.promo_code or "",
                "stripe_customer_id": stripe_customer_id,
                "created_at": now,
                "updated_at": now,
            },
            user_id=str(current_user.id),
        )

        payment_service = PaymentService()
        checkout_request = CheckoutSessionRequest(
            mode="subscription",
            stripe_price_id=stripe_price_id,
            currency="eur",
            ui_mode="hosted",
            success_url=success_url
            if "{CHECKOUT_SESSION_ID}" in success_url
            else f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            customer=stripe_customer_id,
            metadata={
                "subscription_id": str(sub_record.id),
                "user_id": str(current_user.id),
                "workspace_id": str(workspace_id),
                "plan_id": data.plan_id,
                "billing_cycle": data.billing_cycle,
            },
        )
        checkout_response = await payment_service.create_checkout_session(checkout_request)

        await sub_service.update(
            sub_record.id,
            {
                "stripe_session_id": checkout_response.session_id,
                "updated_at": datetime.now(),
            },
            user_id=str(current_user.id),
            workspace_id=workspace_id,
        )

        return SubscriptionCheckoutResponse(
            session_id=checkout_response.session_id,
            url=checkout_response.url or "",
            amount=display_amount,
            currency="eur",
        )

    except CheckoutError as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=502, detail=f"Error de pago: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment session creation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.post("/verify_payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    data: VerifyPaymentRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify payment status and activate subscription (workspace-scoped; same write-path as webhooks)."""
    try:
        payment_service = PaymentService()
        status_response = await payment_service.get_checkout_status(data.session_id)

        meta_ws = (status_response.metadata or {}).get("workspace_id")
        if meta_ws and str(ws_ctx.workspace_id) != str(meta_ws).strip():
            raise HTTPException(
                status_code=403,
                detail="Checkout session does not belong to this workspace",
            )
        meta_plan = (status_response.metadata or {}).get("plan_id", "").strip()
        if meta_plan and meta_plan not in VALID_PLAN_IDS:
            raise HTTPException(status_code=400, detail=f"Plan inválido en sesión: {meta_plan}")

        sub_service = SubscriptionsService(db)

        subs = await sub_service.get_list(
            user_id=str(current_user.id),
            workspace_id=ws_ctx.workspace_id,
            query_dict={"stripe_session_id": data.session_id},
            limit=1,
        )

        subscription = None
        if subs["items"]:
            subscription = subs["items"][0]

        plan_id = status_response.metadata.get("plan_id", "")
        billing_cycle = status_response.metadata.get("billing_cycle", "monthly")

        if status_response.payment_status == "paid" and subscription and ws_ctx.workspace_id is not None:
            row, apply_err = await apply_verified_checkout_session(
                sub_service,
                checkout_session_id=data.session_id,
                user_id=str(current_user.id),
                workspace_id=ws_ctx.workspace_id,
            )
            if row is not None:
                return VerifyPaymentResponse(
                    status="paid",
                    plan_id=plan_id,
                    billing_cycle=billing_cycle,
                    payment_status="paid",
                    subscription_id=row.id,
                )
            logger.warning("verify_payment: paid but apply failed session=%s err=%s", data.session_id, apply_err)

        status_map = {"complete": "paid", "open": "pending", "expired": "cancelled"}
        mapped_status = status_map.get(status_response.status, "pending")

        return VerifyPaymentResponse(
            status=mapped_status,
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            payment_status=status_response.payment_status,
            subscription_id=subscription.id if subscription else None,
        )

    except CheckoutError as e:
        logger.error(f"Payment verification error: {e}")
        raise HTTPException(status_code=502, detail=f"Error verificando pago: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/active_subscription", response_model=ActiveSubscriptionResponse)
async def get_active_subscription(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Active subscription for the billing workspace (X-Workspace-Id), not a global user-level row."""
    try:
        assert ws_ctx.workspace_id is not None
        sub_service = SubscriptionsService(db)
        subs = await sub_service.get_list(
            workspace_id=ws_ctx.workspace_id,
            query_dict={"status": "active"},
            sort="-id",
            limit=1,
        )

        if not subs["items"]:
            return ActiveSubscriptionResponse(has_subscription=False)

        sub = subs["items"][0]
        return ActiveSubscriptionResponse(
            has_subscription=True,
            plan_id=sub.plan_id,
            billing_cycle=sub.billing_cycle,
            status=sub.status,
            amount_paid=sub.amount_paid,
            started_at=sub.started_at.isoformat() if sub.started_at else None,
            expires_at=sub.expires_at.isoformat() if sub.expires_at else None,
            current_period_start=sub.current_period_start.isoformat() if sub.current_period_start else None,
            current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        )

    except Exception as e:
        logger.error(f"Error fetching subscription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/plans")
async def get_plans():
    """Get all available plans with display pricing (Stripe Prices are configured via env)."""
    return build_plans_payload()


class PaymentIntentRequest(BaseModel):
    amount_cents: int = Field(..., gt=0)
    currency: str = Field("eur", min_length=3, max_length=3)


class RefundRequest(BaseModel):
    charge_id: Optional[str] = None
    payment_intent_id: Optional[str] = None
    amount_cents: Optional[int] = Field(None, gt=0)


@router.post("/intent")
async def create_payment_intent(
    body: PaymentIntentRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_admin),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe PaymentIntent for one-off workspace charges."""
    assert ws_ctx.workspace_id is not None
    customer_id = await _get_or_create_stripe_customer(db, ws_ctx.workspace_id, current_user.email)
    payment_service = PaymentService()
    try:
        return await payment_service.create_payment_intent(
            amount_cents=body.amount_cents,
            currency=body.currency,
            customer=customer_id,
            metadata={"workspace_id": str(ws_ctx.workspace_id), "user_id": str(current_user.id)},
        )
    except CheckoutError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/charges")
async def list_charges(
    limit: int = 25,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List Stripe charges for the workspace customer."""
    assert ws_ctx.workspace_id is not None
    customer_id = await _get_or_create_stripe_customer(db, ws_ctx.workspace_id, current_user.email)
    payment_service = PaymentService()
    try:
        return await payment_service.list_charges(customer=customer_id, limit=limit)
    except CheckoutError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/refund")
async def refund_payment(
    body: RefundRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_admin),
    _db: AsyncSession = Depends(get_db),
):
    """Refund a charge or payment intent."""
    payment_service = PaymentService()
    try:
        return await payment_service.refund_payment(
            charge_id=body.charge_id,
            payment_intent_id=body.payment_intent_id,
            amount_cents=body.amount_cents,
        )
    except CheckoutError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/history")
async def payment_history(
    limit: int = 50,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Payment history for the workspace Stripe customer."""
    assert ws_ctx.workspace_id is not None
    customer_id = await _get_or_create_stripe_customer(db, ws_ctx.workspace_id, current_user.email)
    payment_service = PaymentService()
    try:
        return await payment_service.get_payment_history(customer=customer_id, limit=limit)
    except CheckoutError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

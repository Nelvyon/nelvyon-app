"""
Stripe webhook business logic — testable without the HTTP router.

Idempotency: INSERT row (stripe_event_id UNIQUE) → atomic claim received→processing
→ handler → SET processed_at / status processed. Concurrent workers lose claim and get 503.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.billing_catalog import BILLING_MONTHS
from models.stripe_webhook_events import StripeWebhookEvent
from services.billing_sync import (
    build_checkout_activation_update,
    period_fields_from_stripe_invoice,
    period_fields_from_stripe_subscription,
)
from services.billing_plan_validation import is_known_commercial_plan, normalize_plan_id
from services.subscriptions import SubscriptionsService

logger = logging.getLogger(__name__)


BILLING_MONTHS_LOCAL = BILLING_MONTHS


async def _get_event_row(db: AsyncSession, event_id: str) -> Optional[StripeWebhookEvent]:
    r = await db.execute(select(StripeWebhookEvent).where(StripeWebhookEvent.stripe_event_id == event_id))
    return r.scalar_one_or_none()


async def _mark_processed(db: AsyncSession, event_id: str) -> None:
    await db.execute(
        update(StripeWebhookEvent)
        .where(StripeWebhookEvent.stripe_event_id == event_id)
        .values(processed_at=datetime.now(timezone.utc), status="processed", error_message=None)
    )
    await db.commit()


async def _revert_claim_to_received(db: AsyncSession, event_id: str) -> None:
    """Allow Stripe retries when a handler intentionally did not complete (e.g. missing metadata)."""
    await db.execute(
        update(StripeWebhookEvent)
        .where(StripeWebhookEvent.stripe_event_id == event_id, StripeWebhookEvent.status == "processing")
        .values(status="received")
    )
    await db.commit()


async def _mark_error_note(db: AsyncSession, event_id: str, msg: str) -> None:
    try:
        await db.execute(
            update(StripeWebhookEvent)
            .where(StripeWebhookEvent.stripe_event_id == event_id)
            .values(error_message=msg[:2000])
        )
        await db.commit()
    except Exception:
        await db.rollback()


async def process_stripe_event(db: AsyncSession, event: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    Run webhook handlers with idempotency.

    Returns:
        (outcome, payload) where outcome includes 'duplicate' | 'ok' | 'unhandled' | 'error' | 'retry'
    """
    event_id = event.get("id") or ""
    event_type = event.get("type") or ""
    data_object = event.get("data", {}).get("object", {})

    if not event_id:
        logger.error("stripe.webhook event without id")
        return "error", {"detail": "missing event id"}

    row = await _get_event_row(db, event_id)
    if row and row.processed_at is not None:
        logger.info(
            "stripe.webhook duplicate skipped",
            extra={"stripe_event_id": event_id, "event_type": event_type},
        )
        return "duplicate", {"status": "duplicate", "stripe_event_id": event_id, "event_type": event_type}

    if row is None:
        try:
            db.add(
                StripeWebhookEvent(
                    stripe_event_id=event_id,
                    event_type=event_type,
                    status="received",
                    received_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()
        except IntegrityError:
            await db.rollback()
            row = await _get_event_row(db, event_id)
            if row and row.processed_at is not None:
                return "duplicate", {"status": "duplicate", "stripe_event_id": event_id, "event_type": event_type}

    # Single-flight: only one worker moves received → processing (avoids double handler runs).
    claim = await db.execute(
        update(StripeWebhookEvent)
        .where(
            StripeWebhookEvent.stripe_event_id == event_id,
            StripeWebhookEvent.status == "received",
            StripeWebhookEvent.processed_at.is_(None),
        )
        .values(status="processing")
    )
    await db.commit()
    rc = getattr(claim, "rowcount", None)
    if (rc if rc is not None else 0) == 0:
        row = await _get_event_row(db, event_id)
        if row and row.processed_at is not None:
            return "duplicate", {"status": "duplicate", "stripe_event_id": event_id, "event_type": event_type}
        if row and row.status == "processing":
            logger.warning(
                "stripe.webhook claim lost or in-flight",
                extra={"stripe_event_id": event_id, "event_type": event_type},
            )
            return "retry", {
                "detail": "Event in progress or claimed by another worker",
                "stripe_event_id": event_id,
            }
        return "duplicate", {"status": "duplicate", "stripe_event_id": event_id, "event_type": event_type}

    sub_service = SubscriptionsService(db)

    try:
        checkout_effect: Optional[bool] = None
        if event_type == "checkout.session.completed":
            checkout_effect = await _handle_checkout_completed(sub_service, data_object)
        elif event_type == "invoice.payment_succeeded":
            await _handle_payment_succeeded(sub_service, data_object)
        elif event_type == "invoice.payment_failed":
            await _handle_payment_failed(sub_service, data_object)
        elif event_type in ("customer.subscription.deleted", "customer.subscription.canceled"):
            await _handle_subscription_cancelled(sub_service, data_object)
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(sub_service, data_object)
        else:
            logger.info(
                "stripe.webhook unhandled event type",
                extra={"stripe_event_id": event_id, "event_type": event_type},
            )
            await _mark_processed(db, event_id)
            return "unhandled", {"status": "unhandled", "event": event_type, "stripe_event_id": event_id}

        if checkout_effect is False:
            await _revert_claim_to_received(db, event_id)
            return "retry", {
                "detail": "checkout.session.completed did not apply; metadata or subscription row missing",
                "stripe_event_id": event_id,
            }

        await _mark_processed(db, event_id)
        logger.info(
            "stripe.webhook processed",
            extra={"stripe_event_id": event_id, "event_type": event_type},
        )
        return "ok", {"status": "ok", "stripe_event_id": event_id, "event_type": event_type}

    except Exception as e:
        logger.error(
            "stripe.webhook handler failed",
            extra={"stripe_event_id": event_id, "event_type": event_type, "error": str(e)},
            exc_info=True,
        )
        await _mark_error_note(db, event_id, str(e))
        raise


async def _handle_checkout_completed(sub_service: SubscriptionsService, session: dict) -> bool:
    session_id = session.get("id", "")
    metadata = session.get("metadata", {}) or {}
    user_id = metadata.get("user_id", "")
    workspace_raw = metadata.get("workspace_id", "")
    plan_id = metadata.get("plan_id", "")
    billing_cycle = metadata.get("billing_cycle", "monthly")
    stripe_sub_id = session.get("subscription") or ""

    if not user_id:
        logger.warning("checkout.session.completed without user_id in metadata: %s", session_id)
        return False

    workspace_id: Optional[int] = None
    if workspace_raw is not None and str(workspace_raw).strip() != "":
        try:
            workspace_id = int(workspace_raw)
        except (TypeError, ValueError):
            logger.error("checkout.session.completed invalid workspace_id: %s", workspace_raw)
            return False

    qdict = {"stripe_session_id": session_id}
    if workspace_id is not None:
        subs = await sub_service.get_list(
            user_id=user_id,
            workspace_id=workspace_id,
            query_dict=qdict,
            limit=1,
        )
    else:
        subs = await sub_service.get_list(user_id=user_id, query_dict=qdict, limit=1)

    now = datetime.now(timezone.utc)
    activation = await build_checkout_activation_update(session, billing_cycle, str(stripe_sub_id) if stripe_sub_id else "")

    if subs["items"]:
        sub = subs["items"][0]
        await sub_service.update(
            sub.id,
            activation,
            user_id=user_id,
            workspace_id=sub.workspace_id,
        )
        logger.info("Subscription %s activated for user %s plan %s", sub.id, user_id, plan_id)
        return True

    if workspace_id is None:
        logger.error(
            "checkout.session.completed: no pending row and no workspace_id in metadata session=%s",
            session_id,
        )
        return False

    pid = normalize_plan_id(plan_id) if plan_id else "starter"
    if not is_known_commercial_plan(pid):
        logger.warning("checkout.session.completed unknown plan_id=%s; using starter", plan_id)
        pid = "starter"

    create_row = {
        "workspace_id": workspace_id,
        "plan_id": pid,
        "billing_cycle": billing_cycle,
        "stripe_session_id": session_id,
        "amount_paid": (session.get("amount_total", 0) or 0) / 100,
        "currency": session.get("currency", "eur"),
        "created_at": activation.get("started_at", now),
    }
    create_row.update(activation)
    create_row["created_at"] = activation.get("started_at", now)

    await sub_service.create(create_row, user_id=user_id)
    logger.info("New subscription created from webhook for user %s workspace %s", user_id, workspace_id)
    return True


async def _handle_payment_succeeded(sub_service: SubscriptionsService, invoice: dict) -> None:
    stripe_sub_id = invoice.get("subscription", "")
    if not stripe_sub_id:
        return

    subs = await sub_service.get_list(query_dict={"stripe_subscription_id": stripe_sub_id}, limit=1)

    if not subs["items"]:
        logger.warning("No subscription found for stripe_subscription_id: %s", stripe_sub_id)
        return

    sub = subs["items"][0]
    billing_cycle = sub.billing_cycle or "monthly"
    now = datetime.now(timezone.utc)
    inv_pf = period_fields_from_stripe_invoice(invoice)
    if not inv_pf.get("current_period_end"):
        months = BILLING_MONTHS_LOCAL.get(billing_cycle, 1)
        fallback_end = now + timedelta(days=months * 30)
        inv_pf = {
            "current_period_start": now,
            "current_period_end": fallback_end,
            "expires_at": fallback_end,
        }

    await sub_service.update(
        sub.id,
        {
            "status": "active",
            "amount_paid": (invoice.get("amount_paid", 0) or 0) / 100,
            "updated_at": now,
            **inv_pf,
        },
        user_id=sub.user_id,
        workspace_id=sub.workspace_id,
    )
    logger.info("Subscription %s renewed; period_end=%s", sub.id, inv_pf.get("current_period_end"))


async def _handle_payment_failed(sub_service: SubscriptionsService, invoice: dict) -> None:
    stripe_sub_id = invoice.get("subscription", "")
    if not stripe_sub_id:
        return

    subs = await sub_service.get_list(query_dict={"stripe_subscription_id": stripe_sub_id}, limit=1)

    if not subs["items"]:
        return

    sub = subs["items"][0]
    await sub_service.update(
        sub.id,
        {
            "status": "past_due",
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=sub.user_id,
        workspace_id=sub.workspace_id,
    )
    logger.info("Subscription %s marked as past_due (payment failed)", sub.id)


async def _handle_subscription_cancelled(sub_service: SubscriptionsService, subscription: dict) -> None:
    stripe_sub_id = subscription.get("id", "")
    if not stripe_sub_id:
        return

    subs = await sub_service.get_list(query_dict={"stripe_subscription_id": stripe_sub_id}, limit=1)

    if not subs["items"]:
        return

    sub = subs["items"][0]
    await sub_service.update(
        sub.id,
        {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=sub.user_id,
        workspace_id=sub.workspace_id,
    )
    logger.info("Subscription %s cancelled", sub.id)


async def _handle_subscription_updated(sub_service: SubscriptionsService, subscription: dict) -> None:
    stripe_sub_id = subscription.get("id", "")
    stripe_status = subscription.get("status", "")
    if not stripe_sub_id:
        return

    subs = await sub_service.get_list(query_dict={"stripe_subscription_id": stripe_sub_id}, limit=1)

    if not subs["items"]:
        return

    sub = subs["items"][0]
    status_map = {
        "active": "active",
        "past_due": "past_due",
        "canceled": "cancelled",
        "unpaid": "past_due",
        "trialing": "active",
        "incomplete": "pending",
        "incomplete_expired": "cancelled",
    }
    new_status = status_map.get(stripe_status, sub.status)
    period_update = period_fields_from_stripe_subscription(subscription)

    await sub_service.update(
        sub.id,
        {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc),
            **period_update,
        },
        user_id=sub.user_id,
        workspace_id=sub.workspace_id,
    )
    logger.info("Subscription %s updated to status: %s", sub.id, new_status)

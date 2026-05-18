"""
Shared subscription write-path from Stripe (checkout verify + webhooks).

Canonical billing period end: current_period_end (from Stripe). expires_at is kept in sync
as a legacy mirror where writes occur in this module.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

import stripe

from core.billing_catalog import BILLING_MONTHS
from models.subscriptions import Subscriptions
from services.payment import PaymentService
from services.subscriptions import SubscriptionsService

logger = logging.getLogger(__name__)


def utc_from_unix(ts: Optional[Any]) -> Optional[datetime]:
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


def stripe_object_to_dict(obj: Any) -> Dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    try:
        return dict(obj)
    except Exception:
        return {}


def period_fields_from_stripe_subscription(sub: Dict[str, Any]) -> Dict[str, Any]:
    """Map Stripe Subscription JSON to DB columns."""
    out: Dict[str, Any] = {}
    dt_start = utc_from_unix(sub.get("current_period_start"))
    dt_end = utc_from_unix(sub.get("current_period_end"))
    if dt_start is not None:
        out["current_period_start"] = dt_start
    if dt_end is not None:
        out["current_period_end"] = dt_end
        out["expires_at"] = dt_end
    return out


def period_fields_from_stripe_invoice(invoice: Dict[str, Any]) -> Dict[str, Any]:
    """Use invoice billing period (subscription cycle) when present."""
    out: Dict[str, Any] = {}
    dt_start = utc_from_unix(invoice.get("period_start"))
    dt_end = utc_from_unix(invoice.get("period_end"))
    if dt_start is not None:
        out["current_period_start"] = dt_start
    if dt_end is not None:
        out["current_period_end"] = dt_end
        out["expires_at"] = dt_end
    return out


def fallback_period_fields(billing_cycle: str, now: Optional[datetime] = None) -> Dict[str, Any]:
    """When Stripe subscription is not available yet (should be rare)."""
    now = now or datetime.now(timezone.utc)
    months = BILLING_MONTHS.get(billing_cycle, 1)
    end = now + timedelta(days=months * 30)
    return {
        "current_period_start": now,
        "current_period_end": end,
        "expires_at": end,
    }


async def retrieve_stripe_subscription(subscription_id: str) -> Dict[str, Any]:
    await PaymentService._auto_reload_stripe_config()
    obj = await stripe.Subscription.retrieve_async(subscription_id)
    return stripe_object_to_dict(obj)


async def period_fields_for_checkout_session(
    session: Dict[str, Any],
    billing_cycle: str,
) -> Dict[str, Any]:
    """
    Resolve period columns from a Checkout Session (webhook or API).
    Prefers expanded subscription on the session; otherwise retrieves by subscription id.
    """
    now = datetime.now(timezone.utc)
    raw_sub = session.get("subscription")
    if isinstance(raw_sub, dict) and raw_sub.get("id"):
        return period_fields_from_stripe_subscription(raw_sub)
    if raw_sub is not None and not isinstance(raw_sub, str):
        return period_fields_from_stripe_subscription(stripe_object_to_dict(raw_sub))

    stripe_sub_id = session.get("subscription") or ""
    if isinstance(stripe_sub_id, str) and stripe_sub_id.startswith("sub_"):
        try:
            sub_full = await retrieve_stripe_subscription(stripe_sub_id)
            pf = period_fields_from_stripe_subscription(sub_full)
            if pf:
                return pf
        except Exception as e:
            logger.warning("billing_sync: could not retrieve subscription %s: %s", stripe_sub_id, e)

    return fallback_period_fields(billing_cycle, now)


async def build_checkout_activation_update(
    session: Dict[str, Any],
    billing_cycle: str,
    stripe_sub_id: str,
) -> Dict[str, Any]:
    """Fields for subscriptions.update / create after checkout completes."""
    now = datetime.now(timezone.utc)
    periods = await period_fields_for_checkout_session(session, billing_cycle)
    started = periods.get("current_period_start") or now
    update: Dict[str, Any] = {
        "status": "active",
        "stripe_subscription_id": str(stripe_sub_id) if stripe_sub_id else "",
        "started_at": started,
        "updated_at": now,
    }
    update.update(periods)
    return update


async def apply_verified_checkout_session(
    sub_service: SubscriptionsService,
    *,
    checkout_session_id: str,
    user_id: str,
    workspace_id: int,
) -> Tuple[Optional[Subscriptions], Optional[str]]:
    """
    After redirect: load Checkout Session from Stripe with expanded subscription and
    update the workspace subscription row. Returns (subscription_row, None) on success,
    or (None, error_detail) on failure.
    """
    subs = await sub_service.get_list(
        user_id=user_id,
        workspace_id=workspace_id,
        query_dict={"stripe_session_id": checkout_session_id},
        limit=1,
    )
    if not subs["items"]:
        return None, "no_subscription_row"

    sub_row = subs["items"][0]

    await PaymentService._auto_reload_stripe_config()
    sess = await stripe.checkout.Session.retrieve_async(checkout_session_id, expand=["subscription"])

    payment_status = getattr(sess, "payment_status", None) or ""
    if payment_status != "paid":
        return None, f"payment_not_paid:{payment_status}"

    meta = stripe_object_to_dict(getattr(sess, "metadata", None) or {})
    billing_cycle = meta.get("billing_cycle") or sub_row.billing_cycle or "monthly"

    stripe_sub_raw = getattr(sess, "subscription", None)
    stripe_sub_id = ""
    if isinstance(stripe_sub_raw, str):
        stripe_sub_id = stripe_sub_raw
    elif stripe_sub_raw is not None:
        stripe_sub_id = str(getattr(stripe_sub_raw, "id", "") or "")

    sess_dict = stripe_object_to_dict(sess)
    update = await build_checkout_activation_update(sess_dict, billing_cycle, stripe_sub_id)

    await sub_service.update(
        sub_row.id,
        update,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    return sub_row, None

"""Unit tests for billing_sync (Stripe period mapping; no network)."""

from services.billing_sync import (
    period_fields_from_stripe_invoice,
    period_fields_from_stripe_subscription,
)


def test_period_fields_from_stripe_subscription_sets_expires_mirror():
    sub = {"current_period_start": 1700000000, "current_period_end": 1702592000}
    d = period_fields_from_stripe_subscription(sub)
    assert d.get("current_period_start") is not None
    assert d.get("current_period_end") is not None
    assert d.get("expires_at") == d.get("current_period_end")


def test_period_fields_from_stripe_invoice():
    inv = {"period_start": 1700000000, "period_end": 1702592000}
    d = period_fields_from_stripe_invoice(inv)
    assert "current_period_end" in d
    assert d["expires_at"] == d["current_period_end"]

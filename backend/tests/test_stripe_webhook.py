"""
Tests for Stripe webhook: signature, idempotency, HTTP codes.
"""

from typing import Any, Dict, Optional
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from stripe import SignatureVerificationError


@pytest.fixture
def webhook_client(setup_database):
    """ASGI client without auth (Stripe calls the webhook directly)."""
    from main import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


def _fake_event(event_id: str, event_type: str, obj: Optional[Dict[str, Any]] = None) -> dict:
    return {"id": event_id, "type": event_type, "data": {"object": obj or {}}}


@pytest.mark.asyncio
async def test_webhook_rejects_invalid_signature(webhook_client: AsyncClient):
    with patch(
        "stripe.Webhook.construct_event",
        side_effect=SignatureVerificationError("bad sig", None, None),
    ):
        r = await webhook_client.post(
            "/api/v1/stripe/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=bad"},
        )
    assert r.status_code == 400
    assert r.json().get("detail") == "Invalid signature"


@pytest.mark.asyncio
async def test_webhook_duplicate_event_id_only_processes_once(webhook_client: AsyncClient):
    """Same event.id twice: second response is still 200 with duplicate semantics."""
    ev = _fake_event("evt_dup_1", "customer.subscription.updated", {"id": "sub_x", "status": "active"})
    with patch("stripe.Webhook.construct_event", return_value=ev):
        r1 = await webhook_client.post(
            "/api/v1/stripe/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=x"},
        )
        r2 = await webhook_client.post(
            "/api/v1/stripe/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=x"},
        )
    assert r1.status_code == 200
    assert r2.status_code == 200
    b1 = r1.json()
    b2 = r2.json()
    assert b1.get("status") == "ok"
    assert b2.get("status") == "duplicate"


@pytest.mark.asyncio
async def test_webhook_checkout_without_user_metadata_returns_503_for_retry(webhook_client: AsyncClient):
    """No user_id / no subscription row: do not mark processed; Stripe should retry after fix."""
    ev = _fake_event("evt_checkout_retry", "checkout.session.completed", {"id": "cs_1", "metadata": {}})
    with patch("stripe.Webhook.construct_event", return_value=ev):
        r = await webhook_client.post(
            "/api/v1/stripe/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=x"},
        )
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_webhook_unhandled_event_type_marks_processed(webhook_client: AsyncClient):
    ev = _fake_event("evt_unhandled_1", "billing_portal.session.created", {})
    with patch("stripe.Webhook.construct_event", return_value=ev):
        r = await webhook_client.post(
            "/api/v1/stripe/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=x"},
        )
    assert r.status_code == 200
    assert r.json().get("status") == "unhandled"


@pytest.mark.asyncio
async def test_webhook_processing_error_returns_500(webhook_client: AsyncClient):
    """RuntimeError dentro del procesador debe llegar como 500 (router captura Exception)."""
    ev = _fake_event("evt_fail_runtime", "billing_portal.session.created", {})
    with patch("stripe.Webhook.construct_event", return_value=ev):
        with patch(
            "routers.stripe_webhook.process_stripe_event",
            side_effect=RuntimeError("db down"),
        ):
            r = await webhook_client.post(
                "/api/v1/stripe/webhook",
                content=b"{}",
                headers={"stripe-signature": "t=1,v1=x"},
            )
    assert r.status_code == 500

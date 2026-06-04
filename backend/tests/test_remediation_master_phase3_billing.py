"""
NELVYON-REMEDIATION-1 FASE 3 — billing_usage + plan runtime + Stripe webhook feliz.

- Plan activo vía suscripción `active` alineado con `get_active_plan_id_for_workspace`.
- Partner: módulos CRM desactivados → límites de medidor 0 donde aplica.
- Webhook checkout con fila pending + metadata segura → 200 ok (Stripe mock).
- Suscripciones HTTP: plan_id inválido en PUT → 400.
"""

from datetime import datetime, timezone
from typing import Any, Dict
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

UID = "test-user-00000000-0000-0000-0000-000000000001"


def _fake_checkout_event(event_id: str, session_obj: Dict[str, Any]) -> dict:
    return {"id": event_id, "type": "checkout.session.completed", "data": {"object": session_obj}}


@pytest.mark.asyncio
async def test_billing_usage_plan_matches_latest_active_subscription(
    client: AsyncClient, auth_headers: dict, db_session
):
    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'starter', 'monthly', 'active', 0, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'pro', 'monthly', 'active', 99, 'eur', :ts2, :ts2)
            """
        ),
        {"uid": UID, "ts2": now},
    )
    await db_session.commit()

    r = await client.get("/api/v1/billing/usage", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body.get("plan_id") == "pro"


@pytest.mark.asyncio
async def test_billing_usage_partner_contact_limit_zero(
    client: AsyncClient, auth_headers: dict, db_session
):
    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'partner', 'monthly', 'active', 0, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    r = await client.get("/api/v1/billing/usage", headers=auth_headers)
    assert r.status_code == 200
    meters = {m["id"]: m for m in r.json().get("meters", [])}
    assert meters["contacts"]["limit"] == 0
    assert meters["campaigns"]["limit"] == 0
    assert meters["helpdesk"]["limit"] == 0


@pytest.mark.asyncio
async def test_billing_usage_contacts_count_workspace_scoped(
    client: AsyncClient, auth_headers: dict, db_session
):
    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id IN (1, 2)"))
    await db_session.execute(text("DELETE FROM contacts WHERE workspace_id IN (1, 2)"))
    await db_session.execute(text("DELETE FROM crm_contacts WHERE workspace_id IN (1, 2)"))
    await db_session.commit()
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'enterprise', 'monthly', 'active', 0, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.execute(
        text(
            """
            INSERT INTO contacts (user_id, workspace_id, first_name, email, created_at, updated_at)
            VALUES (:uid, 1, 'A', 'a1@test.com', :ts, :ts), (:uid, 1, 'B', 'b1@test.com', :ts, :ts),
                   (:uid, 2, 'C', 'c2@test.com', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    r = await client.get("/api/v1/billing/usage", headers=auth_headers)
    assert r.status_code == 200
    meters = {m["id"]: m for m in r.json().get("meters", [])}
    assert meters["contacts"]["current"] == 2


@pytest.mark.asyncio
async def test_subscriptions_put_invalid_plan_400(client: AsyncClient, auth_headers: dict, db_session):
    from models.subscriptions import Subscriptions

    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()
    row = Subscriptions(
        user_id=UID,
        workspace_id=1,
        plan_id="starter",
        billing_cycle="monthly",
        status="active",
        amount_paid=0.0,
        currency="eur",
        created_at=now,
        updated_at=now,
    )
    db_session.add(row)
    await db_session.commit()
    await db_session.refresh(row)
    sid = row.id

    r = await client.put(
        f"/api/v1/entities/subscriptions/{sid}",
        headers=auth_headers,
        json={"plan_id": "plan_inventado"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_webhook_checkout_completed_ok_with_pending_row(setup_database, db_session):
    from main import app

    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM stripe_webhook_events WHERE stripe_event_id LIKE 'evt_phase3%'"))
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1 AND stripe_session_id = 'cs_phase3_ok'"))
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, stripe_session_id, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'starter', 'monthly', 'pending', 'cs_phase3_ok', 0, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    session_obj: Dict[str, Any] = {
        "id": "cs_phase3_ok",
        "metadata": {
            "user_id": UID,
            "workspace_id": "1",
            "plan_id": "pro",
            "billing_cycle": "monthly",
        },
        "subscription": "sub_phase3_test",
        "amount_total": 7900,
        "currency": "eur",
    }
    ev = _fake_checkout_event("evt_phase3_checkout_ok", session_obj)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as webhook_client:
        with patch("stripe.Webhook.construct_event", return_value=ev):
            with patch(
                "services.billing_sync.period_fields_for_checkout_session",
                new_callable=AsyncMock,
                return_value={
                    "current_period_start": now,
                    "current_period_end": now,
                    "expires_at": now,
                },
            ):
                r = await webhook_client.post(
                    "/api/v1/stripe/webhook",
                    content=b"{}",
                    headers={"stripe-signature": "t=1,v1=x"},
                )
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


@pytest.mark.asyncio
async def test_webhook_metadata_incoherent_workspace_id_returns_retry_503(setup_database, db_session):
    """workspace_id no entero en metadata → handler devuelve False → 503 retry."""
    from main import app

    await db_session.execute(text("DELETE FROM stripe_webhook_events WHERE stripe_event_id = 'evt_phase3_bad_ws'"))
    await db_session.commit()

    session_obj: Dict[str, Any] = {
        "id": "cs_bad_ws",
        "metadata": {
            "user_id": UID,
            "workspace_id": "not-an-int",
            "plan_id": "starter",
            "billing_cycle": "monthly",
        },
        "subscription": "sub_x",
    }
    ev = _fake_checkout_event("evt_phase3_bad_ws", session_obj)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as webhook_client:
        with patch("stripe.Webhook.construct_event", return_value=ev):
            r = await webhook_client.post(
                "/api/v1/stripe/webhook",
                content=b"{}",
                headers={"stripe-signature": "t=1,v1=x"},
            )
    assert r.status_code == 503

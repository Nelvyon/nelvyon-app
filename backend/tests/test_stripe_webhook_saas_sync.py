"""
Stripe webhook → saas_tenants.plan sync (Commit 3.2).

Covers flag OFF/ON, missing tenant, sync internal errors, checkout.session.completed,
and invoice.payment_failed without breaking the primary webhook path.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from services import stripe_webhook_processor as swp
from services.saas_billing_sync import SaasBillingSyncResult

UID = "test-user-00000000-0000-0000-0000-000000000001"
TENANT_ID = "11111111-1111-1111-1111-111111111111"


def _fake_event(event_id: str, event_type: str, obj: Dict[str, Any]) -> dict:
    return {"id": event_id, "type": event_type, "data": {"object": obj}}


async def _ensure_saas_tenants_table(db_session) -> None:
    await db_session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS saas_tenants (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                workspace_id INTEGER,
                company_name TEXT NOT NULL,
                industry TEXT NOT NULL,
                plan TEXT NOT NULL DEFAULT 'starter',
                website TEXT,
                phone TEXT,
                employees TEXT,
                onboarding_completed INTEGER NOT NULL DEFAULT 1,
                onboarding_step INTEGER NOT NULL DEFAULT 4,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
    )
    await db_session.commit()


async def _seed_saas_tenant(db_session, *, plan: str = "starter", workspace_id: int = 1) -> None:
    await _ensure_saas_tenants_table(db_session)
    now = datetime.now(timezone.utc).isoformat()
    await db_session.execute(text("DELETE FROM saas_tenants WHERE workspace_id = :ws"), {"ws": workspace_id})
    await db_session.execute(
        text(
            """
            INSERT INTO saas_tenants
            (id, user_id, workspace_id, company_name, industry, plan, onboarding_completed, onboarding_step, created_at, updated_at)
            VALUES (:id, :uid, :ws, 'Acme', 'SaaS', :plan, 1, 4, :ts, :ts)
            """
        ),
        {"id": TENANT_ID, "uid": UID, "ws": workspace_id, "plan": plan, "ts": now},
    )
    await db_session.commit()


async def _read_tenant_plan(db_session, workspace_id: int = 1) -> str | None:
    r = await db_session.execute(
        text("SELECT plan FROM saas_tenants WHERE workspace_id = :ws LIMIT 1"),
        {"ws": workspace_id},
    )
    row = r.fetchone()
    return str(row[0]) if row else None


@pytest.fixture
def sync_flag_off(monkeypatch):
    # Explicitly disable (default is now ON — set to "false" to opt out).
    monkeypatch.setenv("SAAS_BILLING_SYNC_ENABLED", "false")


@pytest.fixture
def sync_flag_on(monkeypatch):
    monkeypatch.setenv("SAAS_BILLING_SYNC_ENABLED", "true")


@pytest.mark.asyncio
async def test_maybe_sync_flag_off_does_not_call_sync(db_session, sync_flag_off):
    with patch(
        "services.stripe_webhook_processor.sync_from_subscription_hint",
        new_callable=AsyncMock,
    ) as sync_mock:
        await swp._maybe_sync_saas_tenant_plan(
            db_session,
            workspace_id=1,
            plan_id="pro",
            status="active",
        )
    sync_mock.assert_not_called()


@pytest.mark.asyncio
async def test_maybe_sync_flag_on_calls_apply(db_session, sync_flag_on):
    with patch(
        "services.stripe_webhook_processor.sync_from_subscription_hint",
        new_callable=AsyncMock,
        return_value=SaasBillingSyncResult(
            mode="apply",
            tenant_id=TENANT_ID,
            workspace_id=1,
            owner_user_id=UID,
            previous_plan="starter",
            target_plan="pro",
            subscription_plan_id="pro",
            subscription_status="active",
            synced=True,
            skipped=False,
        ),
    ) as sync_mock:
        await swp._maybe_sync_saas_tenant_plan(
            db_session,
            workspace_id=1,
            plan_id="pro",
            status="active",
        )
    sync_mock.assert_awaited_once_with(
        db_session,
        workspace_id=1,
        plan_id="pro",
        status="active",
        mode="apply",
    )


@pytest.mark.asyncio
async def test_maybe_sync_missing_tenant_does_not_raise(db_session, sync_flag_on):
    await _ensure_saas_tenants_table(db_session)
    await db_session.execute(text("DELETE FROM saas_tenants WHERE workspace_id = 1"))
    await db_session.execute(
        text("DELETE FROM stripe_webhook_events WHERE stripe_event_id = 'evt_saas_no_tenant'")
    )
    await db_session.execute(
        text("DELETE FROM subscriptions WHERE workspace_id = 1 AND stripe_session_id = 'cs_no_tenant'")
    )
    await db_session.commit()
    now = datetime.now(timezone.utc)
    with patch(
        "services.billing_sync.period_fields_for_checkout_session",
        new_callable=AsyncMock,
        return_value={
            "status": "active",
            "current_period_start": now,
            "current_period_end": now,
            "expires_at": now,
        },
    ):
        outcome, body = await swp.process_stripe_event(
            db_session,
            _fake_event(
                "evt_saas_no_tenant",
                "checkout.session.completed",
                {
                    "id": "cs_no_tenant",
                    "metadata": {
                        "user_id": UID,
                        "workspace_id": "1",
                        "plan_id": "pro",
                        "billing_cycle": "monthly",
                    },
                    "subscription": "sub_no_tenant",
                    "amount_total": 7900,
                    "currency": "eur",
                },
            ),
        )
    assert outcome == "ok"
    assert body.get("status") == "ok"
    assert await _read_tenant_plan(db_session) is None


@pytest.mark.asyncio
async def test_maybe_sync_internal_error_never_raises(db_session, sync_flag_on):
    with patch(
        "services.stripe_webhook_processor.sync_from_subscription_hint",
        new_callable=AsyncMock,
        side_effect=RuntimeError("sync db exploded"),
    ):
        await swp._maybe_sync_saas_tenant_plan(
            db_session,
            workspace_id=1,
            plan_id="pro",
            status="active",
        )


@pytest.mark.asyncio
async def test_checkout_completed_flag_off_webhook_ok_sync_not_called(setup_database, db_session, sync_flag_off):
    from main import app

    now = datetime.now(timezone.utc)
    await db_session.execute(
        text("DELETE FROM stripe_webhook_events WHERE stripe_event_id = 'evt_saas_flag_off'")
    )
    await db_session.execute(
        text("DELETE FROM subscriptions WHERE workspace_id = 1 AND stripe_session_id = 'cs_saas_flag_off'")
    )
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, stripe_session_id, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'starter', 'monthly', 'pending', 'cs_saas_flag_off', 0, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    session_obj: Dict[str, Any] = {
        "id": "cs_saas_flag_off",
        "metadata": {
            "user_id": UID,
            "workspace_id": "1",
            "plan_id": "pro",
            "billing_cycle": "monthly",
        },
        "subscription": "sub_saas_flag_off",
        "amount_total": 7900,
        "currency": "eur",
    }
    ev = _fake_event("evt_saas_flag_off", "checkout.session.completed", session_obj)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as webhook_client:
        with patch("stripe.Webhook.construct_event", return_value=ev):
            with patch(
                "services.billing_sync.period_fields_for_checkout_session",
                new_callable=AsyncMock,
                return_value={
                    "status": "active",
                    "current_period_start": now,
                    "current_period_end": now,
                    "expires_at": now,
                },
            ):
                with patch(
                    "services.stripe_webhook_processor.sync_from_subscription_hint",
                    new_callable=AsyncMock,
                ) as sync_mock:
                    r = await webhook_client.post(
                        "/api/v1/stripe/webhook",
                        content=b"{}",
                        headers={"stripe-signature": "t=1,v1=x"},
                    )
    assert r.status_code == 200
    assert r.json().get("status") == "ok"
    sync_mock.assert_not_called()


@pytest.mark.asyncio
async def test_checkout_completed_flag_on_updates_saas_tenant_plan(setup_database, db_session, sync_flag_on):
    from main import app

    now = datetime.now(timezone.utc)
    await _seed_saas_tenant(db_session, plan="starter")
    await db_session.execute(
        text("DELETE FROM stripe_webhook_events WHERE stripe_event_id = 'evt_saas_flag_on'")
    )
    await db_session.execute(
        text("DELETE FROM subscriptions WHERE workspace_id = 1 AND stripe_session_id = 'cs_saas_flag_on'")
    )
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, stripe_session_id, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'starter', 'monthly', 'pending', 'cs_saas_flag_on', 0, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    session_obj: Dict[str, Any] = {
        "id": "cs_saas_flag_on",
        "metadata": {
            "user_id": UID,
            "workspace_id": "1",
            "plan_id": "pro",
            "billing_cycle": "monthly",
        },
        "subscription": "sub_saas_flag_on",
        "amount_total": 7900,
        "currency": "eur",
    }
    ev = _fake_event("evt_saas_flag_on", "checkout.session.completed", session_obj)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as webhook_client:
        with patch("stripe.Webhook.construct_event", return_value=ev):
            with patch(
                "services.billing_sync.period_fields_for_checkout_session",
                new_callable=AsyncMock,
                return_value={
                    "status": "active",
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
    assert await _read_tenant_plan(db_session) == "pro"


@pytest.mark.asyncio
async def test_checkout_completed_sync_error_still_marks_webhook_ok(setup_database, db_session, sync_flag_on):
    now = datetime.now(timezone.utc)
    await db_session.execute(
        text("DELETE FROM stripe_webhook_events WHERE stripe_event_id = 'evt_saas_sync_err'")
    )
    await db_session.execute(
        text("DELETE FROM subscriptions WHERE workspace_id = 1 AND stripe_session_id = 'cs_saas_sync_err'")
    )
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, stripe_session_id, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'starter', 'monthly', 'pending', 'cs_saas_sync_err', 0, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    session_obj: Dict[str, Any] = {
        "id": "cs_saas_sync_err",
        "metadata": {
            "user_id": UID,
            "workspace_id": "1",
            "plan_id": "pro",
            "billing_cycle": "monthly",
        },
        "subscription": "sub_saas_sync_err",
        "amount_total": 7900,
        "currency": "eur",
    }

    with patch(
        "services.stripe_webhook_processor.sync_from_subscription_hint",
        new_callable=AsyncMock,
        side_effect=RuntimeError("sync failed"),
    ):
        outcome, body = await swp.process_stripe_event(
            db_session,
            _fake_event("evt_saas_sync_err", "checkout.session.completed", session_obj),
        )
    assert outcome == "ok"
    assert body.get("status") == "ok"


@pytest.mark.asyncio
async def test_invoice_payment_failed_flag_on_syncs_past_due_plan(setup_database, db_session, sync_flag_on):
    now = datetime.now(timezone.utc)
    await _seed_saas_tenant(db_session, plan="starter")
    await db_session.execute(
        text("DELETE FROM stripe_webhook_events WHERE stripe_event_id = 'evt_saas_pay_fail'")
    )
    await db_session.execute(
        text("DELETE FROM subscriptions WHERE stripe_subscription_id = 'sub_saas_pay_fail'")
    )
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, stripe_subscription_id, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'pro', 'monthly', 'active', 'sub_saas_pay_fail', 99, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    invoice_obj: Dict[str, Any] = {"subscription": "sub_saas_pay_fail", "amount_paid": 0}
    outcome, body = await swp.process_stripe_event(
        db_session,
        _fake_event("evt_saas_pay_fail", "invoice.payment_failed", invoice_obj),
    )
    assert outcome == "ok"
    assert body.get("status") == "ok"
    assert await _read_tenant_plan(db_session) == "pro"

    sub_status = await db_session.execute(
        text("SELECT status FROM subscriptions WHERE stripe_subscription_id = 'sub_saas_pay_fail' LIMIT 1")
    )
    assert sub_status.fetchone()[0] == "past_due"


@pytest.mark.asyncio
async def test_invoice_payment_failed_flag_off_does_not_sync(setup_database, db_session, sync_flag_off):
    now = datetime.now(timezone.utc)
    await _seed_saas_tenant(db_session, plan="starter")
    await db_session.execute(
        text("DELETE FROM stripe_webhook_events WHERE stripe_event_id = 'evt_saas_pay_fail_off'")
    )
    await db_session.execute(
        text("DELETE FROM subscriptions WHERE stripe_subscription_id = 'sub_saas_pay_fail_off'")
    )
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions
            (user_id, workspace_id, plan_id, billing_cycle, status, stripe_subscription_id, amount_paid, currency, created_at, updated_at)
            VALUES (:uid, 1, 'pro', 'monthly', 'active', 'sub_saas_pay_fail_off', 99, 'eur', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    with patch(
        "services.stripe_webhook_processor.sync_from_subscription_hint",
        new_callable=AsyncMock,
    ) as sync_mock:
        outcome, body = await swp.process_stripe_event(
            db_session,
            _fake_event(
                "evt_saas_pay_fail_off",
                "invoice.payment_failed",
                {"subscription": "sub_saas_pay_fail_off"},
            ),
        )
    assert outcome == "ok"
    assert body.get("status") == "ok"
    sync_mock.assert_not_called()
    assert await _read_tenant_plan(db_session) == "starter"

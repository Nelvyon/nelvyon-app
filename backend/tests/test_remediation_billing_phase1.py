"""
NELVYON-REMEDIATION-1 FASE 1 — gaps críticos billing + RBAC en rutas sensibles.

Comprueba: listado global de suscripciones acotado a super_admin,
checkout solo admin de workspace, verify_payment rechaza metadata de workspace ajeno.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from core.auth import create_access_token
from services.payment import CheckoutStatusResponse


def _super_admin_headers() -> dict:
    token = create_access_token(
        {
            "sub": "super-user-00000000-0000-0000-0000-000000000001",
            "email": "super@test.com",
            "name": "Super",
            "role": "super_admin",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "1"}


@pytest.mark.asyncio
async def test_subscriptions_all_unauthenticated_401(client: AsyncClient):
    r = await client.get("/api/v1/entities/subscriptions/all?skip=0&limit=5")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_subscriptions_all_regular_user_403(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/entities/subscriptions/all?skip=0&limit=5", headers=auth_headers)
    assert r.status_code == 403
    assert "super" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_subscriptions_all_super_admin_200(client: AsyncClient, setup_database):
    r = await client.get(
        "/api/v1/entities/subscriptions/all?skip=0&limit=5",
        headers=_super_admin_headers(),
    )
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "total" in body


@pytest.mark.asyncio
async def test_create_payment_session_member_forbidden(client: AsyncClient, member_headers: dict):
    """Workspace member no puede abrir checkout (require_workspace_admin)."""
    r = await client.post(
        "/api/v1/payment/create_payment_session",
        json={
            "plan_id": "starter",
            "billing_cycle": "monthly",
            "success_url": "http://localhost/success?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": "http://localhost/cancel",
        },
        headers=member_headers,
    )
    assert r.status_code == 403
    assert "admin" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_verify_payment_rejects_stripe_metadata_workspace_mismatch(
    client: AsyncClient, auth_headers: dict
):
    """Stripe session metadata.workspace_id distinto de X-Workspace-Id → 403."""
    fake = CheckoutStatusResponse(
        status="complete",
        payment_status="paid",
        amount_total=7900,
        currency="eur",
        metadata={"workspace_id": "999", "plan_id": "starter", "billing_cycle": "monthly"},
    )
    with patch(
        "services.payment.PaymentService.get_checkout_status",
        new_callable=AsyncMock,
        return_value=fake,
    ):
        r = await client.post(
            "/api/v1/payment/verify_payment",
            json={"session_id": "cs_test_ws_mismatch"},
            headers=auth_headers,
        )
    assert r.status_code == 403
    assert "workspace" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_verify_payment_rejects_invalid_plan_in_metadata(client: AsyncClient, auth_headers: dict):
    fake = CheckoutStatusResponse(
        status="complete",
        payment_status="paid",
        amount_total=100,
        currency="eur",
        metadata={"workspace_id": "1", "plan_id": "plan_falso", "billing_cycle": "monthly"},
    )
    with patch(
        "services.payment.PaymentService.get_checkout_status",
        new_callable=AsyncMock,
        return_value=fake,
    ):
        r = await client.post(
            "/api/v1/payment/verify_payment",
            json={"session_id": "cs_test_bad_plan"},
            headers=auth_headers,
        )
    assert r.status_code == 400
    assert "plan" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_billing_catalog_valid_plan_ids_match_pricing_plans():
    from core.billing_catalog import VALID_PLAN_IDS
    from core.pricing_plans import PRICING_PLANS

    assert VALID_PLAN_IDS == frozenset(PRICING_PLANS.keys())

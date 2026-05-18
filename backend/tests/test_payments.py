"""
Tests for payment system endpoints.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from core.auth import create_access_token


@pytest.fixture(autouse=True)
def _mock_stripe_account_retrieve():
    """Avoid real Stripe Account.retrieve during PaymentService bootstrap."""
    with patch("stripe.Account.retrieve_async", new_callable=AsyncMock, return_value=MagicMock()):
        yield


@pytest.mark.asyncio
async def test_get_active_subscription_unauthenticated(client: AsyncClient):
    """Test that subscription endpoint requires auth."""
    response = await client.get("/api/v1/payment/active_subscription")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_active_subscription_authenticated(client: AsyncClient, auth_headers: dict):
    """Test fetching active subscription for authenticated user."""
    response = await client.get("/api/v1/payment/active_subscription", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "has_subscription" in data


@pytest.mark.asyncio
async def test_get_active_subscription_requires_workspace_header(client: AsyncClient):
    """PR #4: workspace-scoped billing — X-Workspace-Id required."""
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    response = await client.get(
        "/api/v1/payment/active_subscription",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "workspace" in response.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_checkout_requires_auth(client: AsyncClient):
    """Test that checkout endpoint requires authentication."""
    response = await client.post(
        "/api/v1/payment/create_payment_session",
        json={
            "plan_id": "starter",
            "billing_cycle": "monthly",
            "success_url": "http://localhost/success",
            "cancel_url": "http://localhost/cancel",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_payment_session_requires_workspace_header(client: AsyncClient):
    """Workspace-scoped checkout requires X-Workspace-Id (require_workspace_admin)."""
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    response = await client.post(
        "/api/v1/payment/create_payment_session",
        json={
            "plan_id": "starter",
            "billing_cycle": "monthly",
            "success_url": "http://localhost/success",
            "cancel_url": "http://localhost/cancel",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "workspace" in response.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_checkout_invalid_plan(client: AsyncClient, auth_headers: dict):
    """Test checkout with invalid plan returns error."""
    response = await client.post(
        "/api/v1/payment/create_payment_session",
        json={
            "plan_id": "nonexistent_plan",
            "billing_cycle": "monthly",
            "success_url": "http://localhost/success",
            "cancel_url": "http://localhost/cancel",
        },
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_checkout_invalid_billing_cycle(client: AsyncClient, auth_headers: dict):
    """Test checkout with invalid billing cycle."""
    response = await client.post(
        "/api/v1/payment/create_payment_session",
        json={
            "plan_id": "starter",
            "billing_cycle": "invalid_cycle",
            "success_url": "http://localhost/success",
            "cancel_url": "http://localhost/cancel",
        },
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_payment_session_success_mocked_stripe(client: AsyncClient, auth_headers: dict):
    """Happy path: subscription Checkout Session created (Stripe API mocked)."""
    mock_session = MagicMock()
    mock_session.id = "cs_test_session_ok"
    mock_session.url = "https://checkout.stripe.com/c/pay/cs_test_session_ok"
    mock_session.client_secret = None

    mock_customer = MagicMock()
    mock_customer.id = "cus_test_customer_ok"

    with patch("stripe.Customer.create_async", new_callable=AsyncMock, return_value=mock_customer):
        with patch("stripe.checkout.Session.create_async", new_callable=AsyncMock, return_value=mock_session):
            response = await client.post(
                "/api/v1/payment/create_payment_session",
                json={
                    "plan_id": "starter",
                    "billing_cycle": "monthly",
                    "success_url": "http://localhost/success?session_id={CHECKOUT_SESSION_ID}",
                    "cancel_url": "http://localhost/cancel",
                },
                headers=auth_headers,
            )
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "cs_test_session_ok"
    assert body["url"].startswith("https://")
    assert body["currency"] == "eur"


@pytest.mark.asyncio
async def test_verify_payment_requires_auth(client: AsyncClient):
    """Test that payment verification requires auth."""
    response = await client.post(
        "/api/v1/payment/verify_payment",
        json={"session_id": "cs_test_fake"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_billing_history_requires_auth(client: AsyncClient):
    """Test that billing history requires auth."""
    response = await client.get("/api/v1/entities/subscriptions?skip=0&limit=10")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_billing_history_authenticated(client: AsyncClient, auth_headers: dict):
    """Test fetching billing history for authenticated user."""
    response = await client.get(
        "/api/v1/entities/subscriptions?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data or isinstance(data, list)


@pytest.mark.asyncio
async def test_get_plans(client: AsyncClient, auth_headers: dict):
    """Test fetching available plans."""
    response = await client.get("/api/v1/payment/plans", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "plans" in data

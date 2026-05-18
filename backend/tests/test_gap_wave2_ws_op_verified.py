"""
Oleada 2 — WS-read / OP-write verificado por HTTP.

Dominios: tenant_management, workspace_management, payments (verify_payment),
subscriptions (CRUD mutaciones), storage (borde API + OSS mockeado),
admin settings (plataforma), auth /me (identidad).

Ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from services.payment import CheckoutStatusResponse


@pytest.mark.asyncio
async def test_tenant_settings_requires_workspace(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/tenant/settings")
    assert r.status_code in (400, 401, 403, 422)
    r2 = await client.get("/api/v1/tenant/settings", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json().get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_tenant_options_requires_workspace(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/tenant/options")
    assert r.status_code in (400, 401, 403, 422)
    r2 = await client.get("/api/v1/tenant/options", headers=auth_headers)
    assert r2.status_code == 200
    assert "timezones" in r2.json()


@pytest.mark.asyncio
async def test_tenant_settings_put_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.put(
        "/api/v1/tenant/settings",
        headers=member_headers,
        json={"primary_color": "#010101"},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_tenant_settings_put_owner_ok(client: AsyncClient, auth_headers: dict):
    suffix = uuid.uuid4().hex[:6]
    r = await client.put(
        "/api/v1/tenant/settings",
        headers=auth_headers,
        json={"primary_color": f"#{suffix[:6]}"},
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_workspace_update_requires_workspace(client: AsyncClient, auth_headers: dict):
    token = auth_headers["Authorization"]
    r = await client.put(
        "/api/v1/workspace/update",
        headers={"Authorization": token},
        json={"primary_color": "#222222"},
    )
    assert r.status_code == 400
    assert "workspace" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_workspace_update_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.put(
        "/api/v1/workspace/update",
        headers=member_headers,
        json={"primary_color": "#333333"},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_workspace_update_owner_ok(client: AsyncClient, auth_headers: dict):
    suffix = uuid.uuid4().hex[:6]
    r = await client.put(
        "/api/v1/workspace/update",
        headers=auth_headers,
        json={"primary_color": f"#{suffix[:6]}"},
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_workspace_invite_member_forbidden_operator_ok(
    client: AsyncClient, member_headers: dict, auth_headers: dict
):
    email = f"inv-{uuid.uuid4().hex[:10]}@example.com"
    r_m = await client.post(
        "/api/v1/workspace/members/invite",
        headers=member_headers,
        json={"email": email, "role": "member"},
    )
    assert r_m.status_code == 403
    r_ok = await client.post(
        "/api/v1/workspace/members/invite",
        headers=auth_headers,
        json={"email": email, "role": "member"},
    )
    assert r_ok.status_code == 201, r_ok.text


@pytest.mark.asyncio
async def test_verify_payment_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/payment/verify_payment",
        headers=member_headers,
        json={"session_id": "cs_test_gap"},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_verify_payment_owner_ok_mocked(client: AsyncClient, auth_headers: dict):
    status = CheckoutStatusResponse(
        status="open",
        payment_status="unpaid",
        amount_total=0,
        currency="eur",
        metadata={
            "workspace_id": auth_headers["X-Workspace-Id"],
            "plan_id": "starter",
            "billing_cycle": "monthly",
        },
    )
    with patch("routers.payments.PaymentService") as MockPS:
        inst = MagicMock()
        inst.get_checkout_status = AsyncMock(return_value=status)
        MockPS.return_value = inst
        r = await client.post(
            "/api/v1/payment/verify_payment",
            headers=auth_headers,
            json={"session_id": "cs_test_gap_ok"},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("payment_status") == "unpaid"


@pytest.mark.asyncio
async def test_subscriptions_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    r0 = await client.get("/api/v1/entities/subscriptions")
    assert r0.status_code in (400, 401, 403, 422)
    r = await client.get("/api/v1/entities/subscriptions", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_subscriptions_create_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/subscriptions",
        headers=member_headers,
        json={
            "workspace_id": 1,
            "plan_id": "starter",
            "billing_cycle": "monthly",
            "status": "pending",
        },
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_subscriptions_create_owner_ok(client: AsyncClient, auth_headers: dict):
    wid = int(auth_headers["X-Workspace-Id"])
    r = await client.post(
        "/api/v1/entities/subscriptions",
        headers=auth_headers,
        json={
            "workspace_id": wid,
            "plan_id": "starter",
            "billing_cycle": "monthly",
            "status": "pending",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json().get("workspace_id") == wid


@pytest.mark.asyncio
async def test_storage_list_buckets_workspace_and_mock(client: AsyncClient, auth_headers: dict):
    from schemas.storage import BucketListResponse

    mock_instance = MagicMock()
    mock_instance.list_buckets = AsyncMock(return_value=BucketListResponse(buckets=[]))
    with patch("routers.storage.StorageService", return_value=mock_instance):
        r0 = await client.get("/api/v1/storage/list-buckets")
        assert r0.status_code in (400, 401, 403, 422)
        r = await client.get("/api/v1/storage/list-buckets", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("buckets") == []


@pytest.mark.asyncio
async def test_storage_upload_url_member_forbidden_mocked(client: AsyncClient, member_headers: dict):
    from schemas.storage import FileUpDownResponse

    mock_instance = MagicMock()
    mock_instance.create_upload_url = AsyncMock(
        return_value=FileUpDownResponse(upload_url="https://example/upload", download_url="", expires_at="2099-01-01")
    )
    with patch("routers.storage.StorageService", return_value=mock_instance):
        r = await client.post(
            "/api/v1/storage/upload-url",
            headers=member_headers,
            json={"bucket_name": "test-bucket-gap", "object_key": "file.bin"},
        )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_storage_upload_url_operator_ok_mocked(client: AsyncClient, auth_headers: dict):
    from schemas.storage import FileUpDownResponse

    mock_instance = MagicMock()
    mock_instance.create_upload_url = AsyncMock(
        return_value=FileUpDownResponse(
            upload_url="https://example/upload",
            download_url="",
            expires_at="2099-01-01",
        )
    )
    with patch("routers.storage.StorageService", return_value=mock_instance):
        r = await client.post(
            "/api/v1/storage/upload-url",
            headers=auth_headers,
            json={"bucket_name": "test-bucket-gap", "object_key": "probe.bin"},
        )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_admin_settings_get_member_forbidden_admin_ok(
    client: AsyncClient, member_headers: dict, admin_headers: dict
):
    r_m = await client.get("/api/v1/admin/settings", headers=member_headers)
    assert r_m.status_code == 403
    r_ok = await client.get("/api/v1/admin/settings", headers=admin_headers)
    assert r_ok.status_code == 200
    assert "backend_vars" in r_ok.json()


@pytest.mark.asyncio
async def test_auth_me_unauthorized(client: AsyncClient):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_ok(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data or "email" in data

"""
Oleada 3 — oauth_integrations, onboarding, email_service (tokens / wizard / cola email).

Ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_oauth_providers_requires_workspace(client: AsyncClient, auth_headers: dict):
    r0 = await client.get("/api/v1/oauth/providers")
    assert r0.status_code in (400, 401, 403, 422)
    r = await client.get("/api/v1/oauth/providers", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) >= 1


@pytest.mark.asyncio
async def test_oauth_authorize_member_forbidden_operator_ok(
    client: AsyncClient, member_headers: dict, auth_headers: dict
):
    r_m = await client.get(
        "/api/v1/oauth/authorize/meta",
        params={"redirect_uri": "http://localhost:3000/oauth/callback"},
        headers=member_headers,
    )
    assert r_m.status_code == 403
    assert "operator" in (r_m.json().get("detail") or "").lower()
    r_ok = await client.get(
        "/api/v1/oauth/authorize/meta",
        params={"redirect_uri": "http://localhost:3000/oauth/callback"},
        headers=auth_headers,
    )
    assert r_ok.status_code == 200, r_ok.text
    data = r_ok.json()
    assert "authorize_url" in data and "state" in data


@pytest.mark.asyncio
async def test_oauth_callback_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/oauth/callback",
        headers=member_headers,
        json={"provider": "meta", "code": "fake", "state": "fake-state"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_oauth_callback_owner_ok_after_authorize(client: AsyncClient, auth_headers: dict):
    auth = await client.get(
        "/api/v1/oauth/authorize/meta",
        params={"redirect_uri": "http://localhost:3000/oauth/callback"},
        headers=auth_headers,
    )
    assert auth.status_code == 200, auth.text
    state = auth.json()["state"]
    r = await client.post(
        "/api/v1/oauth/callback",
        headers=auth_headers,
        json={"provider": "meta", "code": "test_auth_code", "state": state},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "connected"


@pytest.mark.asyncio
async def test_oauth_disconnect_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/oauth/disconnect",
        headers=member_headers,
        json={"provider": "meta"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_onboarding_progress_requires_workspace(client: AsyncClient, auth_headers: dict):
    r0 = await client.get("/api/v1/onboarding/progress")
    assert r0.status_code in (400, 401, 403, 422)
    r = await client.get("/api/v1/onboarding/progress", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data.get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_onboarding_steps_requires_workspace(client: AsyncClient, auth_headers: dict):
    r0 = await client.get("/api/v1/onboarding/steps")
    assert r0.status_code in (400, 401, 403, 422)
    r = await client.get("/api/v1/onboarding/steps", headers=auth_headers)
    assert r.status_code == 200
    assert "steps" in r.json()


@pytest.mark.asyncio
async def test_onboarding_complete_step_member_forbidden_operator_ok(
    client: AsyncClient, member_headers: dict, auth_headers: dict
):
    r_m = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=member_headers,
        json={"step_key": "profile"},
    )
    assert r_m.status_code == 403
    r_ok = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=auth_headers,
        json={"step_key": "profile"},
    )
    assert r_ok.status_code == 200, r_ok.text
    assert r_ok.json().get("completed") is True


@pytest.mark.asyncio
async def test_onboarding_reset_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post("/api/v1/onboarding/reset", headers=member_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_onboarding_seed_demo_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/onboarding/seed-demo",
        headers=member_headers,
        json={"modules": []},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_email_stats_requires_workspace(client: AsyncClient, auth_headers: dict):
    token = auth_headers["Authorization"]
    r = await client.get("/api/v1/email/stats", headers={"Authorization": token})
    assert r.status_code == 400
    assert "workspace" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_email_send_member_forbidden_operator_ok(
    client: AsyncClient, member_headers: dict, auth_headers: dict
):
    payload = {
        "to_email": "ops@example.com",
        "subject": "Gap wave3",
        "body_html": "<p>probe</p>",
    }
    r_m = await client.post("/api/v1/email/send", headers=member_headers, json=payload)
    assert r_m.status_code == 403
    r_ok = await client.post("/api/v1/email/send", headers=auth_headers, json=payload)
    assert r_ok.status_code == 200, r_ok.text

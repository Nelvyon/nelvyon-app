import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_branding_policy_read_and_activation_roundtrip(
    monkeypatch: pytest.MonkeyPatch, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    monkeypatch.setenv("BRANDING_V2_ADVANCED_PLAN_IDS", "starter,pro,enterprise")
    monkeypatch.setenv("BRANDING_V2_HQ_LOCK", "0")
    await db_session.execute(text("UPDATE workspaces SET plan = 'starter', status = 'active' WHERE id = 2"))
    await db_session.commit()

    before = await client.get("/api/v1/tenant/branding/policy", headers=admin_headers)
    assert before.status_code == 200, before.text
    data_before = before.json()
    assert data_before["workspace_id"] == 2
    assert len(data_before["fields"]) == 3

    on = await client.post(
        "/api/v1/tenant/branding-v2/activation",
        json={"enabled": True, "note": "test enable"},
        headers=admin_headers,
    )
    assert on.status_code == 200, on.text
    assert on.json()["branding_v2_advanced_enabled"] is True

    logs = await client.get("/api/v1/tenant/branding-v2/activation-logs", headers=admin_headers)
    assert logs.status_code == 200, logs.text
    assert len(logs.json()) >= 1

    off = await client.post(
        "/api/v1/tenant/branding-v2/activation",
        json={"enabled": False, "note": "test disable"},
        headers=admin_headers,
    )
    assert off.status_code == 200, off.text
    assert off.json()["branding_v2_advanced_enabled"] is False


@pytest.mark.asyncio
async def test_branding_activation_precondition_plan_block(
    monkeypatch: pytest.MonkeyPatch, client: AsyncClient, admin_headers: dict
):
    monkeypatch.setenv("BRANDING_V2_ADVANCED_PLAN_IDS", "enterprise")
    monkeypatch.setenv("BRANDING_V2_HQ_LOCK", "0")
    r = await client.post(
        "/api/v1/tenant/branding-v2/activation",
        json={"enabled": True},
        headers=admin_headers,
    )
    assert r.status_code == 400
    assert "plan does not include branding v2 advanced" in r.text.lower()

"""
Oleada 6 — automation, automation_webhooks, user_roles (plataforma), aihub,
partner_records / sales_records (PII).

Ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from schemas.aihub import GenTxtResponse


async def _create_client(client: AsyncClient, headers: dict) -> int:
    suf = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/nelvyon_clients",
        headers=headers,
        json={"business_name": f"W6{suf}", "sector": "saas"},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


# --- automation router (/api/v1/automation) ---


@pytest.mark.asyncio
async def test_automation_jobs_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/automation/jobs", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_automation_stats_member_ok(client: AsyncClient, member_headers: dict):
    r = await client.get("/api/v1/automation/stats", headers=member_headers)
    assert r.status_code == 200, r.text
    assert "total_jobs" in r.json()


@pytest.mark.asyncio
async def test_automation_process_job_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.post(
        "/api/v1/automation/process-job",
        headers={"Authorization": tok},
        json={"client_id": 1, "job_type": "custom"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_automation_process_job_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/automation/process-job",
        headers=member_headers,
        json={"client_id": 1, "job_type": "custom"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_automation_process_job_operator_ok(client: AsyncClient, auth_headers: dict):
    cid = await _create_client(client, auth_headers)
    with patch("services.automation.AIHubService") as m_ai:
        m_ai.return_value.gentxt = AsyncMock(
            return_value=GenTxtResponse(content='{"ok":true}', model="stub", usage=None)
        )
        r = await client.post(
            "/api/v1/automation/process-job",
            headers=auth_headers,
            json={"client_id": cid, "job_type": "custom"},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("status") == "completed"
    assert body.get("job_id") is not None


@pytest.mark.asyncio
async def test_automation_retry_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post("/api/v1/automation/retry/1", headers=member_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_automation_retry_operator_ok(client: AsyncClient, auth_headers: dict):
    cid = await _create_client(client, auth_headers)
    suf = uuid.uuid4().hex[:8]
    ins = await client.post(
        "/api/v1/entities/automation_jobs",
        headers=auth_headers,
        json={
            "job_type": f"retry-{suf}",
            "status": "failed",
            "client_id": cid,
            "input_data": "{}",
            "error_message": "x",
        },
    )
    assert ins.status_code == 201, ins.text
    jid = ins.json()["id"]
    with patch("services.automation.AIHubService") as m_ai:
        m_ai.return_value.gentxt = AsyncMock(
            return_value=GenTxtResponse(content='{"r":1}', model="stub", usage=None)
        )
        r = await client.post(f"/api/v1/automation/retry/{jid}", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "completed"


@pytest.mark.asyncio
async def test_automation_webhook_trigger_cross_workspace_rejected(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    cid_ws2 = await _create_client(client, admin_headers)
    key = f"w6-{uuid.uuid4().hex[:12]}"
    wh = await client.post(
        "/api/v1/entities/automation_webhooks",
        headers=auth_headers,
        json={"name": "t", "webhook_key": key, "job_type": "custom", "is_active": True},
    )
    assert wh.status_code == 201, wh.text
    r = await client.post(
        f"/api/v1/automation/webhook/trigger/{key}",
        json={"client_id": cid_ws2, "job_type": "custom", "data": {}},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_automation_webhook_trigger_ok_no_jwt(client: AsyncClient, auth_headers: dict):
    cid = await _create_client(client, auth_headers)
    key = f"w6ok-{uuid.uuid4().hex[:12]}"
    wh = await client.post(
        "/api/v1/entities/automation_webhooks",
        headers=auth_headers,
        json={"name": "pub", "webhook_key": key, "job_type": "custom", "is_active": True},
    )
    assert wh.status_code == 201, wh.text
    with patch("services.automation.AIHubService") as m_ai:
        m_ai.return_value.gentxt = AsyncMock(
            return_value=GenTxtResponse(content='{"w":1}', model="stub", usage=None)
        )
        r = await client.post(
            f"/api/v1/automation/webhook/trigger/{key}",
            json={"client_id": cid, "job_type": "custom", "data": {}},
        )
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "ok"


# --- automation_webhooks entity ---


@pytest.mark.asyncio
async def test_automation_webhooks_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/entities/automation_webhooks", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_automation_webhooks_member_cannot_create(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/automation_webhooks",
        headers=member_headers,
        json={
            "name": "m",
            "webhook_key": f"k-{uuid.uuid4().hex[:8]}",
            "job_type": "custom",
            "is_active": True,
        },
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_automation_webhooks_operator_create_ok(client: AsyncClient, auth_headers: dict):
    key = f"op-{uuid.uuid4().hex[:10]}"
    r = await client.post(
        "/api/v1/entities/automation_webhooks",
        headers=auth_headers,
        json={"name": "op", "webhook_key": key, "job_type": "custom", "is_active": True},
    )
    assert r.status_code == 201, r.text
    assert r.json().get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_automation_webhooks_all_requires_super_admin(
    client: AsyncClient, admin_headers: dict, super_admin_headers: dict
):
    r_adm = await client.get("/api/v1/entities/automation_webhooks/all", headers=admin_headers)
    assert r_adm.status_code == 403
    r_ok = await client.get("/api/v1/entities/automation_webhooks/all", headers=super_admin_headers)
    assert r_ok.status_code == 200, r_ok.text


# --- user_roles (platform admin / super_admin; not tenant WS/OP) ---


@pytest.mark.asyncio
async def test_user_roles_list_requires_admin(client: AsyncClient, auth_headers: dict, admin_headers: dict):
    r_u = await client.get("/api/v1/entities/user_roles", headers=auth_headers)
    assert r_u.status_code == 403
    r_a = await client.get("/api/v1/entities/user_roles", headers=admin_headers)
    assert r_a.status_code == 200, r_a.text


@pytest.mark.asyncio
async def test_user_roles_all_requires_super_admin(
    client: AsyncClient, admin_headers: dict, super_admin_headers: dict
):
    r_adm = await client.get("/api/v1/entities/user_roles/all", headers=admin_headers)
    assert r_adm.status_code == 403
    r_ok = await client.get("/api/v1/entities/user_roles/all", headers=super_admin_headers)
    assert r_ok.status_code == 200, r_ok.text


@pytest.mark.asyncio
async def test_user_roles_create_admin_ok(client: AsyncClient, admin_headers: dict):
    suf = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/user_roles",
        headers=admin_headers,
        json={
            "user_id": f"probe-{suf}",
            "email": f"probe-{suf}@t.com",
            "role": "analyst",
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text


# --- aihub ---


@pytest.mark.asyncio
async def test_aihub_gentxt_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.post(
        "/api/v1/aihub/gentxt",
        headers={"Authorization": tok},
        json={"messages": [{"role": "user", "content": "hi"}], "model": "x", "stream": False},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_aihub_gentxt_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/aihub/gentxt",
        headers=member_headers,
        json={"messages": [{"role": "user", "content": "hi"}], "model": "x", "stream": False},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_aihub_gentxt_operator_reaches_aihub_service(client: AsyncClient, auth_headers: dict):
    with patch("routers.aihub.AIHubService") as m_ai:
        m_ai.return_value.gentxt = AsyncMock(
            return_value=GenTxtResponse(content="ok", model="stub", usage=None)
        )
        r = await client.post(
            "/api/v1/aihub/gentxt",
            headers=auth_headers,
            json={"messages": [{"role": "user", "content": "hi"}], "model": "x", "stream": False},
        )
    assert r.status_code == 200, r.text


# --- partner_records ---


@pytest.mark.asyncio
async def test_partner_records_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/entities/partner_records", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_partner_records_member_cannot_create(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/partner_records",
        headers=member_headers,
        json={"partner_name": "P", "email": "p@e.com"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_partner_records_operator_create_ok(client: AsyncClient, auth_headers: dict):
    suf = uuid.uuid4().hex[:6]
    r = await client.post(
        "/api/v1/entities/partner_records",
        headers=auth_headers,
        json={"partner_name": f"PR{suf}", "email": f"pr{suf}@e.com", "tier": "gold"},
    )
    assert r.status_code == 201, r.text
    assert r.json().get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_partner_records_all_super_admin_only(
    client: AsyncClient, admin_headers: dict, super_admin_headers: dict
):
    assert (await client.get("/api/v1/entities/partner_records/all", headers=admin_headers)).status_code == 403
    r = await client.get("/api/v1/entities/partner_records/all", headers=super_admin_headers)
    assert r.status_code == 200, r.text


# --- sales_records ---


@pytest.mark.asyncio
async def test_sales_records_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/entities/sales_records", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_sales_records_member_cannot_create(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/sales_records",
        headers=member_headers,
        json={"client_name": "C", "amount": 10.0},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_sales_records_operator_create_ok(client: AsyncClient, auth_headers: dict):
    suf = uuid.uuid4().hex[:6]
    r = await client.post(
        "/api/v1/entities/sales_records",
        headers=auth_headers,
        json={"client_name": f"S{suf}", "amount": 99.0, "currency": "EUR"},
    )
    assert r.status_code == 201, r.text
    assert r.json().get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_sales_records_all_super_admin_only(
    client: AsyncClient, admin_headers: dict, super_admin_headers: dict
):
    assert (await client.get("/api/v1/entities/sales_records/all", headers=admin_headers)).status_code == 403
    r = await client.get("/api/v1/entities/sales_records/all", headers=super_admin_headers)
    assert r.status_code == 200, r.text

"""
Cierre GAP_WS / GAP_OP prioritario con tests HTTP reales.

Routers: security_events, automation_jobs, connector_configs, billing POST /alerts.
Ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.
"""
import json
import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_events_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/entities/security_events")
    assert r.status_code in (400, 401, 403, 422)
    r2 = await client.get("/api/v1/entities/security_events", headers=auth_headers)
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_security_events_member_cannot_create(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/security_events",
        headers=member_headers,
        json={"event_type": "test.member", "status": "ok"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_security_events_operator_create_ok(client: AsyncClient, auth_headers: dict):
    suffix = uuid.uuid4().hex[:8]
    wid = int(auth_headers["X-Workspace-Id"])
    details = json.dumps({"workspace_id": wid, "probe": True})
    r = await client.post(
        "/api/v1/entities/security_events",
        headers=auth_headers,
        json={
            "event_type": f"saas.test.gap_ws_{suffix}",
            "severity": "info",
            "status": "ok",
            "details_json": details,
        },
    )
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    g = await client.get(f"/api/v1/entities/security_events/{rid}", headers=auth_headers)
    assert g.status_code == 200


@pytest.mark.asyncio
async def test_automation_jobs_requires_workspace_and_operator_create(
    client: AsyncClient, auth_headers: dict, member_headers: dict
):
    r0 = await client.get("/api/v1/entities/automation_jobs")
    assert r0.status_code in (400, 401, 403, 422)
    r = await client.get("/api/v1/entities/automation_jobs", headers=auth_headers)
    assert r.status_code == 200
    r_m = await client.post(
        "/api/v1/entities/automation_jobs",
        headers=member_headers,
        json={"job_type": "gap", "status": "pending"},
    )
    assert r_m.status_code == 403
    suffix = uuid.uuid4().hex[:8]
    r_ok = await client.post(
        "/api/v1/entities/automation_jobs",
        headers=auth_headers,
        json={"job_type": f"gap-{suffix}", "status": "pending"},
    )
    assert r_ok.status_code == 201, r_ok.text
    assert r_ok.json().get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_connector_configs_requires_workspace_and_operator(
    client: AsyncClient, auth_headers: dict, member_headers: dict
):
    r0 = await client.get("/api/v1/entities/connector_configs")
    assert r0.status_code in (400, 401, 403, 422)
    r = await client.get("/api/v1/entities/connector_configs", headers=auth_headers)
    assert r.status_code == 200
    r_m = await client.post(
        "/api/v1/entities/connector_configs",
        headers=member_headers,
        json={"connector_name": "x", "status": "active"},
    )
    assert r_m.status_code == 403
    suffix = uuid.uuid4().hex[:8]
    r_ok = await client.post(
        "/api/v1/entities/connector_configs",
        headers=auth_headers,
        json={"connector_name": f"gap-{suffix}", "status": "active", "config_json": "{}"},
    )
    assert r_ok.status_code == 201, r_ok.text
    assert r_ok.json().get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_billing_alerts_requires_operator(client: AsyncClient, member_headers: dict, auth_headers: dict):
    r_m = await client.post(
        "/api/v1/billing/alerts",
        headers=member_headers,
        json={"meter_id": "contacts", "threshold_pct": 80.0},
    )
    assert r_m.status_code == 403
    r_ok = await client.post(
        "/api/v1/billing/alerts",
        headers=auth_headers,
        json={"meter_id": "contacts", "threshold_pct": 80.0},
    )
    assert r_ok.status_code == 200, r_ok.text

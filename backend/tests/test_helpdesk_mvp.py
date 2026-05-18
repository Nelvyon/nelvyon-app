"""
D1-4 — Helpdesk Fase 1 MVP: congelar por tests tenant-first en tickets,
lifecycle/SLA y analytics (sin frontend, sin sleeps).
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient

from core.auth import create_access_token


def _headers_ws(headers: dict, workspace_id: int) -> dict:
    h = dict(headers)
    h["X-Workspace-Id"] = str(workspace_id)
    return h


def _no_workspace(headers: dict) -> dict:
    return {k: v for k, v in headers.items() if k.lower() != "x-workspace-id"}


@pytest.fixture
def auth_only_bearer() -> dict:
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_mvp_ticket_create_in_workspace_a_ok(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    r = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"MVP-A-{suffix}", "description": "d"},
        headers=h_a,
    )
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["subject"] == f"MVP-A-{suffix}"
    assert int(body.get("workspace_id", 0)) == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_mvp_ticket_client_id_from_other_workspace_is_404(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_b = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"MVP-B-{suffix}", "slug": f"mvp-b-{suffix}"},
        headers=no_ws,
    )
    assert ws_b.status_code == 201, ws_b.text
    ws_b_id = int(ws_b.json()["id"])
    h_b = _headers_ws(auth_headers, ws_b_id)

    c_b = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "Ext", "email": f"ext-{suffix}@example.com"},
        headers=h_b,
    )
    assert c_b.status_code in (200, 201), c_b.text
    contact_b_id = int(c_b.json()["id"])

    r = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"MVP-cross-{suffix}", "description": "d", "client_id": contact_b_id},
        headers=h_a,
    )
    assert r.status_code == 404, r.text
    assert "Contact not found" in (r.json().get("detail") or "")


@pytest.mark.asyncio
async def test_mvp_ticket_body_workspace_id_mismatch_header_is_400(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    r = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"MVP-ws-body-{suffix}",
            "description": "d",
            "workspace_id": 999999,
        },
        headers=h_a,
    )
    assert r.status_code == 400, r.text
    assert "workspace_id" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_mvp_ticket_alias_pending_and_critical_persist_canonical(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"MVP-alias-{suffix}",
            "description": "d",
            "status": "pending",
            "priority": "critical",
        },
        headers=auth_headers,
    )
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["status"] == "open"
    assert body["priority"] == "urgent"


@pytest.mark.asyncio
async def test_mvp_lifecycle_assign_and_transition_ok_in_workspace_a(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))

    t = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"MVP-life-{suffix}",
            "description": "d",
            "status": "open",
            "priority": "medium",
        },
        headers=h_a,
    )
    assert t.status_code in (200, 201), t.text
    ticket_id = int(t.json()["id"])

    assign = await client.post(
        "/api/v1/helpdesk/assign",
        json={"ticket_id": ticket_id, "assigned_to": "mvp-agent"},
        headers=h_a,
    )
    assert assign.status_code == 200, assign.text

    tr = await client.post(
        "/api/v1/helpdesk/transition",
        json={"ticket_id": ticket_id, "new_status": "in_progress"},
        headers=h_a,
    )
    assert tr.status_code == 200, tr.text
    assert tr.json()["new_status"] == "in_progress"


@pytest.mark.asyncio
async def test_mvp_lifecycle_assign_transition_cross_workspace_404(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_b = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"MVP-L-{suffix}", "slug": f"mvp-l-{suffix}"},
        headers=no_ws,
    )
    assert ws_b.status_code == 201, ws_b.text
    h_b = _headers_ws(auth_headers, int(ws_b.json()["id"]))

    t = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"MVP-iso-{suffix}", "description": "d", "status": "open"},
        headers=h_a,
    )
    assert t.status_code in (200, 201), t.text
    ticket_id = int(t.json()["id"])

    assign_b = await client.post(
        "/api/v1/helpdesk/assign",
        json={"ticket_id": ticket_id, "assigned_to": "x"},
        headers=h_b,
    )
    assert assign_b.status_code == 404, assign_b.text

    trans_b = await client.post(
        "/api/v1/helpdesk/transition",
        json={"ticket_id": ticket_id, "new_status": "resolved"},
        headers=h_b,
    )
    assert trans_b.status_code == 404, trans_b.text


@pytest.mark.asyncio
async def test_mvp_sla_breaches_in_b_does_not_count_open_ticket_in_a(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_b = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"MVP-SLA-{suffix}", "slug": f"mvp-sla-{suffix}"},
        headers=no_ws,
    )
    assert ws_b.status_code == 201, ws_b.text
    h_b = _headers_ws(auth_headers, int(ws_b.json()["id"]))

    await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"MVP-open-A-{suffix}",
            "description": "d",
            "status": "open",
            "priority": "low",
        },
        headers=h_a,
    )

    breaches_b = await client.get("/api/v1/helpdesk/sla-breaches", headers=h_b)
    assert breaches_b.status_code == 200, breaches_b.text
    assert breaches_b.json()["total_open_tickets"] == 0


@pytest.mark.asyncio
async def test_mvp_analytics_helpdesk_requires_workspace_header_400(
    client: AsyncClient, auth_only_bearer: dict
):
    r = await client.get("/api/v1/analytics/helpdesk", headers=auth_only_bearer)
    assert r.status_code == 400, r.text
    assert "workspace" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_mvp_analytics_helpdesk_scoped_per_workspace_no_cross_leak(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_b = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"MVP-AN-{suffix}", "slug": f"mvp-an-{suffix}"},
        headers=no_ws,
    )
    assert ws_b.status_code == 201, ws_b.text
    ws_b_id = int(ws_b.json()["id"])
    h_b = _headers_ws(auth_headers, ws_b_id)

    total_b_before = (await client.get("/api/v1/analytics/helpdesk", headers=h_b)).json()["kpis"]["total"]

    await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"MVP-only-A-{suffix}", "description": "d"},
        headers=h_a,
    )

    total_b_after_ticket_in_a = (
        await client.get("/api/v1/analytics/helpdesk", headers=h_b)
    ).json()["kpis"]["total"]
    assert total_b_after_ticket_in_a == total_b_before

    total_a_before = (await client.get("/api/v1/analytics/helpdesk", headers=h_a)).json()["kpis"]["total"]
    await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"MVP-only-B-{suffix}", "description": "d"},
        headers=h_b,
    )
    total_b_after_ticket_in_b = (
        await client.get("/api/v1/analytics/helpdesk", headers=h_b)
    ).json()["kpis"]["total"]
    assert total_b_after_ticket_in_b >= total_b_before + 1

    total_a_after_ticket_in_b = (
        await client.get("/api/v1/analytics/helpdesk", headers=h_a)
    ).json()["kpis"]["total"]
    assert total_a_after_ticket_in_b == total_a_before

    ja = (await client.get("/api/v1/analytics/helpdesk", headers=h_a)).json()
    jb = (await client.get("/api/v1/analytics/helpdesk", headers=h_b)).json()
    assert ja.get("workspace_id") == int(auth_headers["X-Workspace-Id"])
    assert jb.get("workspace_id") == ws_b_id


@pytest.mark.asyncio
async def test_mvp_batch_create_rejects_conflicting_workspace_id_in_body(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    r = await client.post(
        "/api/v1/entities/helpdesk_tickets/batch",
        json={
            "items": [
                {
                    "subject": f"MVP-batch-{suffix}",
                    "description": "d",
                    "workspace_id": 999999,
                }
            ]
        },
        headers=h_a,
    )
    assert r.status_code == 400, r.text

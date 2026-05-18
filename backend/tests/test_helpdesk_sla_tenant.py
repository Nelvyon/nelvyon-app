"""
D1-1 — Helpdesk SLA/Lifecycle tenant-first hardening.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient

from core.auth import create_access_token


@pytest.fixture
def auth_only_headers() -> dict:
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}"}


def _headers_ws(auth_headers: dict, workspace_id: int) -> dict:
    h = dict(auth_headers)
    h["X-Workspace-Id"] = str(workspace_id)
    return h


def _no_workspace(auth_headers: dict) -> dict:
    return {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}


@pytest.mark.asyncio
async def test_helpdesk_sla_assign_transition_and_breaches_are_workspace_scoped(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_b_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-HD-{suffix}", "slug": f"qa-hd-{suffix}"},
        headers=no_ws,
    )
    assert ws_b_resp.status_code == 201, ws_b_resp.text
    h_b = _headers_ws(auth_headers, ws_b_resp.json()["id"])

    ticket_a = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"Tenant ticket {suffix}",
            "description": "SLA scope check",
            "status": "open",
            "priority": "medium",
            "category": "General",
            "channel": "web",
        },
        headers=h_a,
    )
    assert ticket_a.status_code in (200, 201), ticket_a.text
    ticket_id = ticket_a.json()["id"]

    assign_a = await client.post(
        "/api/v1/helpdesk/assign",
        json={"ticket_id": ticket_id, "assigned_to": "agent-a"},
        headers=h_a,
    )
    assert assign_a.status_code == 200, assign_a.text

    transition_a = await client.post(
        "/api/v1/helpdesk/transition",
        json={"ticket_id": ticket_id, "new_status": "in_progress"},
        headers=h_a,
    )
    assert transition_a.status_code == 200, transition_a.text
    assert transition_a.json()["new_status"] == "in_progress"

    breaches_a = await client.get("/api/v1/helpdesk/sla-breaches", headers=h_a)
    assert breaches_a.status_code == 200, breaches_a.text
    assert breaches_a.json()["total_open_tickets"] >= 1

    # Cross-workspace: ticket A must not be accessible from B.
    assign_b = await client.post(
        "/api/v1/helpdesk/assign",
        json={"ticket_id": ticket_id, "assigned_to": "agent-b"},
        headers=h_b,
    )
    assert assign_b.status_code == 404, assign_b.text

    transition_b = await client.post(
        "/api/v1/helpdesk/transition",
        json={"ticket_id": ticket_id, "new_status": "resolved"},
        headers=h_b,
    )
    assert transition_b.status_code == 404, transition_b.text

    breaches_b = await client.get("/api/v1/helpdesk/sla-breaches", headers=h_b)
    assert breaches_b.status_code == 200, breaches_b.text
    assert breaches_b.json()["total_open_tickets"] == 0


@pytest.mark.asyncio
async def test_helpdesk_sla_requires_workspace_header(
    client: AsyncClient, auth_only_headers: dict
):
    assign_no_ws = await client.post(
        "/api/v1/helpdesk/assign",
        json={"ticket_id": 999999, "assigned_to": "agent-x"},
        headers=auth_only_headers,
    )
    assert assign_no_ws.status_code == 400

    transition_no_ws = await client.post(
        "/api/v1/helpdesk/transition",
        json={"ticket_id": 999999, "new_status": "in_progress"},
        headers=auth_only_headers,
    )
    assert transition_no_ws.status_code == 400

    breaches_no_ws = await client.get("/api/v1/helpdesk/sla-breaches", headers=auth_only_headers)
    assert breaches_no_ws.status_code == 400


@pytest.mark.asyncio
async def test_helpdesk_sla_reference_requires_workspace(
    client: AsyncClient, auth_only_headers: dict
):
    r = await client.get("/api/v1/helpdesk/sla-targets", headers=auth_only_headers)
    assert r.status_code == 400
    r2 = await client.get("/api/v1/helpdesk/ticket-flow", headers=auth_only_headers)
    assert r2.status_code == 400


@pytest.mark.asyncio
async def test_helpdesk_sla_assign_requires_operator(
    client: AsyncClient, member_headers: dict
):
    r = await client.post(
        "/api/v1/helpdesk/assign",
        headers=member_headers,
        json={"ticket_id": 1, "assigned_to": "x"},
    )
    assert r.status_code == 403

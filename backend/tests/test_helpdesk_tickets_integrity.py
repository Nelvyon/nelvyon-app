"""
D1-2 — Helpdesk tickets: client_id workspace integrity, workspace_id body policy,
status/priority normalization contract.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


def _headers_ws(auth_headers: dict, workspace_id: int) -> dict:
    h = dict(auth_headers)
    h["X-Workspace-Id"] = str(workspace_id)
    return h


def _no_workspace(auth_headers: dict) -> dict:
    return {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}


@pytest.mark.asyncio
async def test_ticket_client_id_must_belong_to_active_workspace(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_b_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-HD2-{suffix}", "slug": f"qa-hd2-{suffix}"},
        headers=no_ws,
    )
    assert ws_b_resp.status_code == 201, ws_b_resp.text
    ws_b_id = int(ws_b_resp.json()["id"])
    h_b = _headers_ws(auth_headers, ws_b_id)

    c_a = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "A",
            "email": f"ca-{suffix}@example.com",
        },
        headers=h_a,
    )
    assert c_a.status_code in (200, 201), c_a.text
    contact_a_id = int(c_a.json()["id"])

    c_b = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "B",
            "email": f"cb-{suffix}@example.com",
        },
        headers=h_b,
    )
    assert c_b.status_code in (200, 201), c_b.text
    contact_b_id = int(c_b.json()["id"])

    bad = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"Cross {suffix}",
            "description": "x",
            "client_id": contact_b_id,
        },
        headers=h_a,
    )
    assert bad.status_code == 404, bad.text
    assert "Contact not found" in bad.json().get("detail", "")

    ok = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"Same ws {suffix}",
            "description": "x",
            "client_id": contact_a_id,
        },
        headers=h_a,
    )
    assert ok.status_code in (200, 201), ok.text
    assert ok.json().get("client_id") == contact_a_id


@pytest.mark.asyncio
async def test_ticket_body_workspace_id_must_match_header_or_omit(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h1 = _headers_ws(auth_headers, 1)

    mismatch = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"WS mismatch {suffix}",
            "description": "x",
            "workspace_id": 2,
        },
        headers=h1,
    )
    assert mismatch.status_code == 400, mismatch.text
    assert "workspace_id" in mismatch.json().get("detail", "").lower()

    same = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"WS same {suffix}",
            "description": "x",
            "workspace_id": 1,
        },
        headers=h1,
    )
    assert same.status_code in (200, 201), same.text
    assert int(same.json().get("workspace_id", 0)) == 1


@pytest.mark.asyncio
async def test_ticket_status_priority_aliases_normalized(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h = auth_headers

    t1 = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"Aliases {suffix}",
            "description": "x",
            "status": "pending",
            "priority": "critical",
        },
        headers=h,
    )
    assert t1.status_code in (200, 201), t1.text
    body = t1.json()
    assert body["status"] == "open"
    assert body["priority"] == "urgent"


@pytest.mark.asyncio
async def test_batch_create_returns_400_on_value_error(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    h1 = _headers_ws(auth_headers, 1)

    batch = await client.post(
        "/api/v1/entities/helpdesk_tickets/batch",
        json={
            "items": [
                {
                    "subject": f"Batch bad {suffix}",
                    "description": "x",
                    "workspace_id": 2,
                }
            ]
        },
        headers=h1,
    )
    assert batch.status_code == 400, batch.text

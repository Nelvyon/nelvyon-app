"""
PRODUCT-HELPDESK-1 FASE 1 — contratos HTTP mínimos: lista, aislamiento por workspace,
operador vs member en mutación, assign/transition con respuesta correcta.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_product_helpdesk_list_200_shape(client: AsyncClient, auth_headers: dict):
    r = await client.get(
        "/api/v1/entities/helpdesk_tickets",
        params={"skip": 0, "limit": 20},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body and "total" in body
    assert isinstance(body["items"], list)


@pytest.mark.asyncio
async def test_product_helpdesk_get_other_workspace_ticket_404(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"PH1-tenant-{suffix}",
            "description": "d",
            "status": "open",
            "priority": "medium",
        },
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    tid = int(create.json()["id"])

    cross = await client.get(
        f"/api/v1/entities/helpdesk_tickets/{tid}",
        headers=admin_headers,
    )
    assert cross.status_code == 404, cross.text


@pytest.mark.asyncio
async def test_product_helpdesk_member_put_status_403(
    client: AsyncClient, auth_headers: dict, member_headers: dict
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"PH1-member-{suffix}", "description": "d", "status": "open"},
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    tid = int(create.json()["id"])

    forbidden = await client.put(
        f"/api/v1/entities/helpdesk_tickets/{tid}",
        json={"status": "in_progress"},
        headers=member_headers,
    )
    assert forbidden.status_code == 403, forbidden.text


@pytest.mark.asyncio
async def test_product_helpdesk_helpdesk_assign_persists_assigned_to(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"PH1-assign-{suffix}", "description": "d", "status": "open"},
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    tid = int(create.json()["id"])

    assign = await client.post(
        "/api/v1/helpdesk/assign",
        json={"ticket_id": tid, "assigned_to": "agent-phase1"},
        headers=auth_headers,
    )
    assert assign.status_code == 200, assign.text

    got = await client.get(
        f"/api/v1/entities/helpdesk_tickets/{tid}",
        headers=auth_headers,
    )
    assert got.status_code == 200, got.text
    assert got.json().get("assigned_to") == "agent-phase1"


@pytest.mark.asyncio
async def test_product_helpdesk_transition_200(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={"subject": f"PH1-trans-{suffix}", "description": "d", "status": "open"},
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    tid = int(create.json()["id"])

    tr = await client.post(
        "/api/v1/helpdesk/transition",
        json={"ticket_id": tid, "new_status": "in_progress", "resolution_notes": ""},
        headers=auth_headers,
    )
    assert tr.status_code == 200, tr.text
    assert tr.json().get("new_status") == "in_progress"

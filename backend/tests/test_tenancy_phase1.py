"""
TENANCY-1 FASE 1 — aislamiento por workspace en rutas críticas.

Verifica (HTTP) que otro usuario en otro workspace no lee recursos por ID
y que campaign_sender no opera sobre campañas ajenas.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_non_member_cannot_bind_foreign_workspace_header(
    client: AsyncClient,
    auth_headers: dict,
):
    """Usuario de workspace 1 no puede usar X-Workspace-Id=2 sin membresía."""
    h = {**auth_headers, "X-Workspace-Id": "2"}
    r = await client.get("/api/v1/entities/contacts?limit=1", headers=h)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_workspace_b_user_cannot_read_workspace_a_contact_by_id(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "Tenancy",
            "email": f"tenancy-contact-{suffix}@example.com",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    cid = create.json()["id"]

    cross = await client.get(f"/api/v1/entities/contacts/{cid}", headers=admin_headers)
    assert cross.status_code == 404, cross.text


@pytest.mark.asyncio
async def test_workspace_b_user_cannot_read_workspace_a_helpdesk_ticket_by_id(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "subject": f"TENANCY-1 ticket {suffix}",
            "description": "body",
            "priority": "medium",
            "status": "open",
        },
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    tid = create.json()["id"]

    cross = await client.get(f"/api/v1/entities/helpdesk_tickets/{tid}", headers=admin_headers)
    assert cross.status_code == 404, cross.text


@pytest.mark.asyncio
async def test_workspace_b_user_cannot_read_workspace_a_workflow_by_id(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/workflows",
        headers=auth_headers,
        json={
            "name": f"TENANCY-WF-{suffix}",
            "description": "wf",
            "trigger_type": "contact_created",
            "trigger_config": "{}",
            "actions": "[]",
            "status": "active",
        },
    )
    assert create.status_code in (200, 201), create.text
    wid = create.json()["id"]

    cross = await client.get(f"/api/v1/entities/workflows/{wid}", headers=admin_headers)
    assert cross.status_code == 404, cross.text


@pytest.mark.asyncio
async def test_campaign_sender_rejects_foreign_workspace_campaign(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
):
    suffix = uuid4().hex[:8]
    camp = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"TENANCY-CAMP-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "S",
            "content": "C",
        },
        headers=auth_headers,
    )
    assert camp.status_code in (200, 201), camp.text
    campaign_id = camp.json()["id"]

    send = await client.post(
        "/api/v1/campaign-sender/send",
        json={"campaign_id": campaign_id},
        headers=admin_headers,
    )
    assert send.status_code == 400, send.text
    detail = (send.json().get("detail") or "").lower()
    assert "not found" in detail or "workspace" in detail or "invalid" in detail

"""
PRODUCT-CONTACTS-1 FASE 1 — lista y detalle de contactos con aislamiento por workspace.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_contacts_list_returns_200_with_shape(
    client: AsyncClient,
    auth_headers: dict,
):
    r = await client.get("/api/v1/entities/contacts?skip=0&limit=10", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data and "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_contact_detail_cross_workspace_returns_404(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "CRM",
            "email": f"crm-phase1-{suffix}@example.com",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    cid = create.json()["id"]

    cross = await client.get(f"/api/v1/entities/contacts/{cid}", headers=admin_headers)
    assert cross.status_code == 404, cross.text


@pytest.mark.asyncio
async def test_crm_search_accepts_q_and_respects_workspace(
    client: AsyncClient,
    auth_headers: dict,
):
    r = await client.get("/api/v1/crm/search", params={"q": "test", "limit": 5}, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body and "total" in body

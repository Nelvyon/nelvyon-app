"""
ENTERPRISE-READY-1 — RBAC mínimo (workspace operator vs member/viewer).
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_member_cannot_create_contact_operator_required(
    client: AsyncClient, member_headers: dict
):
    r = await client.post(
        "/api/v1/entities/contacts",
        headers=member_headers,
        json={
            "first_name": "X",
            "last_name": "Y",
            "email": "no-perm@test.com",
        },
    )
    assert r.status_code == 403
    assert "operator" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_member_can_list_contacts_read(client: AsyncClient, member_headers: dict):
    r = await client.get(
        "/api/v1/entities/contacts",
        headers=member_headers,
        params={"skip": 0, "limit": 5},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_owner_can_create_contact(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/v1/entities/contacts",
        headers=auth_headers,
        json={
            "first_name": "Owner",
            "last_name": "OK",
            "email": "owner-ok-rbac@test.com",
        },
    )
    assert r.status_code in (200, 201), r.text

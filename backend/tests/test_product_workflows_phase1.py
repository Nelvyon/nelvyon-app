"""
PRODUCT-WORKFLOWS-1 FASE 1 — contratos HTTP: lista, aislamiento por workspace,
mutación de estado (operador vs member).
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_product_workflows_list_200_shape(client: AsyncClient, auth_headers: dict):
    r = await client.get(
        "/api/v1/entities/workflows",
        params={"skip": 0, "limit": 20},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body and "total" in body
    assert isinstance(body["items"], list)


@pytest.mark.asyncio
async def test_product_workflows_get_other_workspace_404(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/workflows",
        headers=auth_headers,
        json={
            "name": f"PW1-tenant-{suffix}",
            "description": "d",
            "trigger_type": "contact_created",
            "trigger_config": "{}",
            "actions": "[]",
            "status": "draft",
        },
    )
    assert create.status_code in (200, 201), create.text
    wid = int(create.json()["id"])

    cross = await client.get(f"/api/v1/entities/workflows/{wid}", headers=admin_headers)
    assert cross.status_code == 404, cross.text


@pytest.mark.asyncio
async def test_product_workflows_member_put_status_403(
    client: AsyncClient, auth_headers: dict, member_headers: dict
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/workflows",
        headers=auth_headers,
        json={
            "name": f"PW1-member-{suffix}",
            "description": "d",
            "trigger_type": "manual",
            "trigger_config": "{}",
            "actions": "[]",
            "status": "draft",
        },
    )
    assert create.status_code in (200, 201), create.text
    wid = int(create.json()["id"])

    forbidden = await client.put(
        f"/api/v1/entities/workflows/{wid}",
        headers=member_headers,
        json={"status": "active"},
    )
    assert forbidden.status_code == 403, forbidden.text


@pytest.mark.asyncio
async def test_product_workflows_operator_put_status_200(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/workflows",
        headers=auth_headers,
        json={
            "name": f"PW1-toggle-{suffix}",
            "description": "d",
            "trigger_type": "manual",
            "trigger_config": "{}",
            "actions": "[]",
            "status": "draft",
        },
    )
    assert create.status_code in (200, 201), create.text
    wid = int(create.json()["id"])

    upd = await client.put(
        f"/api/v1/entities/workflows/{wid}",
        headers=auth_headers,
        json={"status": "active"},
    )
    assert upd.status_code == 200, upd.text
    assert (upd.json().get("status") or "").lower() == "active"

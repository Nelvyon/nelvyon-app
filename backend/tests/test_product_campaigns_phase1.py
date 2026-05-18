"""
PRODUCT-CAMPAIGNS-1 FASE 1 — contratos HTTP: lista, aislamiento por workspace,
envío de campaña en contexto válido (campaign-sender + auditoría en router).
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_product_campaigns_list_200_shape(client: AsyncClient, auth_headers: dict):
    r = await client.get(
        "/api/v1/entities/campaigns",
        params={"skip": 0, "limit": 20},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body and "total" in body
    assert isinstance(body["items"], list)


@pytest.mark.asyncio
async def test_product_campaigns_get_other_workspace_404(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    suffix = uuid4().hex[:8]
    create = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"PC1-tenant-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "S",
            "content": "<p>H</p>",
        },
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text
    cid = int(create.json()["id"])

    cross = await client.get(
        f"/api/v1/entities/campaigns/{cid}",
        headers=admin_headers,
    )
    assert cross.status_code == 404, cross.text


@pytest.mark.asyncio
async def test_product_campaigns_sender_send_200_valid_workspace(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    contact = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "Dest",
            "email": f"pc1-send-{suffix}@example.com",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert contact.status_code in (200, 201), contact.text

    camp = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"PC1-send-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Asunto test",
            "content": "<p>Cuerpo</p>",
        },
        headers=auth_headers,
    )
    assert camp.status_code in (200, 201), camp.text
    campaign_id = int(camp.json()["id"])

    send = await client.post(
        "/api/v1/campaign-sender/send",
        json={"campaign_id": campaign_id},
        headers=auth_headers,
    )
    assert send.status_code == 200, send.text
    body = send.json()
    assert body.get("campaign_id") == campaign_id
    assert body.get("status") in ("sent", "failed")

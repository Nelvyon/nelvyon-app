"""Frente 48 — HTTP integration tests for campaigns."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_campaign_create_email(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"F48-campaign-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Hello",
            "content": "<p>Body</p>",
        },
        headers=auth_headers,
    )
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body.get("type") == "email"
    assert "id" in body


@pytest.mark.asyncio
async def test_campaign_send_mock_ses(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    contact = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "Camp", "email": f"f48-{suffix}@example.com", "status": "active"},
        headers=auth_headers,
    )
    assert contact.status_code in (200, 201), contact.text

    camp = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"F48-send-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Test",
            "content": "<p>Send</p>",
        },
        headers=auth_headers,
    )
    assert camp.status_code in (200, 201), camp.text
    campaign_id = int(camp.json()["id"])

    with patch.object(
        __import__("services.email_service", fromlist=["EmailService"]).EmailService,
        "send_email",
        new_callable=AsyncMock,
        return_value={"status": "sent", "message_id": "mock-ses"},
    ):
        send = await client.post(
            "/api/v1/campaign-sender/send",
            json={"campaign_id": campaign_id},
            headers=auth_headers,
        )
    assert send.status_code == 200, send.text
    body = send.json()
    assert body["campaign_id"] == campaign_id
    assert body["status"] in ("sent", "failed")


@pytest.mark.asyncio
async def test_campaign_stats(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]
    camp = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"F48-stats-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Stats",
            "content": "<p>Stats</p>",
        },
        headers=auth_headers,
    )
    assert camp.status_code in (200, 201), camp.text
    campaign_id = int(camp.json()["id"])

    stats = await client.get(
        f"/api/v1/campaign-sender/stats/{campaign_id}",
        headers=auth_headers,
    )
    assert stats.status_code == 200, stats.text
    body = stats.json()
    assert body.get("campaign_id") == campaign_id or "recipients_count" in body or "sent_count" in body

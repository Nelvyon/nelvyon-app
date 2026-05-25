"""F63 — Email warmup, DM chatbots, TikTok ads."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

META_VERIFY = "nelvyon_meta_verify"


@pytest.mark.asyncio
async def test_email_warmup_start(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/email-warmup/start",
        json={"email": "warmup@f63-test.com", "domain": "f63-test.com"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("account_id")


@pytest.mark.asyncio
async def test_email_warmup_stats(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/email-warmup/start",
        json={"email": "stats@f63-test.com"},
        headers=auth_headers,
    )
    r = await client.get("/api/email-warmup/stats", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json().get("accounts", [])) >= 1


@pytest.mark.asyncio
async def test_email_warmup_rotate(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/email-warmup/start",
        json={"email": "rotate@f63-test.com"},
        headers=auth_headers,
    )
    r = await client.post("/api/email-warmup/rotate", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("active_email")


@pytest.mark.asyncio
async def test_email_warmup_check_deliverability(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/email-warmup/check-deliverability",
        json={
            "subject": "Oferta NELVYON",
            "body": "Automatiza tu marketing con IA.",
            "sender": "ventas@nelvyon.com",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert "deliverability_score" in r.json()


@pytest.mark.asyncio
async def test_email_warmup_requires_auth(client: AsyncClient):
    r = await client.get("/api/email-warmup/stats")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_instagram_webhook_verify(client: AsyncClient):
    r = await client.get(
        "/api/instagram-dm/webhook",
        params={"hub.mode": "subscribe", "hub.verify_token": META_VERIFY, "hub.challenge": "abc123"},
    )
    assert r.status_code == 200
    assert r.text == "abc123"


@pytest.mark.asyncio
async def test_instagram_webhook_receive(client: AsyncClient):
    payload = {
        "entry": [
            {
                "messaging": [
                    {
                        "sender": {"id": "ig-user-f63"},
                        "message": {"text": "Hola, tengo un restaurante"},
                    }
                ]
            }
        ]
    }
    r = await client.post("/api/instagram-dm/webhook", json=payload)
    assert r.status_code == 200
    assert r.json().get("processed", 0) >= 1


@pytest.mark.asyncio
async def test_instagram_conversations(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/instagram-dm/conversations", headers=auth_headers)
    assert r.status_code == 200
    assert "conversations" in r.json()


@pytest.mark.asyncio
async def test_instagram_send(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/instagram-dm/send",
        json={"recipient_id": "ig-send-f63", "text": "Hola desde dashboard"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("mock") is True


@pytest.mark.asyncio
async def test_fb_messenger_webhook_verify(client: AsyncClient):
    r = await client.get(
        "/api/fb-messenger/webhook",
        params={"hub.mode": "subscribe", "hub.verify_token": META_VERIFY, "hub.challenge": "fb99"},
    )
    assert r.status_code == 200
    assert r.text == "fb99"


@pytest.mark.asyncio
async def test_fb_messenger_webhook_receive(client: AsyncClient):
    r = await client.post(
        "/api/fb-messenger/webhook",
        json={"entry": [{"messaging": [{"sender": {"id": "psid-f63"}, "message": {"text": "Precio?"}}]}]},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_fb_messenger_conversations(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/fb-messenger/conversations", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_fb_messenger_send(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/fb-messenger/send",
        json={"psid": "psid-manual", "text": "Test"},
        headers=auth_headers,
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_tiktok_dm_webhook(client: AsyncClient):
    r = await client.post(
        "/api/tiktok-dm/webhook",
        json={"events": [{"open_id": "tt-open-f63", "text": "Hola TikTok"}]},
    )
    assert r.status_code == 200
    assert r.json().get("processed") >= 1


@pytest.mark.asyncio
async def test_tiktok_dm_conversations(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/tiktok-dm/conversations", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_tiktok_dm_send(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/tiktok-dm/send",
        json={"open_id": "tt-manual", "text": "Hola"},
        headers=auth_headers,
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_tiktok_ads_status(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/tiktok-ads/status", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("mock") is True


@pytest.mark.asyncio
async def test_tiktok_ads_create_campaign(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/tiktok-ads/campaigns",
        json={"name": "F63 Test Campaign", "daily_budget_eur": 40},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("campaign_id")


@pytest.mark.asyncio
async def test_tiktok_ads_list_campaigns(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/tiktok-ads/campaigns",
        json={"name": "F63 List"},
        headers=auth_headers,
    )
    r = await client.get("/api/tiktok-ads/campaigns", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json().get("campaigns", [])) >= 1


@pytest.mark.asyncio
async def test_tiktok_ads_metrics(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/tiktok-ads/metrics", headers=auth_headers)
    assert r.status_code == 200
    assert "impressions" in r.json()


@pytest.mark.asyncio
async def test_tiktok_ads_suggest(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/tiktok-ads/suggest",
        json={"product": "NELVYON", "audience": "ecommerce", "goal": "ventas"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("hook")


@pytest.mark.asyncio
async def test_tiktok_ads_requires_auth(client: AsyncClient):
    r = await client.get("/api/tiktok-ads/metrics")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_instagram_requires_auth(client: AsyncClient):
    r = await client.get("/api/instagram-dm/conversations")
    assert r.status_code in (401, 403)

"""F65 — Snapchat Ads + Text-2-Pay + PR Digital."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_snapchat_status_mock(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/snapchat-ads/status", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("mock") is True


@pytest.mark.asyncio
async def test_snapchat_create_campaign(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/snapchat-ads/campaigns",
        json={"name": "F65 Snap", "objective": "traffic", "daily_budget_eur": 40},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("campaign_id")


@pytest.mark.asyncio
async def test_snapchat_list_campaigns(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/snapchat-ads/campaigns",
        json={"name": "List Snap", "objective": "awareness"},
        headers=auth_headers,
    )
    r = await client.get("/api/snapchat-ads/campaigns", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json().get("campaigns", [])) >= 1


@pytest.mark.asyncio
async def test_snapchat_metrics(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/snapchat-ads/metrics", headers=auth_headers)
    assert r.status_code == 200
    assert "swipe_ups" in r.json()


@pytest.mark.asyncio
async def test_snapchat_suggest(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/snapchat-ads/suggest",
        json={"product": "NELVYON", "goal": "awareness"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("headline")


@pytest.mark.asyncio
async def test_snapchat_invalid_objective(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/snapchat-ads/campaigns",
        json={"name": "Bad", "objective": "invalid_obj"},
        headers=auth_headers,
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_snapchat_requires_auth(client: AsyncClient):
    r = await client.get("/api/snapchat-ads/campaigns")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_text2pay_create_sms(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/text2pay/create",
        json={
            "client_id": "f65-t2p",
            "lead_phone": "+34600111222",
            "amount": 49.99,
            "description": "Cobro demo F65",
            "channel": "sms",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("stripe_payment_link")
    assert r.json().get("status") == "pending"


@pytest.mark.asyncio
async def test_text2pay_create_whatsapp(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/text2pay/create",
        json={
            "client_id": "f65-wa",
            "lead_phone": "34600333444",
            "amount": 120,
            "description": "WhatsApp cobro",
            "channel": "whatsapp",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("channel") == "whatsapp"


@pytest.mark.asyncio
async def test_text2pay_list_payments(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/text2pay/create",
        json={
            "client_id": "f65-list",
            "lead_phone": "+34600555666",
            "amount": 10,
            "description": "List test",
            "channel": "sms",
        },
        headers=auth_headers,
    )
    r = await client.get("/api/text2pay/payments?client_id=f65-list", headers=auth_headers)
    assert r.status_code == 200
    assert "stats" in r.json()


@pytest.mark.asyncio
async def test_text2pay_get_payment(client: AsyncClient, auth_headers: dict):
    gen = await client.post(
        "/api/text2pay/create",
        json={
            "lead_phone": "+34600777888",
            "amount": 25,
            "description": "Get one",
            "channel": "sms",
        },
        headers=auth_headers,
    )
    pid = gen.json()["id"]
    r = await client.get(f"/api/text2pay/payments/{pid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("id") == pid


@pytest.mark.asyncio
async def test_text2pay_webhook_paid(client: AsyncClient, auth_headers: dict):
    gen = await client.post(
        "/api/text2pay/create",
        json={
            "lead_phone": "+34600999000",
            "amount": 15,
            "description": "Webhook test",
            "channel": "sms",
        },
        headers=auth_headers,
    )
    pid = gen.json()["id"]
    wh = await client.post(
        "/api/text2pay/webhook",
        json={
            "type": "checkout.session.completed",
            "data": {"object": {"metadata": {"text2pay_id": pid}}},
        },
    )
    assert wh.status_code == 200
    assert wh.json().get("status") == "paid"
    got = await client.get(f"/api/text2pay/payments/{pid}", headers=auth_headers)
    assert got.json().get("status") == "paid"


@pytest.mark.asyncio
async def test_text2pay_requires_auth(client: AsyncClient):
    r = await client.get("/api/text2pay/payments")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_pr_generate(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/pr/generate",
        json={
            "client_id": "f65-pr",
            "company": "Acme SL",
            "sector": "tech",
            "news": "Lanza plataforma IA para retail en España",
            "type": "press_release",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("content")
    assert r.json().get("id")


@pytest.mark.asyncio
async def test_pr_headlines(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/pr/headlines",
        json={"company": "Acme", "sector": "saas", "news": "Nueva ronda Serie A"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert len(r.json().get("headlines", [])) == 5


@pytest.mark.asyncio
async def test_pr_crisis(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/pr/crisis",
        json={
            "company": "Acme",
            "sector": "salud",
            "situation": "Incidencia temporal en servicio cloud",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("content")


@pytest.mark.asyncio
async def test_pr_releases_list(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/pr/generate",
        json={"client_id": "f65-rel", "company": "Beta", "sector": "moda", "news": "Colección otoño 2026"},
        headers=auth_headers,
    )
    r = await client.get("/api/pr/releases?client_id=f65-rel", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json().get("releases", [])) >= 1


@pytest.mark.asyncio
async def test_pr_media_list(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/pr/media-list/gastronomia", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json().get("media", [])) >= 1


@pytest.mark.asyncio
async def test_pr_requires_auth(client: AsyncClient):
    r = await client.get("/api/pr/releases")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_text2pay_invalid_amount(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/text2pay/create",
        json={"lead_phone": "+34600", "amount": -5, "description": "bad", "channel": "sms"},
        headers=auth_headers,
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_pr_bio_generate(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/pr/generate",
        json={
            "company": "Gamma Corp",
            "sector": "saas",
            "news": "15 años innovando en automatización",
            "type": "bio",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("type") == "bio"

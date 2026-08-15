"""F60 — Google Ads, Meta Ads, unified ads agent integration tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_google_ads_status(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/google-ads/status", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "mock" in body


@pytest.mark.asyncio
async def test_google_ads_list_campaigns(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/google-ads/campaigns", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    assert "campaigns" in r.json()


@pytest.mark.asyncio
async def test_google_ads_reporting(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/google-ads/reporting", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    assert "summary" in r.json()


@pytest.mark.asyncio
async def test_google_ads_create_campaign(client: AsyncClient, super_admin_headers: dict):
    r = await client.post(
        "/api/google-ads/campaigns",
        json={
            "name": "F60 Test Search",
            "campaign_type": "SEARCH",
            "daily_budget_eur": 40,
            "headlines": ["NELVYON IA", "ROAS real"],
            "descriptions": ["Automatiza paid media"],
        },
        headers=super_admin_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("campaign_id")


@pytest.mark.asyncio
async def test_google_ads_upload_ad_copy(client: AsyncClient, super_admin_headers: dict):
    r = await client.post(
        "/api/google-ads/creatives/ad-copy",
        json={
            "campaign_id": "100001",
            "headlines": ["Headline A"],
            "descriptions": ["Desc A"],
        },
        headers=super_admin_headers,
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_meta_ads_status(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/meta-ads/status", headers=super_admin_headers)
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_meta_ads_list_campaigns(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/meta-ads/campaigns", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    assert len(r.json().get("campaigns", [])) >= 1


@pytest.mark.asyncio
async def test_meta_ads_reporting(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/meta-ads/reporting", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    assert "summary" in r.json()


@pytest.mark.asyncio
async def test_meta_ads_create_campaign(client: AsyncClient, super_admin_headers: dict):
    r = await client.post(
        "/api/meta-ads/campaigns",
        json={
            "name": "F60 Meta Test",
            "daily_budget_eur": 55,
            "primary_text": "Escala con IA",
            "headline": "NELVYON",
        },
        headers=super_admin_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("campaign_id")


@pytest.mark.asyncio
async def test_meta_ads_upload_creative(client: AsyncClient, super_admin_headers: dict):
    r = await client.post(
        "/api/meta-ads/creatives",
        json={
            "image_url": "https://nelvyon.com/og-image.png",
            "primary_text": "Copy IA",
            "headline": "Imperio digital",
        },
        headers=super_admin_headers,
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_ads_agent_briefing_no_launch(client: AsyncClient, super_admin_headers: dict):
    r = await client.post(
        "/api/ads-agent/briefing",
        json={
            "product": "NELVYON",
            "audience": "SaaS ES",
            "goal": "leads",
            "daily_budget_eur": 90,
            "launch": False,
        },
        headers=super_admin_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("strategy")
    assert body.get("launched") is False


@pytest.mark.asyncio
async def test_ads_agent_briefing_with_launch(client: AsyncClient, super_admin_headers: dict):
    r = await client.post(
        "/api/ads-agent/briefing",
        json={
            "product": "NELVYON F60",
            "audience": "CMOs",
            "daily_budget_eur": 100,
            "launch": True,
        },
        headers=super_admin_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("launched") is True
    assert body.get("google")
    assert body.get("meta")


@pytest.mark.asyncio
async def test_ads_agent_unified_reporting(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/ads-agent/reporting/unified", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "google" in body and "meta" in body and "unified" in body


@pytest.mark.asyncio
async def test_ads_agent_optimize(client: AsyncClient, super_admin_headers: dict):
    r = await client.post("/api/ads-agent/optimize?roas_threshold=2", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    assert "actions" in r.json()


@pytest.mark.asyncio
async def test_ads_agent_roas_alerts(client: AsyncClient, super_admin_headers: dict):
    r = await client.get("/api/ads-agent/alerts/roas?threshold=1.5", headers=super_admin_headers)
    assert r.status_code == 200, r.text
    assert "alerts" in r.json()


@pytest.mark.asyncio
async def test_google_ads_requires_platform_authority(
    client: AsyncClient, auth_headers: dict, super_admin_headers: dict
):
    """
    Antes se exigia `X-Workspace-Id`. Dejo de tener sentido al establecerse que
    la cuenta Google Ads es corporativa y unica: la cabecera de workspace no
    acredita nada aqui. Lo que si debe cumplirse es que un rol de workspace no
    alcance el recurso, y que la ausencia de la cabecera no afecte al admin de
    plataforma.
    """
    r = await client.get("/api/google-ads/campaigns", headers=auth_headers)
    assert r.status_code == 403, r.text

    sin_ws = {k: v for k, v in super_admin_headers.items() if k != "X-Workspace-Id"}
    r = await client.get("/api/google-ads/campaigns", headers=sin_ws)
    assert r.status_code == 200, r.text

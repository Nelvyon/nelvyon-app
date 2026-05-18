"""
B1-1 — Domain consolidation signals for campaigns.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_campaigns_domain_marked_official(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/entities/campaigns?limit=1", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.headers.get("X-Campaign-Domain") == "official_campaigns"
    assert r.headers.get("X-Campaign-Official-Domain") == "campaigns"


@pytest.mark.asyncio
async def test_nelvyon_campaigns_domain_marked_legacy(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/entities/nelvyon_campaigns?limit=1", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.headers.get("X-Campaign-Domain") == "legacy_nelvyon_campaigns"
    assert r.headers.get("X-Campaign-Official-Domain") == "campaigns"
    assert r.headers.get("Deprecation") == "true"
    assert r.headers.get("Sunset") is not None
    link = r.headers.get("Link") or ""
    assert 'rel="successor-version"' in link
    assert "/api/v1/entities/campaigns" in link

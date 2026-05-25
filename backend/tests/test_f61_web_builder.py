"""F61 — Web Builder IA, nelvyon home APIs, social auto-publish."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

BRIEFING = {
    "client_id": "f61-client-1",
    "business_name": "Clínica Nova",
    "sector": "salud",
    "primary_color": "#0066FF",
    "secondary_color": "#000000",
    "description": "Clínica dental premium en Madrid.",
    "city": "Madrid",
    "services": ["Ortodoncia", "Implantes", "Blanqueamiento"],
}


@pytest.mark.asyncio
async def test_web_builder_generate(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("website_id")
    assert "<html" in body.get("html", "").lower() or "<!DOCTYPE" in body.get("html", "")


@pytest.mark.asyncio
async def test_web_builder_generate_has_slug(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("slug")


@pytest.mark.asyncio
async def test_web_builder_generate_subdomain(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    assert ".nelvyon.com" in r.json().get("subdomain", "")


@pytest.mark.asyncio
async def test_web_builder_preview(client: AsyncClient, auth_headers: dict):
    gen = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    wid = gen.json()["website_id"]
    r = await client.get(f"/api/web-builder/preview/{wid}", headers=auth_headers)
    assert r.status_code == 200
    assert "html" in r.text.lower() or "Clínica" in r.text


@pytest.mark.asyncio
async def test_web_builder_history(client: AsyncClient, auth_headers: dict):
    await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    r = await client.get("/api/web-builder/history/f61-client-1", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json().get("items", [])) >= 1


@pytest.mark.asyncio
async def test_web_builder_publish(client: AsyncClient, auth_headers: dict):
    gen = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    wid = gen.json()["website_id"]
    r = await client.post("/api/web-builder/publish", json={"website_id": wid}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("subdomain")


@pytest.mark.asyncio
async def test_web_builder_regenerate_section(client: AsyncClient, auth_headers: dict):
    gen = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    wid = gen.json()["website_id"]
    r = await client.post(
        "/api/web-builder/generate",
        json={**BRIEFING, "website_id": wid, "regenerate_section": "hero"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["version"] >= 1


@pytest.mark.asyncio
async def test_web_builder_restore(client: AsyncClient, auth_headers: dict):
    gen = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    wid = gen.json()["website_id"]
    r = await client.post(
        "/api/web-builder/restore",
        json={"client_id": "f61-client-1", "website_id": wid},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("restored_from") == wid


@pytest.mark.asyncio
async def test_web_builder_publish_not_found(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/web-builder/publish", json={"website_id": 999999}, headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_web_builder_preview_not_found(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/web-builder/preview/999999", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_social_publish_settings_get(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/social-publish/settings/f61-social", headers=auth_headers)
    assert r.status_code == 200
    assert "frequency" in r.json()


@pytest.mark.asyncio
async def test_social_publish_settings_put(client: AsyncClient, auth_headers: dict):
    r = await client.put(
        "/api/social-publish/settings",
        json={"client_id": "f61-social", "enabled": True, "frequency": "daily", "sector": "saas"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json().get("enabled") is True


@pytest.mark.asyncio
async def test_social_publish_preview(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/social-publish/preview",
        json={"client_id": "f61-social", "sector": "ecommerce", "platform": "instagram"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body.get("caption")
    assert body.get("image_url")


@pytest.mark.asyncio
async def test_social_publish_schedule(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/social-publish/schedule",
        json={
            "client_id": "f61-social",
            "sector": "saas",
            "platforms": ["instagram", "twitter"],
            "frequency": "weekly",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert len(r.json().get("scheduled", [])) >= 1


@pytest.mark.asyncio
async def test_social_publish_now(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/social-publish/publish-now",
        json={"client_id": "f61-social", "sector": "saas"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert len(r.json().get("published", [])) >= 1


@pytest.mark.asyncio
async def test_social_publish_calendar(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/social-publish/publish-now",
        json={"client_id": "f61-cal", "sector": "legal"},
        headers=auth_headers,
    )
    r = await client.get("/api/social-publish/calendar/f61-cal", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json().get("items"), list)


@pytest.mark.asyncio
async def test_social_publish_analytics(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/social-publish/publish-now",
        json={"client_id": "f61-analytics", "sector": "hosteleria"},
        headers=auth_headers,
    )
    r = await client.get("/api/social-publish/analytics/f61-analytics", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json().get("by_platform"), dict)


@pytest.mark.asyncio
async def test_web_builder_requires_auth(client: AsyncClient):
    r = await client.post("/api/web-builder/generate", json=BRIEFING)
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_social_publish_requires_auth(client: AsyncClient):
    r = await client.get("/api/social-publish/settings/x")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_web_builder_sections_in_response(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    sections = r.json().get("sections", [])
    types = {s.get("section_type") for s in sections}
    assert "hero" in types or len(sections) >= 1


@pytest.mark.asyncio
async def test_web_builder_mock_html_seo(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/web-builder/generate", json=BRIEFING, headers=auth_headers)
    html = r.json().get("html", "")
    assert "schema.org" in html or "og:" in html or "meta" in html


@pytest.mark.asyncio
async def test_social_publish_mock_flag(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/social-publish/publish-now",
        json={"client_id": "f61-mock", "sector": "servicios"},
        headers=auth_headers,
    )
    assert r.json().get("mock") is True

"""Frente 48 — HTTP integration tests for webinars."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.fakes import FakeWebinarService
from tests.integration_helpers import skip_pg_schema_migrations


@pytest.fixture
def webinar_fake(monkeypatch):
    skip_pg_schema_migrations()

    def _factory(session, workspace_id=None):
        return FakeWebinarService(session, workspace_id or 1)

    monkeypatch.setattr("routers.webinars.get_webinar_service", _factory)
    monkeypatch.setattr("services.webinar_service.get_webinar_service", _factory)
    monkeypatch.setattr("services.webinar_service.WebinarService", FakeWebinarService)
    return FakeWebinarService(workspace_id=1)


@pytest.mark.asyncio
async def test_webinar_create(client: AsyncClient, auth_headers: dict, webinar_fake: FakeWebinarService):
    suffix = uuid4().hex[:6]
    r = await client.post(
        "/api/webinars",
        json={"title": f"Webinar {suffix}", "description": "Demo session", "is_free": True},
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["title"] == f"Webinar {suffix}"


@pytest.mark.asyncio
async def test_webinar_register_attendee(client: AsyncClient, auth_headers: dict, webinar_fake: FakeWebinarService):
    created = await client.post(
        "/api/webinars",
        json={"title": "Register Test", "is_free": True},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    webinar_id = created.json()["id"]
    r = await client.post(
        f"/api/webinars/{webinar_id}/register",
        json={"email": "attendee@example.com", "name": "Attendee One"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "attendee@example.com"


@pytest.mark.asyncio
async def test_webinar_attendees_via_stats(client: AsyncClient, auth_headers: dict, webinar_fake: FakeWebinarService):
    created = await client.post(
        "/api/webinars",
        json={"title": "Stats Test", "is_free": True},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    webinar_id = created.json()["id"]
    await client.post(
        f"/api/webinars/{webinar_id}/register",
        json={"email": "a1@example.com", "name": "A1"},
    )
    await client.post(
        f"/api/webinars/{webinar_id}/register",
        json={"email": "a2@example.com", "name": "A2"},
    )
    r = await client.get(f"/api/webinars/{webinar_id}/stats", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("registrations", 0) >= 2 or len(body.get("attendees", [])) >= 2

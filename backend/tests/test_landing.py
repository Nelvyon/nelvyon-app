"""Frente 48 — HTTP integration tests for landing builder."""

from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.fakes import FakeLandingService
from tests.integration_helpers import skip_pg_schema_migrations


@pytest.fixture
def landing_fake(monkeypatch):
    skip_pg_schema_migrations()
    fake = FakeLandingService(workspace_id=1)

    def _factory(session, workspace_id=None):
        return fake

    monkeypatch.setattr("routers.landing_builder.get_landing_builder_service", _factory)
    monkeypatch.setattr("services.landing_builder_service.get_landing_builder_service", _factory)
    return fake


@pytest.mark.asyncio
async def test_landing_generate_create_page(client: AsyncClient, auth_headers: dict, landing_fake: FakeLandingService):
    suffix = uuid4().hex[:6]
    with patch(
        "services.landing_builder_service.LandingBuilderService.create_page",
        wraps=landing_fake.create_page,
    ):
        r = await client.post(
            "/api/landing/pages",
            json={
                "name": f"AI Landing {suffix}",
                "blocks": [{"type": "hero", "props": {"headline": "GPT-4o generated"}}],
                "meta": {"source": "gpt-4o-mock"},
            },
            headers=auth_headers,
        )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == f"AI Landing {suffix}"
    assert body["id"] in landing_fake.pages


@pytest.mark.asyncio
async def test_landing_get_page(client: AsyncClient, auth_headers: dict, landing_fake: FakeLandingService):
    created = await client.post(
        "/api/landing/pages",
        json={"name": "Get Me", "blocks": []},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    page_id = created.json()["id"]
    r = await client.get(f"/api/landing/pages/{page_id}", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == page_id


@pytest.mark.asyncio
async def test_landing_publish_page(client: AsyncClient, auth_headers: dict, landing_fake: FakeLandingService):
    created = await client.post(
        "/api/landing/pages",
        json={"name": "Publish Me", "blocks": []},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    page_id = created.json()["id"]
    r = await client.post(f"/api/landing/pages/{page_id}/publish", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "published"

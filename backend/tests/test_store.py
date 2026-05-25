"""Frente 48 — HTTP integration tests for OS store builder."""

from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.fakes import FakeStoreService
from tests.integration_helpers import skip_pg_schema_migrations


@pytest.fixture
def store_fake(monkeypatch):
    skip_pg_schema_migrations()
    fake = FakeStoreService(workspace_id=1)

    def _factory(session, workspace_id=None):
        return fake

    monkeypatch.setattr("routers.os_store_builder.get_os_store_builder_service", _factory)
    monkeypatch.setattr("services.os_store_builder_service.get_os_store_builder_service", _factory)
    return fake


@pytest.mark.asyncio
async def test_store_generate_mock_ai(client: AsyncClient, auth_headers: dict, store_fake: FakeStoreService):
    suffix = uuid4().hex[:6]
    project = await client.post(
        "/api/os/store/projects",
        json={"store_info": {"store_name": f"Shop {suffix}", "sector": "retail", "language": "es"}},
        headers=auth_headers,
    )
    assert project.status_code == 201, project.text
    project_id = project.json()["id"]

    with patch("routers.os_store_builder.start_store_generation") as mock_worker:
        mock_worker.return_value = None
        r = await client.post(f"/api/os/store/projects/{project_id}/generate", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("project_id") == project_id
    assert body.get("status") in ("generating", "pending")
    mock_worker.assert_called_once_with(project_id)


@pytest.mark.asyncio
async def test_store_get_project(client: AsyncClient, auth_headers: dict, store_fake: FakeStoreService):
    project = await client.post(
        "/api/os/store/projects",
        json={"store_info": {"store_name": "Get Store", "sector": "tech"}},
        headers=auth_headers,
    )
    assert project.status_code == 201, project.text
    project_id = project.json()["id"]
    r = await client.get(f"/api/os/store/projects/{project_id}", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == project_id


@pytest.mark.asyncio
async def test_store_publish(client: AsyncClient, auth_headers: dict, store_fake: FakeStoreService):
    project = await client.post(
        "/api/os/store/projects",
        json={"store_info": {"store_name": "Publish Store"}},
        headers=auth_headers,
    )
    assert project.status_code == 201, project.text
    project_id = project.json()["id"]
    r = await client.post(f"/api/os/store/projects/{project_id}/publish", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "published"

"""Frente 48 — HTTP integration tests for forms."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.fakes import FakeFormsService
from tests.integration_helpers import skip_pg_schema_migrations


@pytest.fixture
def forms_fake(monkeypatch):
    skip_pg_schema_migrations()

    def _factory(session, workspace_id=None):
        return FakeFormsService(session, workspace_id or 1)

    monkeypatch.setattr("routers.forms.get_forms_service", _factory)
    monkeypatch.setattr("services.forms_service.get_forms_service", _factory)
    monkeypatch.setattr("services.forms_service.FormsService", FakeFormsService)
    return FakeFormsService(workspace_id=1)


@pytest.mark.asyncio
async def test_form_create(client: AsyncClient, auth_headers: dict, forms_fake: FakeFormsService):
    suffix = uuid4().hex[:6]
    r = await client.post(
        "/api/forms",
        json={
            "title": f"Contact Form {suffix}",
            "description": "Lead capture",
            "fields": [{"name": "email", "type": "email", "label": "Email"}],
        },
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["title"] == f"Contact Form {suffix}"


@pytest.mark.asyncio
async def test_form_submit_response(client: AsyncClient, auth_headers: dict, forms_fake: FakeFormsService):
    created = await client.post(
        "/api/forms",
        json={"title": "Submit Test", "fields": [{"name": "email", "type": "email"}]},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    form_id = created.json()["id"]
    r = await client.post(
        f"/api/forms/{form_id}/submit",
        json={"responses": {"email": "visitor@example.com"}, "visitor_info": {"ip": "127.0.0.1"}},
    )
    assert r.status_code == 200, r.text
    assert r.json()["responses"]["email"] == "visitor@example.com"


@pytest.mark.asyncio
async def test_form_list_responses(client: AsyncClient, auth_headers: dict, forms_fake: FakeFormsService):
    created = await client.post(
        "/api/forms",
        json={"title": "Responses Test", "fields": [{"name": "name", "type": "text"}]},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    form_id = created.json()["id"]
    await client.post(
        f"/api/forms/{form_id}/submit",
        json={"responses": {"name": "Alice"}},
    )
    r = await client.get(f"/api/forms/{form_id}/responses", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert len(r.json()["items"]) >= 1

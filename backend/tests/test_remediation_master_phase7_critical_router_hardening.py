"""
NELVYON-REMEDIATION-1 Fase 7 — hardening crítico de routers con workspace_id real.
"""
import uuid

import pytest
from httpx import AsyncClient
from core.auth import create_access_token


@pytest.fixture
def auth_only_headers() -> dict:
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_workspace_members_requires_workspace_header(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/entities/workspace_members", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_workspace_members_member_cannot_create(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/workspace_members",
        headers=member_headers,
        json={
            "workspace_id": 1,
            "user_id": "phase7-user-noop",
            "email": "phase7-member@test.com",
            "role": "member",
            "status": "active",
        },
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_quality_metrics_requires_workspace_header(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/entities/nelvyon_quality_metrics", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_quality_metrics_operator_create_sets_workspace(client: AsyncClient, auth_headers: dict):
    suffix = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/nelvyon_quality_metrics",
        headers=auth_headers,
        json={
            "service_id": f"phase7-svc-{suffix}",
            "service_name": "Phase7 Service",
            "category": "ops",
            "score": 90,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body.get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_bot_templates_requires_workspace_header(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/entities/nelvyon_bot_templates", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_bot_templates_operator_create_sets_workspace(client: AsyncClient, auth_headers: dict):
    suffix = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/nelvyon_bot_templates",
        headers=auth_headers,
        json={
            "template_id": f"phase7-template-{suffix}",
            "name": "Phase7 Template",
            "category": "support",
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body.get("workspace_id") == int(auth_headers["X-Workspace-Id"])

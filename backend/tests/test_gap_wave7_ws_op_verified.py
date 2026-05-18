"""
Oleada 7 — perfil JWT (`user`), RBAC plataforma, `platform_settings`,
`social_posts` (alcance workspace vía cliente/proyecto).

Ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.
"""
import uuid

import pytest
from httpx import AsyncClient


async def _create_client(client: AsyncClient, headers: dict) -> int:
    suf = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/nelvyon_clients",
        headers=headers,
        json={"business_name": f"W7{suf}", "sector": "saas"},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


# --- user.py (JWT self-scope; sin X-Workspace-Id) ---


@pytest.mark.asyncio
async def test_users_profile_requires_auth(client: AsyncClient):
    r = await client.get("/api/v1/users/profile")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_users_profile_get_ok(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/users/profile", headers={"Authorization": tok})
    assert r.status_code == 200, r.text
    assert r.json().get("id") == "test-user-00000000-0000-0000-0000-000000000001"


@pytest.mark.asyncio
async def test_users_profile_put_ok(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    suf = uuid.uuid4().hex[:6]
    r = await client.put(
        "/api/v1/users/profile",
        headers={"Authorization": tok},
        json={"name": f"TN{suf}"},
    )
    assert r.status_code == 200, r.text
    assert f"TN{suf}" in (r.json().get("name") or "")


# --- platform_settings (plataforma; mutación admin) ---


@pytest.mark.asyncio
async def test_platform_settings_get_authenticated_ok(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/platform-settings", headers={"Authorization": tok})
    assert r.status_code == 200, r.text
    assert "company_name" in r.json()


@pytest.mark.asyncio
async def test_platform_settings_put_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.put(
        "/api/v1/platform-settings",
        headers=member_headers,
        json={"company_name": "X"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_platform_settings_put_admin_ok(client: AsyncClient, admin_headers: dict):
    r = await client.put(
        "/api/v1/platform-settings",
        headers=admin_headers,
        json={"timezone": "UTC"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("timezone") == "UTC"


# --- rbac_management (plataforma admin) ---


@pytest.mark.asyncio
async def test_rbac_roles_definitions_authenticated_ok(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/rbac/roles", headers={"Authorization": tok})
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


@pytest.mark.asyncio
async def test_rbac_assignments_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.get("/api/v1/rbac/assignments", headers=member_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_rbac_assignments_admin_ok(client: AsyncClient, admin_headers: dict):
    r = await client.get("/api/v1/rbac/assignments", headers=admin_headers)
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_rbac_assign_member_forbidden(client: AsyncClient, auth_headers: dict):
    tid = f"rbac-target-{uuid.uuid4().hex[:12]}"
    r = await client.post(
        "/api/v1/rbac/assign",
        headers=auth_headers,
        json={"target_user_id": tid, "role": "viewer"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_rbac_assign_admin_ok(client: AsyncClient, admin_headers: dict):
    tid = f"rbac-target-{uuid.uuid4().hex[:12]}"
    r = await client.post(
        "/api/v1/rbac/assign",
        headers=admin_headers,
        json={"target_user_id": tid, "email": f"{tid}@t.com", "role": "viewer"},
    )
    assert r.status_code == 201, r.text
    assert r.json().get("role") == "viewer"


# --- social_posts (WS vía cliente/proyecto; OP mutaciones) ---


@pytest.mark.asyncio
async def test_social_posts_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/entities/social_posts", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_social_posts_member_cannot_create(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/social_posts",
        headers=member_headers,
        json={
            "platform": "ig",
            "content": "c",
            "status": "draft",
        },
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_social_posts_operator_create_orphan_ok(client: AsyncClient, auth_headers: dict):
    suf = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/social_posts",
        headers=auth_headers,
        json={
            "platform": "linkedin",
            "content": f"post-{suf}",
            "status": "draft",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json().get("user_id") == "test-user-00000000-0000-0000-0000-000000000001"


@pytest.mark.asyncio
async def test_social_posts_operator_create_with_client_ok(client: AsyncClient, auth_headers: dict):
    cid = await _create_client(client, auth_headers)
    suf = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/social_posts",
        headers=auth_headers,
        json={
            "platform": "x",
            "content": f"cc-{suf}",
            "status": "draft",
            "client_id": cid,
        },
    )
    assert r.status_code == 201, r.text
    assert r.json().get("client_id") == cid


@pytest.mark.asyncio
async def test_social_posts_all_super_admin_only(
    client: AsyncClient, admin_headers: dict, super_admin_headers: dict
):
    assert (await client.get("/api/v1/entities/social_posts/all", headers=admin_headers)).status_code == 403
    r = await client.get("/api/v1/entities/social_posts/all", headers=super_admin_headers)
    assert r.status_code == 200, r.text

"""
OS-1-09 — /api/v1/portal client portal tests.
"""
import uuid

import pytest
from httpx import AsyncClient

CLIENTS_BASE = "/api/v1/os/clients"
PROJECTS_BASE = "/api/v1/os/projects"
DELIVERABLES_BASE = "/api/v1/os/deliverables"
PORTAL_BASE = "/api/v1/portal"


async def _create_client(client: AsyncClient, headers: dict, *, name: str) -> dict:
    r = await client.post(
        CLIENTS_BASE,
        headers=headers,
        json={"business_name": name, "sector": "tech"},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_project(
    client: AsyncClient, headers: dict, *, client_id: str, name: str, status: str = "active"
) -> dict:
    r = await client.post(
        PROJECTS_BASE,
        headers=headers,
        json={"client_id": client_id, "name": name, "status": status, "priority": "medium"},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_and_publish_deliverable(
    client: AsyncClient,
    headers: dict,
    *,
    client_id: str,
    project_id: str,
    title: str,
    visibility: str = "internal",
) -> dict:
    r = await client.post(
        DELIVERABLES_BASE,
        headers=headers,
        json={
            "client_id": client_id,
            "project_id": project_id,
            "title": title,
            "visibility": visibility,
        },
    )
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    for step in ("submit-review", "deliver", "approve", "publish"):
        wr = await client.post(f"{DELIVERABLES_BASE}/{did}/{step}", headers=headers)
        assert wr.status_code == 200, wr.text
    return r.json()


async def _create_draft_deliverable(
    client: AsyncClient,
    headers: dict,
    *,
    client_id: str,
    project_id: str,
    title: str,
) -> dict:
    r = await client.post(
        DELIVERABLES_BASE,
        headers=headers,
        json={"client_id": client_id, "project_id": project_id, "title": title},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _portal_user_headers(
    client: AsyncClient,
    operator_headers: dict,
    *,
    client_id: str,
    email: str,
    password: str = "PortalPass123!",
) -> dict:
    inv = await client.post(
        f"{PORTAL_BASE}/invites",
        headers=operator_headers,
        json={"client_id": client_id, "email": email},
    )
    assert inv.status_code == 201, inv.text
    token = inv.json()["token"]
    acc = await client.post(
        f"{PORTAL_BASE}/auth/accept-invite",
        json={"token": token, "password": password, "name": "Portal User"},
    )
    assert acc.status_code == 200, acc.text
    access = acc.json()["access_token"]
    return {"Authorization": f"Bearer {access}"}


@pytest.fixture
def operator_headers():
    from core.auth import create_access_token

    token = create_access_token(
        {
            "sub": "operator-user-00000000-0000-0000-0000-000000000077",
            "email": "operator@test.com",
            "name": "Operator User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "1"}


@pytest.fixture
async def seed_portal_operator(db_session):
    from sqlalchemy import text

    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO users (id, email, name, role)
            VALUES ('operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'Operator', 'user')
            """
        )
    )
    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, email, role, status)
            VALUES (1, 'operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'operator', 'active')
            """
        )
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_portal_client_sees_own_projects(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"PClient {suf}")
    await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"My Project {suf}"
    )
    email = f"portal_{suf}@test.com"
    portal_h = await _portal_user_headers(
        client, operator_headers, client_id=os_client["id"], email=email
    )

    r = await client.get(f"{PORTAL_BASE}/projects", headers=portal_h)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert any(f"My Project {suf}" in i["name"] for i in items)


@pytest.mark.asyncio
async def test_portal_client_does_not_see_other_projects(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    client_a = await _create_client(client, auth_headers, name=f"PA {suf}")
    client_b = await _create_client(client, auth_headers, name=f"PB {suf}")
    await _create_project(client, auth_headers, client_id=client_a["id"], name=f"ProjA {suf}")
    await _create_project(client, auth_headers, client_id=client_b["id"], name=f"ProjB {suf}")

    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=client_a["id"],
        email=f"pa_{suf}@test.com",
    )
    r = await client.get(f"{PORTAL_BASE}/projects", headers=portal_h)
    names = [i["name"] for i in r.json()["items"]]
    assert any(f"ProjA {suf}" in n for n in names)
    assert not any(f"ProjB {suf}" in n for n in names)


@pytest.mark.asyncio
async def test_portal_client_sees_published_deliverables(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"DClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"DProj {suf}"
    )
    await _create_and_publish_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Published {suf}",
    )
    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"del_{suf}@test.com",
    )
    r = await client.get(f"{PORTAL_BASE}/deliverables", headers=portal_h)
    assert r.status_code == 200
    assert any(f"Published {suf}" in i["title"] for i in r.json()["items"])


@pytest.mark.asyncio
async def test_portal_client_does_not_see_internal_deliverables(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"IClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"IProj {suf}"
    )
    await _create_draft_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"DraftOnly {suf}",
    )
    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"int_{suf}@test.com",
    )
    r = await client.get(f"{PORTAL_BASE}/deliverables", headers=portal_h)
    assert r.status_code == 200
    assert not any(f"DraftOnly {suf}" in i["title"] for i in r.json()["items"])


@pytest.mark.asyncio
async def test_portal_invalid_token_rejected(client: AsyncClient):
    bad = {"Authorization": "Bearer invalid.portal.token"}
    assert (await client.get(f"{PORTAL_BASE}/me", headers=bad)).status_code == 401
    assert (await client.get(f"{PORTAL_BASE}/projects", headers=bad)).status_code == 401


@pytest.mark.asyncio
async def test_portal_cross_access_blocked(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    client_a = await _create_client(client, auth_headers, name=f"CA {suf}")
    client_b = await _create_client(client, auth_headers, name=f"CB {suf}")
    proj_b = await _create_project(
        client, auth_headers, client_id=client_b["id"], name=f"CrossProj {suf}"
    )
    del_b = await _create_and_publish_deliverable(
        client,
        auth_headers,
        client_id=client_b["id"],
        project_id=proj_b["id"],
        title=f"CrossDel {suf}",
    )

    portal_a = await _portal_user_headers(
        client,
        operator_headers,
        client_id=client_a["id"],
        email=f"cross_{suf}@test.com",
    )
    assert (
        await client.get(f"{PORTAL_BASE}/projects/{proj_b['id']}", headers=portal_a)
    ).status_code == 404
    assert (
        await client.get(f"{PORTAL_BASE}/deliverables/{del_b['id']}", headers=portal_a)
    ).status_code == 404


@pytest.mark.asyncio
async def test_portal_me_and_login(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"MeClient {suf}")
    email = f"me_{suf}@test.com"
    password = "PortalPass123!"
    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=email,
        password=password,
    )

    me = await client.get(f"{PORTAL_BASE}/me", headers=portal_h)
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == email
    assert body["client_id"] == os_client["id"]
    assert body["workspace_id"] == 1

    login = await client.post(
        f"{PORTAL_BASE}/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]


@pytest.mark.asyncio
async def test_portal_platform_token_rejected_on_portal_routes(
    client: AsyncClient, auth_headers: dict
):
    r = await client.get(f"{PORTAL_BASE}/me", headers=auth_headers)
    assert r.status_code == 401

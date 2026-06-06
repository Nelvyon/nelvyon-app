"""
OS-1-06 — /api/v1/os/projects REST API tests.
"""
import uuid

import pytest
from httpx import AsyncClient

CLIENTS_BASE = "/api/v1/os/clients"
PROJECTS_BASE = "/api/v1/os/projects"


@pytest.fixture
def viewer_headers():
    from core.auth import create_access_token

    token = create_access_token(
        {
            "sub": "viewer-user-00000000-0000-0000-0000-000000000088",
            "email": "viewer@test.com",
            "name": "Viewer User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "1"}


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
async def seed_os_rbac_members(db_session):
    from sqlalchemy import text

    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO users (id, email, name, role)
            VALUES
            ('viewer-user-00000000-0000-0000-0000-000000000088', 'viewer@test.com', 'Viewer', 'user'),
            ('operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'Operator', 'user')
            """
        )
    )
    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, email, role, status)
            VALUES
            (1, 'viewer-user-00000000-0000-0000-0000-000000000088', 'viewer@test.com', 'viewer', 'active'),
            (1, 'operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'operator', 'active')
            """
        )
    )
    await db_session.commit()


async def _create_os_client(client: AsyncClient, headers: dict, *, name: str) -> dict:
    r = await client.post(
        CLIENTS_BASE,
        headers=headers,
        json={"business_name": name, "sector": "tech"},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_project(
    client: AsyncClient,
    headers: dict,
    *,
    client_id: str,
    name: str,
    status: str = "active",
    priority: str = "medium",
) -> dict:
    r = await client.post(
        PROJECTS_BASE,
        headers=headers,
        json={
            "client_id": client_id,
            "name": name,
            "status": status,
            "priority": priority,
            "description": f"Desc {name}",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.asyncio
async def test_os_projects_crud_owner(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"Client {suf}")
    created = await _create_project(
        client,
        auth_headers,
        client_id=os_client["id"],
        name=f"Project {suf}",
    )
    pid = created["id"]
    assert created["workspace_id"] == 1
    assert created["client_id"] == os_client["id"]

    got = await client.get(f"{PROJECTS_BASE}/{pid}", headers=auth_headers)
    assert got.status_code == 200

    patched = await client.patch(
        f"{PROJECTS_BASE}/{pid}",
        headers=auth_headers,
        json={"priority": "high", "description": "Updated"},
    )
    assert patched.status_code == 200
    assert patched.json()["priority"] == "high"

    deleted = await client.delete(f"{PROJECTS_BASE}/{pid}", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "archived"

    archived = await client.get(f"{PROJECTS_BASE}/{pid}", headers=auth_headers)
    assert archived.status_code == 200
    assert archived.json()["status"] == "archived"
    assert archived.json()["archived_at"] is not None


@pytest.mark.asyncio
async def test_os_projects_viewer_read_only(
    client: AsyncClient,
    auth_headers: dict,
    viewer_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"VClient {suf}")
    created = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"VProj {suf}"
    )
    pid = created["id"]

    assert (await client.get(PROJECTS_BASE, headers=viewer_headers)).status_code == 200
    assert (await client.get(f"{PROJECTS_BASE}/{pid}", headers=viewer_headers)).status_code == 200

    assert (
        await client.post(
            PROJECTS_BASE,
            headers=viewer_headers,
            json={"client_id": os_client["id"], "name": "X"},
        )
    ).status_code == 403
    assert (
        await client.patch(f"{PROJECTS_BASE}/{pid}", headers=viewer_headers, json={"name": "H"})
    ).status_code == 403
    assert (await client.delete(f"{PROJECTS_BASE}/{pid}", headers=viewer_headers)).status_code == 403


@pytest.mark.asyncio
async def test_os_projects_member_cannot_mutate(
    client: AsyncClient,
    auth_headers: dict,
    member_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"MClient {suf}")
    assert (
        await client.post(
            PROJECTS_BASE,
            headers=member_headers,
            json={"client_id": os_client["id"], "name": "MemberProj"},
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_os_projects_operator_can_mutate(
    client: AsyncClient,
    operator_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, operator_headers, name=f"OpClient {suf}")
    created = await _create_project(
        client, operator_headers, client_id=os_client["id"], name=f"OpProj {suf}"
    )
    r = await client.patch(
        f"{PROJECTS_BASE}/{created['id']}",
        headers=operator_headers,
        json={"priority": "urgent"},
    )
    assert r.status_code == 200
    assert r.json()["priority"] == "urgent"


@pytest.mark.asyncio
async def test_os_projects_workspace_isolation(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"IsoClient {suf}")
    created = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"IsoProj {suf}"
    )
    cross = await client.get(f"{PROJECTS_BASE}/{created['id']}", headers=admin_headers)
    assert cross.status_code == 404


@pytest.mark.asyncio
async def test_os_projects_invalid_client_id(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    r = await client.post(
        PROJECTS_BASE,
        headers=auth_headers,
        json={"client_id": str(uuid.uuid4()), "name": "Orphan"},
    )
    assert r.status_code == 400
    assert "client_id" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_os_projects_filters_pagination(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"FClient {suf}")
    cid = os_client["id"]
    await _create_project(
        client, auth_headers, client_id=cid, name=f"Alpha Search {suf}", priority="low"
    )
    await _create_project(
        client, auth_headers, client_id=cid, name=f"Beta Other {suf}", priority="high"
    )
    p3 = await _create_project(
        client,
        auth_headers,
        client_id=cid,
        name=f"Gamma Done {suf}",
        status="completed",
        priority="medium",
    )
    await client.delete(f"{PROJECTS_BASE}/{p3['id']}", headers=auth_headers)

    page = await client.get(f"{PROJECTS_BASE}?page=1&page_size=1", headers=auth_headers)
    assert page.status_code == 200
    body = page.json()
    assert body["page_size"] == 1
    assert len(body["items"]) == 1

    by_client = await client.get(f"{PROJECTS_BASE}?client_id={cid}", headers=auth_headers)
    assert by_client.status_code == 200
    assert all(i["client_id"] == cid for i in by_client.json()["items"])

    by_priority = await client.get(f"{PROJECTS_BASE}?priority=high", headers=auth_headers)
    assert all(i["priority"] == "high" for i in by_priority.json()["items"])

    by_status = await client.get(f"{PROJECTS_BASE}?status=archived", headers=auth_headers)
    assert all(i["status"] == "archived" for i in by_status.json()["items"])

    search = await client.get(f"{PROJECTS_BASE}?q=Alpha+Search", headers=auth_headers)
    assert any("Alpha Search" in i["name"] for i in search.json()["items"])


@pytest.mark.asyncio
async def test_os_projects_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get(PROJECTS_BASE, headers=auth_only_headers)
    assert r.status_code == 400

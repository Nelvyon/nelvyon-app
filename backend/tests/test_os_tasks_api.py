"""
OS-1-07 — /api/v1/os/tasks REST API tests.
"""
import uuid

import pytest
from httpx import AsyncClient

CLIENTS_BASE = "/api/v1/os/clients"
PROJECTS_BASE = "/api/v1/os/projects"
TASKS_BASE = "/api/v1/os/tasks"


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
) -> dict:
    r = await client.post(
        PROJECTS_BASE,
        headers=headers,
        json={
            "client_id": client_id,
            "name": name,
            "status": "active",
            "priority": "medium",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_task(
    client: AsyncClient,
    headers: dict,
    *,
    title: str,
    project_id: str | None = None,
    client_id: str | None = None,
    status: str = "pending",
    priority: str = "medium",
    assignee: str | None = None,
) -> dict:
    payload: dict = {"title": title, "status": status, "priority": priority}
    if project_id:
        payload["project_id"] = project_id
    if client_id:
        payload["client_id"] = client_id
    if assignee:
        payload["assignee"] = assignee
    r = await client.post(TASKS_BASE, headers=headers, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.asyncio
async def test_os_tasks_crud_owner(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"TaskClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"TaskProj {suf}"
    )
    created = await _create_task(
        client,
        auth_headers,
        title=f"Task {suf}",
        project_id=project["id"],
    )
    tid = created["id"]
    assert created["workspace_id"] == 1
    assert created["project_id"] == project["id"]
    assert created["client_id"] == os_client["id"]

    got = await client.get(f"{TASKS_BASE}/{tid}", headers=auth_headers)
    assert got.status_code == 200

    patched = await client.patch(
        f"{TASKS_BASE}/{tid}",
        headers=auth_headers,
        json={"priority": "high", "description": "Updated"},
    )
    assert patched.status_code == 200
    assert patched.json()["priority"] == "high"

    deleted = await client.delete(f"{TASKS_BASE}/{tid}", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "archived"

    archived = await client.get(f"{TASKS_BASE}/{tid}", headers=auth_headers)
    assert archived.status_code == 200
    assert archived.json()["status"] == "archived"
    assert archived.json()["archived_at"] is not None


@pytest.mark.asyncio
async def test_os_tasks_viewer_read_only(
    client: AsyncClient,
    auth_headers: dict,
    viewer_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"VClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"VProj {suf}"
    )
    created = await _create_task(
        client,
        auth_headers,
        title=f"VTask {suf}",
        project_id=project["id"],
    )
    tid = created["id"]

    assert (await client.get(TASKS_BASE, headers=viewer_headers)).status_code == 200
    assert (await client.get(f"{TASKS_BASE}/{tid}", headers=viewer_headers)).status_code == 200

    assert (
        await client.post(
            TASKS_BASE,
            headers=viewer_headers,
            json={"title": "X", "project_id": project["id"]},
        )
    ).status_code == 403
    assert (
        await client.patch(f"{TASKS_BASE}/{tid}", headers=viewer_headers, json={"title": "H"})
    ).status_code == 403
    assert (await client.delete(f"{TASKS_BASE}/{tid}", headers=viewer_headers)).status_code == 403


@pytest.mark.asyncio
async def test_os_tasks_member_cannot_mutate(
    client: AsyncClient,
    auth_headers: dict,
    member_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"MClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"MProj {suf}"
    )
    assert (
        await client.post(
            TASKS_BASE,
            headers=member_headers,
            json={"title": "MemberTask", "project_id": project["id"]},
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_os_tasks_operator_can_mutate(
    client: AsyncClient,
    operator_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, operator_headers, name=f"OpClient {suf}")
    project = await _create_project(
        client, operator_headers, client_id=os_client["id"], name=f"OpProj {suf}"
    )
    created = await _create_task(
        client,
        operator_headers,
        title=f"OpTask {suf}",
        project_id=project["id"],
    )
    r = await client.patch(
        f"{TASKS_BASE}/{created['id']}",
        headers=operator_headers,
        json={"priority": "urgent"},
    )
    assert r.status_code == 200
    assert r.json()["priority"] == "urgent"


@pytest.mark.asyncio
async def test_os_tasks_workspace_isolation(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"IsoClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"IsoProj {suf}"
    )
    created = await _create_task(
        client,
        auth_headers,
        title=f"IsoTask {suf}",
        project_id=project["id"],
    )
    cross = await client.get(f"{TASKS_BASE}/{created['id']}", headers=admin_headers)
    assert cross.status_code == 404


@pytest.mark.asyncio
async def test_os_tasks_invalid_project_id(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    r = await client.post(
        TASKS_BASE,
        headers=auth_headers,
        json={"title": "Orphan", "project_id": str(uuid.uuid4())},
    )
    assert r.status_code == 400
    assert "project_id" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_os_tasks_invalid_client_id(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    r = await client.post(
        TASKS_BASE,
        headers=auth_headers,
        json={"title": "Orphan", "client_id": str(uuid.uuid4())},
    )
    assert r.status_code == 400
    assert "client_id" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_os_tasks_project_client_coherence(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    client_a = await _create_os_client(client, auth_headers, name=f"ClientA {suf}")
    client_b = await _create_os_client(client, auth_headers, name=f"ClientB {suf}")
    project = await _create_project(
        client, auth_headers, client_id=client_a["id"], name=f"ProjA {suf}"
    )
    r = await client.post(
        TASKS_BASE,
        headers=auth_headers,
        json={
            "title": "Mismatch",
            "project_id": project["id"],
            "client_id": client_b["id"],
        },
    )
    assert r.status_code == 400
    assert "client_id" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_os_tasks_complete_sets_completed_at(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"CClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"CProj {suf}"
    )
    created = await _create_task(
        client,
        auth_headers,
        title=f"CompleteMe {suf}",
        project_id=project["id"],
    )
    assert created["completed_at"] is None

    done = await client.patch(
        f"{TASKS_BASE}/{created['id']}",
        headers=auth_headers,
        json={"status": "completed"},
    )
    assert done.status_code == 200
    body = done.json()
    assert body["status"] == "completed"
    assert body["completed_at"] is not None


@pytest.mark.asyncio
async def test_os_tasks_filters_pagination(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"FClient {suf}")
    cid = os_client["id"]
    project = await _create_project(
        client, auth_headers, client_id=cid, name=f"FProj {suf}"
    )
    pid = project["id"]
    await _create_task(
        client,
        auth_headers,
        title=f"Alpha Search {suf}",
        project_id=pid,
        priority="low",
        assignee="alice",
    )
    await _create_task(
        client,
        auth_headers,
        title=f"Beta Other {suf}",
        project_id=pid,
        priority="high",
        assignee="bob",
    )
    t3 = await _create_task(
        client,
        auth_headers,
        title=f"Gamma Done {suf}",
        project_id=pid,
        status="completed",
        priority="medium",
    )
    await client.delete(f"{TASKS_BASE}/{t3['id']}", headers=auth_headers)

    page = await client.get(f"{TASKS_BASE}?page=1&page_size=1", headers=auth_headers)
    assert page.status_code == 200
    body = page.json()
    assert body["page_size"] == 1
    assert len(body["items"]) == 1

    by_project = await client.get(f"{TASKS_BASE}?project_id={pid}", headers=auth_headers)
    assert by_project.status_code == 200
    assert all(i["project_id"] == pid for i in by_project.json()["items"])

    by_client = await client.get(f"{TASKS_BASE}?client_id={cid}", headers=auth_headers)
    assert all(i["client_id"] == cid for i in by_client.json()["items"])

    by_priority = await client.get(f"{TASKS_BASE}?priority=high", headers=auth_headers)
    assert all(i["priority"] == "high" for i in by_priority.json()["items"])

    by_assignee = await client.get(f"{TASKS_BASE}?assignee=alice", headers=auth_headers)
    assert all(i["assignee"] == "alice" for i in by_assignee.json()["items"])

    by_status = await client.get(f"{TASKS_BASE}?status=archived", headers=auth_headers)
    assert all(i["status"] == "archived" for i in by_status.json()["items"])

    search = await client.get(f"{TASKS_BASE}?q=Alpha+Search", headers=auth_headers)
    assert any("Alpha Search" in i["title"] for i in search.json()["items"])


@pytest.mark.asyncio
async def test_os_tasks_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get(TASKS_BASE, headers=auth_only_headers)
    assert r.status_code == 400

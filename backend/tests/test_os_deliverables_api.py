"""
OS-1-08 — /api/v1/os/deliverables REST API tests.
"""
import uuid

import pytest
from httpx import AsyncClient

CLIENTS_BASE = "/api/v1/os/clients"
PROJECTS_BASE = "/api/v1/os/projects"
TASKS_BASE = "/api/v1/os/tasks"
DELIVERABLES_BASE = "/api/v1/os/deliverables"


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
    client: AsyncClient, headers: dict, *, client_id: str, name: str
) -> dict:
    r = await client.post(
        PROJECTS_BASE,
        headers=headers,
        json={"client_id": client_id, "name": name, "status": "active", "priority": "medium"},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_task(
    client: AsyncClient, headers: dict, *, project_id: str, title: str
) -> dict:
    r = await client.post(
        TASKS_BASE,
        headers=headers,
        json={"title": title, "project_id": project_id},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_deliverable(
    client: AsyncClient,
    headers: dict,
    *,
    client_id: str,
    project_id: str,
    title: str,
    task_id: str | None = None,
    type: str | None = "document",
) -> dict:
    payload: dict = {
        "client_id": client_id,
        "project_id": project_id,
        "title": title,
        "type": type,
    }
    if task_id:
        payload["task_id"] = task_id
    r = await client.post(DELIVERABLES_BASE, headers=headers, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


async def _run_full_workflow(client: AsyncClient, headers: dict, did: str) -> dict:
    for path in ("submit-review", "deliver", "approve", "publish"):
        r = await client.post(f"{DELIVERABLES_BASE}/{did}/{path}", headers=headers)
        assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_os_deliverables_crud_owner(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"DClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"DProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Deliverable {suf}",
    )
    did = created["id"]
    assert created["workspace_id"] == 1
    assert created["status"] == "draft"
    assert created["visibility"] == "internal"

    got = await client.get(f"{DELIVERABLES_BASE}/{did}", headers=auth_headers)
    assert got.status_code == 200

    patched = await client.patch(
        f"{DELIVERABLES_BASE}/{did}",
        headers=auth_headers,
        json={"description": "Updated desc"},
    )
    assert patched.status_code == 200

    deleted = await client.delete(f"{DELIVERABLES_BASE}/{did}", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "archived"

    archived = await client.get(f"{DELIVERABLES_BASE}/{did}", headers=auth_headers)
    assert archived.json()["status"] == "archived"
    assert archived.json()["archived_at"] is not None


@pytest.mark.asyncio
async def test_os_deliverables_viewer_read_only(
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
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"VDel {suf}",
    )
    did = created["id"]

    assert (await client.get(DELIVERABLES_BASE, headers=viewer_headers)).status_code == 200
    assert (
        await client.get(f"{DELIVERABLES_BASE}/{did}", headers=viewer_headers)
    ).status_code == 200

    assert (
        await client.post(
            DELIVERABLES_BASE,
            headers=viewer_headers,
            json={
                "client_id": os_client["id"],
                "project_id": project["id"],
                "title": "X",
            },
        )
    ).status_code == 403
    assert (
        await client.patch(
            f"{DELIVERABLES_BASE}/{did}", headers=viewer_headers, json={"title": "H"}
        )
    ).status_code == 403
    assert (
        await client.delete(f"{DELIVERABLES_BASE}/{did}", headers=viewer_headers)
    ).status_code == 403


@pytest.mark.asyncio
async def test_os_deliverables_member_cannot_mutate(
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
            DELIVERABLES_BASE,
            headers=member_headers,
            json={
                "client_id": os_client["id"],
                "project_id": project["id"],
                "title": "MemberDel",
            },
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_os_deliverables_operator_can_mutate(
    client: AsyncClient,
    operator_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, operator_headers, name=f"OpClient {suf}")
    project = await _create_project(
        client, operator_headers, client_id=os_client["id"], name=f"OpProj {suf}"
    )
    created = await _create_deliverable(
        client,
        operator_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"OpDel {suf}",
    )
    r = await client.patch(
        f"{DELIVERABLES_BASE}/{created['id']}",
        headers=operator_headers,
        json={"type": "report"},
    )
    assert r.status_code == 200
    assert r.json()["type"] == "report"


@pytest.mark.asyncio
async def test_os_deliverables_workspace_isolation(
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
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"IsoDel {suf}",
    )
    cross = await client.get(f"{DELIVERABLES_BASE}/{created['id']}", headers=admin_headers)
    assert cross.status_code == 404


@pytest.mark.asyncio
async def test_os_deliverables_invalid_fks(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"FKClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"FKProj {suf}"
    )

    r_client = await client.post(
        DELIVERABLES_BASE,
        headers=auth_headers,
        json={
            "client_id": str(uuid.uuid4()),
            "project_id": project["id"],
            "title": "Bad client",
        },
    )
    assert r_client.status_code == 400

    r_project = await client.post(
        DELIVERABLES_BASE,
        headers=auth_headers,
        json={
            "client_id": os_client["id"],
            "project_id": str(uuid.uuid4()),
            "title": "Bad project",
        },
    )
    assert r_project.status_code == 400

    r_task = await client.post(
        DELIVERABLES_BASE,
        headers=auth_headers,
        json={
            "client_id": os_client["id"],
            "project_id": project["id"],
            "task_id": str(uuid.uuid4()),
            "title": "Bad task",
        },
    )
    assert r_task.status_code == 400


@pytest.mark.asyncio
async def test_os_deliverables_coherence_project_client_task(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    client_a = await _create_os_client(client, auth_headers, name=f"CoA {suf}")
    client_b = await _create_os_client(client, auth_headers, name=f"CoB {suf}")
    project_a = await _create_project(
        client, auth_headers, client_id=client_a["id"], name=f"CoProjA {suf}"
    )
    project_b = await _create_project(
        client, auth_headers, client_id=client_b["id"], name=f"CoProjB {suf}"
    )
    task_b = await _create_task(
        client, auth_headers, project_id=project_b["id"], title=f"TaskB {suf}"
    )

    r_mismatch_client = await client.post(
        DELIVERABLES_BASE,
        headers=auth_headers,
        json={
            "client_id": client_b["id"],
            "project_id": project_a["id"],
            "title": "Mismatch client",
        },
    )
    assert r_mismatch_client.status_code == 400

    r_mismatch_task = await client.post(
        DELIVERABLES_BASE,
        headers=auth_headers,
        json={
            "client_id": client_a["id"],
            "project_id": project_a["id"],
            "task_id": task_b["id"],
            "title": "Mismatch task",
        },
    )
    assert r_mismatch_task.status_code == 400


@pytest.mark.asyncio
async def test_os_deliverables_workflow_happy_path(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"WFClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"WFProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"WF {suf}",
    )
    did = created["id"]

    r1 = await client.post(f"{DELIVERABLES_BASE}/{did}/submit-review", headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json()["status"] == "in_review"

    r2 = await client.post(f"{DELIVERABLES_BASE}/{did}/deliver", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["status"] == "delivered"
    assert r2.json()["delivered_at"] is not None

    r3 = await client.post(f"{DELIVERABLES_BASE}/{did}/approve", headers=auth_headers)
    assert r3.status_code == 200
    assert r3.json()["status"] == "approved"
    assert r3.json()["approved_at"] is not None

    r4 = await client.post(f"{DELIVERABLES_BASE}/{did}/publish", headers=auth_headers)
    assert r4.status_code == 200
    body = r4.json()
    assert body["status"] == "published"
    assert body["visibility"] == "client_visible"
    assert body["published_at"] is not None


@pytest.mark.asyncio
async def test_os_deliverables_workflow_invalid_transitions(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"InvClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"InvProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Inv {suf}",
    )
    did = created["id"]

    assert (
        await client.post(f"{DELIVERABLES_BASE}/{did}/deliver", headers=auth_headers)
    ).status_code == 400
    assert (
        await client.post(f"{DELIVERABLES_BASE}/{did}/approve", headers=auth_headers)
    ).status_code == 400
    assert (
        await client.post(f"{DELIVERABLES_BASE}/{did}/publish", headers=auth_headers)
    ).status_code == 400

    await client.post(f"{DELIVERABLES_BASE}/{did}/submit-review", headers=auth_headers)
    assert (
        await client.post(f"{DELIVERABLES_BASE}/{did}/publish", headers=auth_headers)
    ).status_code == 400


@pytest.mark.asyncio
async def test_os_deliverables_reject_workflow(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"RejClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"RejProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Rej {suf}",
    )
    did = created["id"]
    await client.post(f"{DELIVERABLES_BASE}/{did}/submit-review", headers=auth_headers)

    r = await client.post(
        f"{DELIVERABLES_BASE}/{did}/reject",
        headers=auth_headers,
        json={"review_notes": "Needs revision"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert r.json()["review_notes"] == "Needs revision"


@pytest.mark.asyncio
async def test_os_deliverables_filters_pagination(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"FClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"FProj {suf}"
    )
    task = await _create_task(
        client, auth_headers, project_id=project["id"], title=f"FTask {suf}"
    )
    cid, pid, tid = os_client["id"], project["id"], task["id"]

    await _create_deliverable(
        client,
        auth_headers,
        client_id=cid,
        project_id=pid,
        title=f"Alpha Search {suf}",
        task_id=tid,
        type="document",
    )
    d2 = await _create_deliverable(
        client,
        auth_headers,
        client_id=cid,
        project_id=pid,
        title=f"Beta Other {suf}",
        type="report",
    )
    await client.post(f"{DELIVERABLES_BASE}/{d2['id']}/submit-review", headers=auth_headers)
    d3 = await _create_deliverable(
        client,
        auth_headers,
        client_id=cid,
        project_id=pid,
        title=f"Gamma Archive {suf}",
    )
    await client.delete(f"{DELIVERABLES_BASE}/{d3['id']}", headers=auth_headers)

    page = await client.get(f"{DELIVERABLES_BASE}?page=1&page_size=1", headers=auth_headers)
    assert page.status_code == 200
    assert page.json()["page_size"] == 1

    by_client = await client.get(f"{DELIVERABLES_BASE}?client_id={cid}", headers=auth_headers)
    assert all(i["client_id"] == cid for i in by_client.json()["items"])

    by_project = await client.get(f"{DELIVERABLES_BASE}?project_id={pid}", headers=auth_headers)
    assert all(i["project_id"] == pid for i in by_project.json()["items"])

    by_task = await client.get(f"{DELIVERABLES_BASE}?task_id={tid}", headers=auth_headers)
    assert all(i["task_id"] == tid for i in by_task.json()["items"])

    by_type = await client.get(f"{DELIVERABLES_BASE}?type=report", headers=auth_headers)
    assert all(i["type"] == "report" for i in by_type.json()["items"])

    by_status = await client.get(f"{DELIVERABLES_BASE}?status=in_review", headers=auth_headers)
    assert all(i["status"] == "in_review" for i in by_status.json()["items"])

    by_vis = await client.get(f"{DELIVERABLES_BASE}?visibility=internal", headers=auth_headers)
    assert all(i["visibility"] == "internal" for i in by_vis.json()["items"])

    search = await client.get(f"{DELIVERABLES_BASE}?q=Alpha+Search", headers=auth_headers)
    assert any("Alpha Search" in i["title"] for i in search.json()["items"])


@pytest.mark.asyncio
async def test_os_deliverables_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get(DELIVERABLES_BASE, headers=auth_only_headers)
    assert r.status_code == 400

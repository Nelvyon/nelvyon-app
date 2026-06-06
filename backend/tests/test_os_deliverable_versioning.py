"""
OS-1-11 — Deliverable versioning and re-publication after client feedback.
"""
import uuid

import pytest
from httpx import AsyncClient

CLIENTS_BASE = "/api/v1/os/clients"
PROJECTS_BASE = "/api/v1/os/projects"
DELIVERABLES_BASE = "/api/v1/os/deliverables"
PORTAL_BASE = "/api/v1/portal"


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


async def _create_client(client: AsyncClient, headers: dict, *, name: str) -> dict:
    r = await client.post(
        CLIENTS_BASE, headers=headers, json={"business_name": name, "sector": "tech"}
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


async def _create_deliverable(
    client: AsyncClient,
    headers: dict,
    *,
    client_id: str,
    project_id: str,
    title: str,
    file_url: str | None = None,
) -> dict:
    payload: dict = {
        "client_id": client_id,
        "project_id": project_id,
        "title": title,
    }
    if file_url:
        payload["file_url"] = file_url
    r = await client.post(DELIVERABLES_BASE, headers=headers, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


async def _publish_deliverable(client: AsyncClient, headers: dict, did: str) -> dict:
    for step in ("submit-review", "deliver", "approve", "publish"):
        r = await client.post(f"{DELIVERABLES_BASE}/{did}/{step}", headers=headers)
        assert r.status_code == 200, r.text
    return r.json()


async def _portal_headers(
    client: AsyncClient, operator_headers: dict, *, client_id: str, email: str
) -> dict:
    inv = await client.post(
        PORTAL_BASE + "/invites",
        headers=operator_headers,
        json={"client_id": client_id, "email": email},
    )
    assert inv.status_code == 201, inv.text
    acc = await client.post(
        PORTAL_BASE + "/auth/accept-invite",
        json={"token": inv.json()["token"], "password": "PortalPass123!", "name": "Portal"},
    )
    assert acc.status_code == 200, acc.text
    return {"Authorization": f"Bearer {acc.json()['access_token']}"}


async def _reject_via_portal(
    client: AsyncClient, portal_h: dict, did: str, feedback: str
) -> dict:
    r = await client.post(
        f"{PORTAL_BASE}/deliverables/{did}/reject",
        headers=portal_h,
        json={"feedback": feedback},
    )
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_create_revision_increments_version(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"RevClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"RevProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Rev {suf}",
        file_url="https://cdn.example/v1.pdf",
    )
    did = created["id"]
    assert created["version"] == 1

    await _publish_deliverable(client, auth_headers, did)
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"rev_{suf}@test.com"
    )
    await _reject_via_portal(client, portal_h, did, "Fix section 3")

    rev = await client.post(
        f"{DELIVERABLES_BASE}/{did}/create-revision", headers=auth_headers
    )
    assert rev.status_code == 200, rev.text
    body = rev.json()
    assert body["version"] == 2
    assert body["status"] == "draft"
    assert body["visibility"] == "internal"


@pytest.mark.asyncio
async def test_create_revision_preserves_client_feedback(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"FbClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"FbProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Fb {suf}",
    )
    did = created["id"]
    await _publish_deliverable(client, auth_headers, did)
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"fb_{suf}@test.com"
    )
    await _reject_via_portal(client, portal_h, did, "Needs color update")

    rev = await client.post(
        f"{DELIVERABLES_BASE}/{did}/create-revision", headers=auth_headers
    )
    assert rev.status_code == 200
    meta = rev.json()["metadata"]
    assert meta.get("client_feedback") == "Needs color update"
    assert meta.get("client_review_decision") == "reject"
    assert meta.get("previous_version") == 1
    assert len(meta.get("client_review_history") or []) >= 1


@pytest.mark.asyncio
async def test_version_history_snapshot_saved(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"HistClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"HistProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Hist {suf}",
        file_url="https://cdn.example/old.pdf",
    )
    did = created["id"]
    await _publish_deliverable(client, auth_headers, did)
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"hist_{suf}@test.com"
    )
    await _reject_via_portal(client, portal_h, did, "Revise layout")

    await client.post(f"{DELIVERABLES_BASE}/{did}/create-revision", headers=auth_headers)

    versions = await client.get(f"{DELIVERABLES_BASE}/{did}/versions", headers=auth_headers)
    assert versions.status_code == 200
    items = versions.json()["items"]
    assert len(items) == 1
    snap = items[0]
    assert snap["version"] == 1
    assert snap["status"] == "changes_requested"
    assert snap["file_url"] == "https://cdn.example/old.pdf"
    assert snap["metadata"].get("client_feedback") == "Revise layout"


@pytest.mark.asyncio
async def test_republication_workflow_after_revision(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"RepClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"RepProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Rep {suf}",
    )
    did = created["id"]
    await _publish_deliverable(client, auth_headers, did)
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"rep_{suf}@test.com"
    )
    await _reject_via_portal(client, portal_h, did, "Round 1 feedback")

    rev = await client.post(
        f"{DELIVERABLES_BASE}/{did}/create-revision", headers=auth_headers
    )
    assert rev.json()["version"] == 2

    republished = await _publish_deliverable(client, auth_headers, did)
    assert republished["status"] == "published"
    assert republished["version"] == 2
    assert republished["visibility"] == "client_visible"

    approve = await client.post(
        f"{PORTAL_BASE}/deliverables/{did}/approve",
        headers=portal_h,
        json={"feedback": "v2 looks good"},
    )
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved_by_client"


@pytest.mark.asyncio
async def test_create_revision_only_from_changes_requested(
    client: AsyncClient, auth_headers: dict, seed_portal_operator
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"BadClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"BadProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Bad {suf}",
    )
    r = await client.post(
        f"{DELIVERABLES_BASE}/{created['id']}/create-revision", headers=auth_headers
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_versions_workspace_isolation(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"IsoClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"IsoProj {suf}"
    )
    created = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Iso {suf}",
    )
    did = created["id"]
    await _publish_deliverable(client, auth_headers, did)
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"iso_{suf}@test.com"
    )
    await _reject_via_portal(client, portal_h, did, "iso test")
    await client.post(f"{DELIVERABLES_BASE}/{did}/create-revision", headers=auth_headers)

    cross = await client.get(f"{DELIVERABLES_BASE}/{did}/versions", headers=admin_headers)
    assert cross.status_code == 404

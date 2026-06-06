"""
OS-1-10 — Portal deliverable approve/reject tests.
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


async def _create_and_publish(
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
    did = r.json()["id"]
    for step in ("submit-review", "deliver", "approve", "publish"):
        wr = await client.post(f"{DELIVERABLES_BASE}/{did}/{step}", headers=headers)
        assert wr.status_code == 200, wr.text
    return r.json()


async def _create_draft(
    client: AsyncClient, headers: dict, *, client_id: str, project_id: str, title: str
) -> dict:
    r = await client.post(
        DELIVERABLES_BASE,
        headers=headers,
        json={"client_id": client_id, "project_id": project_id, "title": title},
    )
    assert r.status_code == 201, r.text
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


@pytest.mark.asyncio
async def test_portal_client_approves_visible_deliverable(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"ApClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"ApProj {suf}"
    )
    created = await _create_and_publish(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"ApproveMe {suf}",
    )
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"ap_{suf}@test.com"
    )
    r = await client.post(
        f"{PORTAL_BASE}/deliverables/{created['id']}/approve",
        headers=portal_h,
        json={"feedback": "Looks great"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "approved_by_client"
    assert body["client_review_decision"] == "approve"
    assert body["client_reviewed_at"] is not None


@pytest.mark.asyncio
async def test_portal_client_rejects_with_feedback(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"RejClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"RejProj {suf}"
    )
    created = await _create_and_publish(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"RejectMe {suf}",
    )
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"rej_{suf}@test.com"
    )
    r = await client.post(
        f"{PORTAL_BASE}/deliverables/{created['id']}/reject",
        headers=portal_h,
        json={"feedback": "Please revise section 2"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "changes_requested"
    assert body["client_feedback"] == "Please revise section 2"
    assert body["client_review_decision"] == "reject"


@pytest.mark.asyncio
async def test_portal_reject_without_feedback_400(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"NFClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"NFProj {suf}"
    )
    created = await _create_and_publish(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"NoFb {suf}",
    )
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"nf_{suf}@test.com"
    )
    r = await client.post(
        f"{PORTAL_BASE}/deliverables/{created['id']}/reject",
        headers=portal_h,
        json={"feedback": "   "},
    )
    assert r.status_code == 422 or r.status_code == 400


@pytest.mark.asyncio
async def test_portal_cannot_approve_internal_deliverable(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"IntClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"IntProj {suf}"
    )
    draft = await _create_draft(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Internal {suf}",
    )
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"int_{suf}@test.com"
    )
    r = await client.post(
        f"{PORTAL_BASE}/deliverables/{draft['id']}/approve",
        headers=portal_h,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_portal_cannot_approve_other_client_deliverable(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    client_a = await _create_client(client, auth_headers, name=f"OCA {suf}")
    client_b = await _create_client(client, auth_headers, name=f"OCB {suf}")
    proj_b = await _create_project(
        client, auth_headers, client_id=client_b["id"], name=f"OCProj {suf}"
    )
    del_b = await _create_and_publish(
        client,
        auth_headers,
        client_id=client_b["id"],
        project_id=proj_b["id"],
        title=f"Other {suf}",
    )
    portal_a = await _portal_headers(
        client, operator_headers, client_id=client_a["id"], email=f"oca_{suf}@test.com"
    )
    r = await client.post(
        f"{PORTAL_BASE}/deliverables/{del_b['id']}/approve",
        headers=portal_a,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_portal_invalid_token_401(client: AsyncClient):
    bad = {"Authorization": "Bearer not-a-portal-token"}
    r = await client.post(
        f"{PORTAL_BASE}/deliverables/{uuid.uuid4()}/approve",
        headers=bad,
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_portal_double_review_blocked(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"DblClient {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"DblProj {suf}"
    )
    created = await _create_and_publish(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Double {suf}",
    )
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"dbl_{suf}@test.com"
    )
    first = await client.post(
        f"{PORTAL_BASE}/deliverables/{created['id']}/approve",
        headers=portal_h,
    )
    assert first.status_code == 200
    second = await client.post(
        f"{PORTAL_BASE}/deliverables/{created['id']}/approve",
        headers=portal_h,
    )
    assert second.status_code == 400
    assert "already reviewed" in second.json()["detail"].lower()


@pytest.mark.asyncio
async def test_portal_review_history_saved(
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
    created = await _create_and_publish(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"Hist {suf}",
    )
    portal_h = await _portal_headers(
        client, operator_headers, client_id=os_client["id"], email=f"hist_{suf}@test.com"
    )
    await client.post(
        f"{PORTAL_BASE}/deliverables/{created['id']}/reject",
        headers=portal_h,
        json={"feedback": "Needs work"},
    )
    internal = await client.get(
        f"{DELIVERABLES_BASE}/{created['id']}/client-reviews",
        headers=auth_headers,
    )
    assert internal.status_code == 200
    items = internal.json()["items"]
    assert len(items) >= 1
    assert items[0]["decision"] == "reject"
    assert items[0]["feedback"] == "Needs work"

    detail = await client.get(f"{DELIVERABLES_BASE}/{created['id']}", headers=auth_headers)
    meta = detail.json()["metadata"]
    assert meta.get("client_feedback") == "Needs work"
    assert meta.get("client_review_decision") == "reject"
    assert len(meta.get("client_review_history") or []) >= 1

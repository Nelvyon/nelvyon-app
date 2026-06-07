"""
Phase D — POST /api/v1/os/autonomous/publish tests.
"""
import os
import uuid

import pytest
from httpx import AsyncClient

CLIENTS_BASE = "/api/v1/os/clients"
PROJECTS_BASE = "/api/v1/os/projects"
DELIVERABLES_BASE = "/api/v1/os/deliverables"
PUBLISH_BASE = "/api/v1/os/autonomous/publish"


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


async def _count_deliverables(client: AsyncClient, headers: dict) -> int:
    r = await client.get(DELIVERABLES_BASE, headers=headers, params={"page_size": 200})
    assert r.status_code == 200, r.text
    return int(r.json().get("total", 0))


def _payload(
    *,
    os_client_id: str,
    project_id: str,
    workspace_id: int = 1,
    qa_score: float = 90.0,
    dry_run: bool = True,
) -> dict:
    return {
        "dry_run": dry_run,
        "project_id": f"sim-landing-{uuid.uuid4().hex[:8]}",
        "os_refs": {
            "client_id": os_client_id,
            "project_id": project_id,
            "project_slug": "LANDING-TEST-AUTO",
            "workspace_id": workspace_id,
        },
        "deliverables": [
            {
                "type": "url",
                "label": "Landing staging",
                "value": "https://staging.example.com",
                "visibility": "client",
            },
            {
                "type": "file",
                "label": "QA Report",
                "value": "mock://artifacts/qa-report.pdf",
                "visibility": "internal",
            },
        ],
        "qa_score": qa_score,
        "autonomous_job_id": f"autonomous_job_{uuid.uuid4().hex[:8]}",
        "artifacts": {"build": {"staging_url": "https://staging.example.com"}},
        "handoff_email_draft": {
            "subject": "Staging ready",
            "body_markdown": "Internal review required",
        },
        "os_actions": [
            {"entity": "deliverable", "action": "create", "status": "in_review"},
        ],
        "note": "Phase D test payload",
    }


@pytest.mark.asyncio
async def test_autonomous_publish_dry_run_no_db_write(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"AutoDry {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"AutoProj {suf}"
    )
    before = await _count_deliverables(client, auth_headers)

    r = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_payload(
            os_client_id=os_client["id"],
            project_id=project["id"],
            dry_run=True,
        ),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True
    assert body["written"] is False
    assert body["created"] == []
    assert len(body["deliverables_preview"]) == 2

    after = await _count_deliverables(client, auth_headers)
    assert after == before


@pytest.mark.asyncio
async def test_autonomous_publish_qa_below_threshold_blocks(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"AutoQA {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"AutoQAP {suf}"
    )
    r = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_payload(
            os_client_id=os_client["id"],
            project_id=project["id"],
            qa_score=84.9,
            dry_run=True,
        ),
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_autonomous_publish_without_production_flag_blocks_write(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members, monkeypatch
):
    monkeypatch.delenv("AUTONOMOUS_PRODUCTION", raising=False)
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"AutoFlag {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"AutoFlagP {suf}"
    )
    before = await _count_deliverables(client, auth_headers)

    r = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_payload(
            os_client_id=os_client["id"],
            project_id=project["id"],
            dry_run=False,
        ),
    )
    assert r.status_code == 403
    after = await _count_deliverables(client, auth_headers)
    assert after == before


@pytest.mark.asyncio
async def test_autonomous_publish_with_flag_creates_in_review_internal(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members, monkeypatch
):
    monkeypatch.setenv("AUTONOMOUS_PRODUCTION", "true")
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"AutoProd {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"AutoProdP {suf}"
    )
    before = await _count_deliverables(client, auth_headers)

    r = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_payload(
            os_client_id=os_client["id"],
            project_id=project["id"],
            dry_run=False,
        ),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["written"] is True
    assert body["dry_run"] is False
    assert len(body["created"]) == 2
    assert all(item["status"] == "in_review" for item in body["created"])
    assert all(item["visibility"] == "internal" for item in body["created"])

    after = await _count_deliverables(client, auth_headers)
    assert after == before + 2

    detail = await client.get(
        f"{DELIVERABLES_BASE}/{body['created'][0]['id']}",
        headers=auth_headers,
    )
    assert detail.status_code == 200
    meta = detail.json().get("metadata") or {}
    assert meta.get("autonomous_provenance") is True
    assert meta.get("autonomous_phase") == "D"
    assert meta.get("requested_visibility") == "client"
    assert meta.get("artifacts") == {"build": {"staging_url": "https://staging.example.com"}}


@pytest.mark.asyncio
async def test_autonomous_publish_viewer_forbidden(
    client: AsyncClient,
    auth_headers: dict,
    viewer_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"AutoView {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"AutoViewP {suf}"
    )
    r = await client.post(
        PUBLISH_BASE,
        headers=viewer_headers,
        json=_payload(os_client_id=os_client["id"], project_id=project["id"]),
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_autonomous_publish_member_forbidden(
    client: AsyncClient,
    auth_headers: dict,
    member_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"AutoMem {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"AutoMemP {suf}"
    )
    r = await client.post(
        PUBLISH_BASE,
        headers=member_headers,
        json=_payload(os_client_id=os_client["id"], project_id=project["id"]),
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_autonomous_publish_other_workspace_404(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"AutoIso {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"AutoIsoP {suf}"
    )
    r = await client.post(
        PUBLISH_BASE,
        headers=admin_headers,
        json=_payload(
            os_client_id=os_client["id"],
            project_id=project["id"],
            workspace_id=1,
        ),
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_autonomous_publish_operator_can_dry_run(
    client: AsyncClient, operator_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, operator_headers, name=f"AutoOp {suf}")
    project = await _create_project(
        client, operator_headers, client_id=os_client["id"], name=f"AutoOpP {suf}"
    )
    r = await client.post(
        PUBLISH_BASE,
        headers=operator_headers,
        json=_payload(os_client_id=os_client["id"], project_id=project["id"]),
    )
    assert r.status_code == 200


@pytest.fixture(autouse=True)
def _reset_autonomous_production_env(monkeypatch):
    monkeypatch.delenv("AUTONOMOUS_PRODUCTION", raising=False)
    yield
    if "AUTONOMOUS_PRODUCTION" in os.environ:
        del os.environ["AUTONOMOUS_PRODUCTION"]

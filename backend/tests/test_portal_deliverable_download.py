"""
OS — secure portal deliverable download tests.
"""
import uuid

import pytest
from httpx import AsyncClient

from tests.test_portal_api import (
    DELIVERABLES_BASE,
    PORTAL_BASE,
    _create_and_publish_deliverable,
    _create_client,
    _create_project,
    _portal_user_headers,
)

FILE_URL = "https://cdn.example.com/deliverables/sample.pdf"


async def _publish_with_file(
    client: AsyncClient,
    headers: dict,
    *,
    client_id: str,
    project_id: str,
    title: str,
    file_url: str | None = FILE_URL,
    storage_key: str | None = None,
) -> dict:
    created = await _create_and_publish_deliverable(
        client,
        headers,
        client_id=client_id,
        project_id=project_id,
        title=title,
    )
    did = created["id"]
    payload: dict = {}
    if file_url is not None:
        payload["file_url"] = file_url
    if storage_key is not None:
        payload["storage_key"] = storage_key
    if payload:
        patch = await client.patch(f"{DELIVERABLES_BASE}/{did}", headers=headers, json=payload)
        assert patch.status_code == 200, patch.text
        return patch.json()
    return created


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
async def test_portal_download_visible_ok(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"DL {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"DLProj {suf}"
    )
    deliverable = await _publish_with_file(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"DLFile {suf}",
    )
    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"dl_{suf}@test.com",
    )

    r = await client.get(
        f"{PORTAL_BASE}/deliverables/{deliverable['id']}/download",
        headers=portal_h,
        follow_redirects=False,
    )
    assert r.status_code == 302
    assert r.headers["location"] == FILE_URL


@pytest.mark.asyncio
async def test_portal_download_other_client_404(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    client_a = await _create_client(client, auth_headers, name=f"DLA {suf}")
    client_b = await _create_client(client, auth_headers, name=f"DLB {suf}")
    project_b = await _create_project(
        client, auth_headers, client_id=client_b["id"], name=f"DLBProj {suf}"
    )
    deliverable_b = await _publish_with_file(
        client,
        auth_headers,
        client_id=client_b["id"],
        project_id=project_b["id"],
        title=f"DLCross {suf}",
    )
    portal_a = await _portal_user_headers(
        client,
        operator_headers,
        client_id=client_a["id"],
        email=f"dla_{suf}@test.com",
    )

    r = await client.get(
        f"{PORTAL_BASE}/deliverables/{deliverable_b['id']}/download",
        headers=portal_a,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_portal_download_internal_visibility_404(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"DLInt {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"DLIntProj {suf}"
    )
    deliverable = await _publish_with_file(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"DLInternal {suf}",
    )
    patch = await client.patch(
        f"{DELIVERABLES_BASE}/{deliverable['id']}",
        headers=auth_headers,
        json={"visibility": "internal"},
    )
    assert patch.status_code == 200, patch.text

    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"dlin_{suf}@test.com",
    )
    r = await client.get(
        f"{PORTAL_BASE}/deliverables/{deliverable['id']}/download",
        headers=portal_h,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_portal_download_no_file_404(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"DLNoFile {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"DLNoFileProj {suf}"
    )
    deliverable = await _publish_with_file(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"DLNoFile {suf}",
        file_url=None,
    )
    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"dlnf_{suf}@test.com",
    )

    r = await client.get(
        f"{PORTAL_BASE}/deliverables/{deliverable['id']}/download",
        headers=portal_h,
    )
    assert r.status_code == 404
    assert "no file" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_portal_download_invalid_token_401(client: AsyncClient):
    bad = {"Authorization": "Bearer invalid.portal.token"}
    fake_id = "00000000-0000-0000-0000-000000000099"
    r = await client.get(f"{PORTAL_BASE}/deliverables/{fake_id}/download", headers=bad)
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_portal_download_storage_key_mock_signed_url(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_portal_operator,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"DLKey {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"DLKeyProj {suf}"
    )
    storage_key = f"1/{uuid.uuid4()}/1/report.pdf"
    deliverable = await _publish_with_file(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"DLKey {suf}",
        file_url=None,
        storage_key=storage_key,
    )
    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"dlkey_{suf}@test.com",
    )

    r = await client.get(
        f"{PORTAL_BASE}/deliverables/{deliverable['id']}/download",
        headers=portal_h,
        follow_redirects=False,
    )
    assert r.status_code == 302
    location = r.headers["location"]
    assert "mock.supabase.local" in location
    assert storage_key.split("/")[-1] in location

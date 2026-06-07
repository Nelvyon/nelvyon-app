"""
OS — deliverable file upload tests.
"""
import uuid

import pytest
from httpx import AsyncClient

from tests.test_portal_api import (
    PORTAL_BASE,
    _create_and_publish_deliverable,
    _create_client,
    _create_project,
    _portal_user_headers,
)
from tests.test_os_deliverables_api import (
    DELIVERABLES_BASE,
    _create_deliverable,
    _create_os_client,
    _create_project,
)

# Minimal valid PDF header
PDF_BYTES = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


async def _upload_file(
    client: AsyncClient,
    headers: dict,
    deliverable_id: str,
    *,
    filename: str = "report.pdf",
    content: bytes = PDF_BYTES,
    content_type: str = "application/pdf",
):
    return await client.post(
        f"{DELIVERABLES_BASE}/{deliverable_id}/upload",
        headers=headers,
        files={"file": (filename, content, content_type)},
    )


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


@pytest.mark.asyncio
async def test_deliverable_upload_ok(
    client: AsyncClient,
    auth_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"Up {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"UpProj {suf}")
    deliverable = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"UploadMe {suf}",
    )

    r = await _upload_file(client, auth_headers, deliverable["id"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["storage_key"]
    assert str(body["workspace_id"]) == "1"
    assert f"/{deliverable['id']}/" in body["storage_key"]
    assert body["storage_key"].endswith("report.pdf")


@pytest.mark.asyncio
async def test_deliverable_upload_viewer_forbidden(
    client: AsyncClient,
    auth_headers: dict,
    viewer_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"UpV {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"UpVProj {suf}")
    deliverable = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"NoUpload {suf}",
    )

    r = await _upload_file(client, viewer_headers, deliverable["id"])
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_deliverable_upload_other_workspace_404(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"UpX {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"UpXProj {suf}")
    deliverable = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"CrossWs {suf}",
    )

    r = await _upload_file(client, admin_headers, deliverable["id"])
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_deliverable_upload_invalid_file_400(
    client: AsyncClient,
    auth_headers: dict,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"UpBad {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"UpBadProj {suf}")
    deliverable = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"BadFile {suf}",
    )

    r = await _upload_file(
        client,
        auth_headers,
        deliverable["id"],
        filename="malware.exe",
        content=b"MZ",
        content_type="application/octet-stream",
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_deliverable_upload_keeps_manual_file_url(
    client: AsyncClient,
    auth_headers: dict,
):
    manual_url = "https://cdn.example.com/manual.pdf"
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"UpKeep {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"UpKeepProj {suf}")
    deliverable = await _create_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"KeepUrl {suf}",
    )
    patched = await client.patch(
        f"{DELIVERABLES_BASE}/{deliverable['id']}",
        headers=auth_headers,
        json={"file_url": manual_url},
    )
    assert patched.status_code == 200

    up = await _upload_file(client, auth_headers, deliverable["id"])
    assert up.status_code == 200
    body = up.json()
    assert body["storage_key"]
    assert body["file_url"] == manual_url


@pytest.mark.asyncio
async def test_portal_download_uses_storage_key_after_upload(
    client: AsyncClient,
    auth_headers: dict,
    operator_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_client(client, auth_headers, name=f"UpPortal {suf}")
    project = await _create_project(client, auth_headers, client_id=os_client["id"], name=f"UpPortalProj {suf}")
    created = await _create_and_publish_deliverable(
        client,
        auth_headers,
        client_id=os_client["id"],
        project_id=project["id"],
        title=f"PortalDl {suf}",
    )

    up = await _upload_file(client, auth_headers, created["id"], filename="deliverable.pdf")
    assert up.status_code == 200
    storage_key = up.json()["storage_key"]
    assert storage_key

    portal_h = await _portal_user_headers(
        client,
        operator_headers,
        client_id=os_client["id"],
        email=f"upportal_{suf}@test.com",
    )
    detail = await client.get(f"{PORTAL_BASE}/deliverables/{created['id']}", headers=portal_h)
    assert detail.status_code == 200
    assert detail.json()["has_file"] is True
    assert "storage_key" not in detail.json()

    dl = await client.get(
        f"{PORTAL_BASE}/deliverables/{created['id']}/download",
        headers=portal_h,
        follow_redirects=False,
    )
    assert dl.status_code == 302
    assert "mock.supabase.local" in dl.headers["location"]
    assert storage_key.split("/")[-1] in dl.headers["location"]

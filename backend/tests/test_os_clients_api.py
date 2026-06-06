"""
OS-1-03 — /api/v1/os/clients REST API tests.

Covers CRUD, RBAC (viewer read-only), workspace isolation, pagination, search, filters.
"""
import uuid

import pytest
from httpx import AsyncClient

BASE = "/api/v1/os/clients"


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
    """Viewer + operator members in workspace 1 for RBAC tests."""
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


async def _create_client(
    client: AsyncClient,
    headers: dict,
    *,
    business_name: str,
    sector: str = "tech",
    contact_email: str | None = None,
    status: str = "active",
) -> dict:
    payload: dict = {"business_name": business_name, "sector": sector, "status": status}
    if contact_email:
        payload["contact_email"] = contact_email
    r = await client.post(BASE, headers=headers, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.asyncio
async def test_os_clients_crud_owner(client: AsyncClient, auth_headers: dict, seed_os_rbac_members):
    suf = uuid.uuid4().hex[:8]
    created = await _create_client(
        client,
        auth_headers,
        business_name=f"Acme {suf}",
        contact_email=f"hello-{suf}@acme.com",
    )
    cid = created["id"]
    assert created["workspace_id"] == 1
    assert created["status"] == "active"
    assert created["contact_email"] == f"hello-{suf}@acme.com"

    got = await client.get(f"{BASE}/{cid}", headers=auth_headers)
    assert got.status_code == 200
    assert got.json()["business_name"] == f"Acme {suf}"

    patched = await client.patch(
        f"{BASE}/{cid}",
        headers=auth_headers,
        json={"objectives": "Grow ARR", "sector": "saas"},
    )
    assert patched.status_code == 200
    assert patched.json()["objectives"] == "Grow ARR"
    assert patched.json()["sector"] == "saas"

    deleted = await client.delete(f"{BASE}/{cid}", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "archived"

    archived = await client.get(f"{BASE}/{cid}", headers=auth_headers)
    assert archived.status_code == 200
    assert archived.json()["status"] == "archived"


@pytest.mark.asyncio
async def test_os_clients_viewer_read_only(
    client: AsyncClient,
    auth_headers: dict,
    viewer_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    created = await _create_client(client, auth_headers, business_name=f"ViewCo {suf}")
    cid = created["id"]

    read_list = await client.get(BASE, headers=viewer_headers)
    assert read_list.status_code == 200

    read_one = await client.get(f"{BASE}/{cid}", headers=viewer_headers)
    assert read_one.status_code == 200

    forbidden_create = await client.post(
        BASE,
        headers=viewer_headers,
        json={"business_name": "Nope"},
    )
    assert forbidden_create.status_code == 403

    forbidden_patch = await client.patch(
        f"{BASE}/{cid}",
        headers=viewer_headers,
        json={"business_name": "Hacked"},
    )
    assert forbidden_patch.status_code == 403

    forbidden_delete = await client.delete(f"{BASE}/{cid}", headers=viewer_headers)
    assert forbidden_delete.status_code == 403


@pytest.mark.asyncio
async def test_os_clients_operator_can_mutate(
    client: AsyncClient,
    operator_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    created = await _create_client(
        client,
        operator_headers,
        business_name=f"OpCo {suf}",
    )
    cid = created["id"]
    r = await client.patch(
        f"{BASE}/{cid}",
        headers=operator_headers,
        json={"city": "Madrid"},
    )
    assert r.status_code == 200
    assert r.json()["city"] == "Madrid"


@pytest.mark.asyncio
async def test_os_clients_workspace_isolation(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    created = await _create_client(client, auth_headers, business_name=f"Iso {suf}")
    cid = created["id"]

    cross = await client.get(f"{BASE}/{cid}", headers=admin_headers)
    assert cross.status_code == 404


@pytest.mark.asyncio
async def test_os_clients_pagination_search_filters(
    client: AsyncClient,
    auth_headers: dict,
    seed_os_rbac_members,
):
    suf = uuid.uuid4().hex[:8]
    await _create_client(
        client,
        auth_headers,
        business_name=f"Alpha Retail {suf}",
        sector="retail",
        contact_email=f"alpha-{suf}@shop.com",
    )
    await _create_client(
        client,
        auth_headers,
        business_name=f"Beta Tech {suf}",
        sector="tech",
        contact_email=f"beta-{suf}@dev.com",
    )
    await _create_client(
        client,
        auth_headers,
        business_name=f"Gamma Retail {suf}",
        sector="retail",
        status="archived",
    )

    page = await client.get(f"{BASE}?skip=0&limit=1", headers=auth_headers)
    assert page.status_code == 200
    body = page.json()
    assert body["limit"] == 1
    assert len(body["items"]) == 1
    assert body["total"] >= 3

    by_sector = await client.get(f"{BASE}?sector=retail", headers=auth_headers)
    assert by_sector.status_code == 200
    assert all(i["sector"] == "retail" for i in by_sector.json()["items"])

    by_status = await client.get(f"{BASE}?status=archived", headers=auth_headers)
    assert by_status.status_code == 200
    assert all(i["status"] == "archived" for i in by_status.json()["items"])

    search = await client.get(f"{BASE}?q=alpha-{suf}", headers=auth_headers)
    assert search.status_code == 200
    names = [i["business_name"] for i in search.json()["items"]]
    assert any("Alpha Retail" in n for n in names)


@pytest.mark.asyncio
async def test_os_clients_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get(BASE, headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_os_clients_member_cannot_mutate(
    client: AsyncClient,
    member_headers: dict,
    seed_os_rbac_members,
):
    r = await client.post(
        BASE,
        headers=member_headers,
        json={"business_name": "MemberCo"},
    )
    assert r.status_code == 403

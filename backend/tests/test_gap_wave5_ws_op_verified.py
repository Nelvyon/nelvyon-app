"""
Oleada 5 — e2e_orchestrator (pegamento CRM ↔ OS con SQL acotado a workspace).

Ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.
"""
import uuid

import pytest
from httpx import AsyncClient


async def _create_client_and_project(client: AsyncClient, headers: dict) -> tuple[int, int]:
    suf = uuid.uuid4().hex[:8]
    c = await client.post(
        "/api/v1/entities/nelvyon_clients",
        headers=headers,
        json={"business_name": f"E2E{suf}", "sector": "saas"},
    )
    assert c.status_code == 201, c.text
    cid = c.json()["id"]
    pr = await client.post(
        "/api/v1/entities/nelvyon_projects",
        headers=headers,
        json={
            "client_id": cid,
            "name": f"e2e-prj-{suf}",
            "project_type": "web",
            "status": "draft",
        },
    )
    assert pr.status_code == 201, pr.text
    return cid, pr.json()["id"]


@pytest.mark.asyncio
async def test_e2e_propagate_status_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.post(
        "/api/v1/e2e/propagate-status",
        headers={"Authorization": tok},
        json={"project_id": 1, "new_status": "approved"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_e2e_propagate_status_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/e2e/propagate-status",
        headers=member_headers,
        json={"project_id": 1, "new_status": "approved"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_e2e_propagate_status_operator_ok(client: AsyncClient, auth_headers: dict):
    _cid, pid = await _create_client_and_project(client, auth_headers)
    r = await client.post(
        "/api/v1/e2e/propagate-status",
        headers=auth_headers,
        json={"project_id": pid, "new_status": "approved"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("project_id") == pid
    assert body.get("new_status") == "approved"


@pytest.mark.asyncio
async def test_e2e_relationships_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/e2e/relationships/1", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_e2e_relationships_member_ok(
    client: AsyncClient, auth_headers: dict, member_headers: dict
):
    _cid, pid = await _create_client_and_project(client, auth_headers)
    r = await client.get(f"/api/v1/e2e/relationships/{pid}", headers=member_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("project_id") == pid


@pytest.mark.asyncio
async def test_e2e_full_chain_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/e2e/full-chain/1", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_e2e_full_chain_member_ok(
    client: AsyncClient, auth_headers: dict, member_headers: dict
):
    cid, _pid = await _create_client_and_project(client, auth_headers)
    r = await client.get(f"/api/v1/e2e/full-chain/{cid}", headers=member_headers)
    assert r.status_code == 200, r.text
    assert r.json().get("client", {}).get("id") == cid


@pytest.mark.asyncio
async def test_e2e_contract_from_project_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/e2e/contract-from-project",
        headers=member_headers,
        json={"project_id": 1},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_e2e_contract_from_project_operator_ok(client: AsyncClient, auth_headers: dict):
    _cid, pid = await _create_client_and_project(client, auth_headers)
    r = await client.post(
        "/api/v1/e2e/contract-from-project",
        headers=auth_headers,
        json={"project_id": pid, "contract_type": "servicio"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("contract_id") is not None


@pytest.mark.asyncio
async def test_e2e_deal_from_project_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/e2e/deal-from-project",
        headers=member_headers,
        json={"project_id": 1},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_e2e_deal_from_project_operator_ok(client: AsyncClient, auth_headers: dict):
    _cid, pid = await _create_client_and_project(client, auth_headers)
    r = await client.post(
        "/api/v1/e2e/deal-from-project",
        headers=auth_headers,
        json={"project_id": pid, "title": "Deal e2e", "stage": "proposal"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("deal_id") is not None

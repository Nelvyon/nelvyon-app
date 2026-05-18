"""
Oleada 4 — orchestrator, saas_tools, entities/workspaces (pegamento multi-dominio).

Ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from core.auth import create_access_token


def _super_admin_ws2() -> dict:
    token = create_access_token(
        {
            "sub": "super-user-00000000-0000-0000-0000-000000000001",
            "email": "super@test.com",
            "name": "Super",
            "role": "super_admin",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "2"}


@pytest.fixture
def fake_orchestrator_ai():
    with patch("services.orchestrator.AIHubService") as m:
        inst = m.return_value
        inst.gentxt = AsyncMock(return_value=MagicMock(content='{"seo":{"title":"x"}}'))
        yield m


@pytest.mark.asyncio
async def test_orchestrator_generate_web_requires_workspace(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.post(
        "/api/v1/orchestrator/generate-web",
        headers={"Authorization": tok},
        json={"project_id": 1},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_orchestrator_generate_web_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/orchestrator/generate-web",
        headers=member_headers,
        json={"project_id": 1},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_orchestrator_generate_web_wrong_workspace_super_admin_404(
    client: AsyncClient, auth_headers: dict, fake_orchestrator_ai
):
    suf = uuid.uuid4().hex[:8]
    c = await client.post(
        "/api/v1/entities/nelvyon_clients",
        headers=auth_headers,
        json={"business_name": f"Co{suf}", "sector": "saas"},
    )
    assert c.status_code == 201, c.text
    cid = c.json()["id"]
    pr = await client.post(
        "/api/v1/entities/nelvyon_projects",
        headers=auth_headers,
        json={
            "client_id": cid,
            "name": f"prj{suf}",
            "project_type": "web",
            "status": "draft",
        },
    )
    assert pr.status_code == 201, pr.text
    pid = pr.json()["id"]
    r = await client.post(
        "/api/v1/orchestrator/generate-web",
        headers=_super_admin_ws2(),
        json={"project_id": pid},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_orchestrator_generate_web_operator_ok(
    client: AsyncClient, auth_headers: dict, fake_orchestrator_ai
):
    suf = uuid.uuid4().hex[:8]
    c = await client.post(
        "/api/v1/entities/nelvyon_clients",
        headers=auth_headers,
        json={"business_name": f"Co{suf}", "sector": "saas"},
    )
    assert c.status_code == 201, c.text
    cid = c.json()["id"]
    pr = await client.post(
        "/api/v1/entities/nelvyon_projects",
        headers=auth_headers,
        json={
            "client_id": cid,
            "name": f"prj{suf}",
            "project_type": "web",
            "status": "draft",
        },
    )
    assert pr.status_code == 201, pr.text
    pid = pr.json()["id"]
    r = await client.post(
        "/api/v1/orchestrator/generate-web",
        headers=auth_headers,
        json={"project_id": pid},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("output_id") is not None
    assert body.get("output_type") == "web_structure"


@pytest.mark.asyncio
async def test_saas_tools_generate_pdf_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/saas-tools/generate-pdf",
        headers=member_headers,
        json={"doc_type": "proposal", "title": "T"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_saas_tools_generate_pdf_operator_ok(client: AsyncClient, auth_headers: dict):
    with patch("routers.saas_tools.AIHubService") as m:
        inst = m.return_value
        inst.gentxt = AsyncMock(
            return_value=MagicMock(
                content='{"title":"T","doc_type":"proposal","sections":[],"metadata":{}}'
            )
        )
        r = await client.post(
            "/api/v1/saas-tools/generate-pdf",
            headers=auth_headers,
            json={"doc_type": "proposal", "title": "Title1"},
        )
    assert r.status_code == 200, r.text
    assert r.json().get("title") == "T"


@pytest.mark.asyncio
async def test_workspaces_list_requires_header(client: AsyncClient, auth_headers: dict):
    tok = auth_headers["Authorization"]
    r = await client.get("/api/v1/entities/workspaces", headers={"Authorization": tok})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_workspaces_get_list_member_ok(client: AsyncClient, member_headers: dict):
    r = await client.get("/api/v1/entities/workspaces", headers=member_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == 1


@pytest.mark.asyncio
async def test_workspaces_get_by_id_mismatch_forbidden(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/entities/workspaces/999", headers=auth_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_workspaces_all_unauthenticated_401(client: AsyncClient):
    r = await client.get("/api/v1/entities/workspaces/all")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_workspaces_all_user_forbidden_super_admin_ok(client: AsyncClient, auth_headers: dict):
    r_user = await client.get(
        "/api/v1/entities/workspaces/all?skip=0&limit=5",
        headers=auth_headers,
    )
    assert r_user.status_code == 403
    r_ok = await client.get(
        "/api/v1/entities/workspaces/all?skip=0&limit=5",
        headers=_super_admin_ws2(),
    )
    assert r_ok.status_code == 200, r_ok.text


@pytest.mark.asyncio
async def test_workspaces_put_member_forbidden_operator_ok(
    client: AsyncClient, member_headers: dict, auth_headers: dict
):
    r_m = await client.put(
        "/api/v1/entities/workspaces/1",
        headers=member_headers,
        json={"name": "ShouldNotApply"},
    )
    assert r_m.status_code == 403
    suf = uuid.uuid4().hex[:8]
    r_ok = await client.put(
        "/api/v1/entities/workspaces/1",
        headers=auth_headers,
        json={"name": f"RenamedWS{suf}"},
    )
    assert r_ok.status_code == 200, r_ok.text
    assert r_ok.json()["name"] == f"RenamedWS{suf}"


@pytest.mark.asyncio
async def test_workspaces_put_wrong_id_forbidden(client: AsyncClient, auth_headers: dict):
    r = await client.put(
        "/api/v1/entities/workspaces/2",
        headers=auth_headers,
        json={"name": "X"},
    )
    assert r.status_code == 403

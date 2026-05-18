"""
Fase 10 — cierre OS: nelvyon_projects / nelvyon_outputs / nelvyon_campaigns.

- Sin GET /all (404).
- Listados con query JSON malicioso: workspace_id del cuerpo de filtro se fuerza al header (servicio + mixin).
"""
import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.parametrize(
    "base",
    [
        "/api/v1/entities/nelvyon_projects",
        "/api/v1/entities/nelvyon_outputs",
        "/api/v1/entities/nelvyon_campaigns",
    ],
)
@pytest.mark.asyncio
async def test_os_legacy_routes_no_all_endpoint(client: AsyncClient, auth_headers: dict, base: str):
    r = await client.get(f"{base}/all", headers=auth_headers)
    # Sin ruta GET /all: Starlette resuelve /{id}; "all" no es int → 422. Si hubiera 404 explícito, también OK.
    assert r.status_code in (404, 422), r.text


@pytest.mark.asyncio
async def test_nelvyon_projects_list_query_workspace_forced_to_header(
    client: AsyncClient, auth_headers: dict
):
    """Aunque el cliente envíe otro workspace_id en el query JSON, el router lo sobrescribe con X-Workspace-Id."""
    import json

    q = json.dumps({"workspace_id": 999999})
    r = await client.get(
        "/api/v1/entities/nelvyon_projects",
        headers=auth_headers,
        params={"query": q, "limit": 20},
    )
    assert r.status_code == 200, r.text
    for item in r.json().get("items") or []:
        assert int(item.get("workspace_id") or 0) == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_nelvyon_campaigns_operator_create_enforces_workspace_body(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid.uuid4().hex[:8]
    wid = int(auth_headers["X-Workspace-Id"])
    pr = await client.post(
        "/api/v1/entities/nelvyon_projects",
        headers=auth_headers,
        json={
            "client_id": 1,
            "name": f"phase10-camp-prj-{suffix}",
            "project_type": "campaign",
            "status": "active",
        },
    )
    assert pr.status_code == 201, pr.text
    project_id = pr.json()["id"]

    r_bad = await client.post(
        "/api/v1/entities/nelvyon_campaigns",
        headers=auth_headers,
        json={
            "workspace_id": 999999,
            "project_id": project_id,
            "client_id": 1,
            "platform": "email",
            "campaign_type": "blast",
            "name": "should-fail",
        },
    )
    assert r_bad.status_code == 400

    r_ok = await client.post(
        "/api/v1/entities/nelvyon_campaigns",
        headers=auth_headers,
        json={
            "project_id": project_id,
            "client_id": 1,
            "platform": "email",
            "campaign_type": "blast",
            "name": f"phase10-camp-{suffix}",
        },
    )
    assert r_ok.status_code == 201, r_ok.text
    assert r_ok.json().get("workspace_id") == wid

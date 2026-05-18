"""
PRODUCT-ONBOARD-1 FASE 1 — resumen inicial de workspace (/api/v1/workspace/home-summary).
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_home_summary_authenticated_workspace_returns_200(
    client: AsyncClient,
    auth_headers: dict,
):
    r = await client.get("/api/v1/workspace/home-summary", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("workspace_id") == 1
    assert "workspace_name" in data
    assert "counts" in data
    c = data["counts"]
    assert set(c.keys()) >= {"contacts", "campaigns", "deals_open", "helpdesk_open"}
    for k in ("contacts", "campaigns", "deals_open", "helpdesk_open"):
        assert isinstance(c[k], int)
    steps = data.get("first_steps") or []
    assert len(steps) >= 5
    for s in steps:
        assert "id" in s and "title" in s and "href" in s and "done" in s


@pytest.mark.asyncio
async def test_home_summary_unauthenticated_returns_401(client: AsyncClient):
    r = await client.get("/api/v1/workspace/home-summary")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_home_summary_missing_workspace_header_returns_400(
    client: AsyncClient,
    auth_headers: dict,
):
    h = {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}
    r = await client.get("/api/v1/workspace/home-summary", headers=h)
    assert r.status_code == 400
    assert "workspace" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_home_summary_snapshot_first_step_ids(
    client: AsyncClient,
    auth_headers: dict,
):
    """Contrato estable para el bloque 'Primeros pasos' del frontend."""
    r = await client.get("/api/v1/workspace/home-summary", headers=auth_headers)
    assert r.status_code == 200
    ids = [s["id"] for s in r.json().get("first_steps", [])]
    assert ids == ["contacts", "pipeline", "campaign", "helpdesk", "workflows"]

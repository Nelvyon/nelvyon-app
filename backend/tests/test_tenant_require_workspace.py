"""
Tenant isolation: require_workspace dependency and MVP endpoints.

- 400 when authenticated but X-Workspace-Id is missing
- 403 when workspace is not accessible to the user
- 200/404 with valid owner workspace + header
"""
import inspect

import pytest
from httpx import AsyncClient

from core.auth import create_access_token


@pytest.fixture
def auth_only_headers() -> dict:
    """Bearer token without X-Workspace-Id."""
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_contacts_list_400_without_workspace_header(
    client: AsyncClient, auth_only_headers: dict
):
    r = await client.get("/api/v1/entities/contacts", headers=auth_only_headers)
    assert r.status_code == 400
    assert "workspace" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_deals_list_400_without_workspace_header(
    client: AsyncClient, auth_only_headers: dict
):
    r = await client.get("/api/v1/entities/deals", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_contacts_list_403_foreign_workspace(
    client: AsyncClient, auth_only_headers: dict
):
    h = {**auth_only_headers, "X-Workspace-Id": "99999"}
    r = await client.get("/api/v1/entities/contacts", headers=h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_contacts_list_ok_with_valid_workspace(
    client: AsyncClient, auth_headers: dict
):
    r = await client.get("/api/v1/entities/contacts", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_dashboard_metrics_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/dashboard/metrics", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_crm_analytics_overview_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/crm/analytics/overview", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_pipeline_stats_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/pipeline/stats", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_global_dashboard_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/global-dashboard/overview", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_global_modules_summary_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/global-dashboard/modules-summary", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_campaign_sender_preview_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/campaign-sender/preview-recipients", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_workflow_rules_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/workflow-engine/rules", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_nelvyon_campaigns_requires_workspace(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/entities/nelvyon_campaigns", headers=auth_only_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_contracts_list_requires_workspace_header(client: AsyncClient, auth_only_headers: dict):
    r = await client.get("/api/v1/entities/contracts", headers=auth_only_headers)
    assert r.status_code == 400


def test_mvp_entity_routers_use_require_workspace_dependency():
    """Regression: sample endpoints must use Depends(require_workspace)."""
    from routers.contacts import query_contactss
    from routers.contracts import query_contractss
    from routers.deals import query_deals
    from routers.helpdesk_tickets import query_helpdesk_tickets

    for fn in (query_contactss, query_contractss, query_deals, query_helpdesk_tickets):
        src = inspect.getsource(fn)
        assert "Depends(require_workspace)" in src
        assert "get_workspace_context" not in src

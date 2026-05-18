import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_os_excellence_checklist(client: AsyncClient, admin_headers: dict):
    r = await client.get("/api/v1/os/excellence/checklist", headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    keys = {x["key"] for x in body["items"]}
    assert {"auth_signup", "workspace_select", "branding_v1_v2", "voice_v2", "observability_v1", "os_global_v2"} <= keys


@pytest.mark.asyncio
async def test_os_excellence_i18n_and_golden_path(client: AsyncClient, admin_headers: dict):
    i18n = await client.get("/api/v1/os/excellence/i18n", headers=admin_headers)
    assert i18n.status_code == 200, i18n.text
    i18n_body = i18n.json()
    assert i18n_body["default_locale"]
    assert len(i18n_body["enabled_locales"]) >= 1
    assert len(i18n_body["modules"]) >= 6
    assert len(i18n_body["hotspots"]) >= 3

    gp = await client.get("/api/v1/os/excellence/golden-path", headers=admin_headers)
    assert gp.status_code == 200, gp.text
    gp_body = gp.json()
    assert "ready" in gp_body["criterion"].lower()
    assert len(gp_body["steps"]) == 5

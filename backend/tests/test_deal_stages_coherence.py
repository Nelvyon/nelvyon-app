"""
PR #5 — Coherencia CRM ↔ Pipeline ↔ Dashboard ↔ Resumen ejecutivo.

Objetivo:
- verificar que los módulos cuentan la misma historia para el mismo workspace;
- verificar aislamiento A/B para el mismo usuario;
- cubrir errores críticos de contrato (stage/contact/workspace header).
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


def _headers_for_workspace(auth_headers: dict, workspace_id: int) -> dict:
    h = dict(auth_headers)
    h["X-Workspace-Id"] = str(workspace_id)
    return h


def _without_workspace_header(auth_headers: dict) -> dict:
    return {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}


def _stage_value_map(pipeline_stats: dict) -> dict[str, float]:
    return {
        str(s.get("stage", "")): float(s.get("total_value", 0) or 0)
        for s in pipeline_stats.get("stages", [])
    }


@pytest.mark.asyncio
async def test_crm_pipeline_dashboard_global_are_coherent_same_workspace(
    client: AsyncClient, auth_headers: dict
):
    ws_headers = _headers_for_workspace(auth_headers, 1)
    suffix = uuid4().hex[:8]

    # 1) Crear contacto
    c_resp = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": f"Coherence-{suffix}",
            "last_name": "E2E",
            "email": f"coherence-{suffix}@test.com",
            "status": "active",
        },
        headers=ws_headers,
    )
    assert c_resp.status_code in (200, 201), c_resp.text
    contact_id = c_resp.json()["id"]

    # 2) Crear deal (lead) ligado al contacto
    deal_value = 4321.0
    d_resp = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": f"Coherence Deal {suffix}",
            "stage": "lead",
            "value": deal_value,
            "currency": "USD",
            "probability": 70,
            "contact_id": contact_id,
        },
        headers=ws_headers,
    )
    assert d_resp.status_code in (200, 201), d_resp.text
    deal_id = d_resp.json()["id"]

    # 3) Mover etapas: lead -> qualified -> closed_won
    s1 = await client.post(
        f"/api/v1/pipeline/deals/{deal_id}/stage-change",
        json={"new_stage": "qualified", "notes": "Qualification passed"},
        headers=ws_headers,
    )
    assert s1.status_code == 200, s1.text

    s2 = await client.post(
        f"/api/v1/pipeline/deals/{deal_id}/stage-change",
        json={"new_stage": "closed_won", "notes": "Closed in E2E test"},
        headers=ws_headers,
    )
    assert s2.status_code == 200, s2.text

    # 4) Verificar stage final del deal
    deal_get = await client.get(f"/api/v1/entities/deals/{deal_id}", headers=ws_headers)
    assert deal_get.status_code == 200
    assert deal_get.json()["stage"] == "closed_won"

    # 5) Verificar actividad de cambio de etapa
    activities = await client.get(
        f"/api/v1/pipeline/deals/{deal_id}/activities",
        headers=ws_headers,
    )
    assert activities.status_code == 200, activities.text
    act_items = activities.json().get("items", [])
    assert any(a.get("type") == "stage_change" for a in act_items)

    # 6) Comparar Pipeline vs Dashboard vs Global vs Modules Summary
    p_resp = await client.get("/api/v1/pipeline/stats", headers=ws_headers)
    d_resp = await client.get("/api/v1/dashboard/metrics", headers=ws_headers)
    g_resp = await client.get("/api/v1/global-dashboard/overview", headers=ws_headers)
    m_resp = await client.get("/api/v1/global-dashboard/modules-summary", headers=ws_headers)
    assert p_resp.status_code == 200, p_resp.text
    assert d_resp.status_code == 200, d_resp.text
    assert g_resp.status_code == 200, g_resp.text
    assert m_resp.status_code == 200, m_resp.text

    pipeline = p_resp.json()
    dashboard = d_resp.json()
    global_overview = g_resp.json()
    modules = m_resp.json()

    kpis_deals = dashboard["kpis"]["deals"]
    kpis_contacts = dashboard["kpis"]["contacts"]
    global_pipeline = global_overview["pipeline"]
    module_map = {m["module"]: m for m in modules}

    assert pipeline["total_deals"] == kpis_deals["total"] == global_pipeline["total_deals"]
    assert kpis_deals["won"] == global_pipeline["won_deals"]
    assert kpis_deals["open"] == global_pipeline["open_deals"]
    assert pipeline["win_rate"] == kpis_deals["win_rate"] == global_pipeline["win_rate"]
    assert float(pipeline["total_value"]) == pytest.approx(float(kpis_deals["value_total"]), rel=1e-6)

    stage_values = _stage_value_map(pipeline)
    terminal = {"closed_won", "closed_lost", "won", "closed", "lost"}
    open_pipeline_value = sum(v for stage, v in stage_values.items() if stage not in terminal)
    assert float(global_pipeline["pipeline_value"]) == pytest.approx(open_pipeline_value, rel=1e-6)

    assert module_map["pipelines"]["primary_value"] == pipeline["total_deals"]
    assert module_map["pipelines"]["secondary_value"] == global_pipeline["open_deals"]
    assert module_map["crm"]["primary_value"] == kpis_contacts["total"]


@pytest.mark.asyncio
async def test_multitenant_isolation_same_user_workspace_a_b(
    client: AsyncClient, auth_headers: dict
):
    headers_a = _headers_for_workspace(auth_headers, 1)
    no_ws = _without_workspace_header(auth_headers)
    suffix = uuid4().hex[:8]

    # Crear workspace B del mismo usuario
    ws_create = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"E2E WS B {suffix}", "slug": f"e2e-ws-b-{suffix}"},
        headers=no_ws,
    )
    assert ws_create.status_code == 201, ws_create.text
    ws_b_id = ws_create.json()["id"]
    headers_b = _headers_for_workspace(auth_headers, ws_b_id)

    # Baseline deals por workspace (dashboard)
    a0 = await client.get("/api/v1/dashboard/metrics", headers=headers_a)
    b0 = await client.get("/api/v1/dashboard/metrics", headers=headers_b)
    assert a0.status_code == 200 and b0.status_code == 200
    a0_deals = int(a0.json()["kpis"]["deals"]["total"])
    b0_deals = int(b0.json()["kpis"]["deals"]["total"])

    # Crear datos en A
    ca = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "TenantA", "email": f"tenant-a-{suffix}@test.com", "status": "active"},
        headers=headers_a,
    )
    assert ca.status_code in (200, 201), ca.text
    da = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": f"Deal-A-{suffix}",
            "stage": "lead",
            "value": 1111,
            "currency": "USD",
            "contact_id": ca.json()["id"],
        },
        headers=headers_a,
    )
    assert da.status_code in (200, 201), da.text
    deal_a_id = da.json()["id"]

    a1 = await client.get("/api/v1/dashboard/metrics", headers=headers_a)
    b1 = await client.get("/api/v1/dashboard/metrics", headers=headers_b)
    assert a1.status_code == 200 and b1.status_code == 200
    assert int(a1.json()["kpis"]["deals"]["total"]) == a0_deals + 1
    assert int(b1.json()["kpis"]["deals"]["total"]) == b0_deals

    # Crear datos en B
    cb = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "TenantB", "email": f"tenant-b-{suffix}@test.com", "status": "active"},
        headers=headers_b,
    )
    assert cb.status_code in (200, 201), cb.text
    db = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": f"Deal-B-{suffix}",
            "stage": "lead",
            "value": 2222,
            "currency": "USD",
            "contact_id": cb.json()["id"],
        },
        headers=headers_b,
    )
    assert db.status_code in (200, 201), db.text
    deal_b_id = db.json()["id"]

    a2 = await client.get("/api/v1/dashboard/metrics", headers=headers_a)
    b2 = await client.get("/api/v1/dashboard/metrics", headers=headers_b)
    assert a2.status_code == 200 and b2.status_code == 200
    assert int(a2.json()["kpis"]["deals"]["total"]) == a0_deals + 1
    assert int(b2.json()["kpis"]["deals"]["total"]) == b0_deals + 1

    # No fuga cruzada por id
    wrong_a = await client.get(f"/api/v1/entities/deals/{deal_a_id}", headers=headers_b)
    wrong_b = await client.get(f"/api/v1/entities/deals/{deal_b_id}", headers=headers_a)
    assert wrong_a.status_code == 404
    assert wrong_b.status_code == 404

    # Pipeline stats y global overview permanecen alineados por workspace
    p_a = await client.get("/api/v1/pipeline/stats", headers=headers_a)
    p_b = await client.get("/api/v1/pipeline/stats", headers=headers_b)
    g_a = await client.get("/api/v1/global-dashboard/overview", headers=headers_a)
    g_b = await client.get("/api/v1/global-dashboard/overview", headers=headers_b)
    assert p_a.status_code == 200 and p_b.status_code == 200
    assert g_a.status_code == 200 and g_b.status_code == 200
    assert p_a.json()["total_deals"] == a2.json()["kpis"]["deals"]["total"] == g_a.json()["pipeline"]["total_deals"]
    assert p_b.json()["total_deals"] == b2.json()["kpis"]["deals"]["total"] == g_b.json()["pipeline"]["total_deals"]


@pytest.mark.asyncio
async def test_validation_errors_workspace_stage_and_cross_workspace_contact(
    client: AsyncClient, auth_headers: dict
):
    headers_a = _headers_for_workspace(auth_headers, 1)
    no_ws = _without_workspace_header(auth_headers)
    suffix = uuid4().hex[:8]

    # 1) Sin X-Workspace-Id en endpoints tenant-strict
    missing_ws_pipeline = await client.get("/api/v1/pipeline/stats", headers=no_ws)
    missing_ws_global = await client.get("/api/v1/global-dashboard/overview", headers=no_ws)
    assert missing_ws_pipeline.status_code == 400
    assert missing_ws_global.status_code == 400

    # 2) Stage inválido en escritura de deal
    invalid_stage = await client.post(
        "/api/v1/entities/deals",
        json={"title": f"InvalidStage-{suffix}", "stage": "fantasy_stage", "value": 10},
        headers=headers_a,
    )
    assert invalid_stage.status_code == 400, invalid_stage.text
    assert "stage" in str(invalid_stage.json().get("detail", "")).lower()

    # 3) contact_id de otro workspace
    ws_create = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"Cross Contact WS {suffix}", "slug": f"cross-contact-ws-{suffix}"},
        headers=no_ws,
    )
    assert ws_create.status_code == 201, ws_create.text
    ws_b_id = ws_create.json()["id"]
    headers_b = _headers_for_workspace(auth_headers, ws_b_id)

    contact_b = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "OtherWs", "email": f"other-ws-{suffix}@test.com", "status": "active"},
        headers=headers_b,
    )
    assert contact_b.status_code in (200, 201), contact_b.text
    foreign_contact_id = contact_b.json()["id"]

    cross_ws_contact = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": f"CrossContact-{suffix}",
            "stage": "lead",
            "value": 100,
            "contact_id": foreign_contact_id,
        },
        headers=headers_a,
    )
    assert cross_ws_contact.status_code == 400, cross_ws_contact.text
    assert "workspace" in str(cross_ws_contact.json().get("detail", "")).lower()

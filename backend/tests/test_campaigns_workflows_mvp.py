"""
B1-6 — Fase 1 MVP acceptance: campaigns (oficial) + workflows + segmentación + tenant.

Validación repetible del flujo: campaigns → audiencia → preview/send → triggers CRM
→ ejecuciones workflow, con aislamiento por workspace y señales dominio oficial vs legado.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient

from core.auth import create_access_token


@pytest.fixture
def auth_only_headers() -> dict:
    """Bearer sin X-Workspace-Id (mismo sub que auth_headers de conftest)."""
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}"}


def _headers_ws(auth_headers: dict, workspace_id: int) -> dict:
    h = dict(auth_headers)
    h["X-Workspace-Id"] = str(workspace_id)
    return h


def _no_workspace(auth_headers: dict) -> dict:
    return {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}


@pytest.mark.asyncio
async def test_mvp_fase1_official_campaign_segment_preview_send_stats_and_crm_trigger(
    client: AsyncClient, auth_headers: dict
):
    """
    E2E oficial: regla contact_created → contacto CRM dispara ejecución;
    campaña en `campaigns` + segmento mínimo → preview == recipients_count == stats;
    dominio oficial vs legado en headers.
    """
    suffix = uuid4().hex[:8]
    h = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    tag_send = f"mvp-send-{suffix}"

    # 1) Workflow: auto on contact_created (no mezcla con segmento de envío)
    rule = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"MVP-WF-{suffix}",
            "trigger_type": "contact_created",
            "action_type": "create_notification",
            "action_config": '{"title": "MVP CRM trigger", "message": "contact_created"}',
            "is_active": True,
        },
        headers=h,
    )
    assert rule.status_code == 201, rule.text
    rule_id = rule.json()["id"]

    # 2) Contacto que dispara solo el workflow (sin tag de envío masivo)
    wf_contact = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "MVP",
            "email": f"mvp-wf-only-{suffix}@test.com",
            "status": "active",
            "tags": "workflow-only",
            "source": "web",
            "score": 50,
        },
        headers=h,
    )
    assert wf_contact.status_code in (200, 201), wf_contact.text

    rule_after = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=h)
    assert rule_after.status_code == 200
    assert rule_after.json()["runs_count"] >= 1

    execs = await client.get("/api/v1/workflow-engine/executions?limit=50", headers=h)
    assert execs.status_code == 200
    assert any(
        e["rule_id"] == rule_id and e["status"] == "success"
        for e in execs.json()["items"]
    )

    # 3) Audiencia segmentada para la campaña (2 contactos, tag único)
    for i in (1, 2):
        c = await client.post(
            "/api/v1/entities/contacts",
            json={
                "first_name": f"MVP{i}",
                "email": f"mvp-seg-{i}-{suffix}@test.com",
                "status": "active",
                "tags": tag_send,
                "source": "web",
                "score": 85,
            },
            headers=h,
        )
        assert c.status_code in (200, 201), c.text

    camp = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"MVP-Campaign-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": f"MVP subject {suffix}",
            "content": "<p>MVP body</p>",
        },
        headers=h,
    )
    assert camp.status_code in (200, 201), camp.text
    campaign_id = camp.json()["id"]

    seg = {
        "status": "active",
        "tags": tag_send,
        "source": "web",
        "score_min": 80,
        "score_max": 100,
    }

    preview = await client.get(
        "/api/v1/campaign-sender/preview-recipients",
        params=seg,
        headers=h,
    )
    assert preview.status_code == 200, preview.text
    preview_total = preview.json()["total_recipients"]
    assert preview_total == 2

    send = await client.post(
        "/api/v1/campaign-sender/send",
        json={"campaign_id": campaign_id, "segment_filters": seg},
        headers=h,
    )
    assert send.status_code == 200, send.text
    body = send.json()
    assert body["recipients_count"] == preview_total

    stats = await client.get(
        f"/api/v1/campaign-sender/stats/{campaign_id}", headers=h
    )
    assert stats.status_code == 200, stats.text
    sj = stats.json()
    assert sj["recipients_count"] == preview_total

    camp_get = await client.get(f"/api/v1/entities/campaigns/{campaign_id}", headers=h)
    assert camp_get.status_code == 200
    assert camp_get.json()["recipients_count"] == preview_total

    # Dominio oficial vs legado (headers)
    off = await client.get("/api/v1/entities/campaigns?limit=1", headers=h)
    assert off.headers.get("X-Campaign-Domain") == "official_campaigns"
    assert off.headers.get("X-Campaign-Official-Domain") == "campaigns"

    leg = await client.get("/api/v1/entities/nelvyon_campaigns?limit=1", headers=h)
    assert leg.status_code == 200, leg.text
    assert leg.headers.get("X-Campaign-Domain") == "legacy_nelvyon_campaigns"
    assert leg.headers.get("Deprecation") == "true"
    assert "successor-version" in (leg.headers.get("Link") or "")


@pytest.mark.asyncio
async def test_mvp_fase1_deal_stage_changed_happy_path_and_workspace_isolation(
    client: AsyncClient, auth_headers: dict
):
    """
    Camino feliz CRM: pipeline stage-change canónico dispara regla deal_stage_changed;
    runs_count sube; ejecución con trigger_type coherente; eventos en B no afectan regla en A.
    """
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-STAGE-MVP-{suffix}", "slug": f"qa-stage-mvp-{suffix}"},
        headers=no_ws,
    )
    assert ws_resp.status_code == 201, ws_resp.text
    ws_b = ws_resp.json()["id"]
    h_b = _headers_ws(auth_headers, ws_b)

    rule = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"MVP-STAGE-{suffix}",
            "trigger_type": "deal_stage_changed",
            "action_type": "create_notification",
            "action_config": '{"title": "MVP deal stage", "message": "stage ok"}',
            "is_active": True,
        },
        headers=h_a,
    )
    assert rule.status_code == 201, rule.text
    rule_id = rule.json()["id"]
    runs_before = rule.json()["runs_count"]

    deal = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": f"MVP stage deal {suffix}",
            "stage": "lead",
            "value": 500,
            "currency": "USD",
        },
        headers=h_a,
    )
    assert deal.status_code in (200, 201), deal.text
    deal_id = deal.json()["id"]

    move = await client.post(
        f"/api/v1/pipeline/deals/{deal_id}/stage-change",
        json={"new_stage": "qualified", "notes": "mvp deal_stage_changed"},
        headers=h_a,
    )
    assert move.status_code == 200, move.text

    rule_after = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=h_a)
    assert rule_after.status_code == 200
    assert rule_after.json()["runs_count"] > runs_before

    execs_a = await client.get("/api/v1/workflow-engine/executions?limit=200", headers=h_a)
    assert execs_a.status_code == 200
    assert any(
        e["rule_id"] == rule_id
        and e.get("trigger_type") == "deal_stage_changed"
        and e.get("status") == "success"
        for e in execs_a.json()["items"]
    )

    execs_b = await client.get("/api/v1/workflow-engine/executions?limit=200", headers=h_b)
    assert execs_b.status_code == 200
    assert not any(
        e.get("rule_id") == rule_id and e.get("trigger_type") == "deal_stage_changed"
        for e in execs_b.json()["items"]
    )

    deal_b = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": f"MVP B-only deal {suffix}",
            "stage": "lead",
            "value": 1,
            "currency": "USD",
        },
        headers=h_b,
    )
    assert deal_b.status_code in (200, 201), deal_b.text
    move_b = await client.post(
        f"/api/v1/pipeline/deals/{deal_b.json()['id']}/stage-change",
        json={"new_stage": "qualified"},
        headers=h_b,
    )
    assert move_b.status_code == 200, move_b.text

    rule_a_final = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=h_a)
    assert rule_a_final.status_code == 200
    assert rule_a_final.json()["runs_count"] == rule_after.json()["runs_count"]


@pytest.mark.asyncio
async def test_mvp_tenant_isolation_campaign_rules_executions_and_cross_send(
    client: AsyncClient, auth_headers: dict
):
    """Mismo usuario, workspaces A/B: campañas, reglas, preview y envío cruzado no se mezclan."""
    suffix = uuid4().hex[:8]
    headers_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-MVP-{suffix}", "slug": f"qa-mvp-{suffix}"},
        headers=no_ws,
    )
    assert ws_resp.status_code == 201, ws_resp.text
    ws_b = ws_resp.json()["id"]
    headers_b = _headers_ws(auth_headers, ws_b)

    # Regla solo en A
    rule_a = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"MVP-ISO-RULE-{suffix}",
            "trigger_type": "manual",
            "action_type": "create_notification",
            "is_active": True,
        },
        headers=headers_a,
    )
    assert rule_a.status_code == 201, rule_a.text
    rule_a_id = rule_a.json()["id"]

    rules_b = await client.get("/api/v1/workflow-engine/rules?limit=200", headers=headers_b)
    assert rules_b.status_code == 200
    assert all(r["id"] != rule_a_id for r in rules_b.json()["items"])

    # Campaña en A
    camp_a = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"MVP-ISO-CAMP-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Iso",
            "content": "X",
        },
        headers=headers_a,
    )
    assert camp_a.status_code in (200, 201), camp_a.text
    camp_a_id = camp_a.json()["id"]

    send_cross = await client.post(
        "/api/v1/campaign-sender/send",
        json={"campaign_id": camp_a_id},
        headers=headers_b,
    )
    assert send_cross.status_code in (400, 404), send_cross.text

    # Ejecuciones listadas en B no incluyen reglas de A (por rule_id inexistente en B)
    exec_b = await client.get("/api/v1/workflow-engine/executions?limit=200", headers=headers_b)
    assert exec_b.status_code == 200
    assert all(e.get("rule_id") != rule_a_id for e in exec_b.json()["items"])


@pytest.mark.asyncio
async def test_mvp_error_surface_missing_workspace_invalid_stage_invalid_segment(
    client: AsyncClient, auth_headers: dict, auth_only_headers: dict
):
    """400 sin workspace; stage inválido; segmento inválido (score_min > score_max) en send."""
    h = auth_headers

    r_preview = await client.get(
        "/api/v1/campaign-sender/preview-recipients", headers=auth_only_headers
    )
    assert r_preview.status_code == 400

    deal = await client.post(
        "/api/v1/entities/deals",
        json={"title": "MVP stage err", "stage": "lead", "value": 1, "currency": "USD"},
        headers=h,
    )
    assert deal.status_code in (200, 201), deal.text
    did = deal.json()["id"]
    bad_stage = await client.post(
        f"/api/v1/pipeline/deals/{did}/stage-change",
        json={"new_stage": "not_a_real_stage"},
        headers=h,
    )
    assert bad_stage.status_code == 400
    detail = str(bad_stage.json().get("detail") or "").lower()
    assert "stage" in detail or "new_stage" in detail

    camp = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": "MVP seg err",
            "type": "email",
            "status": "draft",
            "subject": "S",
            "content": "C",
        },
        headers=h,
    )
    assert camp.status_code in (200, 201), camp.text
    cid = camp.json()["id"]
    bad_seg = await client.post(
        "/api/v1/campaign-sender/send",
        json={
            "campaign_id": cid,
            "segment_filters": {"score_min": 100, "score_max": 10},
        },
        headers=h,
    )
    assert bad_seg.status_code == 400
    assert "score" in str(bad_seg.json().get("detail") or "").lower()

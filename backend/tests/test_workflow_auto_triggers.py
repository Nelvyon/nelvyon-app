"""
B1-2 — Auto workflow triggers from real CRM events.
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


@pytest.mark.asyncio
async def test_auto_trigger_contact_created_runs_rule(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]

    rule_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"AUTO-CONTACT-{suffix}",
            "trigger_type": "contact_created",
            "action_type": "create_activity",
            "action_config": '{"title": "Auto contact workflow", "type": "task"}',
            "is_active": True,
        },
        headers=auth_headers,
    )
    assert rule_resp.status_code == 201, rule_resp.text
    rule_id = rule_resp.json()["id"]

    create_contact = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "Auto",
            "last_name": "Contact",
            "email": f"auto-contact-{suffix}@test.com",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert create_contact.status_code in (200, 201), create_contact.text

    # Rule runs_count increments via automatic trigger.
    get_rule = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=auth_headers)
    assert get_rule.status_code == 200
    assert get_rule.json()["runs_count"] >= 1

    execs = await client.get("/api/v1/workflow-engine/executions?limit=200", headers=auth_headers)
    assert execs.status_code == 200
    assert any(e["rule_id"] == rule_id and e["status"] == "success" for e in execs.json()["items"])


@pytest.mark.asyncio
async def test_auto_trigger_deal_stage_changed_runs_rule(client: AsyncClient, auth_headers: dict):
    suffix = uuid4().hex[:8]

    rule_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"AUTO-STAGE-{suffix}",
            "trigger_type": "deal_stage_changed",
            "action_type": "create_notification",
            "action_config": '{"title": "Auto stage workflow", "message": "Deal stage moved"}',
            "is_active": True,
        },
        headers=auth_headers,
    )
    assert rule_resp.status_code == 201, rule_resp.text
    rule_id = rule_resp.json()["id"]

    deal_resp = await client.post(
        "/api/v1/entities/deals",
        json={"title": f"Auto Stage Deal {suffix}", "stage": "lead", "value": 1000, "currency": "USD"},
        headers=auth_headers,
    )
    assert deal_resp.status_code in (200, 201), deal_resp.text
    deal_id = deal_resp.json()["id"]

    move_resp = await client.post(
        f"/api/v1/pipeline/deals/{deal_id}/stage-change",
        json={"new_stage": "qualified", "notes": "auto trigger check"},
        headers=auth_headers,
    )
    assert move_resp.status_code == 200, move_resp.text

    get_rule = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=auth_headers)
    assert get_rule.status_code == 200
    assert get_rule.json()["runs_count"] >= 1

    execs = await client.get("/api/v1/workflow-engine/executions?limit=200", headers=auth_headers)
    assert execs.status_code == 200
    assert any(e["rule_id"] == rule_id and e["status"] == "success" for e in execs.json()["items"])


@pytest.mark.asyncio
async def test_auto_triggers_do_not_run_rules_from_other_workspace(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    ws_a = int(auth_headers["X-Workspace-Id"])
    headers_a = _headers_for_workspace(auth_headers, ws_a)
    no_ws = _without_workspace_header(auth_headers)

    ws_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-AUTO-{suffix}", "slug": f"qa-auto-{suffix}"},
        headers=no_ws,
    )
    assert ws_resp.status_code == 201, ws_resp.text
    ws_b = ws_resp.json()["id"]
    headers_b = _headers_for_workspace(auth_headers, ws_b)

    # Rule only in workspace A.
    rule_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"AUTO-ISO-{suffix}",
            "trigger_type": "contact_created",
            "action_type": "create_activity",
            "action_config": '{"title": "A-only"}',
            "is_active": True,
        },
        headers=headers_a,
    )
    assert rule_resp.status_code == 201, rule_resp.text
    rule_id = rule_resp.json()["id"]

    # Fire event in workspace B by creating contact there.
    c_b = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "B",
            "email": f"b-auto-{suffix}@test.com",
            "status": "active",
        },
        headers=headers_b,
    )
    assert c_b.status_code in (200, 201), c_b.text

    # Rule from A must stay untouched.
    get_rule_a = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=headers_a)
    assert get_rule_a.status_code == 200
    assert get_rule_a.json()["runs_count"] == 0

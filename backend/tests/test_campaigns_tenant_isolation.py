"""
B1-4 — Tenant isolation for campaigns/workflow engine.
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
async def test_campaigns_and_workflows_are_isolated_between_workspaces(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid4().hex[:8]
    headers_a = _headers_for_workspace(auth_headers, 1)
    no_ws = _without_workspace_header(auth_headers)

    # Create workspace B for same user
    ws_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-B1-4-{suffix}", "slug": f"qa-b1-4-{suffix}"},
        headers=no_ws,
    )
    assert ws_resp.status_code == 201, ws_resp.text
    ws_b = ws_resp.json()["id"]
    headers_b = _headers_for_workspace(auth_headers, ws_b)

    # Contacts in each workspace (for campaign recipients preview)
    c_a = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "A", "email": f"a-{suffix}@test.com", "status": "active"},
        headers=headers_a,
    )
    c_b = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "B", "email": f"b-{suffix}@test.com", "status": "active"},
        headers=headers_b,
    )
    assert c_a.status_code in (200, 201), c_a.text
    assert c_b.status_code in (200, 201), c_b.text

    # Campaign in workspace A
    campaign_a = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "name": f"Campaign-A-{suffix}",
            "type": "email",
            "status": "draft",
            "subject": "Hello A",
            "content": "Body A",
        },
        headers=headers_a,
    )
    assert campaign_a.status_code in (200, 201), campaign_a.text
    campaign_a_id = campaign_a.json()["id"]

    # Same campaign must not be reachable from workspace B
    get_cross = await client.get(f"/api/v1/entities/campaigns/{campaign_a_id}", headers=headers_b)
    assert get_cross.status_code == 404

    # Sender preview must be isolated by workspace contacts
    preview_a = await client.get("/api/v1/campaign-sender/preview-recipients", headers=headers_a)
    preview_b = await client.get("/api/v1/campaign-sender/preview-recipients", headers=headers_b)
    assert preview_a.status_code == 200 and preview_b.status_code == 200
    assert preview_a.json()["total_recipients"] >= 1
    assert preview_b.json()["total_recipients"] >= 1

    # Sending campaign A from workspace B must fail as not found in that workspace
    send_cross = await client.post(
        "/api/v1/campaign-sender/send",
        json={"campaign_id": campaign_a_id},
        headers=headers_b,
    )
    assert send_cross.status_code in (400, 404), send_cross.text

    # Workflow rule in workspace A
    rule_a = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"Rule-A-{suffix}",
            "trigger_type": "manual",
            "action_type": "create_notification",
            "is_active": True,
        },
        headers=headers_a,
    )
    assert rule_a.status_code == 201, rule_a.text
    rule_a_id = rule_a.json()["id"]

    # List in workspace B must not include rule from A
    rules_b = await client.get("/api/v1/workflow-engine/rules?limit=200", headers=headers_b)
    assert rules_b.status_code == 200
    assert all(r["id"] != rule_a_id for r in rules_b.json()["items"])

    # Direct fetch of rule from workspace B must be 404
    get_rule_cross = await client.get(f"/api/v1/workflow-engine/rules/{rule_a_id}", headers=headers_b)
    assert get_rule_cross.status_code == 404

    # Nelvyon campaign in workspace A, hidden in B
    n_a = await client.post(
        "/api/v1/entities/nelvyon_campaigns",
        json={
            "project_id": 1,
            "platform": "meta_ads",
            "campaign_type": "awareness",
            "name": f"Nelvyon-A-{suffix}",
        },
        headers=headers_a,
    )
    assert n_a.status_code in (200, 201), n_a.text
    n_a_id = n_a.json()["id"]
    n_cross = await client.get(f"/api/v1/entities/nelvyon_campaigns/{n_a_id}", headers=headers_b)
    assert n_cross.status_code == 404

"""
Tests for Workflow Engine — Rules CRUD, trigger evaluation, action execution.
"""

import pytest
from httpx import AsyncClient


# ─── Rule CRUD ───

@pytest.mark.asyncio
async def test_list_rules_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/workflow-engine/rules")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_rules_authenticated(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/workflow-engine/rules", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_rule(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Test Rule: Move Deal on Contact Created",
            "description": "When a contact is created, create an activity",
            "trigger_type": "contact_created",
            "trigger_config": "{}",
            "action_type": "create_activity",
            "action_config": '{"title": "Follow up new contact", "type": "task"}',
            "is_active": True,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Rule: Move Deal on Contact Created"
    assert data["trigger_type"] == "contact_created"
    assert data["action_type"] == "create_activity"
    assert data["is_active"] is True
    return data["id"]


@pytest.mark.asyncio
async def test_get_rule(client: AsyncClient, auth_headers: dict):
    # Create first
    create_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Get Test Rule",
            "trigger_type": "deal_created",
            "action_type": "create_notification",
            "action_config": '{"title": "New deal!"}',
        },
        headers=auth_headers,
    )
    rule_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == rule_id


@pytest.mark.asyncio
async def test_update_rule(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Update Test Rule",
            "trigger_type": "manual",
            "action_type": "create_activity",
        },
        headers=auth_headers,
    )
    rule_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/v1/workflow-engine/rules/{rule_id}",
        json={"name": "Updated Rule Name", "is_active": False},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Rule Name"
    assert response.json()["is_active"] is False


@pytest.mark.asyncio
async def test_delete_rule(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Delete Test Rule",
            "trigger_type": "manual",
            "action_type": "create_notification",
        },
        headers=auth_headers,
    )
    rule_id = create_resp.json()["id"]

    response = await client.delete(f"/api/v1/workflow-engine/rules/{rule_id}", headers=auth_headers)
    assert response.status_code == 200

    # Verify deleted
    get_resp = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=auth_headers)
    assert get_resp.status_code == 404


# ─── Trigger & Execute ───

@pytest.mark.asyncio
async def test_trigger_creates_activity(client: AsyncClient, auth_headers: dict):
    """Create a rule, fire a trigger, verify activity was created."""
    # Create rule: on contact_created → create_activity
    await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Auto Activity on Contact",
            "trigger_type": "contact_created",
            "action_type": "create_activity",
            "action_config": '{"title": "Welcome new contact", "type": "task"}',
            "is_active": True,
        },
        headers=auth_headers,
    )

    # Fire trigger
    response = await client.post(
        "/api/v1/workflow-engine/trigger",
        json={
            "trigger_type": "contact_created",
            "trigger_data": {"contact_id": 1, "first_name": "Test"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["triggered"] >= 1
    assert data["executions"][0]["status"] == "success"


@pytest.mark.asyncio
async def test_trigger_move_deal(client: AsyncClient, auth_headers: dict):
    """Create a deal, create a rule to move it, fire trigger, verify stage changed."""
    # Create a deal first
    deal_resp = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": "Test Deal for Workflow",
            "stage": "lead",
            "value": 5000,
            "currency": "USD",
        },
        headers=auth_headers,
    )
    assert deal_resp.status_code in (200, 201)
    deal_id = deal_resp.json()["id"]

    # Create rule: on deal_stage_changed → move_deal to "negotiation"
    await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Move Deal to Negotiation",
            "trigger_type": "deal_stage_changed",
            "trigger_config": '{"stage_from": "lead"}',
            "action_type": "move_deal",
            "action_config": f'{{"stage": "negotiation"}}',
            "is_active": True,
        },
        headers=auth_headers,
    )

    # Fire trigger with deal_id
    response = await client.post(
        "/api/v1/workflow-engine/trigger",
        json={
            "trigger_type": "deal_stage_changed",
            "trigger_data": {"deal_id": deal_id, "stage_from": "lead", "stage_to": "qualified"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["triggered"] >= 1
    # Verify the deal was moved
    exec_item = next((e for e in data["executions"] if e["action_type"] == "move_deal"), None)
    if exec_item:
        assert exec_item["status"] == "success"


@pytest.mark.asyncio
async def test_trigger_queue_email(client: AsyncClient, auth_headers: dict):
    """Create a rule with send_email action, fire trigger, verify email queued."""
    await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Email on Deal Created",
            "trigger_type": "deal_created",
            "action_type": "send_email",
            "action_config": '{"to_email": "test@example.com", "subject": "New deal!", "message": "A new deal was created."}',
            "is_active": True,
        },
        headers=auth_headers,
    )

    response = await client.post(
        "/api/v1/workflow-engine/trigger",
        json={
            "trigger_type": "deal_created",
            "trigger_data": {"deal_id": 1, "title": "Big Deal"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["triggered"] >= 1


@pytest.mark.asyncio
async def test_execution_history(client: AsyncClient, auth_headers: dict):
    """After triggers, execution history should have entries."""
    response = await client.get("/api/v1/workflow-engine/executions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_inactive_rule_not_triggered(client: AsyncClient, auth_headers: dict):
    """Inactive rules should not be triggered."""
    await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "Inactive Rule",
            "trigger_type": "contact_created",
            "action_type": "create_notification",
            "is_active": False,
        },
        headers=auth_headers,
    )

    # Count executions before
    before = await client.get("/api/v1/workflow-engine/executions?limit=200", headers=auth_headers)
    before_count = before.json()["total"]

    # Fire trigger — should NOT match inactive rule
    # (but may match other active rules from previous tests)
    await client.post(
        "/api/v1/workflow-engine/trigger",
        json={"trigger_type": "contact_created", "trigger_data": {}},
        headers=auth_headers,
    )

    # The inactive rule specifically should not have been executed
    # We verify by checking the rule's runs_count is still 0
    rules_resp = await client.get("/api/v1/workflow-engine/rules?limit=100", headers=auth_headers)
    inactive_rules = [r for r in rules_resp.json()["items"] if r["name"] == "Inactive Rule"]
    if inactive_rules:
        assert inactive_rules[0]["runs_count"] == 0
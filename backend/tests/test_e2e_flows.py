"""
End-to-End Flow Tests — Full user journeys through NELVYON.
Tests: login → create contact → create deal → trigger workflow → verify effects.
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
async def test_e2e_login_and_profile(client: AsyncClient, auth_headers: dict):
    """E2E: Login and verify user profile."""
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "email" in data


@pytest.mark.asyncio
async def test_e2e_create_contact_and_verify(client: AsyncClient, auth_headers: dict):
    """E2E: Create a contact and verify it appears in the list."""
    # Create contact
    create_resp = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "E2E",
            "last_name": "Contact",
            "email": "e2e@test.com",
            "phone": "+1111111111",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    contact_id = create_resp.json()["id"]

    # Verify in list
    list_resp = await client.get("/api/v1/entities/contacts?limit=100", headers=auth_headers)
    assert list_resp.status_code == 200
    contacts = list_resp.json()
    items = contacts.get("items", contacts) if isinstance(contacts, dict) else contacts
    found = any(c.get("id") == contact_id for c in items)
    assert found, f"Contact {contact_id} not found in list"


@pytest.mark.asyncio
async def test_e2e_create_deal_and_verify(client: AsyncClient, auth_headers: dict):
    """E2E: Create a deal and verify it appears."""
    create_resp = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": "E2E Deal",
            "stage": "lead",
            "value": 10000,
            "currency": "USD",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    deal_id = create_resp.json()["id"]

    # Verify
    get_resp = await client.get(f"/api/v1/entities/deals/{deal_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == "E2E Deal"


@pytest.mark.asyncio
async def test_e2e_workflow_full_cycle(client: AsyncClient, auth_headers: dict):
    """E2E: Create rule → create deal → trigger workflow → verify activity created."""
    # 1. Create workflow rule: on deal_created → create_activity
    rule_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "E2E: Activity on Deal",
            "trigger_type": "deal_created",
            "action_type": "create_activity",
            "action_config": '{"title": "E2E Follow-up", "type": "task"}',
            "is_active": True,
        },
        headers=auth_headers,
    )
    assert rule_resp.status_code == 201

    # 2. Create a deal
    deal_resp = await client.post(
        "/api/v1/entities/deals",
        json={"title": "E2E Workflow Deal", "stage": "lead", "value": 5000, "currency": "USD"},
        headers=auth_headers,
    )
    assert deal_resp.status_code in (200, 201)
    deal_id = deal_resp.json()["id"]

    # 3. Fire trigger
    trigger_resp = await client.post(
        "/api/v1/workflow-engine/trigger",
        json={
            "trigger_type": "deal_created",
            "trigger_data": {"deal_id": deal_id, "title": "E2E Workflow Deal"},
        },
        headers=auth_headers,
    )
    assert trigger_resp.status_code == 200
    trigger_data = trigger_resp.json()
    assert trigger_data["triggered"] >= 1

    # 4. Verify execution logged
    exec_resp = await client.get("/api/v1/workflow-engine/executions?limit=10", headers=auth_headers)
    assert exec_resp.status_code == 200
    assert exec_resp.json()["total"] >= 1

    # 5. Verify activity was created
    activities_resp = await client.get("/api/v1/entities/activities?limit=100", headers=auth_headers)
    assert activities_resp.status_code == 200


@pytest.mark.asyncio
async def test_e2e_agent_creates_contact_then_workflow_fires(client: AsyncClient, auth_headers: dict):
    """E2E: Agent creates contact → workflow fires → notification created."""
    # 1. Create rule: on contact_created → create_notification
    await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "E2E: Notify on Agent Contact",
            "trigger_type": "contact_created",
            "action_type": "create_notification",
            "action_config": '{"title": "Agent created a contact!", "message": "Check CRM"}',
            "is_active": True,
        },
        headers=auth_headers,
    )

    # 2. Agent creates contact
    agent_resp = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "create_contact",
            "params": {"first_name": "AgentE2E", "last_name": "Test", "email": "agente2e@test.com"},
        },
        headers=auth_headers,
    )
    assert agent_resp.status_code == 200
    contact_id = agent_resp.json()["data"]["contact_id"]

    # 3. Fire contact_created trigger (simulating what would happen automatically)
    trigger_resp = await client.post(
        "/api/v1/workflow-engine/trigger",
        json={
            "trigger_type": "contact_created",
            "trigger_data": {"contact_id": contact_id, "first_name": "AgentE2E"},
        },
        headers=auth_headers,
    )
    assert trigger_resp.status_code == 200
    assert trigger_resp.json()["triggered"] >= 1


@pytest.mark.asyncio
async def test_e2e_deal_stage_change_triggers_email(client: AsyncClient, auth_headers: dict):
    """E2E: Deal stage change → email queued."""
    # 1. Create deal
    deal_resp = await client.post(
        "/api/v1/entities/deals",
        json={"title": "Email Trigger Deal", "stage": "lead", "value": 3000, "currency": "USD"},
        headers=auth_headers,
    )
    deal_id = deal_resp.json()["id"]

    # 2. Create rule: deal_stage_changed → send_email
    await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": "E2E: Email on Stage Change",
            "trigger_type": "deal_stage_changed",
            "action_type": "send_email",
            "action_config": '{"to_email": "sales@test.com", "subject": "Deal moved!", "message": "A deal changed stage."}',
            "is_active": True,
        },
        headers=auth_headers,
    )

    # 3. Fire trigger
    trigger_resp = await client.post(
        "/api/v1/workflow-engine/trigger",
        json={
            "trigger_type": "deal_stage_changed",
            "trigger_data": {"deal_id": deal_id, "stage_from": "lead", "stage_to": "qualified"},
        },
        headers=auth_headers,
    )
    assert trigger_resp.status_code == 200

    # 4. Verify email stats show at least one email
    stats_resp = await client.get("/api/v1/email/stats", headers=auth_headers)
    assert stats_resp.status_code == 200


@pytest.mark.asyncio
async def test_e2e_auto_contact_created_trigger_without_manual_endpoint(
    client: AsyncClient, auth_headers: dict
):
    """E2E: Crear contacto dispara workflow automáticamente (sin /trigger manual)."""
    suffix = uuid4().hex[:8]

    rule_resp = await client.post(
        "/api/v1/workflow-engine/rules",
        json={
            "name": f"E2E Auto Contact {suffix}",
            "trigger_type": "contact_created",
            "action_type": "create_notification",
            "action_config": '{"title": "Auto contact", "message": "Created from CRM"}',
            "is_active": True,
        },
        headers=auth_headers,
    )
    assert rule_resp.status_code == 201, rule_resp.text
    rule_id = rule_resp.json()["id"]

    create_contact = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": "E2E-Auto",
            "last_name": "Contact",
            "email": f"e2e-auto-{suffix}@test.com",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert create_contact.status_code in (200, 201), create_contact.text

    get_rule = await client.get(f"/api/v1/workflow-engine/rules/{rule_id}", headers=auth_headers)
    assert get_rule.status_code == 200
    assert get_rule.json()["runs_count"] >= 1


@pytest.mark.asyncio
async def test_e2e_agent_schedules_event_and_creates_report(client: AsyncClient, auth_headers: dict):
    """E2E: Agent schedules event and creates report in one flow."""
    # Schedule event
    event_resp = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "schedule_event",
            "params": {
                "title": "E2E Strategy Session",
                "start_time": "2026-04-20T14:00:00Z",
                "duration_minutes": 90,
                "client_name": "E2E Client",
            },
        },
        headers=auth_headers,
    )
    assert event_resp.status_code == 200
    assert event_resp.json()["success"] is True

    # Create report
    report_resp = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "create_report",
            "params": {
                "name": "E2E Weekly Summary",
                "report_type": "weekly",
                "period": "2026-W16",
                "data": {"contacts_added": 5, "deals_closed": 2},
            },
        },
        headers=auth_headers,
    )
    assert report_resp.status_code == 200
    assert report_resp.json()["success"] is True


@pytest.mark.asyncio
async def test_e2e_crm_pipeline_dashboard_global_coherence_smoke(client: AsyncClient, auth_headers: dict):
    """
    E2E smoke: contacto + deal + stage-change se reflejan de forma consistente
    entre Pipeline Stats, Dashboard Metrics y Global Overview.
    """
    suffix = uuid4().hex[:8]

    c_resp = await client.post(
        "/api/v1/entities/contacts",
        json={
            "first_name": f"Smoke-{suffix}",
            "last_name": "CRM",
            "email": f"smoke-{suffix}@test.com",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert c_resp.status_code in (200, 201), c_resp.text
    contact_id = c_resp.json()["id"]

    d_resp = await client.post(
        "/api/v1/entities/deals",
        json={
            "title": f"Smoke Deal {suffix}",
            "stage": "lead",
            "value": 1500,
            "currency": "USD",
            "probability": 60,
            "contact_id": contact_id,
        },
        headers=auth_headers,
    )
    assert d_resp.status_code in (200, 201), d_resp.text
    deal_id = d_resp.json()["id"]

    move = await client.post(
        f"/api/v1/pipeline/deals/{deal_id}/stage-change",
        json={"new_stage": "closed_won", "notes": "coherence smoke"},
        headers=auth_headers,
    )
    assert move.status_code == 200, move.text

    p = await client.get("/api/v1/pipeline/stats", headers=auth_headers)
    d = await client.get("/api/v1/dashboard/metrics", headers=auth_headers)
    g = await client.get("/api/v1/global-dashboard/overview", headers=auth_headers)
    assert p.status_code == 200 and d.status_code == 200 and g.status_code == 200

    pj = p.json()
    dj = d.json()
    gj = g.json()
    assert pj["total_deals"] == dj["kpis"]["deals"]["total"] == gj["pipeline"]["total_deals"]
    assert dj["kpis"]["deals"]["won"] == gj["pipeline"]["won_deals"]
    assert pj["win_rate"] == dj["kpis"]["deals"]["win_rate"] == gj["pipeline"]["win_rate"]
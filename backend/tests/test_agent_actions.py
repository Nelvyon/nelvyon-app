"""
Tests for Agent Actions — Real actions executed by AI agents.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_agent_actions_requires_auth(client: AsyncClient):
    response = await client.post("/api/v1/agent-actions", json={"action": "create_contact", "params": {}})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_contact_via_agent(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "create_contact",
            "params": {
                "first_name": "Agent",
                "last_name": "Created",
                "email": "agent@test.com",
                "phone": "+1234567890",
                "company": "AI Corp",
            },
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["action"] == "create_contact"
    assert "contact_id" in data["data"]


@pytest.mark.asyncio
async def test_create_contact_missing_name(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={"action": "create_contact", "params": {"email": "no-name@test.com"}},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_move_deal_via_agent(client: AsyncClient, auth_headers: dict):
    # Create a deal first
    deal_resp = await client.post(
        "/api/v1/entities/deals",
        json={"title": "Agent Deal", "stage": "lead", "value": 1000, "currency": "USD"},
        headers=auth_headers,
    )
    assert deal_resp.status_code in (200, 201)
    deal_id = deal_resp.json()["id"]

    # Move it via agent action
    response = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "move_deal",
            "params": {"deal_id": deal_id, "stage": "qualified"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["new_stage"] == "qualified"


@pytest.mark.asyncio
async def test_move_deal_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={"action": "move_deal", "params": {"deal_id": 99999, "stage": "won"}},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_report_via_agent(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "create_report",
            "params": {
                "name": "Monthly Sales Report",
                "report_type": "sales",
                "period": "2026-03",
                "data": {"total_sales": 50000, "deals_closed": 12},
                "metrics": {"conversion_rate": 0.15},
            },
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "report_id" in data["data"]


@pytest.mark.asyncio
async def test_create_blog_post_via_agent(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "create_blog_post",
            "params": {
                "title": "AI-Generated Marketing Tips",
                "content": "Here are 5 tips for better marketing...",
                "excerpt": "Marketing tips from AI",
                "category": "marketing",
                "tags": "ai,marketing,tips",
            },
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "post_id" in data["data"]


@pytest.mark.asyncio
async def test_create_blog_post_missing_title(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={"action": "create_blog_post", "params": {"content": "No title"}},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_schedule_event_via_agent(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={
            "action": "schedule_event",
            "params": {
                "title": "Strategy Meeting",
                "start_time": "2026-04-15T10:00:00Z",
                "end_time": "2026-04-15T11:00:00Z",
                "client_name": "Test Client",
                "event_type": "meeting",
                "duration_minutes": 60,
            },
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "event_id" in data["data"]


@pytest.mark.asyncio
async def test_schedule_event_missing_time(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={"action": "schedule_event", "params": {"title": "No Time Event"}},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_unknown_action(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/agent-actions",
        json={"action": "fly_to_moon", "params": {}},
        headers=auth_headers,
    )
    assert response.status_code == 400
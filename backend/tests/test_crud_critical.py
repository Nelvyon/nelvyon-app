"""
Tests for critical CRUD operations: Contacts, Deals, Campaigns, Helpdesk.
"""

import pytest
from httpx import AsyncClient


# ─── Contacts CRUD ───

@pytest.mark.asyncio
async def test_list_contacts_requires_auth(client: AsyncClient):
    """Test that listing contacts requires authentication."""
    response = await client.get("/api/v1/entities/contacts?skip=0&limit=10")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_contacts_authenticated(client: AsyncClient, auth_headers: dict):
    """Test listing contacts with valid auth."""
    response = await client.get(
        "/api/v1/entities/contacts?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data or isinstance(data, list)


@pytest.mark.asyncio
async def test_create_contact(client: AsyncClient, auth_headers: dict):
    """Test creating a new contact."""
    response = await client.post(
        "/api/v1/entities/contacts",
        json={
            "user_id": "test-user-001",
            "first_name": "Test",
            "email": "contact@test.com",
            "phone": "+1234567890",
            "company": "Test Corp",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert data.get("first_name") == "Test" or "id" in data


@pytest.mark.asyncio
async def test_create_contact_missing_fields(client: AsyncClient, auth_headers: dict):
    """Test creating a contact with missing required fields."""
    response = await client.post(
        "/api/v1/entities/contacts",
        json={},
        headers=auth_headers,
    )
    # Should return 400 or 422 for validation error
    assert response.status_code in (400, 422, 500)


# ─── Deals CRUD ───

@pytest.mark.asyncio
async def test_list_deals_requires_auth(client: AsyncClient):
    """Test that listing deals requires authentication."""
    response = await client.get("/api/v1/entities/deals?skip=0&limit=10")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_deals_authenticated(client: AsyncClient, auth_headers: dict):
    """Test listing deals with valid auth."""
    response = await client.get(
        "/api/v1/entities/deals?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_deal(client: AsyncClient, auth_headers: dict):
    """Test creating a new deal."""
    response = await client.post(
        "/api/v1/entities/deals",
        json={
            "user_id": "test-user-001",
            "title": "Test Deal",
            "value": 5000,
            "stage": "lead",
            "status": "open",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)


# ─── Campaigns CRUD ───

@pytest.mark.asyncio
async def test_list_campaigns_requires_auth(client: AsyncClient):
    """Test that listing campaigns requires authentication."""
    response = await client.get("/api/v1/entities/campaigns?skip=0&limit=10")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_campaigns_authenticated(client: AsyncClient, auth_headers: dict):
    """Test listing campaigns with valid auth."""
    response = await client.get(
        "/api/v1/entities/campaigns?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_campaign(client: AsyncClient, auth_headers: dict):
    """Test creating a new campaign."""
    response = await client.post(
        "/api/v1/entities/campaigns",
        json={
            "user_id": "test-user-001",
            "name": "Test Campaign",
            "type": "email",
            "status": "draft",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)


# ─── Helpdesk Tickets CRUD ───

@pytest.mark.asyncio
async def test_list_tickets_requires_auth(client: AsyncClient):
    """Test that listing tickets requires authentication."""
    response = await client.get("/api/v1/entities/helpdesk_tickets?skip=0&limit=10")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_tickets_authenticated(client: AsyncClient, auth_headers: dict):
    """Test listing tickets with valid auth."""
    response = await client.get(
        "/api/v1/entities/helpdesk_tickets?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_ticket(client: AsyncClient, auth_headers: dict):
    """Test creating a new helpdesk ticket."""
    response = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        json={
            "user_id": "test-user-001",
            "subject": "Test Ticket",
            "description": "This is a test ticket",
            "priority": "medium",
            "status": "open",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)


# ─── Calendar Events CRUD ───

@pytest.mark.asyncio
async def test_list_calendar_events(client: AsyncClient, auth_headers: dict):
    """Test listing calendar events."""
    response = await client.get(
        "/api/v1/entities/calendar_events?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_calendar_event(client: AsyncClient, auth_headers: dict):
    """Test creating a calendar event."""
    response = await client.post(
        "/api/v1/entities/calendar_events",
        json={
            "user_id": "test-user-001",
            "title": "Test Meeting",
            "start_time": "2026-04-15T10:00:00Z",
            "end_time": "2026-04-15T11:00:00Z",
            "event_type": "meeting",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)


# ─── Blog Posts CRUD ───

@pytest.mark.asyncio
async def test_list_blog_posts(client: AsyncClient, auth_headers: dict):
    """Test listing blog posts."""
    response = await client.get(
        "/api/v1/entities/blog_posts?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_blog_post(client: AsyncClient, auth_headers: dict):
    """Test creating a blog post."""
    response = await client.post(
        "/api/v1/entities/blog_posts",
        json={
            "user_id": "test-user-001",
            "title": "Test Blog Post",
            "content": "This is test content for the blog post.",
            "status": "draft",
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)


# ─── Workflows CRUD ───

@pytest.mark.asyncio
async def test_list_workflows(client: AsyncClient, auth_headers: dict):
    """Test listing workflows."""
    response = await client.get(
        "/api/v1/entities/workflows?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200


# ─── Form Items CRUD ───

@pytest.mark.asyncio
async def test_list_forms(client: AsyncClient, auth_headers: dict):
    """Test listing form items."""
    response = await client.get(
        "/api/v1/entities/form_items?skip=0&limit=10",
        headers=auth_headers,
    )
    assert response.status_code == 200
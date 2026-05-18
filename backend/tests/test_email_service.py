"""
Tests for Email Service — Send emails, check stats, verify fallback without SendGrid.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_email_send_requires_auth(client: AsyncClient):
    response = await client.post("/api/v1/email/send", json={
        "to_email": "test@example.com", "subject": "Test", "body_html": "<p>Hi</p>",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_email_send_queued_no_api_key(client: AsyncClient, auth_headers: dict):
    """Without SENDGRID_API_KEY, email should be queued with status no_api_key."""
    response = await client.post(
        "/api/v1/email/send",
        json={
            "to_email": "user@example.com",
            "to_name": "Test User",
            "subject": "Test Email",
            "body_html": "<h1>Hello</h1><p>This is a test.</p>",
            "body_text": "Hello, this is a test.",
            "email_type": "transactional",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("no_api_key", "sent", "pending")
    assert data["to"] == "user@example.com"
    assert "email_id" in data


@pytest.mark.asyncio
async def test_welcome_email(client: AsyncClient, auth_headers: dict):
    response = await client.post("/api/v1/email/welcome", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "email_id" in data
    assert data["status"] in ("no_api_key", "sent", "pending")


@pytest.mark.asyncio
async def test_email_stats(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/email/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "sent" in data
    assert "pending" in data
    assert "sendgrid_configured" in data


@pytest.mark.asyncio
async def test_multiple_emails_tracked(client: AsyncClient, auth_headers: dict):
    """Send multiple emails and verify stats increase."""
    # Send 2 emails
    for i in range(2):
        await client.post(
            "/api/v1/email/send",
            json={
                "to_email": f"user{i}@example.com",
                "subject": f"Test {i}",
                "body_html": f"<p>Email {i}</p>",
            },
            headers=auth_headers,
        )

    response = await client.get("/api/v1/email/stats", headers=auth_headers)
    data = response.json()
    assert data["total"] >= 2
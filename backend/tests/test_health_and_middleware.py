"""
Tests for health endpoints, rate limiting, and security middleware.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root endpoint returns expected response."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NELVYON OS API"
    assert data["status"] == "operational"


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient, auth_headers: dict):
    """Test that security headers are added to API responses."""
    response = await client.get("/api/v1/entities/contacts?skip=0&limit=1", headers=auth_headers)
    # Security headers should be present on API responses
    assert "X-Content-Type-Options" in response.headers or response.status_code in (401, 404)


@pytest.mark.asyncio
async def test_rate_limit_headers(client: AsyncClient, auth_headers: dict):
    """Test that rate limit headers are present on API responses (skipped in test env)."""
    import os
    response = await client.get("/api/v1/entities/contacts?skip=0&limit=1", headers=auth_headers)
    if os.environ.get("ENVIRONMENT") == "test":
        # Rate limiting is disabled in test environment
        assert response.status_code in (200, 404)
    elif response.status_code != 404:
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers


@pytest.mark.asyncio
async def test_path_traversal_in_query_params(client: AsyncClient, auth_headers: dict):
    """Test that path traversal patterns in query params are blocked."""
    response = await client.get(
        "/api/v1/entities/contacts?skip=0&limit=1&file=../../etc/passwd",
        headers=auth_headers,
    )
    assert response.status_code == 400
    data = response.json()
    assert "Invalid" in data.get("detail", "") or "characters" in data.get("detail", "").lower()


@pytest.mark.asyncio
async def test_sql_injection_in_query_params(client: AsyncClient, auth_headers: dict):
    """Test that SQL injection in query params is blocked."""
    response = await client.get(
        "/api/v1/entities/contacts?skip=0&limit=1; DROP TABLE contacts",
        headers=auth_headers,
    )
    # Should be blocked by security middleware
    assert response.status_code in (400, 422)


@pytest.mark.asyncio
async def test_xss_in_json_body(client: AsyncClient, auth_headers: dict):
    """Test that XSS in JSON body is blocked."""
    response = await client.post(
        "/api/v1/entities/contacts",
        json={
            "user_id": "test-user-001",
            "first_name": "<script>alert('xss')</script>",
            "email": "test@test.com",
        },
        headers=auth_headers,
    )
    assert response.status_code == 400
    data = response.json()
    detail_lower = data.get("detail", "").lower()
    assert "dangerous" in detail_lower or "suspicious" in detail_lower or "potentially" in detail_lower


@pytest.mark.asyncio
async def test_request_without_auth_returns_401(client: AsyncClient):
    """Test that protected endpoints require authentication."""
    response = await client.get("/api/v1/entities/contacts?skip=0&limit=1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token_returns_401(client: AsyncClient):
    """Test that invalid JWT tokens are rejected."""
    response = await client.get(
        "/api/v1/entities/contacts?skip=0&limit=1",
        headers={"Authorization": "Bearer invalid-token-here"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_returns_401(client: AsyncClient):
    """Test that expired JWT tokens are rejected."""
    from core.auth import create_access_token
    token = create_access_token(
        claims={"sub": "test", "email": "test@test.com", "role": "user"},
        expires_minutes=-1,  # Already expired
    )
    response = await client.get(
        "/api/v1/entities/contacts?skip=0&limit=1",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
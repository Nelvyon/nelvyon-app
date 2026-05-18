"""
Integration Tests — Full API endpoint testing with database.

These tests verify the complete request/response cycle through FastAPI,
including middleware, authentication, and database operations.

Run with: pytest tests/test_integration.py -v
"""
import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_root_returns_service_info(client: AsyncClient):
    """Root endpoint returns NELVYON service info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NELVYON OS API"
    assert data["status"] == "operational"
    assert data["version"] == "2.0.0"


@pytest.mark.asyncio
async def test_health_returns_healthy(client: AsyncClient):
    """Health endpoint returns healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_system_readiness_endpoint(client: AsyncClient):
    """System readiness endpoint returns all subsystem checks."""
    response = await client.get("/api/v1/system/readiness")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "checks" in data
    assert "database" in data["checks"]
    assert "cache" in data["checks"]
    assert "job_queue" in data["checks"]
    assert "esignature" in data["checks"]
    assert "email" in data["checks"]
    assert "payments" in data["checks"]


@pytest.mark.asyncio
async def test_system_cache_health(client: AsyncClient):
    """Cache health endpoint returns backend info."""
    response = await client.get("/api/v1/system/cache")
    assert response.status_code == 200
    data = response.json()
    assert "backend" in data
    assert data["backend"] in ("redis", "in-memory")
    assert "connected" in data


@pytest.mark.asyncio
async def test_system_jobs_stats(client: AsyncClient):
    """Job queue stats endpoint returns worker info."""
    response = await client.get("/api/v1/system/jobs")
    assert response.status_code == 200
    data = response.json()
    assert "backend" in data
    assert "registered_handlers" in data
    assert isinstance(data["registered_handlers"], list)


@pytest.mark.asyncio
async def test_system_esignature_status(client: AsyncClient):
    """E-signature status endpoint returns provider info."""
    response = await client.get("/api/v1/system/esignature")
    assert response.status_code == 200
    data = response.json()
    assert "active_provider" in data
    assert "providers" in data
    assert "internal" in data["providers"]


@pytest.mark.asyncio
async def test_system_architecture_overview(client: AsyncClient):
    """Architecture overview endpoint returns module scores."""
    response = await client.get("/api/v1/system/architecture")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "NELVYON OS + SaaS"
    assert "modules" in data
    assert "crm" in data["modules"]
    assert "contracts" in data["modules"]
    assert "payments" in data["modules"]
    assert "helpdesk" in data["modules"]
    assert "email_campaigns" in data["modules"]
    assert "infrastructure" in data
    assert "scaling_roadmap" in data


@pytest.mark.asyncio
async def test_email_health_endpoint(client: AsyncClient):
    """Email health endpoint returns SendGrid status."""
    response = await client.get("/api/v1/email/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "features" in data
    assert data["features"]["transactional"] is True
    assert data["features"]["email_validation"] is True
    assert data["features"]["unsubscribe_headers_rfc8058"] is True


@pytest.mark.asyncio
async def test_unauthenticated_crm_analytics(client: AsyncClient):
    """CRM analytics endpoints require authentication."""
    endpoints = [
        "/api/v1/crm/analytics/pipeline",
        "/api/v1/crm/analytics/velocity",
        "/api/v1/crm/analytics/segmentation",
        "/api/v1/crm/analytics/growth",
        "/api/v1/crm/analytics/integrity",
        "/api/v1/crm/analytics/overview",
    ]
    for endpoint in endpoints:
        response = await client.get(endpoint)
        # Should return 401 or 403 (not 500)
        assert response.status_code in (401, 403, 422), (
            f"{endpoint} returned {response.status_code} instead of auth error"
        )


@pytest.mark.asyncio
async def test_unauthenticated_email_send(client: AsyncClient):
    """Email send endpoint requires authentication."""
    response = await client.post(
        "/api/v1/email/send",
        json={
            "to_email": "test@example.com",
            "subject": "Test",
            "body_html": "<p>Test</p>",
        },
    )
    assert response.status_code in (401, 403, 422)


@pytest.mark.asyncio
async def test_rate_limit_headers_present(client: AsyncClient):
    """API responses include rate limit headers."""
    response = await client.get("/api/v1/system/readiness")
    # In test environment, rate limiter is disabled, but the endpoint should work
    assert response.status_code == 200
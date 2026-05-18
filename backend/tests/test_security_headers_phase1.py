"""
SEC-HEADERS-1 FASE 1 — contratos de cabeceras de seguridad HTTP.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_headers_phase1_present_and_values(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200, r.text

    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert r.headers.get("Permissions-Policy") == "camera=(), microphone=(), geolocation=()"

    csp = r.headers.get("Content-Security-Policy", "")
    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "object-src 'none'" in csp
    assert "'unsafe-eval'" not in csp


@pytest.mark.asyncio
async def test_security_headers_phase1_hsts_not_set_in_test_env(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200, r.text
    assert "Strict-Transport-Security" not in r.headers


@pytest.mark.asyncio
async def test_security_headers_phase1_hsts_set_for_staging_https(
    client: AsyncClient, monkeypatch
):
    monkeypatch.setenv("ENVIRONMENT", "staging")
    r = await client.get("/health", headers={"x-forwarded-proto": "https"})
    assert r.status_code == 200, r.text
    assert r.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"

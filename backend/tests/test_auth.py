"""
Tests for authentication system.
"""

import pytest
from core.auth import create_access_token, decode_access_token, AccessTokenError


class TestJWTTokens:
    """Test JWT token creation and validation."""

    def test_create_access_token(self):
        """Test creating a valid access token."""
        token = create_access_token(
            claims={"sub": "user-123", "email": "test@test.com", "role": "user"},
            expires_minutes=60,
        )
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_valid_token(self):
        """Test decoding a valid token returns correct claims."""
        claims = {"sub": "user-123", "email": "test@test.com", "role": "admin", "name": "Test"}
        token = create_access_token(claims=claims, expires_minutes=60)
        decoded = decode_access_token(token)
        assert decoded["sub"] == "user-123"
        assert decoded["email"] == "test@test.com"
        assert decoded["role"] == "admin"
        assert decoded["name"] == "Test"

    def test_decode_expired_token_raises(self):
        """Test that expired tokens raise AccessTokenError."""
        token = create_access_token(
            claims={"sub": "user-123", "email": "test@test.com"},
            expires_minutes=-1,
        )
        with pytest.raises(AccessTokenError):
            decode_access_token(token)

    def test_decode_invalid_token_raises(self):
        """Test that invalid tokens raise AccessTokenError."""
        with pytest.raises(AccessTokenError):
            decode_access_token("not-a-valid-token")

    def test_decode_tampered_token_raises(self):
        """Test that tampered tokens raise AccessTokenError."""
        token = create_access_token(
            claims={"sub": "user-123", "email": "test@test.com"},
            expires_minutes=60,
        )
        # Tamper with the token by changing a character
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(AccessTokenError):
            decode_access_token(tampered)

    def test_token_contains_expiration(self):
        """Test that tokens contain expiration claim."""
        token = create_access_token(
            claims={"sub": "user-123", "email": "test@test.com"},
            expires_minutes=60,
        )
        decoded = decode_access_token(token)
        assert "exp" in decoded

    def test_different_users_get_different_tokens(self):
        """Test that different users get different tokens."""
        token1 = create_access_token(claims={"sub": "user-1", "email": "a@a.com"}, expires_minutes=60)
        token2 = create_access_token(claims={"sub": "user-2", "email": "b@b.com"}, expires_minutes=60)
        assert token1 != token2


# ─── Frente 48: HTTP integration ─────────────────────────────────────────────

from httpx import AsyncClient


class TestAuthHTTPIntegration:
    """HTTP contract tests for /api/v1/auth."""

    async def test_token_exchange_register_returns_token(self, client: AsyncClient):
        from tests.integration_helpers import mock_platform_token_verify

        with mock_platform_token_verify(
            user_id="reg-user-00000000-0000-0000-0000-000000000010",
            email="register@nelvyon-test.com",
            name="Register User",
        ):
            r = await client.post(
                "/api/v1/auth/token/exchange",
                json={"platform_token": "mock-platform-token-register"},
            )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 10

    async def test_token_exchange_login_returns_valid_token(self, client: AsyncClient):
        from tests.integration_helpers import mock_platform_token_verify

        with mock_platform_token_verify(
            user_id="test-user-00000000-0000-0000-0000-000000000001",
            email="testuser@nelvyon-test.com",
            name="Test User",
        ):
            r = await client.post(
                "/api/v1/auth/token/exchange",
                json={"platform_token": "mock-platform-token-login"},
            )
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200, me.text
        assert me.json()["email"] == "testuser@nelvyon-test.com"

    async def test_me_with_token_returns_user(self, client: AsyncClient, auth_only_headers: dict):
        r = await client.get("/api/v1/auth/me", headers=auth_only_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == "testuser@nelvyon-test.com"
        assert body["id"] == "test-user-00000000-0000-0000-0000-000000000001"

    async def test_me_without_token_returns_401(self, client: AsyncClient):
        r = await client.get("/api/v1/auth/me")
        assert r.status_code == 401

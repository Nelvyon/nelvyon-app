"""Tests for nelvyon app JWT bridge into FastAPI auth."""

import os

import jwt
import pytest

from core.auth import AccessTokenError
from core.nelvyon_jwt import decode_nelvyon_app_token, try_decode_nelvyon_app_token

SECRET = "test-nelvyon-jwt-secret-at-least-32-chars"


@pytest.fixture(autouse=True)
def _jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", SECRET)


def test_decode_nelvyon_app_token_maps_user_id_to_sub():
    token = jwt.encode(
        {"userId": "u-1", "email": "a@test.com", "tenantId": "t-1", "plan": "starter"},
        SECRET,
        algorithm="HS256",
    )
    payload = decode_nelvyon_app_token(token)
    assert payload["sub"] == "u-1"
    assert payload["email"] == "a@test.com"
    assert payload["role"] == "operator"


def test_try_decode_returns_none_for_foreign_token():
    foreign = jwt.encode({"sub": "x"}, "other-secret-at-least-32-characters-long", algorithm="HS256")
    assert try_decode_nelvyon_app_token(foreign) is None


def test_decode_raises_when_secret_missing(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    token = jwt.encode({"userId": "u", "email": "e@t.com"}, SECRET, algorithm="HS256")
    with pytest.raises(AccessTokenError):
        decode_nelvyon_app_token(token)

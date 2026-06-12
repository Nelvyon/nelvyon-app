"""Decode JWTs issued by @nelvyon/auth (Next.js /api/auth/login)."""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

from jose import JWTError, jwt

from core.auth import AccessTokenError


def _nelvyon_jwt_secret() -> Optional[str]:
    raw = os.environ.get("JWT_SECRET", "").strip()
    if len(raw) < 32:
        return None
    return raw


def decode_nelvyon_app_token(token: str) -> Dict[str, Any]:
    """
    Validate nelvyon_users JWT (claims: userId, email, tenantId, plan).
    Returns a payload normalized for FastAPI auth (sub, email, role).
    """
    secret = _nelvyon_jwt_secret()
    if not secret:
        raise AccessTokenError("Nelvyon auth is not configured")

    try:
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
    except JWTError as exc:
        raise AccessTokenError("Invalid authentication token") from exc

    if not isinstance(decoded, dict):
        raise AccessTokenError("Invalid authentication token")

    user_id = decoded.get("userId") or decoded.get("sub")
    email = decoded.get("email")
    if not user_id or not email:
        raise AccessTokenError("Invalid authentication token")

    plan = str(decoded.get("plan") or "free").lower()
    if plan in ("admin",):
        role = "admin"
    elif plan in ("enterprise",):
        role = "admin"
    elif plan in ("pro", "starter"):
        role = "operator"
    else:
        role = "user"

    return {
        "sub": str(user_id),
        "email": str(email),
        "role": role,
        "tenant_id": decoded.get("tenantId"),
        "plan": plan,
    }


def try_decode_nelvyon_app_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return decode_nelvyon_app_token(token)
    except AccessTokenError:
        return None

"""HttpOnly session cookie for the application JWT (OIDC completion & API auth)."""

import os
from typing import Optional

from fastapi import Request
from starlette.responses import Response

SESSION_COOKIE_NAME = "nelvyon_session"


def _cookie_secure(request: Request) -> bool:
    if os.getenv("FORCE_INSECURE_COOKIES", "").lower() in ("true", "1"):
        return False
    return request.url.scheme == "https"


def attach_session_cookie(response: Response, request: Request, token: str, max_age_seconds: int) -> None:
    """Set HttpOnly session cookie; SameSite=Lax for OAuth top-level redirects."""
    domain: Optional[str] = None
    raw_domain = os.getenv("SESSION_COOKIE_DOMAIN", "").strip()
    if raw_domain:
        domain = raw_domain

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age_seconds,
        path="/",
        domain=domain,
        secure=_cookie_secure(request),
        httponly=True,
        samesite="lax",
    )


def clear_session_cookie(response: Response, request: Request) -> None:
    domain: Optional[str] = None
    raw_domain = os.getenv("SESSION_COOKIE_DOMAIN", "").strip()
    if raw_domain:
        domain = raw_domain

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        domain=domain,
        secure=_cookie_secure(request),
        httponly=True,
        samesite="lax",
    )

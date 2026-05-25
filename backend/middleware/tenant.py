"""Tenant middleware — extract tenant_id from JWT / headers into ContextVar."""

from __future__ import annotations

import logging
import re
from typing import Callable, Optional

from core.auth import AccessTokenError, decode_access_token
from core.tenant_context import clear_tenant_context, set_tenant_context
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

_PUBLIC_PATHS = frozenset(
    {
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
    }
)

_PUBLIC_PREFIXES = (
    "/api/v1/stripe/",
    "/api/v1/auth/login",
    "/api/v1/auth/callback",
    "/api/v1/auth/register",
    "/api/v1/system/",
    "/api/v1/email/health",
    "/api/affiliates/track/",
    "/api/marketplace/agencies",
    "/api/chat/widget.js",
    "/api/chat/widget-config",
    "/api/chat/ws/",
    "/api/whitelabel/resolve",
    "/api/internal/agent-prompts/",
)

_OPTIONAL_TENANT_PREFIXES = (
    "/api/v1/auth/",
    "/api/marketplace/agencies",
    "/api/developer/docs",
    "/api/workspace/",
)


def _is_social_oauth_callback(path: str, method: str) -> bool:
    return (
        method == "GET"
        and path.startswith("/api/social/oauth/")
        and path.endswith("/callback")
    )


def _is_lms_public(path: str, method: str) -> bool:
    if path.startswith("/api/lms/public/"):
        return True
    if method == "POST" and path.startswith("/api/lms/courses/") and path.endswith("/enroll"):
        return True
    if path.startswith("/api/lms/courses/") and "/progress/" in path and method == "GET":
        return True
    if path.startswith("/api/lms/progress/") and method == "POST":
        return True
    if path.startswith("/api/lms/enrollments/") and path.endswith("/certificate") and method == "GET":
        return True
    return False


def _is_chatbot_public(path: str, method: str) -> bool:
    if path == "/api/chatbot/chat" and method == "POST":
        return True
    if path.startswith("/api/chatbot/widget/") and method == "GET":
        return True
    if path in ("/static/widget.js", "/widget.js") and method == "GET":
        return True
    return False


def _is_ab_public(path: str, method: str) -> bool:
    return path == "/api/ab/track" and method == "POST"


def _is_loyalty_public(path: str, method: str) -> bool:
    return path.startswith("/api/loyalty/public/") and method == "GET"


def _is_webinar_public(path: str, method: str) -> bool:
    if path.startswith("/api/webinars/public/"):
        return True
    if method == "POST" and path.startswith("/api/webinars/") and path.endswith("/register"):
        return True
    return False


def _is_cdp_public(path: str, method: str) -> bool:
    return path in ("/api/cdp/events", "/api/cdp/identify") and method == "POST"


def _is_dialer_public(path: str, method: str) -> bool:
    return method == "POST" and path == "/api/dialer/webhook/twilio"


def _is_forms_public(path: str, method: str) -> bool:
    if path.startswith("/api/forms/public/") and method == "GET":
        return True
    if method == "POST" and path.startswith("/api/forms/") and path.endswith("/submit"):
        return True
    return False


def _is_qr_public(path: str, method: str) -> bool:
    return method == "GET" and path.startswith("/qr/")


def _is_chat_public(path: str, method: str) -> bool:
    if path == "/api/chat/conversations" and method == "POST":
        return True
    if path.startswith("/api/chat/conversations/") and path.endswith("/messages"):
        return method in ("GET", "POST")
    return False


def _is_sms_webhook(path: str, method: str) -> bool:
    return method == "POST" and path == "/api/sms/webhook/twilio"


def _is_conversation_stream_public(path: str, method: str) -> bool:
    return method == "GET" and re.match(r"^/api/v1/conversations/[^/]+/stream$", path) is not None


def _is_automation_webhook_public(path: str, method: str) -> bool:
    return method == "POST" and path.startswith("/api/v1/automation/webhook/trigger/")


def _is_public_api(path: str) -> bool:
    return path.startswith("/api/public/v1/")


def _is_public(path: str, method: str = "GET") -> bool:
    if path in _PUBLIC_PATHS:
        return True
    if _is_public_api(path):
        return True
    if _is_sms_webhook(path, method):
        return True
    if path.startswith("/api/marketplace/agencies") and path.count("/") <= 4:
        return True
    if _is_lms_public(path, method):
        return True
    if _is_chatbot_public(path, method):
        return True
    if _is_ab_public(path, method):
        return True
    if _is_loyalty_public(path, method):
        return True
    if _is_webinar_public(path, method):
        return True
    if _is_cdp_public(path, method):
        return True
    if _is_dialer_public(path, method):
        return True
    if _is_forms_public(path, method):
        return True
    if _is_qr_public(path, method):
        return True
    if _is_chat_public(path, method):
        return True
    if _is_social_oauth_callback(path, method):
        return True
    if _is_automation_webhook_public(path, method):
        return True
    if _is_conversation_stream_public(path, method):
        return True
    if path.startswith("/p/") and method == "GET":
        return True
    if path.startswith("/api/landing/track/") and method == "POST":
        return True
    if path.startswith("/api/landing/forms/") and method == "POST":
        return True
    if path.startswith("/site/") and method == "GET":
        return True
    if path.startswith("/store/"):
        return True
    return any(path.startswith(p) for p in _PUBLIC_PREFIXES)


def _optional_tenant(path: str) -> bool:
    return any(path.startswith(p) for p in _OPTIONAL_TENANT_PREFIXES)


def _extract_bearer(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    cookie = request.cookies.get("nelvyon_session")
    return cookie.strip() if cookie else None


def _resolve_tenant_id(request: Request, payload: dict) -> Optional[int]:
    for key in ("tenant_id", "workspace_id", "ws_id"):
        raw = payload.get(key)
        if raw is not None:
            try:
                return int(raw)
            except (TypeError, ValueError):
                pass

    header = request.headers.get("x-tenant-id") or request.headers.get("x-workspace-id")
    if header:
        try:
            return int(header.strip())
        except ValueError:
            return None
    return None


class TenantMiddleware(BaseHTTPMiddleware):
    """Inject tenant_id from JWT + headers; enforce on protected routes."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        clear_tenant_context()

        if request.method == "OPTIONS" or _is_public(path, request.method):
            return await call_next(request)

        token = _extract_bearer(request)
        user_id: Optional[str] = None
        tenant_id: Optional[int] = None

        if token and not token.startswith("nlv_"):
            try:
                payload = decode_access_token(token)
                user_id = str(payload.get("sub") or "")
                tenant_id = _resolve_tenant_id(request, payload)
            except AccessTokenError:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or expired authentication token"},
                )
        elif token and token.startswith("nlv_"):
            header_ws = request.headers.get("x-workspace-id") or request.headers.get("x-tenant-id")
            if header_ws:
                try:
                    tenant_id = int(header_ws.strip())
                except ValueError:
                    tenant_id = None

        if tenant_id is None:
            tenant_id = _resolve_tenant_id(request, {})

        if tenant_id is not None:
            set_tenant_context(tenant_id, user_id)
            request.state.tenant_id = tenant_id
            if user_id:
                request.state.tenant_user_id = user_id

        if tenant_id is None and not _optional_tenant(path) and not _is_public(path, request.method):
            if re.match(r"^/api/", path):
                # Unauthenticated API calls are rejected here; authenticated requests
                # without X-Workspace-Id pass through so require_workspace can return 400.
                if not user_id:
                    return JSONResponse(
                        status_code=401,
                        content={
                            "detail": "tenant_id required (JWT claim or X-Workspace-Id / X-Tenant-Id header)",
                        },
                    )

        return await call_next(request)

"""Intelligent tiered rate limiting — IP, API key, workspace, JWT."""

from __future__ import annotations

import logging
import os
import time
from typing import Callable, Optional

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core.auth import AccessTokenError, decode_access_token
from core.secrets import sanitize_text

logger = logging.getLogger(__name__)

TIER_ANON_LIMIT = 10
TIER_ANON_WINDOW = 60
TIER_FREE_LIMIT = 100
TIER_FREE_WINDOW = 3600
TIER_PAID_LIMIT = 1000
TIER_PAID_WINDOW = 3600
ABUSE_BLOCK_SECONDS = 3600

FREE_PLANS = frozenset({"free", "starter", "trial", ""})
PAID_PLANS = frozenset({"pro", "growth", "business", "enterprise", "agency", "partner", "whitelabel"})

_EXCLUDED = frozenset({"/health", "/health/ready", "/docs", "/openapi.json", "/redoc"})


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _extract_bearer(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get("nelvyon_session") or None


def _resolve_tier(request: Request) -> tuple[str, str, int, int]:
    """Return tier name, subject key, limit, window."""
    token = _extract_bearer(request)
    if token:
        try:
            payload = decode_access_token(token)
            if payload:
                sub = str(payload.get("sub") or payload.get("user_id") or "jwt")
                return "jwt", f"jwt:{sub}", 0, 0
        except AccessTokenError:
            pass

    api_key = (request.headers.get("X-API-Key") or request.headers.get("x-api-key") or "").strip()
    if api_key:
        plan = (request.headers.get("X-Workspace-Plan") or "free").lower()
        if plan in PAID_PLANS:
            return "paid_key", f"apikey:{api_key[:16]}", TIER_PAID_LIMIT, TIER_PAID_WINDOW
        return "free_key", f"apikey:{api_key[:16]}", TIER_FREE_LIMIT, TIER_FREE_WINDOW

    ws = (request.headers.get("X-Workspace-Id") or "").strip()
    ip = _client_ip(request)
    if ws.isdigit():
        return "anon_ws", f"ip:{ip}:ws:{ws}", TIER_ANON_LIMIT, TIER_ANON_WINDOW
    return "anon", f"ip:{ip}", TIER_ANON_LIMIT, TIER_ANON_WINDOW


class IntelligentRateLimitMiddleware(BaseHTTPMiddleware):
    """Tiered rate limits with abuse blocking — no limit details in responses."""

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled
        self._redis = None
        self._local_blocks: dict[str, float] = {}

    def _get_redis(self):
        if self._redis is None:
            from core.redis_adapter import redis_client
            self._redis = redis_client
        return self._redis

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        env = os.environ.get("ENVIRONMENT", "production").lower()
        if not self.enabled or (env == "test" and os.environ.get("RATE_LIMIT_ENABLE_IN_TEST", "").lower() not in ("1", "true")):
            return await call_next(request)

        path = request.url.path
        if path in _EXCLUDED or not path.startswith("/api/"):
            return await call_next(request)

        tier, subject, limit, window = _resolve_tier(request)
        if tier == "jwt":
            return await call_next(request)

        ip = _client_ip(request)
        now = time.time()
        block_key = f"block:{ip}"
        if block_key in self._local_blocks and self._local_blocks[block_key] > now:
            return self._rate_response(int(self._local_blocks[block_key] - now))

        redis = self._get_redis()
        rl_key = f"rl:tier:{tier}:{subject}"
        try:
            result = await redis.check_rate_limit(rl_key, limit, window)
        except Exception as exc:
            logger.warning("Rate limit redis fail-open: %s", sanitize_text(str(exc)))
            return await call_next(request)

        if not result.get("allowed"):
            self._local_blocks[block_key] = now + ABUSE_BLOCK_SECONDS
            logger.warning("Rate limit abuse block ip=%s tier=%s", ip, tier)
            return self._rate_response(max(1, int(result.get("reset_in") or 60)))

        response = await call_next(request)
        retry = str(max(1, int(result.get("reset_in") or window)))
        response.headers["Retry-After"] = retry
        return response

    @staticmethod
    def _rate_response(retry_after: int) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many requests"},
            headers={"Retry-After": str(retry_after)},
        )

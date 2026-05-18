"""
Rate limiting FASE 1 (minimo y focalizado) para rutas sensibles.

Estrategia:
- Ventana fija via RedisAdapter (Redis si existe / memoria si no).
- Solo endpoints criticos de auth/campaign/workflows/helpdesk.
- Clave por IP o IP+workspace segun riesgo de abuso.
"""

import logging
import os
import time
from typing import Dict, Optional

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from core.secrets import sanitize_text

logger = logging.getLogger(__name__)

RATE_LIMIT_RULES = [
    # Auth login (IP-only: evita bruteforce por origen)
    {"name": "auth_login", "methods": {"GET"}, "path_prefix": "/api/v1/auth/login", "limit": 5, "window": 60, "scope": "ip"},
    # Campanias
    {"name": "campaign_send", "methods": {"POST"}, "path_prefix": "/api/v1/campaign-sender/send", "limit": 6, "window": 60, "scope": "ip_workspace"},
    # Workflows entidad CRUD mutante
    {"name": "workflows_create", "methods": {"POST"}, "path_prefix": "/api/v1/entities/workflows", "limit": 20, "window": 60, "scope": "ip_workspace"},
    {"name": "workflows_update", "methods": {"PUT"}, "path_prefix": "/api/v1/entities/workflows", "limit": 20, "window": 60, "scope": "ip_workspace"},
    {"name": "workflows_delete", "methods": {"DELETE"}, "path_prefix": "/api/v1/entities/workflows", "limit": 10, "window": 60, "scope": "ip_workspace"},
    # Workflow engine ejecucion
    {"name": "workflow_engine_trigger", "methods": {"POST"}, "path_prefix": "/api/v1/workflow-engine/trigger", "limit": 12, "window": 60, "scope": "ip_workspace"},
    {"name": "workflow_engine_execute", "methods": {"POST"}, "path_prefix": "/api/v1/workflow-engine/execute/", "limit": 12, "window": 60, "scope": "ip_workspace"},
    # Helpdesk acciones operativas
    {"name": "helpdesk_assign", "methods": {"POST"}, "path_prefix": "/api/v1/helpdesk/assign", "limit": 30, "window": 60, "scope": "ip_workspace"},
    {"name": "helpdesk_transition", "methods": {"POST"}, "path_prefix": "/api/v1/helpdesk/transition", "limit": 30, "window": 60, "scope": "ip_workspace"},
]

# Paths excluded from rate limiting
EXCLUDED_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Rate limiter simple de FASE 1 sobre endpoints sensibles.
    """

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled
        self._redis = None  # Lazy init to avoid import-time issues
        self._blocked_count: Dict[str, int] = {}

    def _get_redis(self):
        """Lazy-load the Redis adapter singleton."""
        if self._redis is None:
            from core.redis_adapter import redis_client
            self._redis = redis_client
        return self._redis

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, respecting X-Forwarded-For."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    def _get_workspace_hint(self, request: Request) -> str:
        ws = (request.headers.get("X-Workspace-Id") or "").strip()
        if not ws:
            return "no-workspace"
        # Aceptar solo digitos para clave compacta y estable.
        return ws if ws.isdigit() else "invalid-workspace"

    def _match_rule(self, path: str, method: str) -> Optional[dict]:
        for rule in RATE_LIMIT_RULES:
            if method in rule["methods"] and path.startswith(rule["path_prefix"]):
                return rule
        return None

    def _make_subject_key(self, request: Request, scope: str) -> str:
        ip = self._get_client_ip(request)
        if scope == "ip":
            return f"ip:{ip}"
        if scope == "ip_workspace":
            return f"ip:{ip}:ws:{self._get_workspace_hint(request)}"
        return f"ip:{ip}"

    def _make_rate_limit_response(
        self, client_ip: str, rule_name: str, max_requests: int, reset_in: int,
    ) -> JSONResponse:
        """Create a 429 response with proper headers."""
        retry_after = max(1, reset_in)

        self._blocked_count[client_ip] = self._blocked_count.get(client_ip, 0) + 1
        blocked_count = self._blocked_count[client_ip]

        if blocked_count > 10:
            logger.error(
                "Repeated rate limit violations: IP=%s category=%s blocked_count=%d",
                client_ip, rule_name, blocked_count,
            )
        else:
            logger.warning(
                "Rate limit exceeded: IP=%s rule=%s limit=%d",
                client_ip, rule_name, max_requests,
            )

        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": "Too many requests. Please try again later.",
                "retry_after_seconds": retry_after,
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(max_requests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + retry_after),
            },
        )

    async def dispatch(self, request: Request, call_next) -> Response:
        env = os.environ.get("ENVIRONMENT", "").lower()
        allow_in_test = os.environ.get("RATE_LIMIT_ENABLE_IN_TEST", "").lower() in ("1", "true", "yes")
        if not self.enabled or (env == "test" and not allow_in_test):
            return await call_next(request)

        path = request.url.path
        method = request.method

        if path in EXCLUDED_PATHS:
            return await call_next(request)

        if not path.startswith("/api/"):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        rule = self._match_rule(path, method)
        if not rule:
            return await call_next(request)

        max_requests = int(rule["limit"])
        window = int(rule["window"])
        rule_name = str(rule["name"])
        subject_key = self._make_subject_key(request, str(rule["scope"]))
        rate_key = f"rl:phase1:{rule_name}:{subject_key}"

        redis = self._get_redis()

        try:
            result = await redis.check_rate_limit(rate_key, max_requests, window)
        except Exception as e:
            # If Redis fails, allow the request (fail-open for availability)
            logger.warning("Rate limiter error (fail-open): %s", sanitize_text(str(e)))
            return await call_next(request)

        if not result["allowed"]:
            return self._make_rate_limit_response(
                client_ip=client_ip,
                rule_name=rule_name,
                max_requests=max_requests,
                reset_in=result["reset_in"],
            )

        remaining = result["remaining"]

        # Periodically clear blocked count
        if len(self._blocked_count) > 1000:
            self._blocked_count.clear()

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)
        response.headers["X-RateLimit-Backend"] = "redis" if redis.is_redis else "memory"
        response.headers["X-RateLimit-Rule"] = rule_name

        return response
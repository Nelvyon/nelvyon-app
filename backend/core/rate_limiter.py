"""
NELVYON API rate limiter — Redis sliding window with plan-based quotas.
"""

from __future__ import annotations

import functools
import inspect
import logging
import os
import time
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.redis_adapter import redis_client
from dependencies.workspace import WorkspaceContext, require_workspace
from models.workspaces import Workspaces

logger = logging.getLogger(__name__)

# Plan limits: requests per hour (None = unlimited)
PLAN_RATE_LIMITS: dict[str, int | None] = {
    "free": 100,
    "starter": 1000,
    "pro": 10000,
    "enterprise": None,
    "admin": None,
}

DEFAULT_PLAN = "free"
DEFAULT_WINDOW_SECONDS = 3600


class RateLimiter:
    """Sliding-window rate limiter backed by Redis (Upstash) with in-memory fallback."""

    def __init__(self) -> None:
        self._initialized = False

    async def _ensure_redis(self) -> None:
        if not self._initialized:
            if not redis_client._initialized:
                await redis_client.initialize()
            self._initialized = True

    async def rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int = DEFAULT_WINDOW_SECONDS,
    ) -> dict[str, Any]:
        """
        Sliding window rate limit.

        Returns:
            allowed, current, limit, remaining, reset_in
        """
        await self._ensure_redis()
        rate_key = f"rl:core:{key}"
        try:
            result = await redis_client.check_rate_limit(
                rate_key, max_requests, window_seconds
            )
            result["key"] = key
            result["window_seconds"] = window_seconds
            result["backend"] = "redis" if redis_client.is_redis else "memory"
            return result
        except Exception as exc:
            logger.warning("Rate limiter fail-open: %s", exc)
            return {
                "allowed": True,
                "current": 0,
                "limit": max_requests,
                "remaining": max_requests,
                "reset_in": window_seconds,
                "key": key,
                "window_seconds": window_seconds,
                "backend": "fail-open",
                "error": str(exc),
            }

    async def get_usage(self, key: str, max_requests: int, window_seconds: int) -> dict[str, Any]:
        """Read current usage without incrementing."""
        await self._ensure_redis()
        rate_key = f"rl:core:{key}"
        raw = await redis_client.get(rate_key)
        current = int(raw) if raw and raw.isdigit() else 0
        ttl = await redis_client.ttl(rate_key)
        reset_in = ttl if ttl >= 0 else window_seconds
        return {
            "key": key,
            "current": current,
            "limit": max_requests,
            "remaining": max(0, max_requests - current),
            "reset_in": reset_in,
            "window_seconds": window_seconds,
        }


api_rate_limiter = RateLimiter()


def apply_rate_limit_headers(
    response: Response,
    result: dict[str, Any],
    window_seconds: int | None = None,
) -> None:
    """Set standard rate limit headers on a response."""
    window = window_seconds or int(result.get("window_seconds") or DEFAULT_WINDOW_SECONDS)
    reset_at = int(time.time()) + int(result.get("reset_in") or window)
    response.headers["X-RateLimit-Limit"] = str(result.get("limit", 0))
    response.headers["X-RateLimit-Remaining"] = str(result.get("remaining", 0))
    response.headers["X-RateLimit-Reset"] = str(reset_at)
    backend = result.get("backend")
    if backend:
        response.headers["X-RateLimit-Backend"] = str(backend)


def _rate_limit_disabled() -> bool:
    env = os.environ.get("ENVIRONMENT", "").lower()
    allow = os.environ.get("RATE_LIMIT_ENABLE_IN_TEST", "").lower() in ("1", "true", "yes")
    return env == "test" and not allow


async def resolve_workspace_plan(db: AsyncSession, workspace_id: int) -> str:
    result = await db.execute(select(Workspaces.plan).where(Workspaces.id == workspace_id))
    plan = result.scalar_one_or_none()
    return (plan or DEFAULT_PLAN).strip().lower() or DEFAULT_PLAN


def plan_hourly_limit(plan: str) -> int | None:
    return PLAN_RATE_LIMITS.get(plan.strip().lower(), PLAN_RATE_LIMITS[DEFAULT_PLAN])


async def enforce_rate_limit(
    *,
    request: Request,
    response: Response,
    workspace_id: int,
    max_requests: int,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
    key_suffix: str,
    db: AsyncSession | None = None,
    plan: str | None = None,
    enforce_plan: bool = True,
) -> dict[str, Any]:
    """Check endpoint + optional plan quota; raise 429 or attach headers."""
    if _rate_limit_disabled():
        return {"allowed": True, "limit": max_requests, "remaining": max_requests, "reset_in": window_seconds}

    endpoint_key = f"ws:{workspace_id}:{key_suffix}"
    endpoint_result = await api_rate_limiter.rate_limit(
        endpoint_key, max_requests, window_seconds
    )

    plan_result: dict[str, Any] | None = None
    if enforce_plan and db is not None:
        resolved_plan = plan or await resolve_workspace_plan(db, workspace_id)
        plan_limit = plan_hourly_limit(resolved_plan)
        if plan_limit is not None:
            plan_key = f"plan:{resolved_plan}:ws:{workspace_id}"
            plan_result = await api_rate_limiter.rate_limit(
                plan_key, plan_limit, DEFAULT_WINDOW_SECONDS
            )
            if not plan_result["allowed"]:
                apply_rate_limit_headers(response, plan_result, DEFAULT_WINDOW_SECONDS)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Plan rate limit exceeded",
                        "plan": resolved_plan,
                        "limit": plan_limit,
                        "retry_after_seconds": plan_result.get("reset_in", DEFAULT_WINDOW_SECONDS),
                    },
                    headers={
                        "Retry-After": str(max(1, int(plan_result.get("reset_in", 60)))),
                    },
                )

    if not endpoint_result["allowed"]:
        apply_rate_limit_headers(response, endpoint_result, window_seconds)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "limit": max_requests,
                "retry_after_seconds": endpoint_result.get("reset_in", window_seconds),
            },
            headers={
                "Retry-After": str(max(1, int(endpoint_result.get("reset_in", 60)))),
            },
        )

    apply_rate_limit_headers(response, endpoint_result, window_seconds)
    request.state.rate_limit = endpoint_result
    if plan_result:
        request.state.plan_rate_limit = plan_result
    return endpoint_result


def endpoint_rate_limit(
    max_requests: int,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
    key_suffix: str = "",
    enforce_plan: bool = True,
):
    """FastAPI dependency factory for endpoint-specific rate limits."""

    suffix = key_suffix or "endpoint"

    async def _dependency(
        request: Request,
        response: Response,
        ws: WorkspaceContext = Depends(require_workspace),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        await enforce_rate_limit(
            request=request,
            response=response,
            workspace_id=int(ws.workspace_id),
            max_requests=max_requests,
            window_seconds=window_seconds,
            key_suffix=suffix,
            db=db,
            enforce_plan=enforce_plan,
        )

    return _dependency


def rate_limited(
    *,
    max_requests: int | None = None,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
    key_prefix: str = "endpoint",
    plan_field: str | None = None,
):
    """
    Decorator for FastAPI route handlers.

    When plan_field is set (e.g. workspace.plan), enforces plan hourly quota.
  When max_requests is set, enforces endpoint-specific limit.
    """

    def decorator(func: Callable) -> Callable:
        is_coro = inspect.iscoroutinefunction(func)

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            if _rate_limit_disabled():
                return await func(*args, **kwargs)

            request: Request | None = kwargs.get("request")
            response: Response | None = kwargs.get("response")
            ws: WorkspaceContext | None = (
                kwargs.get("ws")
                or kwargs.get("ws_ctx")
                or kwargs.get("_ctx")
                or kwargs.get("ctx")
            )
            db: AsyncSession | None = kwargs.get("db")

            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            if response is None:
                for arg in args:
                    if isinstance(arg, Response):
                        response = arg
                        break
            if ws is None or ws.workspace_id is None:
                return await func(*args, **kwargs)

            if response is None:
                response = Response()

            suffix = f"{key_prefix}:{func.__name__}"
            limit = max_requests
            if plan_field and limit is None and db is not None:
                plan = await resolve_workspace_plan(db, int(ws.workspace_id))
                limit = plan_hourly_limit(plan) or 10**9
            if limit is None:
                return await func(*args, **kwargs)

            await enforce_rate_limit(
                request=request,
                response=response,
                workspace_id=int(ws.workspace_id),
                max_requests=int(limit),
                window_seconds=window_seconds,
                key_suffix=suffix,
                db=db,
                enforce_plan=bool(plan_field),
            )
            return await func(*args, **kwargs)

        return async_wrapper if is_coro else async_wrapper

    return decorator


async def get_workspace_rate_limit_status(
    db: AsyncSession,
    workspace_id: int,
    *,
    endpoint_keys: dict[str, tuple[int, int]] | None = None,
) -> dict[str, Any]:
    """
    Current rate limit usage for a workspace.

    endpoint_keys: {name: (max_requests, window_seconds)}
    """
    plan = await resolve_workspace_plan(db, workspace_id)
    plan_limit = plan_hourly_limit(plan)
    plan_usage: dict[str, Any] | None = None
    if plan_limit is not None:
        plan_usage = await api_rate_limiter.get_usage(
            f"plan:{plan}:ws:{workspace_id}",
            plan_limit,
            DEFAULT_WINDOW_SECONDS,
        )

    endpoints: dict[str, Any] = {}
    default_endpoints = endpoint_keys or {
        "ai_chat": (50, DEFAULT_WINDOW_SECONDS),
        "dalle_generate": (20, DEFAULT_WINDOW_SECONDS),
        "media_video_generate": (10, DEFAULT_WINDOW_SECONDS),
        "reports_full": (5, DEFAULT_WINDOW_SECONDS),
    }
    for name, (limit, window) in default_endpoints.items():
        endpoints[name] = await api_rate_limiter.get_usage(
            f"ws:{workspace_id}:{name}",
            limit,
            window,
        )

    return {
        "workspace_id": workspace_id,
        "plan": plan,
        "plan_limit_per_hour": plan_limit,
        "plan_usage": plan_usage,
        "endpoints": endpoints,
    }

"""
NELVYON health monitoring — service checks, circuit breakers, fallbacks.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Awaitable

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    """Simple circuit breaker for external services."""

    name: str
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    half_open_max_calls: int = 2
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_at: float = 0.0
    half_open_calls: int = 0

    def record_success(self) -> None:
        self.failure_count = 0
        self.half_open_calls = 0
        self.state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_at = time.time()
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.half_open_calls = 0
        elif self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning("Circuit breaker OPEN for service=%s", self.name)

    def allow_request(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_at >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
                logger.info("Circuit breaker HALF_OPEN for service=%s", self.name)
                return True
            return False
        # half_open
        if self.half_open_calls < self.half_open_max_calls:
            self.half_open_calls += 1
            return True
        return False

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout_seconds": self.recovery_timeout,
        }


_breakers: dict[str, CircuitBreaker] = {
    "redis": CircuitBreaker("redis", failure_threshold=3, recovery_timeout=30),
    "openai": CircuitBreaker("openai", failure_threshold=5, recovery_timeout=90),
    "ses": CircuitBreaker("ses", failure_threshold=5, recovery_timeout=60),
    "supabase": CircuitBreaker("supabase", failure_threshold=5, recovery_timeout=60),
    "database": CircuitBreaker("database", failure_threshold=3, recovery_timeout=30),
}


def circuit_breaker(service_name: str) -> CircuitBreaker:
    """Get or create circuit breaker for a service."""
    key = service_name.strip().lower()
    if key not in _breakers:
        _breakers[key] = CircuitBreaker(key)
    return _breakers[key]


def get_service_fallback(service_name: str) -> dict[str, Any]:
    """
    Fallback configuration when a service circuit is open or unavailable.
    Redis → memory, SES → log, OpenAI → gpt-3.5-turbo.
    """
    name = service_name.strip().lower()
    cb = circuit_breaker(name)
    degraded = cb.state in (CircuitState.OPEN, CircuitState.HALF_OPEN)

    fallbacks: dict[str, dict[str, Any]] = {
        "redis": {
            "primary": "redis",
            "fallback": "memory",
            "active": "memory" if degraded else "redis",
            "note": "In-memory store when Redis circuit is open",
        },
        "ses": {
            "primary": "ses",
            "fallback": "log",
            "active": "log" if degraded else "ses",
            "note": "Log-only email when SES circuit is open",
        },
        "openai": {
            "primary": "gpt-4o",
            "fallback": "gpt-3.5-turbo",
            "active": "gpt-3.5-turbo" if degraded else "gpt-4o",
            "note": "Downgrade model when OpenAI circuit is open",
        },
        "supabase": {
            "primary": "supabase",
            "fallback": "local",
            "active": "local" if degraded else "supabase",
            "note": "Skip remote storage when Supabase circuit is open",
        },
    }
    base = fallbacks.get(name, {"primary": name, "fallback": None, "active": name})
    return {**base, "circuit_state": cb.state.value, "degraded": degraded}


def get_effective_openai_model(requested: str | None = None) -> str:
    """Return OpenAI model with circuit-breaker fallback."""
    fb = get_service_fallback("openai")
    if fb.get("degraded"):
        return str(fb["fallback"])
    return requested or "gpt-4o"


class HealthMonitor:
    """Periodic and on-demand health checks for critical services."""

    def __init__(self) -> None:
        self._last_full_check: float = 0.0
        self._cached_health: dict[str, Any] | None = None
        self._cache_ttl = 15.0

    async def _timed_check(self, name: str, fn: Callable[[], Awaitable[dict[str, Any]]]) -> dict[str, Any]:
        cb = circuit_breaker(name)
        if not cb.allow_request():
            return {
                "status": "circuit_open",
                "latency_ms": 0,
                "circuit": cb.to_dict(),
                "fallback": get_service_fallback(name),
            }
        start = time.perf_counter()
        try:
            result = await fn()
            latency = round((time.perf_counter() - start) * 1000, 1)
            cb.record_success()
            result["latency_ms"] = latency
            result["circuit"] = cb.to_dict()
            return result
        except Exception as exc:
            latency = round((time.perf_counter() - start) * 1000, 1)
            cb.record_failure()
            return {
                "status": "error",
                "error": str(exc),
                "latency_ms": latency,
                "circuit": cb.to_dict(),
                "fallback": get_service_fallback(name),
            }

    async def check_database(self) -> dict[str, Any]:
        from sqlalchemy import text
        from core.database import db_manager

        async def _run() -> dict[str, Any]:
            if not db_manager.async_session_maker:
                await db_manager.ensure_initialized()
            if not db_manager.async_session_maker:
                raise RuntimeError("Database not initialized")
            async with db_manager.async_session_maker() as session:
                await session.execute(text("SELECT 1"))
            return {"status": "ok", "backend": "postgresql"}

        return await self._timed_check("database", _run)

    async def check_redis(self) -> dict[str, Any]:
        from core.redis_adapter import redis_client

        async def _run() -> dict[str, Any]:
            if not redis_client._initialized:
                await redis_client.initialize()
            health = await redis_client.health()
            fb = get_service_fallback("redis")
            active = fb["active"]
            return {
                "status": "ok" if health.get("connected") else "degraded",
                **health,
                "fallback_active": active,
            }

        return await self._timed_check("redis", _run)

    async def check_openai(self) -> dict[str, Any]:
        async def _run() -> dict[str, Any]:
            api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
            if not api_key:
                return {
                    "status": "mock",
                    "configured": False,
                    "model_fallback": get_effective_openai_model(),
                }
            try:
                from openai import AsyncOpenAI

                client = AsyncOpenAI(api_key=api_key, timeout=5.0)
                await client.models.list()
                return {
                    "status": "ok",
                    "configured": True,
                    "model_fallback": get_effective_openai_model(),
                }
            except Exception as exc:
                raise RuntimeError(str(exc)) from exc

        return await self._timed_check("openai", _run)

    async def check_ses(self) -> dict[str, Any]:
        from services.ses_service import get_ses_service

        async def _run() -> dict[str, Any]:
            ses = get_ses_service()
            if ses.is_mock:
                return {"status": "mock", "mock": True, "fallback": "log"}
            quota = await ses.get_sending_quota()
            return {"status": "ok", "mock": False, "quota": quota}

        return await self._timed_check("ses", _run)

    async def check_supabase(self) -> dict[str, Any]:
        from services.supabase_service import get_supabase_service

        async def _run() -> dict[str, Any]:
            svc = get_supabase_service()
            if svc.is_mock:
                return {"status": "mock", "mock": True}
            return {"status": "ok", "mock": False, "bucket": getattr(svc, "bucket", None)}

        return await self._timed_check("supabase", _run)

    async def get_system_health(self, *, use_cache: bool = True) -> dict[str, Any]:
        """Full system health with latencies and circuit breaker states."""
        now = time.time()
        if use_cache and self._cached_health and (now - self._last_full_check) < self._cache_ttl:
            return self._cached_health

        checks = await asyncio.gather(
            self.check_database(),
            self.check_redis(),
            self.check_openai(),
            self.check_ses(),
            self.check_supabase(),
            return_exceptions=False,
        )
        names = ("database", "redis", "openai", "ses", "supabase")
        check_map = dict(zip(names, checks))

        statuses = [c.get("status") for c in check_map.values()]
        if any(s == "error" for s in statuses):
            overall = "unhealthy"
        elif any(s in ("degraded", "mock", "circuit_open") for s in statuses):
            overall = "degraded"
        else:
            overall = "healthy"

        from core.regions import CURRENT_REGION

        result = {
            "status": overall,
            "region": CURRENT_REGION,
            "environment": os.environ.get("ENVIRONMENT", "production"),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "checks": check_map,
            "circuit_breakers": {name: circuit_breaker(name).to_dict() for name in names},
            "fallbacks": {name: get_service_fallback(name) for name in ("redis", "ses", "openai", "supabase")},
        }
        self._cached_health = result
        self._last_full_check = now
        return result


health_monitor = HealthMonitor()

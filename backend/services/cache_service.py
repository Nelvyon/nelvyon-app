"""Redis-backed cache with in-memory fallback (REDIS_URL / Upstash)."""

from __future__ import annotations

import functools
import hashlib
import json
import logging
import os
from typing import Any, Callable, Optional, TypeVar

from core.redis_adapter import InMemoryStore

logger = logging.getLogger(__name__)

CACHE_PREFIX = "nelvyon:cache:"
F = TypeVar("F", bound=Callable[..., Any])

_cache_instance: Optional["CacheService"] = None


class CacheService:
    """Lazy Redis cache; falls back to in-memory dict when REDIS_URL is unset."""

    def __init__(self) -> None:
        self._client: Any = None
        self._fallback = InMemoryStore()
        self._using_redis = False
        self._initialized = False

    async def _ensure_initialized(self) -> None:
        if self._initialized:
            return

        redis_url = (os.environ.get("REDIS_URL") or "").strip()
        if redis_url:
            try:
                import redis.asyncio as aioredis

                self._client = aioredis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                )
                await self._client.ping()
                self._using_redis = True
                logger.info("CacheService connected to Redis")
            except Exception as exc:
                logger.warning("CacheService Redis unavailable, using in-memory: %s", exc)
                self._client = None
                self._using_redis = False
        else:
            logger.info("CacheService: REDIS_URL not set, using in-memory store")

        self._initialized = True

    def _full_key(self, key: str) -> str:
        return f"{CACHE_PREFIX}{key}"

    @property
    def backend(self) -> str:
        return "redis" if self._using_redis else "in-memory"

    async def get(self, key: str) -> Optional[str]:
        await self._ensure_initialized()
        full = self._full_key(key)
        if self._using_redis:
            return await self._client.get(full)
        return await self._fallback.get(full)

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        await self._ensure_initialized()
        full = self._full_key(key)
        if self._using_redis:
            if ttl:
                await self._client.setex(full, ttl, value)
            else:
                await self._client.set(full, value)
            return True
        return await self._fallback.set(full, value, ttl)

    async def delete(self, key: str) -> bool:
        await self._ensure_initialized()
        full = self._full_key(key)
        if self._using_redis:
            await self._client.delete(full)
            return True
        return await self._fallback.delete(full)

    async def exists(self, key: str) -> bool:
        await self._ensure_initialized()
        full = self._full_key(key)
        if self._using_redis:
            return bool(await self._client.exists(full))
        return await self._fallback.exists(full)

    async def get_json(self, key: str) -> Any | None:
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    async def set_json(self, key: str, data: Any, ttl: Optional[int] = None) -> bool:
        return await self.set(key, json.dumps(data, ensure_ascii=False, default=str), ttl)

    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete keys matching pattern (Redis SCAN or in-memory prefix match)."""
        await self._ensure_initialized()
        match = pattern if pattern.startswith(CACHE_PREFIX) else f"{CACHE_PREFIX}{pattern}"
        deleted = 0

        if self._using_redis:
            async for key in self._client.scan_iter(match=match, count=200):
                await self._client.delete(key)
                deleted += 1
        else:
            prefix = pat.rstrip("*")
            keys = await self._fallback.keys(f"{prefix}*")
            for key in keys:
                await self._fallback.delete(key)
                deleted += 1

        return deleted


def get_cache_service() -> CacheService:
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance


def _cache_key_from_call(
    func: Callable[..., Any],
    prefix: str | None,
    args: tuple,
    kwargs: dict,
) -> str:
    parts: list[str] = [prefix or func.__module__, func.__qualname__]

    for key in (
        "ctx",
        "ws_ctx",
        "_ws_ctx",
        "_ctx",
    ):
        ws = kwargs.get(key)
        if ws is not None and hasattr(ws, "workspace_id"):
            parts.append(f"ws:{ws.workspace_id}")
            break

    for name in (
        "campaign_id",
        "site_url",
        "start_date",
        "end_date",
        "property_id",
        "dimensions",
        "customer_id",
    ):
        val = kwargs.get(name)
        if val is not None:
            parts.append(f"{name}:{val}")

    skip = frozenset({"db", "_db", "request", "svc"})
    scalars = {
        k: v
        for k, v in kwargs.items()
        if k not in skip
        and k not in ("ctx", "ws_ctx", "_ws_ctx", "_ctx")
        and isinstance(v, (str, int, float, bool, type(None)))
    }
    if scalars:
        parts.append(
            hashlib.sha256(
                json.dumps(scalars, sort_keys=True, default=str).encode()
            ).hexdigest()[:12]
        )

    raw = ":".join(parts)
    if len(raw) > 200:
        return hashlib.sha256(raw.encode()).hexdigest()
    return raw


def cached(ttl: int = 300, prefix: str | None = None) -> Callable[[F], F]:
    """Cache async endpoint responses (JSON-serializable) for ``ttl`` seconds."""

    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            cache = get_cache_service()
            key = _cache_key_from_call(func, prefix, args, kwargs)
            hit = await cache.get_json(key)
            if hit is not None:
                return hit
            result = await func(*args, **kwargs)
            if result is not None:
                await cache.set_json(key, result, ttl)
            return result

        return wrapper  # type: ignore[return-value]

    return decorator

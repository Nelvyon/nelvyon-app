"""
Redis Adapter — Abstraction layer for cache, rate limiting, and sessions.

Provides a unified interface that works with:
1. Real Redis (when REDIS_URL is configured) — production
2. In-memory fallback — development/testing

Usage:
    from core.redis_adapter import redis_client
    await redis_client.initialize()
    await redis_client.set("key", "value", ttl=300)
    value = await redis_client.get("key")

Features:
- Rate limiting with sliding window
- Session storage
- Cache with TTL
- Pub/sub ready (when using real Redis)
- Automatic fallback to in-memory when Redis is unavailable
"""
import asyncio
import logging
import os
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class InMemoryStore:
    """Thread-safe in-memory store as Redis fallback for development."""

    def __init__(self):
        self._store: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            self._cleanup_expired()
            return self._store.get(key)

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        async with self._lock:
            self._store[key] = value
            if ttl:
                self._expiry[key] = time.time() + ttl
            return True

    async def delete(self, key: str) -> bool:
        async with self._lock:
            self._store.pop(key, None)
            self._expiry.pop(key, None)
            return True

    async def incr(self, key: str) -> int:
        async with self._lock:
            self._cleanup_expired()
            val = int(self._store.get(key, 0)) + 1
            self._store[key] = str(val)
            return val

    async def expire(self, key: str, ttl: int) -> bool:
        async with self._lock:
            if key in self._store:
                self._expiry[key] = time.time() + ttl
                return True
            return False

    async def ttl(self, key: str) -> int:
        async with self._lock:
            if key in self._expiry:
                remaining = self._expiry[key] - time.time()
                return max(0, int(remaining))
            return -1

    async def exists(self, key: str) -> bool:
        async with self._lock:
            self._cleanup_expired()
            return key in self._store

    async def keys(self, pattern: str = "*") -> list:
        """Simple pattern matching (only supports prefix*)."""
        async with self._lock:
            self._cleanup_expired()
            if pattern == "*":
                return list(self._store.keys())
            prefix = pattern.rstrip("*")
            return [k for k in self._store.keys() if k.startswith(prefix)]

    async def flushall(self) -> bool:
        async with self._lock:
            self._store.clear()
            self._expiry.clear()
            return True

    def _cleanup_expired(self):
        """Remove expired keys."""
        now = time.time()
        expired = [k for k, exp in self._expiry.items() if exp <= now]
        for k in expired:
            self._store.pop(k, None)
            self._expiry.pop(k, None)


class RedisAdapter:
    """
    Unified Redis interface with automatic fallback.

    Tries to connect to Redis on initialize(). If Redis is unavailable,
    falls back to InMemoryStore transparently.
    """

    def __init__(self):
        self._client = None
        self._fallback = InMemoryStore()
        self._using_redis = False
        self._initialized = False

    @property
    def is_redis(self) -> bool:
        """Whether we're using real Redis or in-memory fallback."""
        return self._using_redis

    async def initialize(self):
        """Initialize Redis connection or fall back to in-memory."""
        if self._initialized:
            return

        redis_url = os.environ.get("REDIS_URL")
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
                # Test connection
                await self._client.ping()
                self._using_redis = True
                logger.info("✅ Connected to Redis at %s", redis_url.split("@")[-1] if "@" in redis_url else "***")
            except ImportError:
                logger.warning("⚠️  redis package not installed. Using in-memory fallback. Install with: pip install redis")
                self._client = None
            except Exception as e:
                logger.warning("⚠️  Redis connection failed: %s. Using in-memory fallback.", str(e))
                self._client = None
                self._using_redis = False
        else:
            logger.info("ℹ️  REDIS_URL not configured. Using in-memory store (suitable for single-instance deployment).")

        self._initialized = True

    async def close(self):
        """Close Redis connection."""
        if self._client and self._using_redis:
            try:
                await self._client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.warning("Error closing Redis: %s", str(e))
        self._initialized = False
        self._using_redis = False

    @property
    def _store(self):
        return self._client if self._using_redis else self._fallback

    # ── Core Operations ──

    async def get(self, key: str) -> Optional[str]:
        return await self._store.get(key)

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        if self._using_redis:
            if ttl:
                await self._client.setex(key, ttl, value)
            else:
                await self._client.set(key, value)
            return True
        return await self._fallback.set(key, value, ttl)

    async def delete(self, key: str) -> bool:
        if self._using_redis:
            await self._client.delete(key)
            return True
        return await self._fallback.delete(key)

    async def incr(self, key: str) -> int:
        if self._using_redis:
            return await self._client.incr(key)
        return await self._fallback.incr(key)

    async def expire(self, key: str, ttl: int) -> bool:
        if self._using_redis:
            return await self._client.expire(key, ttl)
        return await self._fallback.expire(key, ttl)

    async def ttl(self, key: str) -> int:
        if self._using_redis:
            return await self._client.ttl(key)
        return await self._fallback.ttl(key)

    async def exists(self, key: str) -> bool:
        if self._using_redis:
            return bool(await self._client.exists(key))
        return await self._fallback.exists(key)

    # ── Rate Limiting ──

    async def check_rate_limit(
        self, key: str, max_requests: int, window_seconds: int
    ) -> Dict[str, Any]:
        """
        Sliding window rate limiter.

        Returns:
            {
                "allowed": bool,
                "current": int,
                "limit": int,
                "remaining": int,
                "reset_in": int (seconds),
            }
        """
        current = await self.incr(key)
        if current == 1:
            await self.expire(key, window_seconds)

        ttl_remaining = await self.ttl(key)
        if ttl_remaining < 0:
            ttl_remaining = window_seconds

        return {
            "allowed": current <= max_requests,
            "current": current,
            "limit": max_requests,
            "remaining": max(0, max_requests - current),
            "reset_in": ttl_remaining,
        }

    # ── Session Storage ──

    async def set_session(self, session_id: str, data: str, ttl: int = 3600) -> bool:
        """Store session data with TTL."""
        return await self.set(f"session:{session_id}", data, ttl=ttl)

    async def get_session(self, session_id: str) -> Optional[str]:
        """Retrieve session data."""
        return await self.get(f"session:{session_id}")

    async def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        return await self.delete(f"session:{session_id}")

    # ── Cache ──

    async def cache_get(self, namespace: str, key: str) -> Optional[str]:
        """Get cached value."""
        return await self.get(f"cache:{namespace}:{key}")

    async def cache_set(self, namespace: str, key: str, value: str, ttl: int = 300) -> bool:
        """Set cached value with TTL."""
        return await self.set(f"cache:{namespace}:{key}", value, ttl=ttl)

    async def cache_invalidate(self, namespace: str, key: str) -> bool:
        """Invalidate a cache entry."""
        return await self.delete(f"cache:{namespace}:{key}")

    # ── Health ──

    async def health(self) -> Dict[str, Any]:
        """Return health status of the cache layer."""
        return {
            "backend": "redis" if self._using_redis else "in-memory",
            "connected": self._initialized,
            "suitable_for_production": self._using_redis,
            "note": (
                "Using real Redis — ready for multi-instance deployment"
                if self._using_redis
                else "Using in-memory store — suitable for single instance only. Set REDIS_URL for production."
            ),
        }


# Singleton instance
redis_client = RedisAdapter()
"""
Redis adapter tests — verify in-memory fallback works correctly.
"""
import pytest
import pytest_asyncio

from core.redis_adapter import RedisAdapter


@pytest_asyncio.fixture
async def redis():
    """Create a fresh Redis adapter (will use in-memory fallback in tests)."""
    adapter = RedisAdapter()
    await adapter.initialize()
    yield adapter
    await adapter.close()


@pytest.mark.asyncio
async def test_set_and_get(redis: RedisAdapter):
    """Test basic set/get operations."""
    await redis.set("test:key", "hello")
    value = await redis.get("test:key")
    assert value == "hello"


@pytest.mark.asyncio
async def test_set_with_ttl(redis: RedisAdapter):
    """Test set with TTL."""
    await redis.set("test:ttl", "value", ttl=300)
    value = await redis.get("test:ttl")
    assert value == "value"
    remaining = await redis.ttl("test:ttl")
    assert remaining > 0


@pytest.mark.asyncio
async def test_delete(redis: RedisAdapter):
    """Test delete operation."""
    await redis.set("test:del", "value")
    await redis.delete("test:del")
    value = await redis.get("test:del")
    assert value is None


@pytest.mark.asyncio
async def test_incr(redis: RedisAdapter):
    """Test increment operation."""
    val1 = await redis.incr("test:counter")
    assert val1 == 1
    val2 = await redis.incr("test:counter")
    assert val2 == 2


@pytest.mark.asyncio
async def test_rate_limit(redis: RedisAdapter):
    """Test rate limiting."""
    key = "ratelimit:test:127.0.0.1"

    # First request should be allowed
    result = await redis.check_rate_limit(key, max_requests=3, window_seconds=60)
    assert result["allowed"] is True
    assert result["remaining"] == 2

    # Second and third
    await redis.check_rate_limit(key, max_requests=3, window_seconds=60)
    await redis.check_rate_limit(key, max_requests=3, window_seconds=60)

    # Fourth should be blocked
    result = await redis.check_rate_limit(key, max_requests=3, window_seconds=60)
    assert result["allowed"] is False
    assert result["remaining"] == 0


@pytest.mark.asyncio
async def test_session_storage(redis: RedisAdapter):
    """Test session set/get/delete."""
    await redis.set_session("sess-123", '{"user_id": "abc"}', ttl=3600)
    data = await redis.get_session("sess-123")
    assert data == '{"user_id": "abc"}'

    await redis.delete_session("sess-123")
    data = await redis.get_session("sess-123")
    assert data is None


@pytest.mark.asyncio
async def test_cache_operations(redis: RedisAdapter):
    """Test cache namespace operations."""
    await redis.cache_set("crm", "contacts:count", "150", ttl=300)
    value = await redis.cache_get("crm", "contacts:count")
    assert value == "150"

    await redis.cache_invalidate("crm", "contacts:count")
    value = await redis.cache_get("crm", "contacts:count")
    assert value is None


@pytest.mark.asyncio
async def test_health(redis: RedisAdapter):
    """Test health check."""
    health = await redis.health()
    assert health["backend"] == "in-memory"
    assert health["connected"] is True
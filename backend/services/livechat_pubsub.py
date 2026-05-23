"""Live chat Redis Pub/Sub — real-time message broadcast."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any, AsyncIterator

from core.redis_adapter import redis_client

logger = logging.getLogger(__name__)

_MEMORY_CHANNELS: dict[str, list[asyncio.Queue]] = defaultdict(list)
_MEMORY_LOCK = asyncio.Lock()


def channel_name(conversation_id: str) -> str:
    return f"livechat:conv:{conversation_id}"


def presence_key(tenant_id: int, agent_id: str) -> str:
    return f"livechat:presence:{tenant_id}:{agent_id}"


async def publish_event(conversation_id: str, event: dict[str, Any]) -> None:
    """Publish JSON event to conversation channel."""
    await redis_client.initialize()
    payload = json.dumps(event, ensure_ascii=False, default=str)
    ch = channel_name(conversation_id)

    if redis_client.is_redis and redis_client._client:
        await redis_client._client.publish(ch, payload)
        return

    async with _MEMORY_LOCK:
        for q in _MEMORY_CHANNELS.get(ch, []):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass


async def subscribe_events(conversation_id: str) -> AsyncIterator[dict[str, Any]]:
    """Subscribe to conversation events (Redis or in-memory fallback)."""
    await redis_client.initialize()
    ch = channel_name(conversation_id)

    if redis_client.is_redis and redis_client._client:
        pubsub = redis_client._client.pubsub()
        await pubsub.subscribe(ch)
        try:
            while True:
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if msg and msg.get("type") == "message" and msg.get("data"):
                    try:
                        yield json.loads(msg["data"])
                    except json.JSONDecodeError:
                        continue
                await asyncio.sleep(0.05)
        finally:
            await pubsub.unsubscribe(ch)
            await pubsub.close()
        return

    queue: asyncio.Queue = asyncio.Queue(maxsize=200)
    async with _MEMORY_LOCK:
        _MEMORY_CHANNELS[ch].append(queue)
    try:
        while True:
            raw = await queue.get()
            try:
                yield json.loads(raw)
            except json.JSONDecodeError:
                continue
    finally:
        async with _MEMORY_LOCK:
            if ch in _MEMORY_CHANNELS and queue in _MEMORY_CHANNELS[ch]:
                _MEMORY_CHANNELS[ch].remove(queue)


async def set_agent_presence(
    tenant_id: int,
    agent_id: str,
    status: str,
    *,
    ttl: int = 120,
) -> None:
    await redis_client.initialize()
    key = presence_key(tenant_id, agent_id)
    await redis_client.set(key, status, ttl=ttl)


async def get_agent_presence(tenant_id: int, agent_id: str) -> str:
    await redis_client.initialize()
    val = await redis_client.get(presence_key(tenant_id, agent_id))
    return val or "offline"

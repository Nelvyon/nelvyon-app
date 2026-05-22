"""Redis list-based task queues with in-memory fallback."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from collections import defaultdict, deque
from typing import Any, Awaitable, Callable, Optional

logger = logging.getLogger(__name__)

QUEUE_PREFIX = "nelvyon:queue:"

QUEUE_CAMPAIGNS = "campaigns"
QUEUE_EMAILS = "emails"
QUEUE_NOTIFICATIONS = "notifications"
QUEUE_REPORTS = "reports"

PREDEFINED_QUEUES = frozenset(
    {QUEUE_CAMPAIGNS, QUEUE_EMAILS, QUEUE_NOTIFICATIONS, QUEUE_REPORTS}
)

HandlerFunc = Callable[[str, dict[str, Any]], Awaitable[Any]]

_queue_instance: Optional["QueueService"] = None


class InMemoryQueueStore:
    """FIFO queues + delayed tasks when Redis is unavailable."""

    def __init__(self) -> None:
        self._queues: dict[str, deque[str]] = defaultdict(deque)
        self._delayed: dict[str, list[tuple[float, str]]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def lpush(self, queue_key: str, value: str) -> None:
        async with self._lock:
            self._queues[queue_key].appendleft(value)

    async def rpop(self, queue_key: str) -> str | None:
        async with self._lock:
            q = self._queues[queue_key]
            if not q:
                return None
            return q.pop()

    async def llen(self, queue_key: str) -> int:
        async with self._lock:
            return len(self._queues[queue_key])

    async def zadd_delayed(self, delayed_key: str, value: str, execute_at: float) -> None:
        async with self._lock:
            self._delayed[delayed_key].append((execute_at, value))
            self._delayed[delayed_key].sort(key=lambda x: x[0])

    async def promote_due(self, delayed_key: str, queue_key: str) -> None:
        now = time.time()
        async with self._lock:
            remaining: list[tuple[float, str]] = []
            for execute_at, raw in self._delayed[delayed_key]:
                if execute_at <= now:
                    self._queues[queue_key].appendleft(raw)
                else:
                    remaining.append((execute_at, raw))
            self._delayed[delayed_key] = remaining

    async def flush(self, queue_key: str, delayed_key: str) -> None:
        async with self._lock:
            self._queues[queue_key].clear()
            self._delayed[delayed_key].clear()

    async def delayed_len(self, delayed_key: str) -> int:
        async with self._lock:
            return len(self._delayed[delayed_key])


class QueueService:
    """LPUSH / RPOP task queues on Redis (Upstash) or in-memory fallback."""

    def __init__(self) -> None:
        self._client: Any = None
        self._memory = InMemoryQueueStore()
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
                logger.info("QueueService connected to Redis")
            except Exception as exc:
                logger.warning("QueueService Redis unavailable, using in-memory: %s", exc)
                self._client = None
                self._using_redis = False
        else:
            logger.info("QueueService: REDIS_URL not set, using in-memory store")

        self._initialized = True

    def _queue_key(self, queue_name: str) -> str:
        return f"{QUEUE_PREFIX}{queue_name}"

    def _delayed_key(self, queue_name: str) -> str:
        return f"{QUEUE_PREFIX}{queue_name}:delayed"

    @staticmethod
    def _serialize_task(task_name: str, payload: dict[str, Any]) -> str:
        return json.dumps(
            {
                "task_name": task_name,
                "payload": payload,
                "enqueued_at": time.time(),
            },
            ensure_ascii=False,
            default=str,
        )

    @staticmethod
    def _parse_task(raw: str) -> dict[str, Any] | None:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    async def _promote_delayed(self, queue_name: str) -> None:
        queue_key = self._queue_key(queue_name)
        delayed_key = self._delayed_key(queue_name)
        if self._using_redis:
            now = time.time()
            due = await self._client.zrangebyscore(delayed_key, "-inf", now)
            if due:
                pipe = self._client.pipeline()
                for item in due:
                    pipe.lpush(queue_key, item)
                    pipe.zrem(delayed_key, item)
                await pipe.execute()
        else:
            await self._memory.promote_due(delayed_key, queue_key)

    async def enqueue(
        self,
        queue_name: str,
        task_name: str,
        payload: dict[str, Any],
        delay_seconds: int = 0,
    ) -> dict[str, Any]:
        await self._ensure_initialized()
        if queue_name not in PREDEFINED_QUEUES:
            raise ValueError(f"Unknown queue: {queue_name}")

        raw = self._serialize_task(task_name, payload)
        queue_key = self._queue_key(queue_name)
        delayed_key = self._delayed_key(queue_name)

        if delay_seconds > 0:
            execute_at = time.time() + delay_seconds
            if self._using_redis:
                await self._client.zadd(delayed_key, {raw: execute_at})
            else:
                await self._memory.zadd_delayed(delayed_key, raw, execute_at)
        elif self._using_redis:
            await self._client.lpush(queue_key, raw)
        else:
            await self._memory.lpush(queue_key, raw)

        length = await self.get_queue_length(queue_name)
        return {
            "queue": queue_name,
            "task_name": task_name,
            "delay_seconds": delay_seconds,
            "length": length,
        }

    async def dequeue(self, queue_name: str) -> dict[str, Any] | None:
        await self._ensure_initialized()
        await self._promote_delayed(queue_name)
        queue_key = self._queue_key(queue_name)

        if self._using_redis:
            raw = await self._client.rpop(queue_key)
        else:
            raw = await self._memory.rpop(queue_key)

        if not raw:
            return None
        return self._parse_task(raw)

    async def get_queue_length(self, queue_name: str) -> int:
        await self._ensure_initialized()
        queue_key = self._queue_key(queue_name)
        delayed_key = self._delayed_key(queue_name)

        if self._using_redis:
            main_len = await self._client.llen(queue_key)
            delayed_len = await self._client.zcard(delayed_key)
            return int(main_len) + int(delayed_len)

        main_len = await self._memory.llen(queue_key)
        delayed_len = await self._memory.delayed_len(delayed_key)
        return main_len + delayed_len

    async def flush_queue(self, queue_name: str) -> int:
        await self._ensure_initialized()
        if queue_name not in PREDEFINED_QUEUES:
            raise ValueError(f"Unknown queue: {queue_name}")

        before = await self.get_queue_length(queue_name)
        queue_key = self._queue_key(queue_name)
        delayed_key = self._delayed_key(queue_name)

        if self._using_redis:
            await self._client.delete(queue_key, delayed_key)
        else:
            await self._memory.flush(queue_key, delayed_key)

        return before

    async def get_all_stats(self) -> dict[str, Any]:
        stats = {}
        for name in sorted(PREDEFINED_QUEUES):
            stats[name] = await self.get_queue_length(name)
        return {
            "queues": stats,
            "backend": "redis" if self._using_redis else "in-memory",
            "total_pending": sum(stats.values()),
        }

    async def process_queue(
        self,
        queue_name: str,
        handler_func: HandlerFunc,
        *,
        max_items: int | None = None,
        poll_interval: float = 1.0,
        stop_event: asyncio.Event | None = None,
    ) -> int:
        """Consume tasks until ``max_items`` reached or ``stop_event`` is set."""
        processed = 0
        while True:
            if stop_event and stop_event.is_set():
                break
            if max_items is not None and processed >= max_items:
                break

            task = await self.dequeue(queue_name)
            if not task:
                await asyncio.sleep(poll_interval)
                continue

            task_name = str(task.get("task_name", ""))
            payload = task.get("payload") or {}
            try:
                await handler_func(task_name, payload)
                processed += 1
            except Exception as exc:
                logger.error(
                    "queue %s task %s failed: %s",
                    queue_name,
                    task_name,
                    exc,
                    exc_info=True,
                )

        return processed


def get_queue_service() -> QueueService:
    global _queue_instance
    if _queue_instance is None:
        _queue_instance = QueueService()
    return _queue_instance

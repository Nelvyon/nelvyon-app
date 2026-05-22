"""
Production Job Queue — ARQ (Redis-backed) with in-process asyncio fallback.

Backend selection:
1. If REDIS_URL is set → uses ARQ with Redis broker (production, multi-instance)
2. If not → uses in-process asyncio queue (development, single-instance)

Both backends share the same handler interface, so switching is transparent.

Job types:
- email: Send emails (campaign blasts, notifications, retries)
- notification: Push notifications, in-app alerts
- report: Generate reports, analytics exports
- webhook: Outbound webhook delivery with retry
- cleanup: Data cleanup, stale record archival

Usage:
    from core.job_queue import job_queue

    # Register a handler
    job_queue.register_handler("email", my_email_handler)

    # Enqueue a job
    job_id = await job_queue.enqueue(
        job_type="email",
        payload={"to": "user@example.com", "subject": "Hello"},
    )

    # Check status
    status = await job_queue.get_status(job_id)
"""
import asyncio
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional

from core.job_observability import record_job_outcome
from core.job_contracts import CONTRACT_JOB_TYPES, validate_job_payload
from core.structured_log import log_structured

logger = logging.getLogger(__name__)

# Type for job handlers
JobHandler = Callable[[Dict[str, Any]], Coroutine[Any, Any, Optional[str]]]


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class Job:
    """Represents a background job."""

    def __init__(
        self,
        job_type: str,
        payload: Dict[str, Any],
        priority: str = "normal",
        max_retries: int = 3,
        retry_delay: int = 60,
    ):
        self.id = str(uuid.uuid4())
        self.job_type = job_type
        self.payload = payload
        self.priority = priority
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.status = JobStatus.PENDING
        self.attempts = 0
        self.result: Optional[str] = None
        self.error: Optional[str] = None
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.started_at: Optional[str] = None
        self.completed_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "job_type": self.job_type,
            "payload": self.payload,
            "priority": self.priority,
            "status": self.status,
            "attempts": self.attempts,
            "max_retries": self.max_retries,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }


# ═══════════════════════════════════════════════════════════════
# ARQ Backend (Redis-backed, production)
# ═══════════════════════════════════════════════════════════════

class ARQJobQueue:
    """
    ARQ-backed job queue using Redis as the broker.

    Features:
    - Persistent job storage in Redis
    - Distributed workers across multiple instances
    - Built-in retry with configurable delays
    - Job result storage with TTL
    - Health monitoring via Redis
    """

    def __init__(self):
        self._handlers: Dict[str, JobHandler] = {}
        self._redis_pool = None
        self._worker_task: Optional[asyncio.Task] = None
        self._running = False
        self._available = False
        self._jobs: Dict[str, Job] = {}  # Local cache for status queries
        self._stats = {
            "total_enqueued": 0,
            "total_completed": 0,
            "total_failed": 0,
            "total_retried": 0,
        }

    def register_handler(self, job_type: str, handler: JobHandler):
        self._handlers[job_type] = handler
        logger.info(f"ARQ: Registered handler for '{job_type}'")

    async def start(self):
        """Initialize Redis connection and start processing."""
        if self._running:
            return

        redis_url = (os.environ.get("REDIS_URL") or "").strip()
        if not redis_url:
            self._available = False
            log_structured(
                logger,
                logging.WARNING,
                "job_queue.redis_url_missing",
                "REDIS_URL not set; running without Redis-backed queue",
            )
            return

        try:
            from redis.asyncio import Redis

            self._redis_pool = Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            await self._redis_pool.ping()
            self._available = True
            self._running = True
            self._worker_task = asyncio.create_task(self._worker_loop())
            log_structured(
                logger,
                logging.INFO,
                "job_queue.redis_connected",
                "Redis connected",
            )
            logger.info("✅ ARQ job queue started with Redis broker")
        except Exception as e:
            self._available = False
            self._running = False
            self._redis_pool = None
            log_structured(
                logger,
                logging.WARNING,
                "job_queue.redis_unavailable",
                f"Redis not available, running without queue: {e}",
            )

    async def stop(self):
        """Gracefully stop the worker."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        if self._redis_pool:
            await self._redis_pool.close()
        logger.info("ARQ job queue stopped")

    async def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        priority: str = "normal",
        max_retries: int = 3,
        retry_delay: int = 60,
    ) -> str:
        """Enqueue a job to Redis."""
        import json

        if not self._available or not self._redis_pool:
            logger.warning("ARQ: Redis unavailable, job not enqueued type=%s", job_type)
            job = Job(job_type=job_type, payload=payload, priority=priority,
                      max_retries=max_retries, retry_delay=retry_delay)
            job.status = JobStatus.FAILED
            job.error = "Redis unavailable"
            self._jobs[job.id] = job
            return job.id

        validate_job_payload(job_type, payload)
        job = Job(job_type=job_type, payload=payload, priority=priority,
                  max_retries=max_retries, retry_delay=retry_delay)
        self._jobs[job.id] = job

        # Store job data in Redis
        job_data = json.dumps({
            "id": job.id,
            "job_type": job_type,
            "payload": payload,
            "priority": priority,
            "max_retries": max_retries,
            "retry_delay": retry_delay,
            "attempts": 0,
            "created_at": job.created_at,
        })

        # Push to priority queue
        queue_key = f"jobq:{priority}"
        await self._redis_pool.lpush(queue_key, job_data)
        await self._redis_pool.set(f"job:{job.id}:status", "pending", ex=86400)

        self._stats["total_enqueued"] += 1
        logger.info(f"ARQ: Enqueued job {job.id} type={job_type} priority={priority}")
        return job.id

    async def get_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status from local cache or Redis."""
        job = self._jobs.get(job_id)
        if job:
            return job.to_dict()

        # Try Redis
        if self._redis_pool:
            status_val = await self._redis_pool.get(f"job:{job_id}:status")
            if status_val:
                return {"id": job_id, "status": status_val}
        return None

    async def _worker_loop(self):
        """Main worker loop — polls Redis queues for jobs."""
        import json

        queues = ["jobq:high", "jobq:normal", "jobq:low"]

        while self._running:
            try:
                # BRPOP with timeout for graceful shutdown
                for queue_key in queues:
                    result = await self._redis_pool.rpop(queue_key)
                    if result:
                        job_data = json.loads(result)
                        await self._process_arq_job(job_data)
                        break
                else:
                    # No jobs found, wait briefly
                    await asyncio.sleep(0.5)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"ARQ worker error: {e}")
                await asyncio.sleep(1)

    async def _process_arq_job(self, job_data: dict):
        """Process a single job from Redis."""
        import json

        job_id = job_data["id"]
        job_type = job_data["job_type"]
        payload = job_data["payload"]
        max_retries = job_data.get("max_retries", 3)
        retry_delay = job_data.get("retry_delay", 60)
        attempts = job_data.get("attempts", 0) + 1

        handler = self._handlers.get(job_type)
        if not handler:
            await self._redis_pool.set(f"job:{job_id}:status", "failed", ex=86400)
            self._stats["total_failed"] += 1
            logger.error(f"ARQ: No handler for job type '{job_type}'")
            record_job_outcome(job_type=job_type, terminal="no_handler", job_id=job_id)
            return

        await self._redis_pool.set(f"job:{job_id}:status", "running", ex=86400)

        # Update local cache
        if job_id in self._jobs:
            self._jobs[job_id].status = JobStatus.RUNNING
            self._jobs[job_id].attempts = attempts

        try:
            result = await handler(payload)
            await self._redis_pool.set(f"job:{job_id}:status", "completed", ex=86400)
            if result:
                await self._redis_pool.set(f"job:{job_id}:result", str(result), ex=86400)
            self._stats["total_completed"] += 1

            if job_id in self._jobs:
                self._jobs[job_id].status = JobStatus.COMPLETED
                self._jobs[job_id].result = result
                self._jobs[job_id].completed_at = datetime.now(timezone.utc).isoformat()

            logger.info(f"ARQ: Job {job_id} completed (attempt {attempts})")
            record_job_outcome(job_type=job_type, terminal="completed", job_id=job_id)

        except Exception as e:
            logger.warning(f"ARQ: Job {job_id} failed (attempt {attempts}/{max_retries}): {e}")

            if attempts < max_retries:
                # Re-enqueue with incremented attempts
                job_data["attempts"] = attempts
                delay = min(retry_delay * (2 ** (attempts - 1)), 300)
                await asyncio.sleep(delay)
                await self._redis_pool.lpush("jobq:normal", json.dumps(job_data))
                await self._redis_pool.set(f"job:{job_id}:status", "retrying", ex=86400)
                self._stats["total_retried"] += 1

                if job_id in self._jobs:
                    self._jobs[job_id].status = JobStatus.RETRYING
            else:
                await self._redis_pool.set(f"job:{job_id}:status", "failed", ex=86400)
                self._stats["total_failed"] += 1

                if job_id in self._jobs:
                    self._jobs[job_id].status = JobStatus.FAILED
                    self._jobs[job_id].error = str(e)
                    self._jobs[job_id].completed_at = datetime.now(timezone.utc).isoformat()

                logger.error(f"ARQ: Job {job_id} permanently failed after {attempts} attempts")
                record_job_outcome(
                    job_type=job_type,
                    terminal="failed",
                    job_id=job_id,
                    error=str(e),
                )

    def get_stats(self) -> Dict[str, Any]:
        return {
            **self._stats,
            "active_workers": 1 if self._running else 0,
            "max_workers": 1,
            "registered_handlers": list(self._handlers.keys()),
            "contracted_job_types": sorted(CONTRACT_JOB_TYPES),
            "backend": "arq-redis",
            "redis_connected": self._available,
        }

    async def cleanup_old_jobs(self, max_age_hours: int = 24):
        """Cleanup is handled by Redis TTL automatically."""
        return 0


# ═══════════════════════════════════════════════════════════════
# In-Process Asyncio Backend (fallback, development)
# ═══════════════════════════════════════════════════════════════

class AsyncJobQueue:
    """In-process async job queue with retry support (development fallback)."""

    def __init__(self, max_workers: int = 5):
        self._handlers: Dict[str, JobHandler] = {}
        self._jobs: Dict[str, Job] = {}
        self._queue: asyncio.Queue = asyncio.Queue()
        self._workers: List[asyncio.Task] = []
        self._max_workers = max_workers
        self._running = False
        self._stats = {
            "total_enqueued": 0,
            "total_completed": 0,
            "total_failed": 0,
            "total_retried": 0,
        }

    def reset_for_new_event_loop(self) -> None:
        """
        pytest-asyncio puede usar un event loop distinto por test; ``asyncio.Queue``
        queda ligada al loop donde se creó. Recrear cola y estado antes de ``start()``.
        """
        self._queue = asyncio.Queue()
        self._jobs.clear()
        self._workers.clear()
        self._running = False
        self._stats = {
            "total_enqueued": 0,
            "total_completed": 0,
            "total_failed": 0,
            "total_retried": 0,
        }

    def register_handler(self, job_type: str, handler: JobHandler):
        self._handlers[job_type] = handler
        logger.info(f"Registered job handler: {job_type}")

    async def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        priority: str = "normal",
        max_retries: int = 3,
        retry_delay: int = 60,
    ) -> str:
        validate_job_payload(job_type, payload)
        job = Job(job_type=job_type, payload=payload, priority=priority,
                  max_retries=max_retries, retry_delay=retry_delay)
        self._jobs[job.id] = job
        await self._queue.put(job)
        self._stats["total_enqueued"] += 1
        logger.info(f"Job enqueued: {job.id} type={job_type} priority={priority}")
        return job.id

    async def get_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self._jobs.get(job_id)
        if not job:
            return None
        return job.to_dict()

    async def start(self):
        if self._running:
            return
        self._running = True
        for i in range(self._max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self._workers.append(worker)
        logger.info(f"In-process job queue started with {self._max_workers} workers")

    async def stop(self):
        self._running = False
        for worker in self._workers:
            worker.cancel()
        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        logger.info("In-process job queue stopped")

    async def _worker(self, name: str):
        while self._running:
            try:
                try:
                    job = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                await self._process_job(job, name)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {name} error: {e}")
                await asyncio.sleep(1)

    async def _process_job(self, job: Job, worker_name: str):
        handler = self._handlers.get(job.job_type)
        if not handler:
            job.status = JobStatus.FAILED
            job.error = f"No handler registered for job type: {job.job_type}"
            self._stats["total_failed"] += 1
            record_job_outcome(
                job_type=job.job_type,
                terminal="no_handler",
                job_id=job.id,
                error=job.error,
            )
            return

        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc).isoformat()
        job.attempts += 1

        try:
            result = await handler(job.payload)
            job.status = JobStatus.COMPLETED
            job.result = result
            job.completed_at = datetime.now(timezone.utc).isoformat()
            self._stats["total_completed"] += 1
            record_job_outcome(job_type=job.job_type, terminal="completed", job_id=job.id)
        except Exception as e:
            if job.attempts < job.max_retries:
                job.status = JobStatus.RETRYING
                job.error = str(e)
                delay = min(job.retry_delay * (2 ** (job.attempts - 1)), 300)
                self._stats["total_retried"] += 1
                await asyncio.sleep(delay)
                await self._queue.put(job)
            else:
                job.status = JobStatus.FAILED
                job.error = str(e)
                job.completed_at = datetime.now(timezone.utc).isoformat()
                self._stats["total_failed"] += 1
                record_job_outcome(
                    job_type=job.job_type,
                    terminal="failed",
                    job_id=job.id,
                    error=str(e),
                )

    def get_stats(self) -> Dict[str, Any]:
        return {
            **self._stats,
            "queue_size": self._queue.qsize(),
            "active_workers": len([w for w in self._workers if not w.done()]),
            "max_workers": self._max_workers,
            "registered_handlers": list(self._handlers.keys()),
            "contracted_job_types": sorted(CONTRACT_JOB_TYPES),
            "backend": "in-process-asyncio",
        }

    async def cleanup_old_jobs(self, max_age_hours: int = 24):
        cutoff = time.time() - (max_age_hours * 3600)
        removed = 0
        for job_id in list(self._jobs.keys()):
            job = self._jobs[job_id]
            if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
                if job.completed_at:
                    completed_time = datetime.fromisoformat(job.completed_at).timestamp()
                    if completed_time < cutoff:
                        del self._jobs[job_id]
                        removed += 1
        return removed


# ═══════════════════════════════════════════════════════════════
# Factory: Auto-select backend based on REDIS_URL
# ═══════════════════════════════════════════════════════════════

def _create_job_queue():
    """Create the appropriate job queue backend."""
    # Tests (pytest): always in-process so workers share the same asyncio loop as ASGITransport.
    if os.environ.get("ENVIRONMENT", "").strip().lower() in ("test", "testing"):
        logger.info("Job queue: test environment → in-process asyncio backend")
        return AsyncJobQueue(max_workers=5)

    redis_url = os.environ.get("REDIS_URL", "")
    if redis_url:
        logger.info("Job queue: Using ARQ with Redis broker")
        return ARQJobQueue()
    else:
        logger.info("Job queue: Using in-process asyncio (set REDIS_URL for production)")
        return AsyncJobQueue(max_workers=5)


# Singleton — auto-selects backend at import time
job_queue = _create_job_queue()
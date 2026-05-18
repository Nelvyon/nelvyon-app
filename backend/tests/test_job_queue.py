"""
Job queue tests — verify async job processing works correctly.
"""
import asyncio

import pytest
import pytest_asyncio

from core.job_queue import AsyncJobQueue, JobStatus


@pytest_asyncio.fixture
async def queue():
    """Create a fresh job queue for each test."""
    q = AsyncJobQueue(max_workers=2)

    # Register test handlers
    async def echo_handler(payload):
        return f"echo: {payload.get('message', '')}"

    async def failing_handler(payload):
        raise ValueError("Intentional failure")

    q.register_handler("echo", echo_handler)
    q.register_handler("fail", failing_handler)

    await q.start()
    yield q
    await q.stop()


@pytest.mark.asyncio
async def test_enqueue_and_process(queue: AsyncJobQueue):
    """Test basic job enqueue and processing."""
    job_id = await queue.enqueue(
        job_type="echo",
        payload={"message": "hello"},
    )
    assert job_id is not None

    # Wait for processing
    await asyncio.sleep(0.5)

    status = await queue.get_status(job_id)
    assert status is not None
    assert status["status"] == JobStatus.COMPLETED
    assert status["result"] == "echo: hello"


@pytest.mark.asyncio
async def test_job_failure_and_retry(queue: AsyncJobQueue):
    """Test job failure triggers retry."""
    job_id = await queue.enqueue(
        job_type="fail",
        payload={},
        max_retries=2,
        retry_delay=0,  # No delay for testing
    )

    # Wait for retries
    await asyncio.sleep(2)

    status = await queue.get_status(job_id)
    assert status is not None
    assert status["status"] == JobStatus.FAILED
    assert status["attempts"] == 2
    assert "Intentional failure" in status["error"]


@pytest.mark.asyncio
async def test_unknown_job_type(queue: AsyncJobQueue):
    """Test enqueuing unknown job type."""
    job_id = await queue.enqueue(
        job_type="unknown",
        payload={},
    )

    await asyncio.sleep(0.5)

    status = await queue.get_status(job_id)
    assert status["status"] == JobStatus.FAILED
    assert "No handler" in status["error"]


@pytest.mark.asyncio
async def test_queue_stats(queue: AsyncJobQueue):
    """Test queue statistics."""
    await queue.enqueue(job_type="echo", payload={"message": "test1"})
    await queue.enqueue(job_type="echo", payload={"message": "test2"})

    await asyncio.sleep(1)

    stats = queue.get_stats()
    assert stats["total_enqueued"] >= 2
    assert stats["total_completed"] >= 2
    assert "echo" in stats["registered_handlers"]
    assert stats["backend"] == "in-process-asyncio"
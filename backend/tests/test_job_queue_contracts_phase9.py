import pytest

from core.job_queue import job_queue


@pytest.mark.asyncio
async def test_email_job_contract_rejects_missing_to():
    with pytest.raises(ValueError):
        await job_queue.enqueue(
            "email",
            {
                "workspace_id": 1,
                "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
                "subject": "Hi",
                "body": "Body",
            },
        )


@pytest.mark.asyncio
async def test_report_job_contract_rejects_missing_workspace():
    with pytest.raises(ValueError):
        await job_queue.enqueue(
            "report",
            {"report_type": "daily", "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001"},
        )


@pytest.mark.asyncio
async def test_webhook_job_contract_accepts_valid_payload():
    jid = await job_queue.enqueue(
        "webhook",
        {
            "workspace_id": 1,
            "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            "url": "https://example.com",
            "method": "GET",
            "payload": {},
        },
        max_retries=0,
        retry_delay=0,
    )
    assert isinstance(jid, str) and jid


@pytest.mark.asyncio
async def test_cleanup_job_contract_rejects_invalid_days():
    with pytest.raises(ValueError):
        await job_queue.enqueue(
            "cleanup",
            {
                "target": "saas_job_audits",
                "older_than_days": 0,
                "workspace_id": 1,
                "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            },
        )


@pytest.mark.asyncio
async def test_cleanup_job_contract_rejects_unknown_target():
    with pytest.raises(ValueError):
        await job_queue.enqueue(
            "cleanup",
            {
                "target": "temp_files",
                "older_than_days": 7,
                "workspace_id": 1,
                "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            },
        )


@pytest.mark.asyncio
async def test_non_contracted_job_type_still_works():
    jid = await job_queue.enqueue("echo", {"hello": "world"}, max_retries=0, retry_delay=0)
    assert isinstance(jid, str) and jid

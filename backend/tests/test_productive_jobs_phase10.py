"""Fase 10 — jobs contratados: enqueue → handler → auditoría / métricas."""
import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.job_observability import reset_job_counters_for_tests, snapshot_job_counters
from core.job_queue import JobStatus, job_queue


@pytest.mark.asyncio
async def test_contract_jobs_e2e_audit_and_counters(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    reset_job_counters_for_tests()
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})

    wid = int(auth_headers["X-Workspace-Id"])
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    base = {"workspace_id": wid, "actor_user_id": uid}

    async def _wait(job_id: str) -> dict:
        for _ in range(50):
            await asyncio.sleep(0.1)
            st = await job_queue.get_status(job_id)
            if st and st.get("status") in (
                JobStatus.COMPLETED,
                "completed",
                JobStatus.FAILED,
                "failed",
            ):
                return st
        return await job_queue.get_status(job_id) or {}

    jid_mail = await job_queue.enqueue(
        "email",
        {**base, "to": "phase10@test.com", "subject": "Phase10", "body": "Hello"},
        max_retries=0,
        retry_delay=0,
    )
    st_mail = await _wait(jid_mail)
    assert st_mail.get("status") in (JobStatus.COMPLETED, "completed"), st_mail

    jid_rep = await job_queue.enqueue(
        "report",
        {**base, "report_type": "contacts_snapshot"},
        max_retries=0,
        retry_delay=0,
    )
    st_rep = await _wait(jid_rep)
    assert st_rep.get("status") in (JobStatus.COMPLETED, "completed"), st_rep

    jid_hook = await job_queue.enqueue(
        "webhook",
        {
            **base,
            "url": "https://example.com",
            "method": "GET",
            "payload": {},
        },
        max_retries=0,
        retry_delay=0,
    )
    st_hook = await _wait(jid_hook)
    assert st_hook.get("status") in (JobStatus.COMPLETED, "completed"), st_hook

    jid_clean = await job_queue.enqueue(
        "cleanup",
        {
            **base,
            "target": "saas_job_audits",
            "older_than_days": 3650,
        },
        max_retries=0,
        retry_delay=0,
    )
    st_clean = await _wait(jid_clean)
    assert st_clean.get("status") in (JobStatus.COMPLETED, "completed"), st_clean

    row = (
        await db_session.execute(
            text(
                """
                SELECT COUNT(*) AS c FROM security_events
                WHERE event_type IN ('saas.job.email', 'saas.job.report', 'saas.job.webhook', 'saas.job.cleanup_run')
                  AND status = 'ok'
                """
            )
        )
    ).mappings().first()
    assert row is not None and int(row["c"]) >= 4

    snap = snapshot_job_counters()
    assert any(k.endswith("|completed") for k in snap), snap

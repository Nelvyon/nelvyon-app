"""
NELVYON-REMEDIATION-1 Fase 5 — contracts workspace+OP, helpdesk_sla endurecido, job_queue handler real.
"""
import asyncio
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.job_queue import JobStatus
from core.nelvyon_job_handlers import JOB_TYPE_NELVYON_WORKSPACE_AUDIT


@pytest.mark.asyncio
async def test_contracts_member_cannot_create(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/contracts",
        headers=member_headers,
        json={"title": "Blocked", "status": "draft"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_contracts_operator_create_ok(client: AsyncClient, auth_headers: dict):
    suffix = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/contracts",
        headers=auth_headers,
        json={"title": f"Phase5-{suffix}", "status": "draft"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body.get("workspace_id") == int(auth_headers["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_nelvyon_workspace_audit_job_ok(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})

    from core.job_queue import job_queue

    job_id = await job_queue.enqueue(
        JOB_TYPE_NELVYON_WORKSPACE_AUDIT,
        payload={
            "workspace_id": int(auth_headers["X-Workspace-Id"]),
            "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            "action": "phase5_pytest_audit",
            "correlation_id": "pytest-phase5-ok",
        },
    )
    for _ in range(30):
        await asyncio.sleep(0.1)
        st = await job_queue.get_status(job_id)
        if st and st.get("status") in (JobStatus.COMPLETED, "completed"):
            break
    st = await job_queue.get_status(job_id)
    assert st is not None
    assert st.get("status") in (JobStatus.COMPLETED, "completed"), st

    row = (
        await db_session.execute(
            text(
                """
                SELECT event_type, status
                FROM security_events
                WHERE event_type = 'saas.job.nelvyon_workspace_audit' AND status = 'ok'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        )
    ).mappings().first()
    assert row is not None


@pytest.mark.asyncio
async def test_nelvyon_workspace_audit_job_rejects_non_member_payload(
    client: AsyncClient, auth_headers: dict
):
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})

    from core.job_queue import job_queue

    job_id = await job_queue.enqueue(
        JOB_TYPE_NELVYON_WORKSPACE_AUDIT,
        payload={
            "workspace_id": int(auth_headers["X-Workspace-Id"]),
            "actor_user_id": "totally-unknown-user-not-in-ws",
            "action": "phase5_pytest_audit_bad",
        },
        max_retries=0,
        retry_delay=0,
    )
    for _ in range(30):
        await asyncio.sleep(0.1)
        st = await job_queue.get_status(job_id)
        if st and st.get("status") in (JobStatus.FAILED, "failed"):
            break
    st = await job_queue.get_status(job_id)
    assert st is not None
    assert st.get("status") in (JobStatus.FAILED, "failed"), st
    assert "member" in (st.get("error") or "").lower() or "actor" in (st.get("error") or "").lower()

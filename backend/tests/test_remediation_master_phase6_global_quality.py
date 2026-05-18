"""
NELVYON-REMEDIATION-1 Fase 6 — segundo job de negocio (CRM snapshot), contadores jobs,
smoke mínimo legacy + nelvyon OS endurecidos.
"""
import asyncio
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.job_observability import reset_job_counters_for_tests, snapshot_job_counters
from core.job_queue import JobStatus
from core.nelvyon_job_handlers import (
    JOB_TYPE_NELVYON_WORKSPACE_AUDIT,
    JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT,
)


@pytest.fixture(autouse=True)
def _reset_job_counters():
    reset_job_counters_for_tests()
    yield
    reset_job_counters_for_tests()


@pytest.mark.asyncio
async def test_nelvyon_workspace_crm_snapshot_job_ok(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})

    from core.job_queue import job_queue

    job_id = await job_queue.enqueue(
        JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT,
        payload={
            "workspace_id": int(auth_headers["X-Workspace-Id"]),
            "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            "action": "phase6_pytest_crm_snapshot",
            "correlation_id": "pytest-phase6-crm-ok",
        },
    )
    for _ in range(40):
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
                WHERE event_type = 'saas.job.workspace_crm_snapshot' AND status = 'ok'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        )
    ).mappings().first()
    assert row is not None

    counters = snapshot_job_counters()
    assert counters.get(f"{JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT}|completed", 0) >= 1


@pytest.mark.asyncio
async def test_nelvyon_workspace_crm_snapshot_job_rejects_non_member(
    client: AsyncClient, auth_headers: dict
):
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})

    from core.job_queue import job_queue

    job_id = await job_queue.enqueue(
        JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT,
        payload={
            "workspace_id": int(auth_headers["X-Workspace-Id"]),
            "actor_user_id": "unknown-user-not-member",
            "action": "phase6_pytest_crm_bad",
        },
        max_retries=0,
        retry_delay=0,
    )
    for _ in range(40):
        await asyncio.sleep(0.1)
        st = await job_queue.get_status(job_id)
        if st and st.get("status") in (JobStatus.FAILED, "failed"):
            break
    st = await job_queue.get_status(job_id)
    assert st is not None
    assert st.get("status") in (JobStatus.FAILED, "failed"), st

    counters = snapshot_job_counters()
    assert counters.get(f"{JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT}|failed", 0) >= 1


@pytest.mark.asyncio
async def test_job_observability_counts_audit_and_crm_jobs(
    client: AsyncClient, auth_headers: dict
):
    """Ejecuta ambos handlers registrados y comprueba contadores por tipo."""
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})

    from core.job_queue import job_queue

    jid_audit = await job_queue.enqueue(
        JOB_TYPE_NELVYON_WORKSPACE_AUDIT,
        payload={
            "workspace_id": int(auth_headers["X-Workspace-Id"]),
            "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            "action": "phase6_pytest_audit_counters",
        },
    )
    jid_crm = await job_queue.enqueue(
        JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT,
        payload={
            "workspace_id": int(auth_headers["X-Workspace-Id"]),
            "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            "action": "phase6_pytest_crm_counters",
        },
    )
    for _ in range(50):
        await asyncio.sleep(0.1)
        sa = await job_queue.get_status(jid_audit)
        sc = await job_queue.get_status(jid_crm)
        if (
            sa
            and sc
            and sa.get("status") in (JobStatus.COMPLETED, "completed")
            and sc.get("status") in (JobStatus.COMPLETED, "completed")
        ):
            break

    c = snapshot_job_counters()
    assert c.get(f"{JOB_TYPE_NELVYON_WORKSPACE_AUDIT}|completed", 0) >= 1
    assert c.get(f"{JOB_TYPE_NELVYON_WORKSPACE_CRM_SNAPSHOT}|completed", 0) >= 1


@pytest.mark.asyncio
async def test_appointments_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/entities/appointments?limit=5")
    assert r.status_code in (400, 401, 403, 422)
    r2 = await client.get("/api/v1/entities/appointments?limit=5", headers=auth_headers)
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_nelvyon_projects_list_requires_workspace(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/entities/nelvyon_projects?limit=5")
    assert r.status_code in (400, 401, 403, 422)
    r2 = await client.get("/api/v1/entities/nelvyon_projects?limit=5", headers=auth_headers)
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_nelvyon_outputs_operator_create_chained_from_project(
    client: AsyncClient, auth_headers: dict
):
    suffix = uuid.uuid4().hex[:8]
    pr = await client.post(
        "/api/v1/entities/nelvyon_projects",
        headers=auth_headers,
        json={
            "client_id": 1,
            "name": f"phase6-prj-{suffix}",
            "project_type": "campaign",
            "status": "active",
        },
    )
    assert pr.status_code == 201, pr.text
    project_id = pr.json()["id"]

    r = await client.post(
        "/api/v1/entities/nelvyon_outputs",
        headers=auth_headers,
        json={
            "project_id": project_id,
            "output_type": "document",
            "title": f"phase6-out-{suffix}",
            "qa_status": "pending",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body.get("workspace_id") == int(auth_headers["X-Workspace-Id"])

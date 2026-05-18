import asyncio

import pytest
from httpx import AsyncClient

from core.job_queue import JobStatus
from core.nelvyon_job_handlers import JOB_TYPE_NELVYON_WORKSPACE_AUDIT


@pytest.mark.asyncio
async def test_metrics_endpoint_exposes_http_and_job_counters(client: AsyncClient, auth_headers: dict):
    await client.get("/api/v1/entities/contracts", headers=auth_headers, params={"limit": 1})

    from core.job_queue import job_queue

    jid = await job_queue.enqueue(
        JOB_TYPE_NELVYON_WORKSPACE_AUDIT,
        payload={
            "workspace_id": int(auth_headers["X-Workspace-Id"]),
            "actor_user_id": "test-user-00000000-0000-0000-0000-000000000001",
            "action": "phase9_metrics_probe",
        },
    )
    for _ in range(40):
        await asyncio.sleep(0.1)
        st = await job_queue.get_status(jid)
        if st and st.get("status") in (JobStatus.COMPLETED, "completed"):
            break

    r = await client.get("/metrics")
    assert r.status_code == 200
    assert "text/plain" in (r.headers.get("content-type") or "")
    body = r.text
    assert "# HELP http_requests_total" in body
    assert "http_requests_total{" in body
    assert "# HELP job_outcomes_total" in body
    assert "job_outcomes_total{" in body

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from core.http_observability import record_http_request, reset_http_counters_for_tests


@pytest.mark.asyncio
async def test_os_global_snapshot_and_risk_queue(client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
    reset_http_counters_for_tests()
    record_http_request("GET", "/api/v1/demo", 200, 0.120, request_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    record_http_request("GET", "/api/v1/demo", 500, 0.520, request_id="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")

    await db_session.execute(
        text(
            """
            INSERT INTO automation_jobs
            (user_id, workspace_id, job_type, status, error_message, created_at)
            VALUES
            ('admin-user-00000000-0000-0000-0000-000000000001', 2, 'email', 'failed', 'smtp timeout', :now),
            ('admin-user-00000000-0000-0000-0000-000000000001', 2, 'webhook', 'failed', 'provider timeout', :now)
            """
        ),
        {"now": datetime.now(timezone.utc).isoformat()},
    )
    await db_session.commit()

    snap = await client.get("/api/v1/os/global", headers=admin_headers)
    assert snap.status_code == 200, snap.text
    body = snap.json()
    assert body["window"] == "24h"
    assert "five_xx_rate" in body
    assert "top_risky_workspaces" in body

    rq = await client.get("/api/v1/os/global/risk-queue", headers=admin_headers)
    assert rq.status_code == 200, rq.text
    queue = rq.json()
    assert isinstance(queue, list)


@pytest.mark.asyncio
async def test_os_global_change_journal_reads_activation_logs(client: AsyncClient, admin_headers: dict):
    toggle = await client.post(
        "/api/v1/tenant/branding-v2/activation",
        json={"enabled": True, "note": "journal seed"},
        headers=admin_headers,
    )
    assert toggle.status_code in (200, 400), toggle.text

    j = await client.get("/api/v1/os/global/change-journal", headers=admin_headers)
    assert j.status_code == 200, j.text
    items = j.json()
    assert isinstance(items, list)

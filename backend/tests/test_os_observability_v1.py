from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.http_observability import record_http_request, reset_http_counters_for_tests
from models.automation_jobs import Automation_jobs


@pytest.mark.asyncio
async def test_os_observability_health_snapshot(client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
    reset_http_counters_for_tests()
    record_http_request("GET", "/api/v1/demo", 200, 0.120, request_id="11111111-1111-4111-8111-111111111111")
    record_http_request("GET", "/api/v1/demo", 500, 0.450, request_id="22222222-2222-4222-8222-222222222222")

    db_session.add(
        Automation_jobs(
            user_id="admin-user-00000000-0000-0000-0000-000000000001",
            workspace_id=2,
            job_type="email",
            status="failed",
            error_message="smtp timeout",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
    )
    await db_session.commit()

    r = await client.get("/api/v1/os/observability", headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["window"] == "24h"
    assert "five_xx_rate" in body
    assert "latency_p95_ms" in body
    assert "failed_jobs" in body
    assert "queue_backlog" in body
    assert body["status"] in ("ok", "warn", "crit")


@pytest.mark.asyncio
async def test_os_observability_incidents_and_alerts(client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
    reset_http_counters_for_tests()
    record_http_request("POST", "/api/v1/orders", 502, 0.200, request_id="33333333-3333-4333-8333-333333333333")
    record_http_request("POST", "/api/v1/orders", 503, 0.300, request_id="44444444-4444-4444-8444-444444444444")

    db_session.add(
        Automation_jobs(
            user_id="admin-user-00000000-0000-0000-0000-000000000001",
            workspace_id=2,
            job_type="webhook",
            status="failed",
            error_message="downstream timeout",
            created_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        )
    )
    await db_session.commit()

    inc = await client.get("/api/v1/os/observability/incidents", headers=admin_headers)
    assert inc.status_code == 200, inc.text
    items = inc.json()
    assert isinstance(items, list)
    assert any(i["kind"] == "endpoint" for i in items)

    alerts = await client.get("/api/v1/os/observability/alerts", headers=admin_headers)
    assert alerts.status_code == 200, alerts.text
    data = alerts.json()
    assert data["window"] == "24h"
    assert "no external pager" in data["note"].lower()
    assert len(data["rules"]) == 3

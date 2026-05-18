from sqlalchemy import text
import pytest


async def _set_active_subscription(db_session, *, workspace_id: int, plan_id: str) -> None:
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions (user_id, workspace_id, plan_id, billing_cycle, status)
            VALUES (:user_id, :workspace_id, :plan_id, :billing_cycle, :status)
            """
        ),
        {
            "user_id": "test-user-00000000-0000-0000-0000-000000000001",
            "workspace_id": workspace_id,
            "plan_id": plan_id,
            "billing_cycle": "monthly",
            "status": "active",
        },
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_advisor_entitlements_reports_usage_defaults(client, auth_headers):
    response = await client.get("/api/v1/advisor/entitlements", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["tier"] in {"basic", "growth", "executive"}
    assert payload["used_sessions_this_month"] == 0
    assert payload["remaining_sessions_this_month"] == payload["sessions_per_month"]
    assert payload["limit_reached"] is False


@pytest.mark.asyncio
async def test_advisor_session_consume_enforces_monthly_limit(client, auth_headers, db_session):
    await _set_active_subscription(db_session, workspace_id=1, plan_id="starter")

    ent = await client.get("/api/v1/advisor/entitlements", headers=auth_headers)
    assert ent.status_code == 200
    start = ent.json()
    assert start["sessions_per_month"] == 6

    for _ in range(6):
        consumed = await client.post("/api/v1/advisor/sessions/consume", headers=auth_headers)
        assert consumed.status_code == 200
        assert consumed.json()["consumed"] is True

    blocked = await client.post("/api/v1/advisor/sessions/consume", headers=auth_headers)
    assert blocked.status_code == 200
    blocked_payload = blocked.json()
    assert blocked_payload["consumed"] is False
    assert blocked_payload["limit_reached"] is True
    assert blocked_payload["remaining_sessions_this_month"] == 0

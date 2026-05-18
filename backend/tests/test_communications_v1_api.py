import pytest


@pytest.mark.asyncio
async def test_communications_summary_returns_shape(client, auth_headers):
    response = await client.get("/api/v1/communications/v1/summary", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["period_utc_date"]
    assert "tickets_created_today" in payload
    assert "projects_created_today" in payload
    assert payload["email"]["total"] >= 0
    assert isinstance(payload["recent_email_events"], list)
    assert "scope_note" in payload


@pytest.mark.asyncio
async def test_signup_confirmation_flow_queues_or_sends(client, auth_headers):
    response = await client.post("/api/v1/communications/v1/flows/signup-confirmation", headers=auth_headers, json={})
    assert response.status_code == 200
    body = response.json()
    assert body["to"]
    assert body["status"] in {"sent", "no_api_key", "failed", "validation_error"}

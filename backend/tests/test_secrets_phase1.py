"""
SECRETS-1 FASE 1
- no fugas de secretos en audit log
- no fugas de secretos en respuestas de error
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_secrets_not_exposed_in_audit_or_logs_for_denied_contact_create(
    client: AsyncClient,
    member_headers: dict,
    db_session: AsyncSession,
    caplog,
):
    secret_password = "pw_super_secret_123456"
    secret_cookie = "cookie_secret_abcdef123456"
    secret_api_key = "sk_live_secret_9876543210"
    auth_header = member_headers.get("Authorization", "")

    caplog.clear()
    r = await client.post(
        "/api/v1/entities/contacts",
        headers={**member_headers, "Cookie": f"nelvyon_session={secret_cookie}"},
        json={
            "first_name": "Secret",
            "last_name": "Leak",
            "email": "secret-audit@nelvyon.local",
            "password": secret_password,
            "api_key": secret_api_key,
            "token": "jwt_secret_token_123456",
        },
    )
    assert r.status_code == 403

    row = (
        await db_session.execute(
            text(
                """
                SELECT details_json
                FROM security_events
                WHERE event_type = 'saas.rbac.denied' AND status = 'denied'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        )
    ).mappings().first()
    assert row is not None

    details_raw = (row["details_json"] or "").lower()
    assert "authorization" not in details_raw
    assert "password" not in details_raw
    assert "token" not in details_raw
    assert "nelvyon_session" not in details_raw
    assert secret_password.lower() not in details_raw
    assert secret_cookie.lower() not in details_raw
    assert secret_api_key.lower() not in details_raw
    assert auth_header.lower() not in details_raw

    logs_raw = caplog.text.lower()
    assert secret_password.lower() not in logs_raw
    assert secret_cookie.lower() not in logs_raw
    assert secret_api_key.lower() not in logs_raw
    assert auth_header.lower() not in logs_raw


@pytest.mark.asyncio
async def test_error_response_sanitizes_token_from_exception(
    client: AsyncClient,
    auth_headers: dict,
    monkeypatch,
    caplog,
):
    secret_token = "jwt_secret_phase1_token_ABCDEF9876543210"

    from services.campaign_sender import CampaignSenderService

    async def _raise_secret_error(self, campaign_id, user_id, workspace_id, segment_filters=None):
        raise ValueError(f"Invalid bearer token: {secret_token}")

    monkeypatch.setattr(CampaignSenderService, "send_campaign", _raise_secret_error)

    caplog.clear()
    r = await client.post(
        "/api/v1/campaign-sender/send",
        headers=auth_headers,
        json={"campaign_id": 123},
    )
    assert r.status_code == 400
    payload = r.json()
    detail = str(payload.get("detail", ""))
    assert secret_token not in detail
    assert "redacted" in detail.lower()

    assert secret_token.lower() not in caplog.text.lower()

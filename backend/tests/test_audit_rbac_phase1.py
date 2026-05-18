"""
AUDIT-RBAC-1 FASE 1
- evento ok en acción sensible permitida
- evento denied centralizado por RBAC
- sin secretos en details_json
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_audit_ok_for_contacts_create(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    r = await client.post(
        "/api/v1/entities/contacts",
        headers=auth_headers,
        json={
            "first_name": "Audit",
            "last_name": "OK",
            "email": "audit-ok@nelvyon.local",
        },
    )
    assert r.status_code in (200, 201), r.text

    row = (
        await db_session.execute(
            text(
                """
                SELECT event_type, status, details_json
                FROM security_events
                WHERE event_type = 'saas.contact.create' AND status = 'ok'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        )
    ).mappings().first()
    assert row is not None
    assert row["event_type"] == "saas.contact.create"
    assert row["status"] == "ok"


@pytest.mark.asyncio
async def test_audit_denied_and_no_secrets(
    client: AsyncClient, member_headers: dict, db_session: AsyncSession
):
    r = await client.post(
        "/api/v1/entities/contacts",
        headers=member_headers,
        json={
            "first_name": "Denied",
            "last_name": "RBAC",
            "email": "audit-denied@nelvyon.local",
            "password": "do-not-log",  # campo inesperado; no debe acabar en audit
        },
    )
    assert r.status_code == 403

    row = (
        await db_session.execute(
            text(
                """
                SELECT event_type, status, details_json
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
    assert "token" not in details_raw
    assert "password" not in details_raw
    assert "nelvyon_session" not in details_raw

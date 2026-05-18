"""
BLOCK REGRESSION-ABCD-1 — Smoke HTTP mínimo A/B/C/D.

Congela los contratos que rompieron en staging (C1.2–C1.4, B1.2) y un
toque superficial de lectura en A/D/B listados, sin duplicar suites grandes.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.smoke_abcd
@pytest.mark.asyncio
async def test_regression_abcd_c1_entities_conversation_message_stream_token(
    client: AsyncClient, auth_headers: dict
):
    """
    Mismo contrato que S-ABCD-3 (C1): entities/conversations + entities/messages
    + stream-token (no SSE completo para mantener el smoke estable y rápido).
    """
    h = dict(auth_headers)

    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=h,
        json={
            "subject": f"REG-ABCD-C1-{uuid4().hex[:8]}",
            "channel": "chat",
            "status": "open",
            "last_message": "hola",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    conv_id = conv.json()["id"]
    assert conv_id

    msg = await client.post(
        "/api/v1/entities/messages",
        headers=h,
        json={
            "conversation_id": conv_id,
            "sender_type": "agent",
            "sender_name": "QA",
            "content": "mensaje smoke REG-ABCD-1",
            "channel": "chat",
        },
    )
    assert msg.status_code in (200, 201), msg.text

    tok = await client.post(
        f"/api/v1/conversations/{conv_id}/stream-token",
        headers=h,
    )
    assert tok.status_code == 200, tok.text
    body = tok.json()
    assert "stream_token" in body
    assert int(body.get("expires_in_seconds", 0)) > 0


@pytest.mark.smoke_abcd
@pytest.mark.asyncio
async def test_regression_abcd_b1_entities_workflow_create(
    client: AsyncClient, auth_headers: dict
):
    """Contrato S-ABCD-3 (B1.2): POST /entities/workflows sin 500 por mapping ORM."""
    h = dict(auth_headers)
    r = await client.post(
        "/api/v1/entities/workflows",
        headers=h,
        json={
            "name": f"REG-ABCD-WF-{uuid4().hex[:8]}",
            "description": "wf",
            "trigger_type": "contact_created",
            "trigger_config": "{}",
            "actions": "[]",
            "status": "active",
        },
    )
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data.get("id")
    assert data.get("name", "").startswith("REG-ABCD-WF-")


@pytest.mark.smoke_abcd
@pytest.mark.asyncio
async def test_regression_abcd_a_d_b_surface_gets(client: AsyncClient, auth_headers: dict):
    """Lecturas mínimas A/D/B list (no sustituye test_crm / test_helpdesk_mvp)."""
    h = dict(auth_headers)

    me = await client.get("/api/v1/auth/me", headers=h)
    assert me.status_code == 200, me.text

    for path in (
        "/api/v1/entities/contacts?skip=0&limit=5",
        "/api/v1/entities/helpdesk_tickets?skip=0&limit=5",
        "/api/v1/entities/campaigns?skip=0&limit=5",
        "/api/v1/entities/workflows?skip=0&limit=5",
    ):
        r = await client.get(path, headers=h)
        assert r.status_code == 200, f"{path}: {r.text}"

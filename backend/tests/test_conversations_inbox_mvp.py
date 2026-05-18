"""
C1-4 — Inbox Fase 1 MVP acceptance.

Flujo oficial: entities/conversations -> realtime messages -> mark-read -> stream-token -> stream.
Incluye aislamiento A/B, errores mínimos y consistencia workspace_id en mensajes.
"""
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import create_access_token
from models.messages import Messages


@pytest.fixture
def auth_only_headers() -> dict:
    """Bearer auth sin X-Workspace-Id."""
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}"}


def _headers_ws(auth_headers: dict, workspace_id: int) -> dict:
    h = dict(auth_headers)
    h["X-Workspace-Id"] = str(workspace_id)
    return h


def _no_workspace(auth_headers: dict) -> dict:
    return {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}


@pytest.mark.asyncio
async def test_mvp_inbox_fase1_e2e_conversation_messages_mark_read_stream(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """
    E2E oficial Inbox Fase 1:
    crea conversación oficial, lista mensajes, envía mensaje, mark-read,
    obtiene stream-token y conecta stream autenticado.
    """
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))

    conv = await client.post(
        "/api/v1/entities/conversations",
        json={
            "channel": "web",
            "status": "active",
            "subject": f"MVP Inbox {suffix}",
            "last_message": "",
            "unread_count": 0,
        },
        headers=h_a,
    )
    assert conv.status_code in (200, 201), conv.text
    conv_id = conv.json()["id"]

    listed = await client.get(f"/api/v1/conversations/{conv_id}/messages", headers=h_a)
    assert listed.status_code == 200, listed.text
    assert listed.json()["conversation_id"] == conv_id

    sent = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "Hola desde agente", "sender_type": "agent", "sender_name": "QA"},
        headers=h_a,
    )
    assert sent.status_code == 200, sent.text
    sent_id = sent.json()["id"]

    mark = await client.post(f"/api/v1/conversations/{conv_id}/mark-read", headers=h_a)
    assert mark.status_code == 200, mark.text

    token_resp = await client.post(
        f"/api/v1/conversations/{conv_id}/stream-token",
        headers=h_a,
    )
    assert token_resp.status_code == 200, token_resp.text
    stream_token = token_resp.json()["stream_token"]
    assert token_resp.json()["expires_in_seconds"] > 0

    async with client.stream(
        "GET",
        f"/api/v1/conversations/{conv_id}/stream?stream_token={stream_token}",
    ) as stream_resp:
        assert stream_resp.status_code == 200, await stream_resp.aread()
        lines = stream_resp.aiter_lines()
        first = await anext(lines)
        second = await anext(lines)
        assert first.startswith("event: connected")
        assert "conversation_id" in second

    row = (
        await db_session.execute(select(Messages).where(Messages.id == sent_id))
    ).scalar_one()
    assert row.workspace_id == int(h_a["X-Workspace-Id"])


@pytest.mark.asyncio
async def test_mvp_inbox_fase1_tenant_isolation_ab_read_write_stream_token(
    client: AsyncClient, auth_headers: dict
):
    """Mismo usuario A/B: conversación A no visible, escribible ni streameable desde B."""
    suffix = uuid4().hex[:8]
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    no_ws = _no_workspace(auth_headers)

    ws_b_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-INBOX-{suffix}", "slug": f"qa-inbox-{suffix}"},
        headers=no_ws,
    )
    assert ws_b_resp.status_code == 201, ws_b_resp.text
    h_b = _headers_ws(auth_headers, ws_b_resp.json()["id"])

    conv = await client.post(
        "/api/v1/entities/conversations",
        json={
            "channel": "web",
            "status": "active",
            "subject": f"Inbox A {suffix}",
            "last_message": "",
            "unread_count": 0,
        },
        headers=h_a,
    )
    assert conv.status_code in (200, 201), conv.text
    conv_id = conv.json()["id"]

    a_send = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "A only", "sender_type": "agent"},
        headers=h_a,
    )
    assert a_send.status_code == 200, a_send.text

    b_get = await client.get(f"/api/v1/conversations/{conv_id}/messages", headers=h_b)
    assert b_get.status_code == 404, b_get.text

    b_send = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "B trying"},
        headers=h_b,
    )
    assert b_send.status_code == 404, b_send.text

    b_mark = await client.post(f"/api/v1/conversations/{conv_id}/mark-read", headers=h_b)
    assert b_mark.status_code == 404, b_mark.text

    b_stream_token = await client.post(
        f"/api/v1/conversations/{conv_id}/stream-token",
        headers=h_b,
    )
    assert b_stream_token.status_code == 404, b_stream_token.text


@pytest.mark.asyncio
async def test_mvp_inbox_fase1_error_surface_workspace_and_stream_auth(
    client: AsyncClient, auth_headers: dict, auth_only_headers: dict
):
    """
    Errores mínimos:
    - realtime sin X-Workspace-Id -> 400
    - /stream sin token -> 401
    - /stream token inválido/expirado -> 401
    """
    h_a = _headers_ws(auth_headers, int(auth_headers["X-Workspace-Id"]))
    suffix = uuid4().hex[:8]

    conv = await client.post(
        "/api/v1/entities/conversations",
        json={
            "channel": "web",
            "status": "active",
            "subject": f"Inbox errors {suffix}",
            "last_message": "",
            "unread_count": 0,
        },
        headers=h_a,
    )
    assert conv.status_code in (200, 201), conv.text
    conv_id = conv.json()["id"]

    no_ws_get = await client.get(
        f"/api/v1/conversations/{conv_id}/messages", headers=auth_only_headers
    )
    assert no_ws_get.status_code == 400
    no_ws_send = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "no ws"},
        headers=auth_only_headers,
    )
    assert no_ws_send.status_code == 400
    no_ws_mark = await client.post(
        f"/api/v1/conversations/{conv_id}/mark-read", headers=auth_only_headers
    )
    assert no_ws_mark.status_code == 400

    no_token = await client.get(f"/api/v1/conversations/{conv_id}/stream")
    assert no_token.status_code == 401, no_token.text

    invalid = await client.get(
        f"/api/v1/conversations/{conv_id}/stream?stream_token=invalid-token"
    )
    assert invalid.status_code == 401, invalid.text

    expired = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "type": "conversation_stream",
            "workspace_id": int(h_a["X-Workspace-Id"]),
            "conversation_id": conv_id,
        },
        expires_minutes=-1,
    )
    expired_resp = await client.get(
        f"/api/v1/conversations/{conv_id}/stream?stream_token={expired}"
    )
    assert expired_resp.status_code == 401, expired_resp.text

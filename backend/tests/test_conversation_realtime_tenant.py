"""
C1-1 — tenant hardening for conversation realtime endpoints.
"""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import create_access_token
from models.conversations import Conversations
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
async def test_conversation_realtime_requires_workspace_header(
    client: AsyncClient, auth_only_headers: dict
):
    conv_id = 999999

    r_get = await client.get(
        f"/api/v1/conversations/{conv_id}/messages", headers=auth_only_headers
    )
    assert r_get.status_code == 400

    r_post = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "hola desde sin ws"},
        headers=auth_only_headers,
    )
    assert r_post.status_code == 400

    r_mark = await client.post(
        f"/api/v1/conversations/{conv_id}/mark-read", headers=auth_only_headers
    )
    assert r_mark.status_code == 400


@pytest.mark.asyncio
async def test_conversation_realtime_does_not_allow_cross_workspace_read_or_write(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    suffix = uuid4().hex[:8]
    ws_a = int(auth_headers["X-Workspace-Id"])
    h_a = _headers_ws(auth_headers, ws_a)
    no_ws = _no_workspace(auth_headers)

    ws_b_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-CONV-{suffix}", "slug": f"qa-conv-{suffix}"},
        headers=no_ws,
    )
    assert ws_b_resp.status_code == 201, ws_b_resp.text
    ws_b = ws_b_resp.json()["id"]
    h_b = _headers_ws(auth_headers, ws_b)

    now = datetime.now(timezone.utc)
    conv_a = Conversations(
        user_id="test-user-00000000-0000-0000-0000-000000000001",
        workspace_id=ws_a,
        contact_name=f"Conv A {suffix}",
        channel="web",
        subject=f"Asunto {suffix}",
        last_message="hola A",
        last_message_at=now,
        status="active",
        unread_count=1,
        priority="normal",
        created_at=now,
    )
    db_session.add(conv_a)
    await db_session.commit()
    await db_session.refresh(conv_a)

    msg_a = Messages(
        user_id="test-user-00000000-0000-0000-0000-000000000001",
        workspace_id=ws_a,
        conversation_id=conv_a.id,
        sender_type="contact",
        sender_name="Cliente A",
        content="mensaje inicial",
        channel="web",
        status="received",
        created_at=now,
    )
    db_session.add(msg_a)
    await db_session.commit()

    get_a = await client.get(f"/api/v1/conversations/{conv_a.id}/messages", headers=h_a)
    assert get_a.status_code == 200, get_a.text
    assert get_a.json()["conversation_id"] == conv_a.id
    assert get_a.json()["total"] >= 1

    get_b = await client.get(f"/api/v1/conversations/{conv_a.id}/messages", headers=h_b)
    assert get_b.status_code == 404, get_b.text

    post_b = await client.post(
        f"/api/v1/conversations/{conv_a.id}/messages",
        json={"content": "intento cross workspace"},
        headers=h_b,
    )
    assert post_b.status_code == 404, post_b.text

    mark_b = await client.post(f"/api/v1/conversations/{conv_a.id}/mark-read", headers=h_b)
    assert mark_b.status_code == 404, mark_b.text


@pytest.mark.asyncio
async def test_conversation_stream_requires_short_lived_token_and_workspace_scope(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    suffix = uuid4().hex[:8]
    ws_a = int(auth_headers["X-Workspace-Id"])
    h_a = _headers_ws(auth_headers, ws_a)
    no_ws = _no_workspace(auth_headers)

    ws_b_resp = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"QA-STREAM-{suffix}", "slug": f"qa-stream-{suffix}"},
        headers=no_ws,
    )
    assert ws_b_resp.status_code == 201, ws_b_resp.text
    ws_b = ws_b_resp.json()["id"]
    h_b = _headers_ws(auth_headers, ws_b)

    now = datetime.now(timezone.utc)
    conv_a = Conversations(
        user_id="test-user-00000000-0000-0000-0000-000000000001",
        workspace_id=ws_a,
        contact_name=f"Stream A {suffix}",
        channel="web",
        subject=f"SSE {suffix}",
        status="active",
        unread_count=0,
        created_at=now,
        last_message_at=now,
    )
    db_session.add(conv_a)
    await db_session.commit()
    await db_session.refresh(conv_a)

    no_token = await client.get(f"/api/v1/conversations/{conv_a.id}/stream")
    assert no_token.status_code == 401, no_token.text

    token_a = await client.post(
        f"/api/v1/conversations/{conv_a.id}/stream-token",
        headers=h_a,
    )
    assert token_a.status_code == 200, token_a.text
    stream_token = token_a.json()["stream_token"]
    assert token_a.json()["expires_in_seconds"] > 0

    token_b = await client.post(
        f"/api/v1/conversations/{conv_a.id}/stream-token",
        headers=h_b,
    )
    assert token_b.status_code == 404, token_b.text

    async with client.stream(
        "GET",
        f"/api/v1/conversations/{conv_a.id}/stream?stream_token={stream_token}",
    ) as stream_resp:
        assert stream_resp.status_code == 200, await stream_resp.aread()
        lines = stream_resp.aiter_lines()
        first = await anext(lines)
        second = await anext(lines)
        assert first.startswith("event: connected")
        assert "conversation_id" in second

    bad = await client.get(
        f"/api/v1/conversations/{conv_a.id}/stream?stream_token=invalid-token"
    )
    assert bad.status_code == 401, bad.text


"""
NELVYON-REMEDIATION-FAST-1 — corredor inbox/helpdesk: mutaciones alineadas
(operator + módulo helpdesk + tenant) en messages, helpdesk_tickets create/batch,
conversation_realtime mark-read / send_message (módulo).
"""
import json
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def _restore_ws1_starter(db_session: AsyncSession) -> None:
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_messages_put_member_forbidden_operator(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-PUT-M-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]
    created = await client.post(
        "/api/v1/entities/messages",
        headers=auth_headers,
        json={
            "conversation_id": cid,
            "sender_type": "agent",
            "content": "base",
            "channel": "web",
        },
    )
    assert created.status_code in (200, 201), created.text
    mid = created.json()["id"]

    r = await client.put(
        f"/api/v1/entities/messages/{mid}",
        headers=member_headers,
        json={"content": "hacked"},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()

    await db_session.execute(text("DELETE FROM messages WHERE id = :i"), {"i": mid})
    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_messages_put_cross_workspace_not_found(
    client: AsyncClient, auth_headers: dict, admin_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-PUT-X-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]
    created = await client.post(
        "/api/v1/entities/messages",
        headers=auth_headers,
        json={"conversation_id": cid, "sender_type": "agent", "content": "x", "channel": "web"},
    )
    assert created.status_code in (200, 201), created.text
    mid = created.json()["id"]

    r = await client.put(
        f"/api/v1/entities/messages/{mid}",
        headers=admin_headers,
        json={"content": "wrong ws"},
    )
    assert r.status_code == 404

    await db_session.execute(text("DELETE FROM messages WHERE id = :i"), {"i": mid})
    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_messages_put_partner_plan_blocks_helpdesk(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-PUT-P-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]
    created = await client.post(
        "/api/v1/entities/messages",
        headers=auth_headers,
        json={"conversation_id": cid, "sender_type": "agent", "content": "pre", "channel": "web"},
    )
    assert created.status_code in (200, 201), created.text
    mid = created.json()["id"]

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions (
                user_id, workspace_id, plan_id, billing_cycle, status,
                created_at, updated_at
            ) VALUES (
                :uid, 1, 'partner', 'monthly', 'active',
                :now, :now
            )
            """
        ),
        {"uid": uid, "now": datetime.now(timezone.utc)},
    )
    await db_session.commit()

    r = await client.put(
        f"/api/v1/entities/messages/{mid}",
        headers=auth_headers,
        json={"content": "blocked"},
    )
    assert r.status_code == 403
    d = (r.json().get("detail") or "").lower()
    assert "helpdesk" in d or "mensajes" in d

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM messages WHERE id = :i"), {"i": mid})
    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_messages_put_delete_batch_happy_operator(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-BATCH-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]
    a = await client.post(
        "/api/v1/entities/messages",
        headers=auth_headers,
        json={"conversation_id": cid, "sender_type": "agent", "content": "a", "channel": "web"},
    )
    b = await client.post(
        "/api/v1/entities/messages",
        headers=auth_headers,
        json={"conversation_id": cid, "sender_type": "agent", "content": "b", "channel": "web"},
    )
    assert a.status_code in (200, 201) and b.status_code in (200, 201)
    id_a, id_b = a.json()["id"], b.json()["id"]

    bu = await client.put(
        "/api/v1/entities/messages/batch",
        headers=auth_headers,
        json={
            "items": [
                {"id": id_a, "updates": {"content": "A2"}},
                {"id": id_b, "updates": {"content": "B2"}},
            ]
        },
    )
    assert bu.status_code == 200, bu.text
    bodies = bu.json()
    assert len(bodies) == 2

    h_del = {**auth_headers, "Content-Type": "application/json"}
    bd = await client.request(
        "DELETE",
        "/api/v1/entities/messages/batch",
        headers=h_del,
        content=json.dumps({"ids": [id_a, id_b]}),
    )
    assert bd.status_code == 200, bd.text
    assert bd.json().get("deleted_count") == 2

    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_helpdesk_create_member_forbidden(
    client: AsyncClient, member_headers: dict
):
    r = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        headers=member_headers,
        json={"subject": "m", "description": "x", "status": "open"},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_fast1_helpdesk_create_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions (
                user_id, workspace_id, plan_id, billing_cycle, status,
                created_at, updated_at
            ) VALUES (
                :uid, 1, 'partner', 'monthly', 'active',
                :now, :now
            )
            """
        ),
        {"uid": uid, "now": datetime.now(timezone.utc)},
    )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        headers=auth_headers,
        json={"subject": f"H-P-{uuid4().hex[:8]}", "description": "d", "status": "open"},
    )
    assert r.status_code == 403
    assert "helpdesk" in (r.json().get("detail") or "").lower()

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_helpdesk_create_and_batch_happy_operator(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    one = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        headers=auth_headers,
        json={"subject": f"FAST1-H1-{suf}", "description": "d", "status": "open"},
    )
    assert one.status_code in (200, 201), one.text

    batch = await client.post(
        "/api/v1/entities/helpdesk_tickets/batch",
        headers=auth_headers,
        json={
            "items": [
                {"subject": f"FAST1-HB1-{suf}", "description": "a", "status": "open"},
                {"subject": f"FAST1-HB2-{suf}", "description": "b", "status": "open"},
            ]
        },
    )
    assert batch.status_code in (200, 201), batch.text
    assert len(batch.json()) == 2


@pytest.mark.asyncio
async def test_fast1_helpdesk_batch_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/helpdesk_tickets/batch",
        headers=member_headers,
        json={"items": [{"subject": "x", "description": "y", "status": "open"}]},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_fast1_conversation_mark_read_member_forbidden(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-MR-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 1,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]

    r = await client.post(f"/api/v1/conversations/{cid}/mark-read", headers=member_headers)
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()

    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_conversation_mark_read_send_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-RT-P-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 1,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions (
                user_id, workspace_id, plan_id, billing_cycle, status,
                created_at, updated_at
            ) VALUES (
                :uid, 1, 'partner', 'monthly', 'active',
                :now, :now
            )
            """
        ),
        {"uid": uid, "now": datetime.now(timezone.utc)},
    )
    await db_session.commit()

    mr = await client.post(f"/api/v1/conversations/{cid}/mark-read", headers=auth_headers)
    assert mr.status_code == 403

    sm = await client.post(
        f"/api/v1/conversations/{cid}/messages",
        headers=auth_headers,
        json={"content": "nope", "sender_type": "agent"},
    )
    assert sm.status_code == 403

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_conversation_mark_read_happy_operator(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-MR-OK-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 2,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]

    r = await client.post(f"/api/v1/conversations/{cid}/mark-read", headers=auth_headers)
    assert r.status_code == 200, r.text

    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_fast1_stream_token_not_operator_gate_member_not_403_operator(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    """
    Producto: POST stream-token sigue en require_workspace (no operator): no emite JWT
    de negocio persistente. El member no es dueño de la fila Conversations.user_id del
    owner → 404 scoped; lo relevante es que no sea 403 «operator».
    """
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"FAST1-TOK-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    cid = conv.json()["id"]

    tok = await client.post(f"/api/v1/conversations/{cid}/stream-token", headers=member_headers)
    assert tok.status_code != 403
    if tok.status_code == 404:
        assert "operator" not in (tok.json().get("detail") or "").lower()

    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()

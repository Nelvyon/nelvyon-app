"""
NELVYON-REMEDIATION-1 FASE 4 — segunda ola: merge CRM, deals (módulo CRM), mensajes masivos (helpdesk + workspace).
"""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import text


@pytest.mark.asyncio
async def test_merge_contacts_partner_plan_blocks(client: AsyncClient, auth_headers: dict, db_session):
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
        "/api/v1/crm/merge",
        headers=auth_headers,
        json={"primary_id": 1, "secondary_ids": [2]},
    )
    assert r.status_code == 403
    assert "contactos" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_merge_contacts_member_forbidden_operator(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/crm/merge",
        headers=member_headers,
        json={"primary_id": 1, "secondary_ids": [2]},
    )
    assert r.status_code == 403
    assert "operator" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_merge_contacts_cross_workspace_forbidden(client: AsyncClient, auth_headers: dict):
    bad = {**auth_headers, "X-Workspace-Id": "2"}
    r = await client.post(
        "/api/v1/crm/merge",
        headers=bad,
        json={"primary_id": 1, "secondary_ids": [2]},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_merge_contacts_happy_path(client: AsyncClient, admin_headers: dict, db_session):
    """Dos contactos mismo email en ws2 → merge OK."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.commit()

    admin_uid = "admin-user-00000000-0000-0000-0000-000000000001"
    now = datetime.now(timezone.utc)
    email = f"merge_happy_{uuid4().hex[:8]}@test.com"
    await db_session.execute(text("DELETE FROM contacts WHERE workspace_id = 2 AND email = :e"), {"e": email})
    await db_session.commit()

    await db_session.execute(
        text(
            """
            INSERT INTO contacts (
                user_id, workspace_id, first_name, email, created_at, updated_at
            ) VALUES
            (:u, 2, 'P1', :em, :now, :now),
            (:u, 2, 'P2', :em, :now, :now)
            """
        ),
        {"u": admin_uid, "em": email, "now": now},
    )
    await db_session.commit()

    r_ids = await db_session.execute(
        text("SELECT id FROM contacts WHERE workspace_id = 2 AND email = :e ORDER BY id"),
        {"e": email},
    )
    rows = r_ids.fetchall()
    assert len(rows) == 2
    pid, sid = rows[0][0], rows[1][0]

    r = await client.post(
        "/api/v1/crm/merge",
        headers=admin_headers,
        json={"primary_id": pid, "secondary_ids": [sid]},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("merged_contact_id") == pid

    await db_session.execute(text("DELETE FROM contacts WHERE id = :i"), {"i": pid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_deal_create_partner_plan_blocks(client: AsyncClient, admin_headers: dict, db_session):
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions (
                user_id, workspace_id, plan_id, billing_cycle, status,
                created_at, updated_at
            ) VALUES (
                'admin-user-00000000-0000-0000-0000-000000000001', 2, 'partner', 'monthly', 'active',
                :now, :now
            )
            """
        ),
        {"now": datetime.now(timezone.utc)},
    )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/deals",
        headers=admin_headers,
        json={"title": "Blocked deal", "stage": "lead"},
    )
    assert r.status_code == 403
    assert "contactos" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_deal_batch_partner_plan_blocks(client: AsyncClient, admin_headers: dict, db_session):
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions (
                user_id, workspace_id, plan_id, billing_cycle, status,
                created_at, updated_at
            ) VALUES (
                'admin-user-00000000-0000-0000-0000-000000000001', 2, 'partner', 'monthly', 'active',
                :now, :now
            )
            """
        ),
        {"now": datetime.now(timezone.utc)},
    )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/deals/batch",
        headers=admin_headers,
        json={"items": [{"title": "B1", "stage": "lead"}]},
    )
    assert r.status_code == 403

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_deal_create_member_forbidden_operator(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/deals",
        headers=member_headers,
        json={"title": "M", "stage": "lead"},
    )
    assert r.status_code == 403
    assert "operator" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_deal_create_cross_workspace_forbidden(client: AsyncClient, auth_headers: dict):
    bad = {**auth_headers, "X-Workspace-Id": "2"}
    r = await client.post(
        "/api/v1/entities/deals",
        headers=bad,
        json={"title": "X", "stage": "lead"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_deal_create_happy_starter(client: AsyncClient, admin_headers: dict, db_session):
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.commit()

    title = f"deal_ok_{uuid4().hex[:8]}"
    r = await client.post(
        "/api/v1/entities/deals",
        headers=admin_headers,
        json={"title": title, "stage": "lead"},
    )
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_messages_create_partner_helpdesk_blocks(
    client: AsyncClient, auth_headers: dict, db_session
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

    now = datetime.now(timezone.utc)
    suf = uuid4().hex[:8]
    await db_session.execute(
        text(
            """
            INSERT INTO conversations (
                user_id, workspace_id, contact_name, channel, subject, status, unread_count, created_at, last_message_at
            ) VALUES (
                :uid, 1, :cn, 'web', :sub, 'open', 0, :now, :now
            )
            """
        ),
        {"uid": uid, "cn": f"C {suf}", "sub": f"S {suf}", "now": now},
    )
    await db_session.commit()
    r_conv = await db_session.execute(
        text("SELECT id FROM conversations WHERE workspace_id = 1 AND subject = :s LIMIT 1"),
        {"s": f"S {suf}"},
    )
    cid = r_conv.fetchone()[0]

    r = await client.post(
        "/api/v1/entities/messages",
        headers=auth_headers,
        json={
            "conversation_id": cid,
            "sender_type": "agent",
            "sender_name": "T",
            "content": "blocked",
            "channel": "web",
        },
    )
    assert r.status_code == 403
    assert "helpdesk" in r.json().get("detail", "").lower() or "mensajes" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM messages WHERE conversation_id = :c"), {"c": cid})
    await db_session.execute(text("DELETE FROM conversations WHERE id = :c"), {"c": cid})
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_messages_create_member_forbidden_operator(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/messages",
        headers=member_headers,
        json={
            "conversation_id": 999999,
            "content": "x",
        },
    )
    assert r.status_code == 403
    assert "operator" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_messages_create_cross_workspace_forbidden(client: AsyncClient, auth_headers: dict):
    bad = {**auth_headers, "X-Workspace-Id": "2"}
    r = await client.post(
        "/api/v1/entities/messages",
        headers=bad,
        json={"conversation_id": 1, "content": "x"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_messages_create_happy_starter(client: AsyncClient, auth_headers: dict, db_session):
    """ws1 starter: conversación + mensaje."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()

    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"MSG-HAPPY-{suf}",
            "channel": "chat",
            "status": "open",
            "last_message": "hi",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    conv_id = conv.json()["id"]

    msg = await client.post(
        "/api/v1/entities/messages",
        headers=auth_headers,
        json={
            "conversation_id": conv_id,
            "sender_type": "agent",
            "sender_name": "QA",
            "content": "hello fase4",
            "channel": "chat",
        },
    )
    assert msg.status_code in (200, 201), msg.text

    mid = msg.json()["id"]
    await db_session.execute(text("DELETE FROM messages WHERE id = :i"), {"i": mid})
    await db_session.execute(text("DELETE FROM conversations WHERE id = :c"), {"c": conv_id})
    await db_session.commit()


@pytest.mark.asyncio
async def test_messages_batch_happy_starter(client: AsyncClient, admin_headers: dict, db_session):
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.commit()

    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=admin_headers,
        json={
            "subject": f"BAT-{suf}",
            "channel": "chat",
            "status": "open",
            "last_message": "x",
            "unread_count": 0,
        },
    )
    assert conv.status_code in (200, 201), conv.text
    conv_id = conv.json()["id"]

    r = await client.post(
        "/api/v1/entities/messages/batch",
        headers=admin_headers,
        json={
            "items": [
                {
                    "conversation_id": conv_id,
                    "content": "m1",
                    "channel": "chat",
                }
            ]
        },
    )
    assert r.status_code == 201, r.text
    mid = r.json()[0]["id"]
    await db_session.execute(text("DELETE FROM messages WHERE id = :i"), {"i": mid})
    await db_session.execute(text("DELETE FROM conversations WHERE id = :c"), {"c": conv_id})
    await db_session.commit()

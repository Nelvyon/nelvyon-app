"""
NELVYON roadmap Fase 2 — Integridad tenant + RBAC (inbox/helpdesk, activities, agent_actions).
"""
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
async def test_phase2_messages_get_requires_workspace_header(client: AsyncClient, auth_headers: dict):
    h = {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}
    r = await client.get("/api/v1/entities/messages", headers=h)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_phase2_messages_all_member_forbidden_operator(client: AsyncClient, member_headers: dict):
    r = await client.get("/api/v1/entities/messages/all", headers=member_headers)
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_phase2_helpdesk_put_delete_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    cr = await client.post(
        "/api/v1/entities/helpdesk_tickets",
        headers=auth_headers,
        json={"subject": f"P2-HD-{suf}", "description": "d", "status": "open"},
    )
    assert cr.status_code in (200, 201), cr.text
    tid = cr.json()["id"]

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

    pu = await client.put(
        f"/api/v1/entities/helpdesk_tickets/{tid}",
        headers=auth_headers,
        json={"status": "in_progress"},
    )
    assert pu.status_code == 403
    de = await client.delete(f"/api/v1/entities/helpdesk_tickets/{tid}", headers=auth_headers)
    assert de.status_code == 403

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()
    await client.delete(f"/api/v1/entities/helpdesk_tickets/{tid}", headers=auth_headers)


@pytest.mark.asyncio
async def test_phase2_conversations_post_partner_blocks(
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
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"P2-CV-{uuid4().hex[:8]}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 0,
        },
    )
    assert r.status_code == 403
    d = (r.json().get("detail") or "").lower()
    assert "helpdesk" in d or "mensajes" in d

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase2_activities_post_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/entities/activities",
        headers=member_headers,
        json={"type": "note", "title": "x"},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_phase2_activities_post_partner_blocks(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
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
        "/api/v1/entities/activities",
        headers=auth_headers,
        json={"type": "task", "title": "blocked"},
    )
    assert r.status_code == 403

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase2_activities_get_cross_workspace_404(
    client: AsyncClient, auth_headers: dict, admin_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    cr = await client.post(
        "/api/v1/entities/activities",
        headers=auth_headers,
        json={"type": "note", "title": f"P2-ACT-{suf}"},
    )
    assert cr.status_code in (200, 201), cr.text
    aid = cr.json()["id"]
    g = await client.get(f"/api/v1/entities/activities/{aid}", headers=admin_headers)
    assert g.status_code == 404
    await db_session.execute(text("DELETE FROM activities WHERE id = :i"), {"i": aid})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase2_activities_batch_happy_operator(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/activities/batch",
        headers=auth_headers,
        json={
            "items": [
                {"type": "note", "title": f"P2-B1-{suf}"},
                {"type": "note", "title": f"P2-B2-{suf}"},
            ]
        },
    )
    assert r.status_code == 201, r.text
    assert len(r.json()) == 2
    for row in r.json():
        await db_session.execute(text("DELETE FROM activities WHERE id = :i"), {"i": row["id"]})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase2_agent_actions_member_forbidden(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/agent-actions",
        headers=member_headers,
        json={"action": "create_contact", "params": {"first_name": "X", "email": "x@y.com"}},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_phase2_agent_create_contact_partner_blocks(
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
        "/api/v1/agent-actions",
        headers=auth_headers,
        json={
            "action": "create_contact",
            "params": {"first_name": "P2", "last_name": "A", "email": f"p2-{uuid4().hex[:8]}@t.com"},
        },
    )
    assert r.status_code == 403

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase2_stream_token_partner_blocks_helpdesk(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    conv = await client.post(
        "/api/v1/entities/conversations",
        headers=auth_headers,
        json={
            "subject": f"P2-TOK-{suf}",
            "channel": "web",
            "status": "active",
            "last_message": "",
            "unread_count": 0,
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

    tok = await client.post(f"/api/v1/conversations/{cid}/stream-token", headers=auth_headers)
    assert tok.status_code == 403

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()
    await db_session.execute(text("DELETE FROM conversations WHERE id = :i"), {"i": cid})
    await db_session.commit()

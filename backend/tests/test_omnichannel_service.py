"""Tests for OmnichannelService (Frente 52) — ingest, unread, mark-read on thread open."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from sqlalchemy import text

from services.omnichannel_service import OmnichannelService


@pytest.fixture(autouse=True)
def _skip_pg_tenant_context(monkeypatch):
    """SQLite tests have no set_tenant_context(); workspace_id is filtered in SQL."""
    monkeypatch.setattr(
        OmnichannelService,
        "_set_tenant",
        AsyncMock(),
    )


async def _bootstrap_omnichannel(session) -> None:
    """SQLite-friendly omnichannel tables for unit tests."""
    import services.omnichannel_service as omni_mod

    if omni_mod._SCHEMA_READY:
        return
    for ddl in (
        """
        CREATE TABLE IF NOT EXISTS omnichannel_conversations (
            id TEXT PRIMARY KEY,
            workspace_id INTEGER NOT NULL,
            contact_id TEXT,
            channel TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            subject TEXT,
            participant_name TEXT,
            participant_email TEXT,
            participant_phone TEXT,
            last_message TEXT,
            last_message_at TEXT,
            unread_count INTEGER NOT NULL DEFAULT 0,
            external_id TEXT,
            auto_reply_enabled INTEGER NOT NULL DEFAULT 0,
            last_inbound_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS omnichannel_messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            direction TEXT NOT NULL,
            content TEXT NOT NULL,
            channel TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ):
        await session.execute(text(ddl))
    await session.commit()
    omni_mod._SCHEMA_READY = True


@pytest.mark.asyncio
async def test_ingest_voice_creates_thread(db_session):
    await _bootstrap_omnichannel(db_session)
    svc = OmnichannelService(db_session, workspace_id=1)
    out = await svc.ingest_inbound(
        1,
        "voice",
        "Hola, llamo para consultar disponibilidad",
        participant_phone="+34600111222",
        external_id="CA_pytest_voice_01",
        metadata={"probe": True},
    )
    cid = str(out["conversation"]["id"])
    assert out["message"]["direction"] == "in"
    assert out["message"]["channel"] == "voice"
    inbox = await svc.get_unified_inbox(1)
    row = next(c for c in inbox["items"] if c["id"] == cid)
    assert int(row["unread_count"]) >= 1


@pytest.mark.asyncio
async def test_get_messages_clears_unread(db_session):
    """Loading the thread marks the conversation as read (badge / unread_count)."""
    await _bootstrap_omnichannel(db_session)
    svc = OmnichannelService(db_session, workspace_id=1)
    out = await svc.ingest_inbound(
        1,
        "sms",
        "Mensaje no leído",
        participant_phone="+34600999888",
        external_id=None,
    )
    cid = str(out["conversation"]["id"])
    inbox_before = await svc.get_unified_inbox(1)
    before = next(c for c in inbox_before["items"] if c["id"] == cid)
    assert int(before["unread_count"]) >= 1

    msgs = await svc.get_messages(cid, 1)
    assert len(msgs) >= 1

    inbox_after = await svc.get_unified_inbox(1)
    after = next(c for c in inbox_after["items"] if c["id"] == cid)
    assert int(after["unread_count"]) == 0


@pytest.mark.asyncio
async def test_suggest_reply_without_openai_returns_placeholder(db_session):
    await _bootstrap_omnichannel(db_session)
    svc = OmnichannelService(db_session, workspace_id=1)
    out = await svc.ingest_inbound(1, "chat", "Necesito ayuda con mi pedido", external_id="sess_py_1")
    cid = str(out["conversation"]["id"])
    suggestion = await svc.suggest_reply(cid, 1)
    assert "suggestion" in suggestion
    assert len(suggestion["suggestion"]) > 0

"""
C1-2 — messages.workspace_id consistency on create flows.
"""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.conversations import Conversations
from models.messages import Messages


@pytest.mark.asyncio
async def test_entities_messages_create_inherits_workspace_from_conversation(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    suffix = uuid4().hex[:8]
    ws_id = int(auth_headers["X-Workspace-Id"])
    now = datetime.now(timezone.utc)

    conv = Conversations(
        user_id="test-user-00000000-0000-0000-0000-000000000001",
        workspace_id=ws_id,
        contact_name=f"C1-2 {suffix}",
        channel="web",
        subject=f"Subject {suffix}",
        status="active",
        unread_count=0,
        created_at=now,
        last_message_at=now,
    )
    db_session.add(conv)
    await db_session.commit()
    await db_session.refresh(conv)

    created = await client.post(
        "/api/v1/entities/messages",
        json={
            "conversation_id": conv.id,
            "sender_type": "agent",
            "sender_name": "QA",
            "content": "workspace consistency",
            "channel": "web",
            "status": "sent",
        },
        headers=auth_headers,
    )
    assert created.status_code in (200, 201), created.text
    msg_id = created.json()["id"]

    row = (
        await db_session.execute(select(Messages).where(Messages.id == msg_id))
    ).scalar_one()
    assert row.workspace_id == conv.workspace_id

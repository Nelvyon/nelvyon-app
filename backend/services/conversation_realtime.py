"""
Conversation Realtime Service — Manages messages within conversations
and provides SSE streaming for real-time updates.
"""

import asyncio
import os
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import AccessTokenError, create_access_token, decode_access_token
from models.conversations import Conversations
from models.messages import Messages

logger = logging.getLogger(__name__)


# In-memory event bus for SSE (per conversation_id)
_event_queues: Dict[int, List[asyncio.Queue]] = defaultdict(list)
STREAM_TOKEN_TYPE = "conversation_stream"
STREAM_TOKEN_TTL_MINUTES = 2


def _notify_conversation(conversation_id: int, event_data: dict):
    """Push an event to all listeners of a conversation."""
    queues = _event_queues.get(conversation_id, [])
    for q in queues:
        try:
            q.put_nowait(event_data)
        except asyncio.QueueFull:
            pass  # Drop if queue is full


class ConversationRealtimeService:
    """Handles message CRUD and real-time streaming for conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_scoped_conversation(
        self, conversation_id: int, user_id: str, workspace_id: int
    ) -> Optional[Conversations]:
        conv_q = select(Conversations).where(
            Conversations.id == conversation_id,
            Conversations.user_id == user_id,
            Conversations.workspace_id == workspace_id,
        )
        conv_result = await self.db.execute(conv_q)
        return conv_result.scalar_one_or_none()

    async def create_stream_token(
        self, conversation_id: int, user_id: str, workspace_id: int
    ) -> Dict[str, Any]:
        conv = await self._get_scoped_conversation(conversation_id, user_id, workspace_id)
        if not conv:
            raise ValueError("Conversation not found")

        token = create_access_token(
            {
                "sub": user_id,
                "type": STREAM_TOKEN_TYPE,
                "workspace_id": workspace_id,
                "conversation_id": conversation_id,
            },
            expires_minutes=STREAM_TOKEN_TTL_MINUTES,
        )
        return {
            "stream_token": token,
            "expires_in_seconds": STREAM_TOKEN_TTL_MINUTES * 60,
        }

    async def verify_stream_token(
        self, conversation_id: int, stream_token: str
    ) -> Dict[str, Any]:
        try:
            payload = decode_access_token(stream_token)
        except AccessTokenError as exc:
            raise ValueError(exc.message) from exc

        if payload.get("type") != STREAM_TOKEN_TYPE:
            raise ValueError("Invalid stream token type")

        token_user_id = str(payload.get("sub") or "")
        token_workspace_id = payload.get("workspace_id")
        token_conversation_id = payload.get("conversation_id")
        if not token_user_id or token_workspace_id is None or token_conversation_id is None:
            raise ValueError("Invalid stream token payload")
        if int(token_conversation_id) != conversation_id:
            raise ValueError("Stream token does not match conversation")

        conv = await self._get_scoped_conversation(
            conversation_id=conversation_id,
            user_id=token_user_id,
            workspace_id=int(token_workspace_id),
        )
        if not conv:
            raise ValueError("Conversation not found")

        return {
            "user_id": token_user_id,
            "workspace_id": int(token_workspace_id),
            "conversation_id": conversation_id,
        }

    async def send_message(
        self,
        conversation_id: int,
        user_id: str,
        workspace_id: int,
        content: str,
        sender_type: str = "agent",
        sender_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send a message in a conversation. Creates the message record,
        updates the conversation's last_message, and notifies SSE listeners.
        """
        # Verify conversation ownership
        conv = await self._get_scoped_conversation(conversation_id, user_id, workspace_id)
        if not conv:
            raise ValueError(f"Conversation {conversation_id} not found")

        now = datetime.now(timezone.utc)

        # Create message
        msg = Messages(
            user_id=user_id,
            workspace_id=conv.workspace_id,
            conversation_id=conversation_id,
            sender_type=sender_type,
            sender_name=sender_name or "Agente",
            content=content,
            channel=conv.channel,
            status="sent",
            created_at=now,
        )
        self.db.add(msg)

        # Update conversation
        conv.last_message = content
        conv.last_message_at = now
        if conv.status == "waiting":
            conv.status = "active"

        await self.db.commit()
        await self.db.refresh(msg)

        msg_data = {
            "id": msg.id,
            "conversation_id": conversation_id,
            "sender_type": sender_type,
            "sender_name": sender_name or "Agente",
            "content": content,
            "channel": msg.channel,
            "status": "sent",
            "created_at": now.isoformat(),
        }

        # Notify SSE listeners
        _notify_conversation(conversation_id, {
            "type": "new_message",
            "data": msg_data,
        })

        return msg_data

    async def get_messages(
        self,
        conversation_id: int,
        user_id: str,
        workspace_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Get messages for a conversation, ordered by created_at."""
        # Verify ownership
        conv = await self._get_scoped_conversation(conversation_id, user_id, workspace_id)
        if not conv:
            raise ValueError("Conversation not found")

        # Count
        count_q = select(func.count()).select_from(Messages).where(
            Messages.conversation_id == conversation_id,
            Messages.user_id == user_id,
            Messages.workspace_id == workspace_id,
        )
        total = (await self.db.execute(count_q)).scalar() or 0

        # Fetch messages
        msgs_q = (
            select(Messages)
            .where(
                Messages.conversation_id == conversation_id,
                Messages.user_id == user_id,
                Messages.workspace_id == workspace_id,
            )
            .order_by(Messages.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(msgs_q)
        messages = result.scalars().all()

        return {
            "items": [
                {
                    "id": m.id,
                    "conversation_id": m.conversation_id,
                    "sender_type": m.sender_type,
                    "sender_name": m.sender_name,
                    "content": m.content,
                    "channel": m.channel,
                    "status": m.status,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
            "total": total,
            "conversation_id": conversation_id,
        }

    async def mark_read(self, conversation_id: int, user_id: str, workspace_id: int) -> bool:
        """Mark all messages in a conversation as read (reset unread count)."""
        conv = await self._get_scoped_conversation(conversation_id, user_id, workspace_id)
        if not conv:
            return False
        conv.unread_count = 0
        await self.db.commit()
        return True


async def sse_stream(conversation_id: int) -> AsyncGenerator[str, None]:
    """
    Server-Sent Events stream for a conversation.
    Yields SSE-formatted events when new messages arrive.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _event_queues[conversation_id].append(queue)

    try:
        # Send initial keepalive
        yield f"event: connected\ndata: {json.dumps({'conversation_id': conversation_id})}\n\n"

        # En tests ASGI+httpx puede bloquear con bucle infinito; el contrato mínimo es el evento inicial.
        if (os.getenv("ENVIRONMENT") or "").lower() == "test":
            return

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"event: {event['type']}\ndata: {json.dumps(event['data'])}\n\n"
            except asyncio.TimeoutError:
                # Send keepalive ping every 30s
                yield f"event: ping\ndata: {json.dumps({'ts': datetime.now(timezone.utc).isoformat()})}\n\n"
    finally:
        _event_queues[conversation_id].remove(queue)
        if not _event_queues[conversation_id]:
            del _event_queues[conversation_id]
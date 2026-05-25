"""F63 — Facebook Messenger chatbot (Meta webhook + mock)."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind
from services.instagram_dm_service import _sales_reply

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
GRAPH = "https://graph.facebook.com/v19.0"


def _mock_mode() -> bool:
    return not os.environ.get("FB_PAGE_ACCESS_TOKEN", "").strip()


class FacebookMessengerService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self.token = os.environ.get("FB_PAGE_ACCESS_TOKEN", "").strip()
        self.verify_token = os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "nelvyon_meta_verify").strip()

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS facebook_messenger_conversations (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL DEFAULT 1,
                    psid TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'open',
                    bot_enabled INTEGER NOT NULL DEFAULT 1,
                    last_message_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS facebook_messenger_messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    workspace_id INTEGER NOT NULL,
                    direction TEXT NOT NULL,
                    body TEXT NOT NULL,
                    meta_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    def verify_webhook(self, mode: str | None, token: str | None, challenge: str | None) -> str | None:
        if mode == "subscribe" and token == self.verify_token:
            return challenge or ""
        return None

    async def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        processed = 0
        for entry in payload.get("entry") or []:
            for event in entry.get("messaging") or []:
                psid = (event.get("sender") or {}).get("id")
                if not psid:
                    continue
                text_in = (event.get("message") or {}).get("text") or ""
                if not text_in:
                    continue
                await self._inbound(psid, text_in, meta=event)
                processed += 1
        await self.session.commit()
        return {"processed": processed, "mock": _mock_mode()}

    async def _inbound(self, psid: str, text_in: str, meta: dict | None = None) -> dict[str, Any]:
        conv = await self._get_or_create_conv(psid)
        await self._save_message(conv["id"], "in", text_in, meta)
        if not conv.get("bot_enabled", 1):
            return {"conversation_id": conv["id"], "auto_reply": False}
        history = await self._history(conv["id"])
        reply = await _sales_reply(text_in, history, "Facebook Messenger")
        await self._save_message(conv["id"], "out", reply, {"auto": True})
        await self.send_message(psid, reply, conversation_id=conv["id"])
        return {"conversation_id": conv["id"], "reply": reply}

    async def _get_or_create_conv(self, psid: str) -> dict[str, Any]:
        row = await self.session.execute(
            text(
                "SELECT * FROM facebook_messenger_conversations WHERE psid = :psid AND workspace_id = :ws"
            ),
            {"psid": psid, "ws": self.workspace_id},
        )
        existing = row.mappings().first()
        if existing:
            return dict(existing)
        cid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await self.session.execute(
            text(
                """
                INSERT INTO facebook_messenger_conversations (
                    id, workspace_id, psid, status, bot_enabled, last_message_at
                ) VALUES (:id, :ws, :psid, 'open', 1, :now)
                """
            ),
            {"id": cid, "ws": self.workspace_id, "psid": psid, "now": now},
        )
        return {"id": cid, "psid": psid, "bot_enabled": 1}

    async def _history(self, conversation_id: str) -> list[dict[str, str]]:
        rows = await self.session.execute(
            text(
                """
                SELECT direction, body FROM facebook_messenger_messages
                WHERE conversation_id = :cid ORDER BY created_at ASC LIMIT 20
                """
            ),
            {"cid": conversation_id},
        )
        return [
            {"role": "assistant" if r["direction"] == "out" else "user", "content": r["body"]}
            for r in rows.mappings().all()
        ]

    async def _save_message(
        self, conversation_id: str, direction: str, body: str, meta: dict | None = None
    ) -> None:
        await self.session.execute(
            text(
                f"""
                INSERT INTO facebook_messenger_messages (
                    id, conversation_id, workspace_id, direction, body, meta_json
                ) VALUES (:id, :cid, :ws, :dir, :body, {json_bind(self.session, "meta")})
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "cid": conversation_id,
                "ws": self.workspace_id,
                "dir": direction,
                "body": body,
                "meta": json.dumps(meta or {}, ensure_ascii=False),
            },
        )

    async def list_conversations(self) -> dict[str, Any]:
        await self.ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT c.*,
                    (SELECT body FROM facebook_messenger_messages m
                     WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_snippet
                FROM facebook_messenger_conversations c
                WHERE c.workspace_id = :ws
                ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
                """
            ),
            {"ws": self.workspace_id},
        )
        return {"conversations": [dict(r) for r in rows.mappings().all()], "mock": _mock_mode()}

    async def set_bot_enabled(self, conversation_id: str, enabled: bool) -> dict[str, Any]:
        await self.ensure_schema()
        await self.session.execute(
            text(
                "UPDATE facebook_messenger_conversations SET bot_enabled = :en WHERE id = :id AND workspace_id = :ws"
            ),
            {"en": 1 if enabled else 0, "id": conversation_id, "ws": self.workspace_id},
        )
        await self.session.commit()
        return {"conversation_id": conversation_id, "bot_enabled": enabled}

    async def send_message(
        self, psid: str, text: str, *, conversation_id: str | None = None
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if conversation_id:
            await self._save_message(conversation_id, "out", text, {"manual": True})
        if _mock_mode():
            await self.session.commit()
            return {"status": "sent", "mock": True, "psid": psid, "text": text}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{GRAPH}/me/messages",
                params={"access_token": self.token},
                json={"recipient": {"id": psid}, "message": {"text": text[:2000]}},
            )
        if resp.status_code >= 400:
            raise ValueError(f"Messenger API error: {resp.text[:300]}")
        await self.session.commit()
        return {"status": "sent", "mock": False, "psid": psid}


def get_facebook_messenger_service(session: AsyncSession, workspace_id: int) -> FacebookMessengerService:
    return FacebookMessengerService(session, workspace_id)

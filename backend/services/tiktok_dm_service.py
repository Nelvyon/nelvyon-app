"""F63 — TikTok DM automation (Business API + mock)."""

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


def _mock_mode() -> bool:
    return not os.environ.get("TIKTOK_ACCESS_TOKEN", "").strip()


class TikTokDMService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self.token = os.environ.get("TIKTOK_ACCESS_TOKEN", "").strip()

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS tiktok_dm_conversations (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    tiktok_open_id TEXT NOT NULL,
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
                CREATE TABLE IF NOT EXISTS tiktok_dm_messages (
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

    async def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        events = payload.get("events") or payload.get("data", {}).get("events") or [payload]
        processed = 0
        for ev in events if isinstance(events, list) else [events]:
            open_id = ev.get("open_id") or ev.get("from_user_id") or ev.get("sender_id")
            text_in = ev.get("text") or ev.get("content") or ""
            if open_id and text_in:
                await self._inbound(str(open_id), str(text_in), meta=ev)
                processed += 1
        await self.session.commit()
        return {"processed": processed, "mock": _mock_mode()}

    async def _inbound(self, open_id: str, text_in: str, meta: dict | None = None) -> dict[str, Any]:
        conv = await self._get_or_create_conv(open_id)
        await self._save_message(conv["id"], "in", text_in, meta)
        if not conv.get("bot_enabled", 1):
            return {"conversation_id": conv["id"], "auto_reply": False}
        history = await self._history(conv["id"])
        reply = await _sales_reply(text_in, history, "TikTok DM")
        await self._save_message(conv["id"], "out", reply, {"auto": True})
        await self.send_message(open_id, reply, conversation_id=conv["id"])
        return {"conversation_id": conv["id"], "reply": reply}

    async def _get_or_create_conv(self, open_id: str) -> dict[str, Any]:
        row = await self.session.execute(
            text(
                "SELECT * FROM tiktok_dm_conversations WHERE tiktok_open_id = :oid AND workspace_id = :ws"
            ),
            {"oid": open_id, "ws": self.workspace_id},
        )
        existing = row.mappings().first()
        if existing:
            return dict(existing)
        cid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await self.session.execute(
            text(
                """
                INSERT INTO tiktok_dm_conversations (
                    id, workspace_id, tiktok_open_id, bot_enabled, last_message_at
                ) VALUES (:id, :ws, :oid, 1, :now)
                """
            ),
            {"id": cid, "ws": self.workspace_id, "oid": open_id, "now": now},
        )
        return {"id": cid, "tiktok_open_id": open_id, "bot_enabled": 1}

    async def _history(self, conversation_id: str) -> list[dict[str, str]]:
        rows = await self.session.execute(
            text(
                """
                SELECT direction, body FROM tiktok_dm_messages
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
                INSERT INTO tiktok_dm_messages (
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
                    (SELECT body FROM tiktok_dm_messages m
                     WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_snippet
                FROM tiktok_dm_conversations c
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
                "UPDATE tiktok_dm_conversations SET bot_enabled = :en WHERE id = :id AND workspace_id = :ws"
            ),
            {"en": 1 if enabled else 0, "id": conversation_id, "ws": self.workspace_id},
        )
        await self.session.commit()
        return {"conversation_id": conversation_id, "bot_enabled": enabled}

    async def send_message(
        self, open_id: str, text: str, *, conversation_id: str | None = None
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if conversation_id:
            await self._save_message(conversation_id, "out", text, {"manual": True})
        if _mock_mode():
            await self.session.commit()
            return {"status": "sent", "mock": True, "open_id": open_id, "text": text}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://business-api.tiktok.com/open_api/v1.3/business/message/send/",
                headers={"Access-Token": self.token},
                json={"open_id": open_id, "text": text[:2000]},
            )
        if resp.status_code >= 400:
            raise ValueError(f"TikTok DM API error: {resp.text[:300]}")
        await self.session.commit()
        return {"status": "sent", "mock": False, "open_id": open_id}


def get_tiktok_dm_service(session: AsyncSession, workspace_id: int) -> TikTokDMService:
    return TikTokDMService(session, workspace_id)

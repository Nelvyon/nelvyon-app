"""F63 — Instagram DM chatbot (Meta Messaging API + mock)."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
GRAPH = "https://graph.facebook.com/v19.0"


def _mock_mode() -> bool:
    return not os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


async def _sales_reply(text_in: str, history: list[dict[str, str]], channel: str) -> str:
    client = _openai_client()
    if not client:
        t = text_in.lower()
        if any(w in t for w in ("hola", "hey", "buenas")):
            return (
                "¡Hola! Soy el asistente de ventas de NELVYON. "
                "¿Buscas más reservas, leads o ventas online? Cuéntame tu negocio en una frase."
            )
        if "precio" in t or "plan" in t:
            return (
                "Tenemos Starter (97€/mes), Growth (297€/mes) y Elite (797€/mes). "
                "¿Cuántos clientes nuevos al mes necesitas? Te recomiendo el plan ideal."
            )
        return (
            "Perfecto. Con NELVYON automatizamos captación con IA (ads, email, SEO). "
            "Empieza tu prueba gratis 14 días → https://nelvyon.com/register"
        )
    msgs = [
        {
            "role": "system",
            "content": (
                f"Asistente de ventas NELVYON por {channel}. Flujo: saludo → pregunta cualificadora "
                "(tipo negocio / objetivo) → beneficio concreto → CTA /register. Tono directo, español."
            ),
        },
        *[{"role": h["role"], "content": h["content"]} for h in history[-8:]],
        {"role": "user", "content": text_in},
    ]
    try:
        resp = await client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
            messages=msgs,
            temperature=0.65,
            max_tokens=400,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("instagram DM GPT fallback: %s", exc)
        return await _sales_reply(text_in, history, channel)


class InstagramDMService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self.token = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()
        self.verify_token = os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "nelvyon_meta_verify").strip()

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS instagram_dm_conversations (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL DEFAULT 1,
                    instagram_user_id TEXT NOT NULL,
                    username TEXT,
                    status TEXT NOT NULL DEFAULT 'open',
                    bot_enabled INTEGER NOT NULL DEFAULT 1,
                    stage TEXT NOT NULL DEFAULT 'greeting',
                    last_message_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS instagram_dm_messages (
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
                sender = (event.get("sender") or {}).get("id")
                if not sender:
                    continue
                msg = event.get("message") or {}
                text_in = msg.get("text") or ""
                if not text_in:
                    continue
                await self._inbound(sender, text_in, meta=event)
                processed += 1
        await self.session.commit()
        return {"processed": processed, "mock": _mock_mode()}

    async def _inbound(self, ig_user_id: str, text_in: str, meta: dict | None = None) -> dict[str, Any]:
        conv = await self._get_or_create_conv(ig_user_id)
        await self._save_message(conv["id"], "in", text_in, meta)
        if not conv.get("bot_enabled", 1):
            return {"conversation_id": conv["id"], "auto_reply": False}
        history = await self._history(conv["id"])
        reply = await _sales_reply(text_in, history, "Instagram DM")
        await self._save_message(conv["id"], "out", reply, {"auto": True})
        await self.send_message(ig_user_id, reply, conversation_id=conv["id"])
        return {"conversation_id": conv["id"], "reply": reply}

    async def _get_or_create_conv(self, ig_user_id: str) -> dict[str, Any]:
        row = await self.session.execute(
            text(
                """
                SELECT * FROM instagram_dm_conversations
                WHERE instagram_user_id = :uid AND workspace_id = :ws
                """
            ),
            {"uid": ig_user_id, "ws": self.workspace_id},
        )
        existing = row.mappings().first()
        if existing:
            return dict(existing)
        cid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await self.session.execute(
            text(
                """
                INSERT INTO instagram_dm_conversations (
                    id, workspace_id, instagram_user_id, status, bot_enabled, last_message_at
                ) VALUES (:id, :ws, :uid, 'open', 1, :now)
                """
            ),
            {"id": cid, "ws": self.workspace_id, "uid": ig_user_id, "now": now},
        )
        return {"id": cid, "instagram_user_id": ig_user_id, "bot_enabled": 1}

    async def _history(self, conversation_id: str) -> list[dict[str, str]]:
        rows = await self.session.execute(
            text(
                """
                SELECT direction, body FROM instagram_dm_messages
                WHERE conversation_id = :cid ORDER BY created_at ASC LIMIT 20
                """
            ),
            {"cid": conversation_id},
        )
        out = []
        for r in rows.mappings().all():
            role = "assistant" if r["direction"] == "out" else "user"
            out.append({"role": role, "content": r["body"]})
        return out

    async def _save_message(
        self, conversation_id: str, direction: str, body: str, meta: dict | None = None
    ) -> None:
        await self.session.execute(
            text(
                f"""
                INSERT INTO instagram_dm_messages (
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
                    (SELECT body FROM instagram_dm_messages m
                     WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_snippet
                FROM instagram_dm_conversations c
                WHERE c.workspace_id = :ws
                ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
                """
            ),
            {"ws": self.workspace_id},
        )
        items = [dict(r) for r in rows.mappings().all()]
        return {"conversations": items, "mock": _mock_mode()}

    async def set_bot_enabled(self, conversation_id: str, enabled: bool) -> dict[str, Any]:
        await self.ensure_schema()
        await self.session.execute(
            text(
                """
                UPDATE instagram_dm_conversations SET bot_enabled = :en
                WHERE id = :id AND workspace_id = :ws
                """
            ),
            {"en": 1 if enabled else 0, "id": conversation_id, "ws": self.workspace_id},
        )
        await self.session.commit()
        return {"conversation_id": conversation_id, "bot_enabled": enabled}

    async def send_message(
        self,
        recipient_id: str,
        text: str,
        *,
        conversation_id: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if conversation_id:
            await self._save_message(conversation_id, "out", text, {"manual": True})
        if _mock_mode():
            await self.session.commit()
            return {"status": "sent", "mock": True, "recipient_id": recipient_id, "text": text}
        page_id = os.environ.get("INSTAGRAM_PAGE_ID", "").strip()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{GRAPH}/{page_id}/messages",
                params={"access_token": self.token},
                json={
                    "recipient": {"id": recipient_id},
                    "message": {"text": text[:2000]},
                },
            )
        if resp.status_code >= 400:
            raise ValueError(f"Instagram API error: {resp.text[:300]}")
        await self.session.commit()
        return {"status": "sent", "mock": False, "recipient_id": recipient_id}


def get_instagram_dm_service(session: AsyncSession, workspace_id: int) -> InstagramDMService:
    return InstagramDMService(session, workspace_id)

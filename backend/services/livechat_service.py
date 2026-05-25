"""NELVYON native live chat — conversations, widget, AI auto-reply."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services import memory_service
from services.livechat_pubsub import publish_event
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
AUTO_REPLY_DELAY_SEC = 30
HANDOFF_PATTERNS = re.compile(
    r"(hablar con (una )?persona|agente humano|persona real|operador|"
    r"human agent|talk to (a )?human|speak to (a )?person)",
    re.IGNORECASE,
)
CHAT_MODEL = "gpt-4o"
_pending_auto_reply: dict[str, asyncio.Task] = {}


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
    return data


def _openai_client() -> AsyncOpenAI:
    api_key = (
        os.environ.get("OPENAI_API_KEY", "").strip()
        or os.environ.get("APP_AI_KEY", "").strip()
    )
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not configured")
    base_url = (
        os.environ.get("OPENAI_BASE_URL", "").strip()
        or os.environ.get("APP_AI_BASE_URL", "").strip()
        or "https://api.openai.com/v1"
    ).rstrip("/")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


class LiveChatService:
    """Tenant-scoped live chat operations."""

    def __init__(self, session: AsyncSession, tenant_id: int | None = None):
        self.session = session
        self.tenant_id = int(tenant_id) if tenant_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await TenantService.ensure_schema()
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "livechat.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("livechat schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, tenant_id: int) -> None:
        await TenantService(self.session).set_tenant_context(tenant_id)

    async def create_conversation(
        self,
        tenant_id: int,
        visitor_id: str,
        *,
        page_url: str | None = None,
        metadata: dict[str, Any] | None = None,
        visitor_name: str | None = None,
        visitor_email: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        conv_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO chat_conversations (
                    id, tenant_id, visitor_id, visitor_name, visitor_email,
                    page_url, status, metadata
                )
                VALUES (
                    :id, :tid, :vid, :vname, :vemail, :url, 'open', CAST(:meta AS jsonb)
                )
                RETURNING *
                """
            ),
            {
                "id": conv_id,
                "tid": tenant_id,
                "vid": visitor_id,
                "vname": visitor_name,
                "vemail": visitor_email,
                "url": page_url,
                "meta": _json_dumps(metadata or {}),
            },
        )
        await self.session.commit()
        conv = _row(r.fetchone())
        config = await self.get_widget_config(tenant_id)
        welcome = config.get("welcome_message")
        if welcome:
            await self.send_message(
                conv_id,
                "bot",
                welcome,
                sender_id="system",
                tenant_id=tenant_id,
                skip_auto_reply_schedule=True,
            )
        return conv

    async def send_message(
        self,
        conversation_id: str,
        sender_type: str,
        content: str,
        *,
        sender_id: str | None = None,
        tenant_id: int | None = None,
        skip_auto_reply_schedule: bool = False,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        conv = await self._get_conversation_raw(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")
        tid = int(tenant_id or conv["tenant_id"])
        await self._set_tenant(tid)

        if conv.get("status") == "closed":
            raise ValueError("Conversation is closed")

        sender_type = sender_type.strip().lower()
        if sender_type not in ("visitor", "agent", "bot"):
            raise ValueError("Invalid sender_type")

        if sender_type == "visitor" and HANDOFF_PATTERNS.search(content or ""):
            await self.session.execute(
                text(
                    "UPDATE chat_conversations SET status = 'waiting' WHERE id = :id::uuid"
                ),
                {"id": conversation_id},
            )

        msg_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO chat_messages (
                    id, conversation_id, sender_type, sender_id, content
                )
                VALUES (:id, :cid::uuid, :stype, :sid, :content)
                RETURNING *
                """
            ),
            {
                "id": msg_id,
                "cid": conversation_id,
                "stype": sender_type,
                "sid": sender_id,
                "content": content,
            },
        )
        now = datetime.now(timezone.utc)
        if sender_type in ("agent", "bot") and not conv.get("first_response_at"):
            await self.session.execute(
                text(
                    """
                    UPDATE chat_conversations
                    SET first_response_at = :now
                    WHERE id = :id::uuid AND first_response_at IS NULL
                    """
                ),
                {"id": conversation_id, "now": now},
            )
        await self.session.commit()
        message = _row(r.fetchone())

        await publish_event(
            conversation_id,
            {"type": "message", "message": message},
        )

        if sender_type == "visitor":
            try:
                from services.omnichannel_service import ingest_omnichannel_inbound

                await ingest_omnichannel_inbound(
                    self.session,
                    tid,
                    "chat",
                    content,
                    participant_name=conv.get("visitor_name"),
                    participant_email=conv.get("visitor_email"),
                    external_id=conversation_id,
                    metadata={"sender_type": sender_type},
                )
            except Exception as exc:
                logger.debug("omnichannel chat ingest skipped: %s", exc)

        if (
            sender_type == "visitor"
            and not skip_auto_reply_schedule
            and not conv.get("assigned_agent_id")
            and conv.get("status") != "waiting"
        ):
            _schedule_auto_reply(conversation_id, tid)

        if sender_type == "agent":
            _cancel_auto_reply(conversation_id)

        return message

    async def assign_agent(
        self,
        conversation_id: str,
        agent_id: str,
        *,
        tenant_id: int | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        conv = await self._get_conversation_raw(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")
        tid = int(tenant_id or conv["tenant_id"])
        await self._set_tenant(tid)
        _cancel_auto_reply(conversation_id)

        await self.session.execute(
            text(
                """
                UPDATE chat_conversations
                SET assigned_agent_id = :aid, status = 'open'
                WHERE id = :id::uuid AND tenant_id = :tid
                """
            ),
            {"id": conversation_id, "aid": agent_id, "tid": tid},
        )
        await self.session.commit()
        updated = await self.get_conversation(conversation_id, tenant_id=tid)
        await publish_event(
            conversation_id,
            {"type": "assigned", "agent_id": agent_id, "conversation": updated},
        )
        return updated or {}

    async def close_conversation(
        self,
        conversation_id: str,
        resolution_note: str | None = None,
        *,
        tenant_id: int | None = None,
        csat_score: int | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        conv = await self._get_conversation_raw(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")
        tid = int(tenant_id or conv["tenant_id"])
        await self._set_tenant(tid)
        _cancel_auto_reply(conversation_id)

        await self.session.execute(
            text(
                """
                UPDATE chat_conversations
                SET status = 'closed', closed_at = NOW(),
                    resolution_note = :note, csat_score = :csat
                WHERE id = :id::uuid AND tenant_id = :tid
                """
            ),
            {
                "id": conversation_id,
                "tid": tid,
                "note": resolution_note,
                "csat": csat_score,
            },
        )
        await self.session.commit()
        updated = await self.get_conversation(conversation_id, tenant_id=tid)
        await publish_event(
            conversation_id,
            {"type": "closed", "conversation": updated},
        )
        return updated or {}

    async def get_conversations(
        self,
        tenant_id: int,
        *,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        page = max(1, page)
        offset = (page - 1) * page_size
        params: dict[str, Any] = {
            "tid": tenant_id,
            "limit": page_size,
            "offset": offset,
        }
        q = """
            SELECT id, tenant_id, visitor_id, visitor_name, visitor_email, page_url,
                   status, assigned_agent_id, created_at, closed_at, first_response_at
            FROM chat_conversations
            WHERE tenant_id = :tid
        """
        count_q = "SELECT COUNT(*) AS cnt FROM chat_conversations WHERE tenant_id = :tid"
        if status:
            q += " AND status = :status"
            count_q += " AND status = :status"
            params["status"] = status
        q += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        r = await self.session.execute(text(q), params)
        cnt = await self.session.execute(text(count_q), params)
        row_cnt = cnt.fetchone()
        total = int(row_cnt._mapping["cnt"]) if row_cnt else 0
        return {
            "items": [_row(x) for x in r.fetchall()],
            "page": page,
            "page_size": page_size,
            "total": total,
        }

    async def get_conversation(
        self,
        conversation_id: str,
        *,
        tenant_id: int | None = None,
    ) -> dict[str, Any] | None:
        await self.ensure_schema()
        conv = await self._get_conversation_raw(conversation_id)
        if not conv:
            return None
        if tenant_id is not None and int(conv["tenant_id"]) != int(tenant_id):
            return None
        await self._set_tenant(int(conv["tenant_id"]))
        return conv

    async def get_messages(self, conversation_id: str) -> list[dict[str, Any]]:
        await self.ensure_schema()
        conv = await self._get_conversation_raw(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")
        await self._set_tenant(int(conv["tenant_id"]))
        r = await self.session.execute(
            text(
                """
                SELECT id, conversation_id, sender_type, sender_id, content, read_at, created_at
                FROM chat_messages
                WHERE conversation_id = :cid::uuid
                ORDER BY created_at ASC
                """
            ),
            {"cid": conversation_id},
        )
        return [_row(x) for x in r.fetchall()]

    async def auto_reply(self, conversation_id: str) -> dict[str, Any] | None:
        """GPT-4o auto-reply using tenant pgvector memory."""
        conv = await self._get_conversation_raw(conversation_id)
        if not conv:
            return None
        if conv.get("assigned_agent_id") or conv.get("status") in ("closed", "waiting"):
            return None

        tid = int(conv["tenant_id"])
        visitor_id = str(conv["visitor_id"])
        messages = await self.get_messages(conversation_id)
        last_visitor = next(
            (m["content"] for m in reversed(messages) if m.get("sender_type") == "visitor"),
            "",
        )
        if not last_visitor:
            return None

        memories = await memory_service.search_memory(tid, visitor_id, last_visitor, limit=5)
        memory_ctx = "\n".join(
            f"- {m.get('content', '')}" for m in memories if m.get("content")
        )
        system = (
            "Eres un asistente de chat en vivo para una empresa. Responde en español, "
            "de forma breve y útil. Si no sabes algo, ofrece conectar con un agente humano."
        )
        user_prompt = f"Contexto del cliente:\n{memory_ctx or '(sin historial)'}\n\nMensaje: {last_visitor}"

        try:
            client = _openai_client()
            resp = await client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.4,
                max_tokens=400,
            )
            reply = (resp.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("livechat auto_reply failed: %s", exc)
            reply = (
                "Gracias por tu mensaje. Un agente te atenderá en breve. "
                "Si prefieres hablar con una persona ahora, escribe «hablar con persona»."
            )

        await memory_service.save_memory(
            tid,
            visitor_id,
            f"Visitor: {last_visitor}\nBot: {reply}",
            metadata={"source": "livechat", "conversation_id": conversation_id},
        )
        return await self.send_message(
            conversation_id,
            "bot",
            reply,
            sender_id="gpt-4o",
            tenant_id=tid,
            skip_auto_reply_schedule=True,
        )

    async def get_widget_config(self, tenant_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        r = await self.session.execute(
            text("SELECT * FROM chat_widget_config WHERE tenant_id = :tid"),
            {"tid": tenant_id},
        )
        row = r.fetchone()
        if row:
            return _row(row)
        return {
            "tenant_id": tenant_id,
            "color": "#6366f1",
            "welcome_message": "¡Hola! ¿En qué podemos ayudarte?",
            "agent_name": "Soporte",
            "avatar_url": None,
            "position": "bottom-right",
            "active": True,
        }

    async def update_widget_config(self, tenant_id: int, config: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        r = await self.session.execute(
            text(
                """
                INSERT INTO chat_widget_config (
                    tenant_id, color, welcome_message, agent_name, avatar_url, position, active
                )
                VALUES (
                    :tid, :color, :welcome, :aname, :avatar, :pos, :active
                )
                ON CONFLICT (tenant_id) DO UPDATE SET
                    color = EXCLUDED.color,
                    welcome_message = EXCLUDED.welcome_message,
                    agent_name = EXCLUDED.agent_name,
                    avatar_url = EXCLUDED.avatar_url,
                    position = EXCLUDED.position,
                    active = EXCLUDED.active,
                    updated_at = NOW()
                RETURNING *
                """
            ),
            {
                "tid": tenant_id,
                "color": config.get("color", "#6366f1"),
                "welcome": config.get("welcome_message", "¡Hola! ¿En qué podemos ayudarte?"),
                "aname": config.get("agent_name", "Soporte"),
                "avatar": config.get("avatar_url"),
                "pos": config.get("position", "bottom-right"),
                "active": bool(config.get("active", True)),
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def get_stats(
        self,
        tenant_id: int,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        params: dict[str, Any] = {"tid": tenant_id}
        date_filter = ""
        if date_from:
            date_filter += " AND created_at >= :dfrom"
            params["dfrom"] = date_from
        if date_to:
            date_filter += " AND created_at <= :dto"
            params["dto"] = date_to

        r = await self.session.execute(
            text(
                f"""
                SELECT
                    COUNT(*) AS total_conversations,
                    COUNT(*) FILTER (WHERE status = 'open') AS open_count,
                    COUNT(*) FILTER (WHERE status = 'waiting') AS waiting_count,
                    COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
                    AVG(
                        EXTRACT(EPOCH FROM (first_response_at - created_at))
                    ) FILTER (WHERE first_response_at IS NOT NULL) AS avg_first_response_sec,
                    AVG(csat_score) FILTER (WHERE csat_score IS NOT NULL) AS avg_csat
                FROM chat_conversations
                WHERE tenant_id = :tid {date_filter}
                """
            ),
            params,
        )
        row = _row(r.fetchone())
        msg_filter = date_filter.replace("created_at", "m.created_at")
        msg_r = await self.session.execute(
            text(
                f"""
                SELECT COUNT(*) AS message_count
                FROM chat_messages m
                JOIN chat_conversations c ON c.id = m.conversation_id
                WHERE c.tenant_id = :tid {msg_filter}
                """
            ),
            params,
        )
        msg_row = msg_r.fetchone()
        row["message_count"] = int(msg_row._mapping["message_count"]) if msg_row else 0
        if row.get("avg_first_response_sec") is not None:
            row["avg_first_response_sec"] = round(float(row["avg_first_response_sec"]), 1)
        if row.get("avg_csat") is not None:
            row["avg_csat"] = round(float(row["avg_csat"]), 2)
        return row

    async def _get_conversation_raw(self, conversation_id: str) -> dict[str, Any] | None:
        r = await self.session.execute(
            text("SELECT * FROM chat_conversations WHERE id = :id::uuid"),
            {"id": conversation_id},
        )
        row = r.fetchone()
        return _row(row) if row else None


def _schedule_auto_reply(conversation_id: str, tenant_id: int) -> None:
    _cancel_auto_reply(conversation_id)

    async def _run() -> None:
        try:
            await asyncio.sleep(AUTO_REPLY_DELAY_SEC)
            if not db_manager.async_session_maker:
                await db_manager.ensure_initialized()
            async with db_manager.async_session_maker() as session:
                svc = LiveChatService(session, tenant_id)
                await svc.auto_reply(conversation_id)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.warning("auto_reply task failed: %s", exc)
        finally:
            _pending_auto_reply.pop(conversation_id, None)

    try:
        loop = asyncio.get_running_loop()
        _pending_auto_reply[conversation_id] = loop.create_task(_run())
    except RuntimeError:
        pass


def _cancel_auto_reply(conversation_id: str) -> None:
    task = _pending_auto_reply.pop(conversation_id, None)
    if task and not task.done():
        task.cancel()


def get_livechat_service(session: AsyncSession, tenant_id: int | None = None) -> LiveChatService:
    return LiveChatService(session, tenant_id)

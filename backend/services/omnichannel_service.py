"""
Frente 52 — Unified omnichannel inbox service.

Unifies Email, WhatsApp, SMS, Live Chat, and Voice into one conversation bandeja.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind, uuid_bind
from services.crm_service import CRMService
from services.ses_service import get_ses_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
CHANNELS = frozenset({"email", "whatsapp", "sms", "chat", "voice"})
STATUSES = frozenset({"open", "pending", "resolved"})
AUTO_REPLY_HOURS = 24
_pending_auto_replies: dict[str, asyncio.Task] = {}


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj if obj is not None else {}, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    try:
        data = dict(row._mapping)
    except AttributeError:
        data = dict(row)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class OmnichannelService:
    """Unified inbox across email, WhatsApp, SMS, live chat, and voice."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "omnichannel.sql"
        if sql_path.is_file() and db_manager.async_session_maker:
            async with db_manager.async_session_maker() as session:
                bind = session.get_bind()
                dialect = bind.dialect.name if bind is not None else "postgresql"
                raw = sql_path.read_text(encoding="utf-8")
                if dialect == "sqlite":
                    raw = raw.replace("JSONB", "TEXT").replace("::jsonb", "")
                    raw = raw.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', "")
                for stmt in raw.split(";"):
                    s = stmt.strip()
                    if s:
                        try:
                            await session.execute(text(s))
                        except Exception as exc:
                            logger.debug("omnichannel schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    # ─── Inbox ───────────────────────────────────────────────────────────────

    async def get_unified_inbox(
        self,
        workspace_id: int,
        *,
        channel: str | None = None,
        status: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        clauses = ["workspace_id = :ws"]
        params: dict[str, Any] = {"ws": workspace_id, "skip": skip, "limit": limit}
        if channel and channel in CHANNELS:
            clauses.append("channel = :channel")
            params["channel"] = channel
        if status and status in STATUSES:
            clauses.append("status = :status")
            params["status"] = status
        bind = self.session.get_bind()
        dialect = bind.dialect.name if bind is not None else "postgresql"
        if search:
            q = f"%{search.strip()}%"
            params["q"] = q
            if dialect == "sqlite":
                clauses.append(
                    "(last_message LIKE :q OR participant_name LIKE :q OR participant_email LIKE :q OR subject LIKE :q)"
                )
            else:
                clauses.append(
                    "(last_message ILIKE :q OR participant_name ILIKE :q OR participant_email ILIKE :q OR subject ILIKE :q)"
                )
        where = " AND ".join(clauses)
        cnt = await self.session.execute(
            text(f"SELECT COUNT(*) FROM omnichannel_conversations WHERE {where}"),
            params,
        )
        total = int(cnt.scalar() or 0)
        if dialect == "sqlite":
            order = "last_message_at IS NULL, last_message_at DESC, created_at DESC"
            page = "LIMIT :limit OFFSET :skip"
        else:
            order = "last_message_at DESC NULLS LAST, created_at DESC"
            page = "OFFSET :skip LIMIT :limit"
        rows = await self.session.execute(
            text(
                f"""
                SELECT * FROM omnichannel_conversations
                WHERE {where}
                ORDER BY {order}
                {page}
                """
            ),
            params,
        )
        return {"items": [_row(r) for r in rows.mappings()], "total": total, "skip": skip, "limit": limit}

    async def get_messages(self, conversation_id: str, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        await self._get_conversation(conversation_id, workspace_id)
        # Opening the thread clears unread — matches “mark read on select” UX.
        now = datetime.now(timezone.utc)
        await self.session.execute(
            text(
                f"""
                UPDATE omnichannel_conversations
                SET unread_count = 0, updated_at = :now
                WHERE id = {uuid_bind(self.session, "id")} AND workspace_id = :ws
                """
            ),
            {"id": conversation_id, "ws": workspace_id, "now": now},
        )
        await self.session.commit()
        rows = await self.session.execute(
            text(
                f"""
                SELECT * FROM omnichannel_messages
                WHERE conversation_id = {uuid_bind(self.session, "cid")}
                ORDER BY created_at ASC
                """
            ),
            {"cid": conversation_id},
        )
        items = []
        for r in rows.mappings():
            item = _row(r)
            if isinstance(item.get("metadata"), str):
                try:
                    item["metadata"] = json.loads(item["metadata"])
                except json.JSONDecodeError:
                    pass
            items.append(item)
        return items

    async def send_reply(
        self,
        conversation_id: str,
        workspace_id: int,
        content: str,
        channel: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        conv = await self._get_conversation(conversation_id, workspace_id)
        ch = channel or conv["channel"]
        body = (content or "").strip()
        if not body:
            raise ValueError("content is required")

        delivery = await self._dispatch_outbound(conv, ch, body)
        msg = await self._add_message(
            conversation_id,
            direction="out",
            content=body,
            channel=ch,
            metadata={"delivery": delivery},
            workspace_id=workspace_id,
        )
        await self.session.execute(
            text(
                f"""
                UPDATE omnichannel_conversations
                SET unread_count = 0, status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END,
                    updated_at = :now
                WHERE id = {uuid_bind(self.session, "id")}
                """
            ),
            {"id": conversation_id, "now": datetime.now(timezone.utc)},
        )
        await self.session.commit()
        return {"message": msg, "delivery": delivery}

    async def suggest_reply(self, conversation_id: str, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        conv = await self._get_conversation(conversation_id, workspace_id)
        history = await self.get_messages(conversation_id, workspace_id)
        client = _openai_client()
        if not client:
            return {"suggestion": "Gracias por contactarnos. ¿En qué más podemos ayudarte?", "mock": True}

        lines = []
        for m in history[-20:]:
            role = "Cliente" if m.get("direction") == "in" else "Agente"
            lines.append(f"{role}: {m.get('content', '')}")

        prompt = (
            "Eres un agente de soporte profesional. Analiza el hilo y redacta UNA respuesta lista para enviar "
            f"por {conv.get('channel')}. Sé conciso, empático y en español.\n\n"
            + "\n".join(lines)
        )
        try:
            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.4,
            )
            suggestion = (resp.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("suggest_reply GPT failed: %s", exc)
            suggestion = "Gracias por tu mensaje. Un agente revisará tu consulta en breve."
        return {"suggestion": suggestion, "conversation_id": conversation_id}

    async def auto_reply(self, conversation_id: str, workspace_id: int) -> dict[str, Any]:
        """Send 24h follow-up if contact has not replied and auto_reply is enabled."""
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        conv = await self._get_conversation(conversation_id, workspace_id)
        if not conv.get("auto_reply_enabled"):
            return {"status": "skipped", "reason": "auto_reply disabled"}

        last_in = conv.get("last_inbound_at")
        if not last_in:
            return {"status": "skipped", "reason": "no inbound messages"}

        if isinstance(last_in, str):
            last_in = datetime.fromisoformat(last_in.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - last_in < timedelta(hours=AUTO_REPLY_HOURS):
            return {"status": "skipped", "reason": "within 24h window"}

        last_out = await self.session.execute(
            text(
                f"""
                SELECT created_at FROM omnichannel_messages
                WHERE conversation_id = {uuid_bind(self.session, "cid")} AND direction = 'out'
                ORDER BY created_at DESC LIMIT 1
                """
            ),
            {"cid": conversation_id},
        )
        out_row = last_out.fetchone()
        if out_row:
            out_at = out_row._mapping["created_at"]
            if isinstance(out_at, datetime) and out_at > last_in:
                return {"status": "skipped", "reason": "already replied"}

        follow_up = (
            f"Hola{(' ' + conv['participant_name']) if conv.get('participant_name') else ''}, "
            "queríamos hacer seguimiento de tu consulta. ¿Necesitas algo más?"
        )
        result = await self.send_reply(conversation_id, workspace_id, follow_up)
        return {"status": "sent", **result}

    async def update_status(self, conversation_id: str, workspace_id: int, status: str) -> dict[str, Any]:
        if status not in STATUSES:
            raise ValueError(f"Invalid status: {status}")
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        await self._get_conversation(conversation_id, workspace_id)
        await self.session.execute(
            text(
                f"""
                UPDATE omnichannel_conversations
                SET status = :status, updated_at = :now
                WHERE id = {uuid_bind(self.session, "id")} AND workspace_id = :ws
                """
            ),
            {"id": conversation_id, "status": status, "ws": workspace_id, "now": datetime.now(timezone.utc)},
        )
        await self.session.commit()
        return await self._get_conversation(conversation_id, workspace_id)

    async def set_auto_reply(self, conversation_id: str, workspace_id: int, enabled: bool) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        await self._get_conversation(conversation_id, workspace_id)
        await self.session.execute(
            text(
                f"""
                UPDATE omnichannel_conversations
                SET auto_reply_enabled = :enabled, updated_at = :now
                WHERE id = {uuid_bind(self.session, "id")} AND workspace_id = :ws
                """
            ),
            {"id": conversation_id, "enabled": enabled, "ws": workspace_id, "now": datetime.now(timezone.utc)},
        )
        await self.session.commit()
        if enabled:
            self._schedule_auto_reply(conversation_id, workspace_id)
        return await self._get_conversation(conversation_id, workspace_id)

    async def get_stats(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        row = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'open') AS open_count,
                    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
                    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
                    COALESCE(SUM(unread_count), 0) AS unread_total
                FROM omnichannel_conversations
                WHERE workspace_id = :ws
                """
            ),
            {"ws": workspace_id},
        )
        summary = _row(row.mappings().first())

        channels = await self.session.execute(
            text(
                """
                SELECT channel, COUNT(*) AS count
                FROM omnichannel_conversations
                WHERE workspace_id = :ws
                GROUP BY channel
                ORDER BY count DESC
                """
            ),
            {"ws": workspace_id},
        )
        channel_counts = {r._mapping["channel"]: int(r._mapping["count"]) for r in channels.mappings()}

        avg_resp = await self.session.execute(
            text(
                """
                SELECT AVG(
                    EXTRACT(EPOCH FROM (o.created_at - i.created_at))
                ) AS avg_seconds
                FROM omnichannel_messages i
                JOIN omnichannel_messages o
                  ON o.conversation_id = i.conversation_id
                 AND o.direction = 'out'
                 AND o.created_at > i.created_at
                JOIN omnichannel_conversations c ON c.id = i.conversation_id
                WHERE c.workspace_id = :ws AND i.direction = 'in'
                """
            ),
            {"ws": workspace_id},
        )
        avg_row = avg_resp.fetchone()
        avg_seconds = float(avg_row._mapping["avg_seconds"] or 0) if avg_row else 0.0
        total = int(summary.get("total") or 0)
        resolved = int(summary.get("resolved_count") or 0)

        return {
            **summary,
            "channels": channel_counts,
            "avg_response_seconds": round(avg_seconds, 1),
            "resolution_rate": round(resolved / total * 100, 1) if total else 0.0,
            "unread_count": int(summary.get("unread_total") or 0),
        }

    # ─── Ingestion (integrations) ────────────────────────────────────────────

    async def ingest_inbound(
        self,
        workspace_id: int,
        channel: str,
        content: str,
        *,
        participant_name: str | None = None,
        participant_email: str | None = None,
        participant_phone: str | None = None,
        contact_id: str | None = None,
        external_id: str | None = None,
        subject: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create or update conversation from an inbound channel message."""
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        if channel not in CHANNELS:
            raise ValueError(f"Invalid channel: {channel}")

        conv = await self._find_or_create_conversation(
            workspace_id,
            channel,
            participant_email=participant_email,
            participant_phone=participant_phone,
            external_id=external_id,
            participant_name=participant_name,
            contact_id=contact_id,
            subject=subject,
        )
        msg = await self._add_message(
            str(conv["id"]),
            direction="in",
            content=content,
            channel=channel,
            metadata=metadata or {},
            workspace_id=workspace_id,
            increment_unread=True,
        )
        await self.session.commit()
        if conv.get("auto_reply_enabled"):
            self._schedule_auto_reply(str(conv["id"]), workspace_id)
        return {"conversation": conv, "message": msg}

    # ─── Internal ────────────────────────────────────────────────────────────

    async def _get_conversation(self, conversation_id: str, workspace_id: int) -> dict[str, Any]:
        row = await self.session.execute(
            text(
                f"""
                SELECT * FROM omnichannel_conversations
                WHERE id = {uuid_bind(self.session, "id")} AND workspace_id = :ws
                """
            ),
            {"id": conversation_id, "ws": workspace_id},
        )
        conv = _row(row.mappings().first())
        if not conv:
            raise ValueError("Conversation not found")
        return conv

    async def _find_or_create_conversation(
        self,
        workspace_id: int,
        channel: str,
        *,
        participant_email: str | None = None,
        participant_phone: str | None = None,
        external_id: str | None = None,
        participant_name: str | None = None,
        contact_id: str | None = None,
        subject: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"ws": workspace_id, "channel": channel}
        clauses = ["workspace_id = :ws", "channel = :channel"]
        if external_id:
            clauses.append("external_id = :ext")
            params["ext"] = external_id
        elif participant_email:
            clauses.append("lower(participant_email) = :email")
            params["email"] = participant_email.strip().lower()
        elif participant_phone:
            digits = "".join(c for c in participant_phone if c.isdigit())[-9:]
            clauses.append("replace(participant_phone, ' ', '') LIKE :phone")
            params["phone"] = f"%{digits}"
        else:
            clauses.append("external_id IS NULL")

        row = await self.session.execute(
            text(f"SELECT * FROM omnichannel_conversations WHERE {' AND '.join(clauses)} ORDER BY updated_at DESC LIMIT 1"),
            params,
        )
        existing = _row(row.mappings().first())
        if existing:
            return existing

        conv_id = str(uuid.uuid4())
        await self.session.execute(
            text(
                f"""
                INSERT INTO omnichannel_conversations (
                    id, workspace_id, contact_id, channel, status, subject,
                    participant_name, participant_email, participant_phone, external_id
                )
                VALUES (
                    {uuid_bind(self.session, "id")}, :ws, :cid, :channel, 'open', :subject,
                    :name, :email, :phone, :ext
                )
                """
            ),
            {
                "id": conv_id,
                "ws": workspace_id,
                "cid": contact_id,
                "channel": channel,
                "subject": subject,
                "name": participant_name,
                "email": participant_email,
                "phone": participant_phone,
                "ext": external_id,
            },
        )
        return await self._get_conversation(conv_id, workspace_id)

    async def _add_message(
        self,
        conversation_id: str,
        *,
        direction: str,
        content: str,
        channel: str,
        metadata: dict[str, Any],
        workspace_id: int,
        increment_unread: bool = False,
    ) -> dict[str, Any]:
        msg_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        await self.session.execute(
            text(
                f"""
                INSERT INTO omnichannel_messages (
                    id, conversation_id, direction, content, channel, metadata
                )
                VALUES (
                    {uuid_bind(self.session, "id")}, {uuid_bind(self.session, "cid")},
                    :direction, :content, :channel, {json_bind(self.session, "meta")}
                )
                """
            ),
            {
                "id": msg_id,
                "cid": conversation_id,
                "direction": direction,
                "content": content,
                "channel": channel,
                "meta": _json_dumps(metadata),
            },
        )
        unread_sql = ", unread_count = unread_count + 1" if increment_unread and direction == "in" else ""
        inbound_sql = ", last_inbound_at = :now" if direction == "in" else ""
        await self.session.execute(
            text(
                f"""
                UPDATE omnichannel_conversations
                SET last_message = :content, last_message_at = :now, updated_at = :now
                    {unread_sql}{inbound_sql}
                WHERE id = {uuid_bind(self.session, "cid")} AND workspace_id = :ws
                """
            ),
            {"cid": conversation_id, "content": content[:500], "now": now, "ws": workspace_id},
        )
        row = await self.session.execute(
            text(
                f"""
                SELECT * FROM omnichannel_messages
                WHERE id = {uuid_bind(self.session, "id")}
                """
            ),
            {"id": msg_id},
        )
        return _row(row.mappings().first())

    async def _dispatch_outbound(self, conv: dict[str, Any], channel: str, content: str) -> dict[str, Any]:
        ws = int(conv["workspace_id"])
        try:
            if channel == "email":
                email = conv.get("participant_email")
                if email:
                    ses = get_ses_service()
                    subj = conv.get("subject") or "Respuesta NELVYON"
                    await ses.send_email(str(email), f"Re: {subj}", f"<p>{content}</p>")
                return {"channel": "email", "to": email, "sent": bool(email)}

            if channel == "whatsapp":
                from services.whatsapp_service import get_whatsapp_service

                phone = conv.get("participant_phone")
                if phone:
                    result = await get_whatsapp_service().send_message(str(phone), content)
                    return {"channel": "whatsapp", **result}
                return {"skipped": True, "reason": "no phone"}

            if channel == "sms":
                from services.sms_service import SmsService

                phone = conv.get("participant_phone")
                if phone:
                    result = await SmsService(self.session, ws).send_sms(str(phone), content)
                    return {"channel": "sms", **result}
                return {"skipped": True, "reason": "no phone"}

            if channel == "chat":
                from services.livechat_service import LiveChatService

                ext = conv.get("external_id")
                if ext:
                    svc = LiveChatService(self.session, ws)
                    msg = await svc.send_message(
                        str(ext), "agent", content, tenant_id=ws, skip_auto_reply_schedule=True
                    )
                    return {"channel": "chat", "message_id": msg.get("id")}
                return {"skipped": True, "reason": "no external_id"}

            if channel == "voice":
                return {"channel": "voice", "logged": True, "note": "Voice reply logged in inbox"}

        except Exception as exc:
            logger.warning("dispatch_outbound %s failed: %s", channel, exc)
            return {"channel": channel, "error": str(exc)}
        return {"channel": channel, "skipped": True}

    def _schedule_auto_reply(self, conversation_id: str, workspace_id: int) -> None:
        key = f"{workspace_id}:{conversation_id}"
        existing = _pending_auto_replies.pop(key, None)
        if existing and not existing.done():
            existing.cancel()

        async def _run() -> None:
            await asyncio.sleep(AUTO_REPLY_HOURS * 3600)
            from core.database import db_manager

            if not db_manager.async_session_maker:
                await db_manager.ensure_initialized()
            if not db_manager.async_session_maker:
                return
            async with db_manager.async_session_maker() as session:
                svc = OmnichannelService(session, workspace_id)
                try:
                    await svc.auto_reply(conversation_id, workspace_id)
                except Exception as exc:
                    logger.debug("scheduled auto_reply: %s", exc)

        _pending_auto_replies[key] = asyncio.create_task(_run())

    async def get_contact_context(self, conversation_id: str, workspace_id: int) -> dict[str, Any]:
        conv = await self._get_conversation(conversation_id, workspace_id)
        contact_id = conv.get("contact_id")
        if not contact_id:
            return {"conversation": conv, "contact": None, "interactions": []}
        try:
            crm = CRMService(self.session, workspace_id)
            contact = await crm.get_contact_by_id(str(contact_id))
            return {
                "conversation": conv,
                "contact": contact,
                "interactions": contact.get("metadata", {}).get("interactions", []) if contact else [],
                "score": contact.get("score") if contact else None,
            }
        except Exception as exc:
            logger.debug("get_contact_context: %s", exc)
            return {"conversation": conv, "contact": None, "interactions": []}


async def ingest_omnichannel_inbound(
    session: AsyncSession,
    workspace_id: int,
    channel: str,
    content: str,
    **kwargs: Any,
) -> dict[str, Any]:
    """Public hook for channel integrations."""
    svc = OmnichannelService(session, workspace_id)
    return await svc.ingest_inbound(workspace_id, channel, content, **kwargs)


def get_omnichannel_service(session: AsyncSession, workspace_id: int | None = None) -> OmnichannelService:
    return OmnichannelService(session, workspace_id)

"""Embeddable chatbot builder — config, GPT-4o chat, leads, helpdesk escalation."""

from __future__ import annotations

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

from services.crm_service import CRMService
from services.helpdesk_service import get_helpdesk_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
CHAT_MODEL = "gpt-4o"
BEHAVIORS = frozenset({"soporte", "ventas", "leads", "faq"})
HANDOFF_PATTERNS = re.compile(
    r"(hablar con (una )?persona|agente humano|persona real|operador|humano|"
    r"human agent|talk to (a )?human|speak to (a )?person|quiero un agente)",
    re.IGNORECASE,
)
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
NAME_PATTERNS = [
    re.compile(r"(?:me llamo|soy|mi nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,40})", re.IGNORECASE),
]

BEHAVIOR_PROMPTS = {
    "soporte": "Eres un asistente de soporte amable y resolutivo. Ayuda con incidencias y guía paso a paso.",
    "ventas": "Eres un asesor comercial consultivo. Destaca beneficios sin presionar; invita a demo o contacto.",
    "leads": "Tu objetivo principal es captar leads: pide nombre y email de forma natural cuando haya interés.",
    "faq": "Respondes preguntas frecuentes de forma concisa usando la base de conocimiento del cliente.",
}


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _openai_client() -> AsyncOpenAI | None:
    key = (
        os.environ.get("OPENAI_API_KEY", "").strip()
        or os.environ.get("APP_AI_KEY", "").strip()
    )
    if not key:
        return None
    base = (
        os.environ.get("OPENAI_BASE_URL", "").strip()
        or os.environ.get("APP_AI_BASE_URL", "").strip()
        or None
    )
    return AsyncOpenAI(api_key=key, base_url=base)


def _normalize_config(config: dict[str, Any], name: str = "") -> dict[str, Any]:
    cfg = dict(config or {})
    cfg.setdefault("nombre", name or cfg.get("nombre") or "Asistente")
    cfg.setdefault("avatar_url", "")
    cfg.setdefault("color_primario", "#6366f1")
    cfg.setdefault("mensaje_bienvenida", "¡Hola! ¿En qué puedo ayudarte?")
    cfg.setdefault("idioma", "es")
    comp = str(cfg.get("comportamiento", "soporte")).lower()
    cfg["comportamiento"] = comp if comp in BEHAVIORS else "soporte"
    cfg.setdefault("base_conocimiento", "")
    cfg.setdefault("escalada_a_humano", True)
    return cfg


class ChatbotService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "chatbot_builder.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def create_chatbot(self, workspace_id: int, config: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        name = str(config.get("nombre") or config.get("name") or "Chatbot").strip()
        if not name:
            raise ValueError("nombre is required")
        normalized = _normalize_config(config, name)
        embed_token = str(uuid.uuid4())
        result = await self.session.execute(
            text(
                """
                INSERT INTO chatbots (workspace_id, name, config, embed_token)
                VALUES (:ws, :name, CAST(:config AS jsonb), CAST(:token AS uuid))
                RETURNING *
                """
            ),
            {"ws": ws, "name": name, "config": _json_dumps(normalized), "token": embed_token},
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return self._format_bot(row)

    async def update_chatbot(self, chatbot_id: str, config: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        existing = await self.get_chatbot(chatbot_id)
        merged = {**existing.get("config", {}), **config}
        name = str(config.get("nombre") or config.get("name") or existing.get("name") or "Chatbot").strip()
        normalized = _normalize_config(merged, name)
        is_active = config.get("is_active", existing.get("is_active", True))
        result = await self.session.execute(
            text(
                """
                UPDATE chatbots
                SET name = :name, config = CAST(:config AS jsonb), is_active = :active
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": chatbot_id,
                "ws": self.workspace_id,
                "name": name,
                "config": _json_dumps(normalized),
                "active": bool(is_active),
            },
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Chatbot not found")
        await self.session.commit()
        return self._format_bot(_row(row))

    async def get_chatbot(self, chatbot_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        params: dict[str, Any] = {"id": chatbot_id}
        where = "id = CAST(:id AS uuid)"
        if self.workspace_id is not None:
            await self._set_tenant(self.workspace_id)
            where += " AND workspace_id = :ws"
            params["ws"] = self.workspace_id
        result = await self.session.execute(
            text(f"SELECT * FROM chatbots WHERE {where}"),
            params,
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Chatbot not found")
        return self._format_bot(_row(row))

    async def get_by_embed_token(self, embed_token: str) -> dict[str, Any]:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                SELECT * FROM chatbots
                WHERE embed_token = CAST(:token AS uuid) AND is_active = true
                """
            ),
            {"token": embed_token},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Chatbot not found")
        return self._format_bot(_row(row))

    async def list_chatbots(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.session.execute(
            text(
                """
                SELECT
                    c.*,
                    COUNT(conv.id) FILTER (WHERE conv.started_at >= :day_start) AS conversations_today,
                    COUNT(conv.id) AS conversations_total,
                    COUNT(conv.id) FILTER (WHERE conv.lead_captured) AS leads_captured
                FROM chatbots c
                LEFT JOIN chatbot_conversations conv ON conv.chatbot_id = c.id
                WHERE c.workspace_id = :ws
                GROUP BY c.id
                ORDER BY c.created_at DESC
                """
            ),
            {"ws": ws, "day_start": day_start},
        )
        return [self._format_bot(_row(r), with_stats=True) for r in result.mappings().all()]

    async def delete_chatbot(self, chatbot_id: str) -> bool:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text(
                """
                DELETE FROM chatbots
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING id
                """
            ),
            {"id": chatbot_id, "ws": self.workspace_id},
        )
        ok = result.mappings().first() is not None
        await self.session.commit()
        return ok

    def _format_bot(self, row: dict[str, Any], *, with_stats: bool = False) -> dict[str, Any]:
        cfg = row.get("config") or {}
        if isinstance(cfg, str):
            cfg = json.loads(cfg)
        bot = {
            "id": str(row.get("id", "")),
            "workspace_id": row.get("workspace_id"),
            "name": row.get("name"),
            "config": cfg,
            "is_active": bool(row.get("is_active", True)),
            "embed_token": str(row.get("embed_token", "")),
            "created_at": row.get("created_at"),
        }
        if with_stats:
            bot["conversations_today"] = int(row.get("conversations_today") or 0)
            bot["conversations_total"] = int(row.get("conversations_total") or 0)
            bot["leads_captured"] = int(row.get("leads_captured") or 0)
        return bot

    def get_public_widget_config(self, bot: dict[str, Any]) -> dict[str, Any]:
        cfg = bot.get("config") or {}
        return {
            "chatbot_id": bot["id"],
            "nombre": cfg.get("nombre") or bot.get("name"),
            "avatar_url": cfg.get("avatar_url", ""),
            "color_primario": cfg.get("color_primario", "#6366f1"),
            "mensaje_bienvenida": cfg.get("mensaje_bienvenida", "¡Hola! ¿En qué puedo ayudarte?"),
            "idioma": cfg.get("idioma", "es"),
        }

    def _build_system_prompt(self, bot: dict[str, Any]) -> str:
        cfg = bot.get("config") or {}
        behavior = str(cfg.get("comportamiento", "soporte")).lower()
        behavior_line = BEHAVIOR_PROMPTS.get(behavior, BEHAVIOR_PROMPTS["soporte"])
        lang = cfg.get("idioma", "es")
        kb = (cfg.get("base_conocimiento") or "").strip()
        name = cfg.get("nombre") or bot.get("name") or "Asistente"
        parts = [
            f"Eres {name}, chatbot embebible de una empresa.",
            behavior_line,
            f"Responde siempre en idioma: {lang}.",
            "Sé breve (máximo 3 párrafos cortos). No inventes datos que no estén en la base de conocimiento.",
        ]
        if kb:
            parts.append(f"Base de conocimiento del cliente:\n{kb}")
        if cfg.get("escalada_a_humano"):
            parts.append(
                "Si el visitante pide hablar con una persona, confirma que crearás un ticket para un agente humano."
            )
        return "\n\n".join(parts)

    async def chat(
        self,
        chatbot_id: str,
        session_id: str,
        message: str,
        visitor_info: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        bot = await self.get_chatbot(chatbot_id)
        if not bot.get("is_active"):
            raise ValueError("Chatbot inactive")
        ws = int(bot["workspace_id"])
        await self._set_tenant(ws)

        sid = (session_id or "").strip() or str(uuid.uuid4())
        text_in = (message or "").strip()
        if not text_in:
            raise ValueError("message is required")

        conv = await self._get_or_create_conversation(bot["id"], ws, sid, visitor_info or {})
        messages: list[dict[str, Any]] = list(conv.get("messages") or [])
        if isinstance(messages, str):
            messages = json.loads(messages)

        now_iso = datetime.now(timezone.utc).isoformat()
        messages.append({"role": "user", "content": text_in, "at": now_iso})

        cfg = bot.get("config") or {}
        escalated = bool(conv.get("escalated"))
        lead_captured = bool(conv.get("lead_captured"))
        reply = ""
        handoff = False

        if cfg.get("escalada_a_humano") and HANDOFF_PATTERNS.search(text_in):
            handoff = True
            reply = (
                "Entendido. He creado un ticket para que un agente humano te contacte pronto. "
                "¿Hay algo más que debamos saber mientras tanto?"
            )
            if not escalated:
                await self._escalate_to_helpdesk(bot, conv, text_in, visitor_info or {})
                escalated = True
        else:
            reply = await self._generate_reply(bot, messages)

        messages.append({"role": "assistant", "content": reply, "at": datetime.now(timezone.utc).isoformat()})

        visitor_merged = {**(conv.get("visitor_info") or {}), **(visitor_info or {})}
        if not lead_captured:
            lead = self._extract_lead(messages, visitor_merged)
            if lead:
                visitor_merged.update(lead)
                try:
                    await CRMService.ensure_db()
                    crm = CRMService(self.session, ws)
                    await crm.create_contact(
                        name=lead.get("name") or "Visitante web",
                        email=lead.get("email"),
                        metadata={"source": "chatbot", "chatbot_id": bot["id"], "session_id": sid},
                    )
                    lead_captured = True
                except Exception as exc:
                    logger.warning("chatbot lead capture failed: %s", exc)

        await self.session.execute(
            text(
                """
                UPDATE chatbot_conversations
                SET messages = CAST(:messages AS jsonb),
                    visitor_info = CAST(:visitor AS jsonb),
                    lead_captured = :lead,
                    escalated = :escalated,
                    last_message_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": conv["id"],
                "messages": _json_dumps(messages),
                "visitor": _json_dumps(visitor_merged),
                "lead": lead_captured,
                "escalated": escalated,
            },
        )
        await self.session.commit()

        return {
            "session_id": sid,
            "reply": reply,
            "escalated": escalated,
            "lead_captured": lead_captured,
            "handoff": handoff,
        }

    async def _generate_reply(self, bot: dict[str, Any], messages: list[dict[str, Any]]) -> str:
        system = self._build_system_prompt(bot)
        client = _openai_client()
        if not client:
            cfg = bot.get("config") or {}
            welcome = cfg.get("mensaje_bienvenida", "")
            return (
                f"{welcome + ' ' if welcome else ''}"
                "Gracias por tu mensaje. En este momento el asistente IA no está disponible; "
                "un miembro del equipo revisará tu consulta pronto."
            ).strip()

        chat_messages = [{"role": "system", "content": system}]
        for m in messages[-12:]:
            role = "assistant" if m.get("role") == "assistant" else "user"
            chat_messages.append({"role": role, "content": m.get("content", "")})

        try:
            resp = await client.chat.completions.create(
                model=CHAT_MODEL,
                messages=chat_messages,
                temperature=0.5,
                max_tokens=500,
            )
            return (resp.choices[0].message.content or "").strip() or "¿En qué más puedo ayudarte?"
        except Exception as exc:
            logger.warning("chatbot GPT failed: %s", exc)
            return (
                "Gracias por escribirnos. He registrado tu mensaje y te responderemos en breve."
            )

    async def _get_or_create_conversation(
        self,
        chatbot_id: str,
        workspace_id: int,
        session_id: str,
        visitor_info: dict[str, Any],
    ) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM chatbot_conversations
                WHERE chatbot_id = CAST(:bot AS uuid) AND session_id = :sid
                LIMIT 1
                """
            ),
            {"bot": chatbot_id, "sid": session_id},
        )
        row = result.mappings().first()
        if row:
            conv = _row(row)
            if isinstance(conv.get("messages"), str):
                conv["messages"] = json.loads(conv["messages"])
            if isinstance(conv.get("visitor_info"), str):
                conv["visitor_info"] = json.loads(conv["visitor_info"])
            return conv

        ins = await self.session.execute(
            text(
                """
                INSERT INTO chatbot_conversations (
                    chatbot_id, workspace_id, session_id, visitor_info, messages
                )
                VALUES (
                    CAST(:bot AS uuid), :ws, :sid, CAST(:visitor AS jsonb), '[]'::jsonb
                )
                RETURNING *
                """
            ),
            {"bot": chatbot_id, "ws": workspace_id, "sid": session_id, "visitor": _json_dumps(visitor_info)},
        )
        conv = _row(ins.mappings().first())
        conv["messages"] = []
        conv["visitor_info"] = visitor_info
        await self.session.commit()
        return conv

    async def _escalate_to_helpdesk(
        self,
        bot: dict[str, Any],
        conv: dict[str, Any],
        last_message: str,
        visitor_info: dict[str, Any],
    ) -> None:
        ws = int(bot["workspace_id"])
        visitor = {**(conv.get("visitor_info") or {}), **visitor_info}
        name = visitor.get("name") or visitor.get("nombre") or "Visitante chatbot"
        email = visitor.get("email") or visitor.get("correo")
        try:
            await get_helpdesk_service(self.session, ws).create_ticket(
                channel="web",
                contact_data={"client_name": name, "client_email": email},
                subject=f"Escalada chatbot — {bot.get('name', 'Chatbot')}",
                first_message=last_message,
                priority="high",
            )
        except Exception as exc:
            logger.warning("chatbot helpdesk escalation failed: %s", exc)

    def _extract_lead(
        self,
        messages: list[dict[str, Any]],
        visitor_info: dict[str, Any],
    ) -> dict[str, str] | None:
        if visitor_info.get("email"):
            return {
                "email": str(visitor_info["email"]),
                "name": str(visitor_info.get("name") or visitor_info.get("nombre") or "Visitante"),
            }
        combined = " ".join(m.get("content", "") for m in messages if m.get("role") == "user")
        email_match = EMAIL_PATTERN.search(combined)
        if not email_match:
            return None
        email = email_match.group(0)
        name = str(visitor_info.get("name") or "")
        for pat in NAME_PATTERNS:
            m = pat.search(combined)
            if m:
                name = m.group(1).strip()
                break
        if not name:
            name = "Visitante web"
        return {"email": email, "name": name}

    async def get_conversations(self, chatbot_id: str) -> list[dict[str, Any]]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text(
                """
                SELECT id, session_id, visitor_info, lead_captured, escalated,
                       satisfaction, started_at, last_message_at,
                       jsonb_array_length(messages) AS message_count
                FROM chatbot_conversations
                WHERE chatbot_id = CAST(:bot AS uuid) AND workspace_id = :ws
                ORDER BY last_message_at DESC
                LIMIT 200
                """
            ),
            {"bot": chatbot_id, "ws": self.workspace_id},
        )
        items = []
        for r in result.mappings().all():
            row = _row(r)
            vi = row.get("visitor_info")
            if isinstance(vi, str):
                row["visitor_info"] = json.loads(vi)
            items.append(row)
        return items

    async def get_conversation_detail(self, session_id: str, chatbot_id: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        where = "session_id = :sid AND workspace_id = :ws"
        params: dict[str, Any] = {"sid": session_id, "ws": self.workspace_id}
        if chatbot_id:
            where += " AND chatbot_id = CAST(:bot AS uuid)"
            params["bot"] = chatbot_id
        result = await self.session.execute(
            text(f"SELECT * FROM chatbot_conversations WHERE {where} LIMIT 1"),
            params,
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Conversation not found")
        conv = _row(row)
        if isinstance(conv.get("messages"), str):
            conv["messages"] = json.loads(conv["messages"])
        if isinstance(conv.get("visitor_info"), str):
            conv["visitor_info"] = json.loads(conv["visitor_info"])
        return conv

    async def get_stats(self, chatbot_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        counts = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) AS total_conversations,
                    COUNT(*) FILTER (WHERE lead_captured) AS leads_captured,
                    COUNT(*) FILTER (WHERE escalated) AS escalated,
                    COALESCE(AVG(satisfaction) FILTER (WHERE satisfaction IS NOT NULL), 0) AS avg_satisfaction
                FROM chatbot_conversations
                WHERE chatbot_id = CAST(:bot AS uuid) AND workspace_id = :ws
                """
            ),
            {"bot": chatbot_id, "ws": self.workspace_id},
        )
        c = counts.mappings().first()
        chart = await self.session.execute(
            text(
                """
                SELECT DATE(started_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS total
                FROM chatbot_conversations
                WHERE chatbot_id = CAST(:bot AS uuid) AND workspace_id = :ws
                  AND started_at >= :week_ago
                GROUP BY DATE(started_at AT TIME ZONE 'UTC')
                ORDER BY day ASC
                """
            ),
            {"bot": chatbot_id, "ws": self.workspace_id, "week_ago": week_ago},
        )
        by_day = [{"day": str(r["day"]), "total": int(r["total"] or 0)} for r in chart.mappings().all()]
        return {
            "total_conversations": int(c["total_conversations"] or 0),
            "leads_captured": int(c["leads_captured"] or 0),
            "escalated": int(c["escalated"] or 0),
            "avg_satisfaction": round(float(c["avg_satisfaction"] or 0), 2),
            "conversations_by_day": by_day,
        }

    async def get_global_stats(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) AS total_conversations,
                    COUNT(*) FILTER (WHERE lead_captured) AS leads_captured,
                    COUNT(*) FILTER (WHERE escalated) AS escalated
                FROM chatbot_conversations
                WHERE workspace_id = :ws
                """
            ),
            {"ws": ws},
        )
        r = result.mappings().first()
        return {
            "total_conversations": int(r["total_conversations"] or 0),
            "leads_captured": int(r["leads_captured"] or 0),
            "escalated": int(r["escalated"] or 0),
        }


def get_chatbot_service(session: AsyncSession, workspace_id: int | None = None) -> ChatbotService:
    return ChatbotService(session, workspace_id)

"""GPT-4o premium agents with persistent client context (pgvector)."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, timedelta
from typing import Any, AsyncGenerator

from openai import AsyncOpenAI
from sqlalchemy import text

from core.database import db_manager
from services import memory_service
from services.crm_service import CRMService
from services.google_ads_service import get_google_ads_service
from services.gsc_service import get_gsc_service
from services.klaviyo_service import build_email_marketing_premium_context
from services.seo_apis import build_seo_premium_context

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gpt-4o"
WORKSPACE_CLIENT_PREFIX = "ai-ws"


AGENT_DEFINITIONS: list[dict[str, str]] = [
    {
        "id": "seo_agent",
        "name": "SEO Premium",
        "description": "Experto SEO con datos reales de Google Search Console, Semrush y DataForSEO.",
    },
    {
        "id": "content_agent",
        "name": "Content Premium",
        "description": "Copywriter senior alineado con la voz de marca y propuesta de valor del cliente.",
    },
    {
        "id": "ads_agent",
        "name": "Ads Premium",
        "description": "Especialista en Google Ads y Meta Ads con histórico de campañas del workspace.",
    },
    {
        "id": "email_agent",
        "name": "Email Premium",
        "description": "Email marketing con datos Klaviyo y campañas SES del cliente.",
    },
    {
        "id": "crm_agent",
        "name": "CRM Premium",
        "description": "Analista CRM con pipeline, win rate y actividades reales del workspace.",
    },
]

PREMIUM_PROMPTS: dict[str, str] = {
    "seo_agent": (
        "Eres el agente SEO premium de NELVYON: auditor técnico, estratega de contenidos y analista de "
        "posicionamiento. Usa ÚNICAMENTE los datos reales de GSC/Semrush/DataForSEO del contexto. "
        "Prioriza quick wins, keywords con intención de negocio y métricas verificables. "
        "Responde en español, estructurado y accionable."
    ),
    "content_agent": (
        "Eres copywriter premium de NELVYON. Respeta la voz de marca, tono y propuesta de valor del cliente. "
        "Genera titulares, landings, posts y emails con claridad, persuasión ética y CTA medibles. "
        "Español nativo, sin clichés vacíos."
    ),
    "ads_agent": (
        "Eres estratega de paid media (Google Ads + Meta). Optimiza ROAS, estructura de campañas, "
        "segmentación y creatividades. Basa recomendaciones en el histórico real del contexto; "
        "no inventes métricas."
    ),
    "email_agent": (
        "Eres especialista en email marketing y lifecycle. Diseña secuencias, asuntos A/B y "
        "automatizaciones usando datos Klaviyo/SES del contexto. Cumple GDPR y buenas prácticas de entregabilidad."
    ),
    "crm_agent": (
        "Eres analista CRM senior. Interpreta pipeline, deals, win rate y actividades del cliente. "
        "Recomienda priorización de oportunidades y siguientes pasos concretos por contacto/deal."
    ),
}


def _workspace_client_id(workspace_id: int) -> str:
    return f"{WORKSPACE_CLIENT_PREFIX}-{workspace_id}"


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


def list_agents() -> list[dict[str, str]]:
    return [dict(agent) for agent in AGENT_DEFINITIONS]


class AIService:
    """GPT-4o chat with workspace-scoped persistent memory."""

    def __init__(self, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.workspace_id = int(workspace_id)
        self.client_id = _workspace_client_id(self.workspace_id)

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        model: str = DEFAULT_MODEL,
        *,
        stream: bool = False,
    ) -> Any:
        client = _openai_client()
        return await client.chat.completions.create(
            model=model or DEFAULT_MODEL,
            messages=messages,
            stream=stream,
        )

    async def get_context(self) -> dict[str, Any]:
        items = await memory_service.list_client_memories(
            self.workspace_id, self.client_id, limit=100
        )
        kv: dict[str, Any] = {}
        for item in items:
            meta = item.get("metadata") or {}
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except json.JSONDecodeError:
                    meta = {}
            if meta.get("type") == "ai_context_kv" and meta.get("key"):
                kv[str(meta["key"])] = meta.get("value", item.get("content"))
        context_text = await memory_service.get_client_context(
            self.workspace_id, self.client_id, max_items=50
        )
        return {
            "workspace_id": self.workspace_id,
            "client_id": self.client_id,
            "kv": kv,
            "items": items,
            "context": context_text,
        }

    async def save_context(self, key: str, value: Any) -> dict[str, Any]:
        key = key.strip()
        if not key:
            raise ValueError("key is required")
        content = f"{key}: {value}"
        row_id = await memory_service.save_memory(
            self.workspace_id,
            self.client_id,
            content,
            metadata={
                "type": "ai_context_kv",
                "key": key,
                "value": value,
            },
        )
        if not row_id:
            raise RuntimeError("Failed to save context to client_memory")
        return {"ok": True, "key": key, "id": row_id}

    async def clear_context(self) -> dict[str, Any]:
        deleted = await memory_service.delete_client_memories(
            self.workspace_id, self.client_id
        )
        return {"ok": True, "deleted_count": deleted}

    async def _load_brand_context(self) -> dict[str, Any]:
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            return {}
        async with db_manager.async_session_maker() as session:
            result = await session.execute(
                text(
                    """
                    SELECT business_name, brand_tone, value_proposition, visual_style,
                           objectives, website_url, sector
                    FROM nelvyon_clients
                    WHERE workspace_id = :workspace_id
                    ORDER BY id DESC LIMIT 1
                    """
                ),
                {"workspace_id": self.workspace_id},
            )
            row = result.mappings().first()
            return dict(row) if row else {}

    async def _load_agent_data(self, agent_type: str, user_message: str) -> str:
        parts: list[str] = []
        agent_type = (agent_type or "content_agent").strip()

        if agent_type == "seo_agent":
            domain = os.environ.get("GSC_SITE_URL", "").strip()
            if not domain:
                brand = await self._load_brand_context()
                domain = (brand.get("website_url") or "").strip()
            domain = re.sub(r"^https?://", "", domain).strip("/") if domain else None
            keywords = [user_message[:80]] if user_message else ["seo"]
            seo_data = await build_seo_premium_context(
                domain=domain, keywords=keywords
            )
            end = date.today()
            start = end - timedelta(days=30)
            gsc = get_gsc_service()
            site = domain or "https://example.com/"
            if not site.endswith("/"):
                site += "/"
            try:
                gsc_data = await gsc.get_search_analytics(
                    site, start.isoformat(), end.isoformat(), dimensions=["query"]
                )
            except Exception as exc:
                gsc_data = {"error": str(exc)}
            parts.append(
                "Datos SEO reales:\n"
                + json.dumps(
                    {"semrush_dataforseo": seo_data, "gsc": gsc_data},
                    ensure_ascii=False,
                    default=str,
                )
            )

        elif agent_type == "content_agent":
            brand = await self._load_brand_context()
            if brand:
                parts.append(
                    "Brand voice del cliente:\n"
                    + json.dumps(brand, ensure_ascii=False, default=str)
                )

        elif agent_type == "ads_agent":
            ads = get_google_ads_service()
            try:
                campaigns = await ads.get_campaigns(None)
                parts.append(
                    "Google Ads (datos reales):\n"
                    + json.dumps(campaigns, ensure_ascii=False, default=str)
                )
            except Exception as exc:
                parts.append(f"Google Ads: error al cargar ({exc})")

        elif agent_type == "email_agent":
            klaviyo = await build_email_marketing_premium_context()
            campaign_stats: dict[str, Any] = {}
            if db_manager.async_session_maker:
                async with db_manager.async_session_maker() as session:
                    row = await session.execute(
                        text(
                            """
                            SELECT
                                COUNT(*) AS total,
                                COALESCE(SUM(sent_count), 0) AS sent,
                                COALESCE(SUM(open_count), 0) AS opened,
                                COALESCE(SUM(click_count), 0) AS clicked
                            FROM campaigns
                            WHERE workspace_id = :workspace_id
                            """
                        ),
                        {"workspace_id": self.workspace_id},
                    )
                    campaign_stats = dict(row.mappings().first() or {})
            parts.append(
                "Email marketing real:\n"
                + json.dumps(
                    {"klaviyo": klaviyo, "campaigns": campaign_stats},
                    ensure_ascii=False,
                    default=str,
                )
            )

        elif agent_type == "crm_agent":
            if db_manager.async_session_maker:
                async with db_manager.async_session_maker() as session:
                    crm = CRMService(session, self.workspace_id)
                    stats = await crm.get_stats()
                    pipeline = await crm.get_pipeline_view()
                    parts.append(
                        "CRM real:\n"
                        + json.dumps(
                            {"stats": stats, "pipeline_totals": pipeline.get("totals")},
                            ensure_ascii=False,
                            default=str,
                        )
                    )

        return "\n\n".join(parts)

    async def _build_messages(
        self,
        user_message: str,
        agent_type: str,
        *,
        history: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        agent_type = (agent_type or "content_agent").strip()
        if agent_type not in PREMIUM_PROMPTS:
            raise ValueError(f"Unknown agent_type: {agent_type}")

        relevant = await memory_service.search_memory(
            self.workspace_id,
            self.client_id,
            user_message or "contexto",
            limit=6,
        )
        memory_block = memory_service.format_relevant_memories(relevant)
        ctx = await self.get_context()
        kv_block = json.dumps(ctx.get("kv") or {}, ensure_ascii=False, default=str)
        data_block = await self._load_agent_data(agent_type, user_message)

        system_content = "\n\n".join(
            part
            for part in [
                PREMIUM_PROMPTS[agent_type],
                f"Workspace ID: {self.workspace_id}",
                f"Contexto persistente (clave-valor): {kv_block}",
                f"Memoria relevante:\n{memory_block}",
                data_block,
            ]
            if part
        )

        messages: list[dict[str, Any]] = [{"role": "system", "content": system_content}]
        if history:
            for msg in history:
                role = msg.get("role")
                content = msg.get("content")
                if role in ("user", "assistant", "system") and content:
                    messages.append({"role": role, "content": str(content)})
        messages.append({"role": "user", "content": user_message.strip()})
        return messages

    async def chat_with_context(
        self,
        user_message: str,
        agent_type: str,
        *,
        model: str = DEFAULT_MODEL,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        if not user_message or not user_message.strip():
            raise ValueError("user_message is required")

        messages = await self._build_messages(user_message, agent_type, history=history)
        response = await self.chat_completion(messages, model=model, stream=False)
        assistant = ""
        if response.choices:
            assistant = (response.choices[0].message.content or "").strip()

        await memory_service.save_memory(
            self.workspace_id,
            self.client_id,
            f"Usuario: {user_message.strip()}\nAsistente: {assistant}",
            metadata={"type": "ai_chat", "agent_type": agent_type, "model": model},
        )

        return {
            "workspace_id": self.workspace_id,
            "agent_type": agent_type,
            "model": model,
            "message": assistant,
            "usage": response.usage.model_dump() if response.usage else None,
        }

    async def stream_chat_with_context(
        self,
        user_message: str,
        agent_type: str,
        *,
        model: str = DEFAULT_MODEL,
        history: list[dict[str, Any]] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Yield SSE lines: data: {json}\\n\\n and terminal data: [DONE]\\n\\n."""
        if not user_message or not user_message.strip():
            yield f"data: {json.dumps({'error': 'user_message is required'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        messages = await self._build_messages(user_message, agent_type, history=history)
        assistant_parts: list[str] = []
        try:
            stream = await self.chat_completion(messages, model=model, stream=True)
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    assistant_parts.append(delta)
                    yield f"data: {json.dumps({'content': delta})}\n\n"
        except Exception as exc:
            logger.warning("AI stream error: %s", exc)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            assistant_text = "".join(assistant_parts).strip()
            if user_message.strip() or assistant_text:
                await memory_service.save_memory(
                    self.workspace_id,
                    self.client_id,
                    f"Usuario: {user_message.strip()}\nAsistente: {assistant_text}",
                    metadata={
                        "type": "ai_chat",
                        "agent_type": agent_type,
                        "model": model,
                    },
                )
            yield "data: [DONE]\n\n"


def get_ai_service(workspace_id: int) -> AIService:
    return AIService(workspace_id)

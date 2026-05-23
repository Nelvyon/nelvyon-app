"""Voice command control — Whisper transcription + GPT-4o intent parsing."""

from __future__ import annotations

import io
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.crm_service import CRMService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
WHISPER_MODEL = "whisper-1"
PARSE_MODEL = "gpt-4o"

PARSE_SYSTEM = """Eres el intérprete de comandos de voz para NELVYON SaaS.
Devuelve SOLO JSON válido con esta forma:
{
  "action": "navigate" | "query" | "create" | "unknown",
  "route": "/dashboard/..." (solo si navigate),
  "module": "crm" | "helpdesk" | "campaigns" | "social" (solo si query/create),
  "metric": "contacts_count" | "open_tickets" | "pipeline_value" (solo si query),
  "params": {} (solo si create),
  "confidence": 0.0-1.0
}

Rutas válidas:
- campañas → /dashboard/campanas
- crm, contactos, pipeline → /dashboard/crm
- helpdesk, tickets → /dashboard/helpdesk
- social, posts → /dashboard/social-scheduler
- sms → /dashboard/sms
- webs → /dashboard/websites
- tiendas → /dashboard/stores

Ejemplos:
"muéstrame mis campañas" → {"action":"navigate","route":"/dashboard/campanas"}
"cuántos contactos tengo" → {"action":"query","module":"crm","metric":"contacts_count"}
"cuántos tickets abiertos" → {"action":"query","module":"helpdesk","metric":"open_tickets"}
"programa un post para mañana" → {"action":"navigate","route":"/dashboard/social-scheduler"}
"crea una campaña llamada Black Friday" → {"action":"create","module":"campaigns","params":{"name":"Black Friday"}}
"""


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
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class VoiceCommandsService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "voice_commands.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def transcribe_command(self, audio_blob: bytes, *, filename: str = "command.webm") -> str:
        client = _openai_client()
        if not client:
            raise ValueError(
                "OpenAI no configurado. Define OPENAI_API_KEY para usar comandos de voz."
            )
        if not audio_blob:
            raise ValueError("Audio vacío")
        buf = io.BytesIO(audio_blob)
        buf.name = filename
        result = await client.audio.transcriptions.create(model=WHISPER_MODEL, file=buf, language="es")
        return (result.text or "").strip()

    async def parse_command(self, text: str, workspace_id: int | None = None) -> dict[str, Any]:
        client = _openai_client()
        cleaned = (text or "").strip()
        if not cleaned:
            return {"action": "unknown", "confidence": 0}

        if not client:
            return self._heuristic_parse(cleaned)

        try:
            resp = await client.chat.completions.create(
                model=PARSE_MODEL,
                messages=[
                    {"role": "system", "content": PARSE_SYSTEM},
                    {"role": "user", "content": cleaned},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            raw = resp.choices[0].message.content or "{}"
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                parsed.setdefault("action", "unknown")
                return parsed
        except Exception as exc:
            logger.warning("voice parse_command GPT failed: %s", exc)

        return self._heuristic_parse(cleaned)

    def _heuristic_parse(self, text: str) -> dict[str, Any]:
        lower = text.lower()
        if any(w in lower for w in ("campaña", "campañas", "campaign")):
            if "cuánt" in lower or "cuant" in lower:
                return {"action": "navigate", "route": "/dashboard/campanas", "confidence": 0.6}
            return {"action": "navigate", "route": "/dashboard/campanas", "confidence": 0.7}
        if "contacto" in lower:
            return {"action": "query", "module": "crm", "metric": "contacts_count", "confidence": 0.7}
        if "ticket" in lower:
            return {"action": "query", "module": "helpdesk", "metric": "open_tickets", "confidence": 0.7}
        if "pipeline" in lower:
            return {"action": "navigate", "route": "/dashboard/crm", "confidence": 0.7}
        if "post" in lower or "social" in lower:
            return {"action": "navigate", "route": "/dashboard/social-scheduler", "confidence": 0.7}
        return {"action": "unknown", "confidence": 0.3}

    async def execute_query(self, workspace_id: int, module: str, metric: str) -> str:
        ws = int(workspace_id)
        mod = (module or "").lower()
        met = (metric or "").lower()

        if mod == "crm":
            if met in ("contacts_count", "contacts", "contactos"):
                await CRMService.ensure_db()
                stats = await CRMService(self.session, ws).get_stats()
                count = stats.get("contacts", 0)
                return f"Tienes {count} contactos en tu CRM."
            if met in ("pipeline_value", "pipeline"):
                await CRMService.ensure_db()
                stats = await CRMService(self.session, ws).get_stats()
                val = stats.get("pipeline_value", 0)
                return f"El valor de tu pipeline abierto es {val:.2f} €."
        if mod == "helpdesk" and met in ("open_tickets", "tickets", "tickets_abiertos"):
            from services.helpdesk_service import get_helpdesk_service

            stats = await get_helpdesk_service(self.session, ws).get_stats()
            open_count = int(stats.get("open_count") or 0)
            return f"Tienes {open_count} tickets abiertos en helpdesk."

        return "No pude obtener ese dato todavía."

    async def process_audio(
        self,
        audio_blob: bytes,
        *,
        filename: str = "command.webm",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        status = "ok"
        response = ""
        transcript = ""
        action: dict[str, Any] = {"action": "unknown"}

        try:
            transcript = await self.transcribe_command(audio_blob, filename=filename)
            action = await self.parse_command(transcript, self.workspace_id)
            if action.get("action") == "query":
                response = await self.execute_query(
                    self.workspace_id,
                    str(action.get("module") or ""),
                    str(action.get("metric") or ""),
                )
        except Exception as exc:
            status = "error"
            response = str(exc)
            logger.warning("voice process_audio: %s", exc)

        await self._save_history(transcript, action, response, status)
        return {
            "transcript": transcript,
            "action": action,
            "response": response,
            "status": status,
        }

    async def _save_history(
        self,
        transcript: str,
        action: dict[str, Any],
        response: str,
        status: str,
    ) -> None:
        await self.session.execute(
            text(
                """
                INSERT INTO voice_commands (workspace_id, transcript, action, response, status)
                VALUES (:ws, :transcript, CAST(:action AS jsonb), :response, :status)
                """
            ),
            {
                "ws": self.workspace_id,
                "transcript": transcript or "(vacío)",
                "action": json.dumps(action, ensure_ascii=False),
                "response": response,
                "status": status,
            },
        )
        await self.session.commit()

    async def get_voice_history(self, workspace_id: int | None = None, *, limit: int = 20) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        result = await self.session.execute(
            text(
                """
                SELECT * FROM voice_commands
                WHERE workspace_id = :ws
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"ws": ws, "limit": limit},
        )
        return [_row(r) for r in result.fetchall()]


def get_voice_commands_service(session: AsyncSession, workspace_id: int) -> VoiceCommandsService:
    return VoiceCommandsService(session, workspace_id)

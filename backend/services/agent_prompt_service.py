"""Load and decrypt OS agent prompts from DB — decrypted content stays in memory only."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.agent_encryption import decrypt_prompt
from core.database import db_manager

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
_MEMORY_CACHE: dict[str, dict[str, str]] = {}


class AgentPromptService:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "os_agent_prompts.sql"
        if sql_path.is_file() and db_manager.async_session_maker:
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("os_agent_prompts schema skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def get_prompt_payload(self, agent_id: str) -> dict[str, str]:
        """Return decrypted elite_role, mission, few_shot for an agent."""
        aid = (agent_id or "").strip().lower()
        if not aid:
            raise ValueError("agent_id is required")

        if aid in _MEMORY_CACHE:
            return dict(_MEMORY_CACHE[aid])

        await self.ensure_schema()
        r = await self.session.execute(
            text("SELECT prompt_encrypted FROM os_agent_prompts WHERE agent_id = :id"),
            {"id": aid},
        )
        row = r.mappings().first()
        if not row:
            raise KeyError(f"Unknown agent prompt: {aid}")

        decrypted = decrypt_prompt(str(row["prompt_encrypted"]))
        try:
            payload = json.loads(decrypted)
        except json.JSONDecodeError:
            payload = {"elite_role": decrypted, "mission": "", "few_shot": "{}"}

        result = {
            "elite_role": str(payload.get("elite_role") or payload.get("eliteRole") or ""),
            "mission": str(payload.get("mission") or ""),
            "few_shot": str(payload.get("few_shot") or payload.get("fewShotExample") or payload.get("few_shot_example") or "{}"),
        }
        _MEMORY_CACHE[aid] = result
        return result


def get_agent_prompt_service(session: AsyncSession) -> AgentPromptService:
    return AgentPromptService(session)

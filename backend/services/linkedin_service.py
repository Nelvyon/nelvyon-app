"""F62 — LinkedIn outreach sequences (mock without OAuth token)."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
RATE_LIMIT_PER_HOUR = 40


def _mock_mode() -> bool:
    return not os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


async def _generate_messages(name: str, company: str, sector: str, role: str) -> dict[str, Any]:
    client = _openai_client()
    if not client:
        return {
            "connection_request": f"Hola {name}, me encantaría conectar — veo gran encaje con {company} en {sector}.",
            "follow_up_1": f"{name}, ¿tiene 15 min esta semana para ver cómo NELVYON acelera {sector}?",
            "follow_up_2": f"Cierro el hilo, {name} — si le interesa automatizar marketing en {company}, aquí estoy.",
            "mock": True,
        }
    try:
        resp = await client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Genera outreach LinkedIn B2B en JSON para {name}, {role} en {company}, sector {sector}. "
                        'Keys: connection_request, follow_up_1, follow_up_2 (máx 280 chars cada uno).'
                    ),
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.6,
        )
        return {**json.loads(resp.choices[0].message.content or "{}"), "mock": False}
    except Exception as exc:
        logger.warning("linkedin GPT fallback: %s", exc)
        return await _generate_messages(name, company, sector, role)


class LinkedInService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id

    async def _ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS linkedin_outreach (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    client_id TEXT NOT NULL,
                    contact_id TEXT,
                    prospect_name TEXT,
                    company TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    messages_json TEXT NOT NULL DEFAULT '{}',
                    metrics_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS linkedin_inbox (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    client_id TEXT NOT NULL,
                    outreach_id TEXT,
                    from_name TEXT,
                    message TEXT NOT NULL,
                    received_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def _hourly_count(self) -> int:
        row = await self.session.execute(
            text(
                """
                SELECT COUNT(*) AS c FROM linkedin_outreach
                WHERE workspace_id = :ws
                AND created_at >= datetime('now', '-1 hour')
                """
            ),
            {"ws": self.workspace_id},
        )
        return int(row.scalar_one() or 0)

    async def send_connect(
        self,
        *,
        client_id: str,
        prospect_name: str,
        company: str,
        sector: str,
        role: str = "Director",
        contact_id: str | None = None,
        preview_only: bool = False,
    ) -> dict[str, Any]:
        await self._ensure_schema()
        if await self._hourly_count() >= RATE_LIMIT_PER_HOUR and not _mock_mode():
            raise ValueError("LinkedIn rate limit reached for this hour")

        messages = await _generate_messages(prospect_name, company, sector, role)
        if preview_only:
            return {"preview": messages, "mock": _mock_mode()}

        oid = str(uuid.uuid4())
        status = "connected" if _mock_mode() else "pending"
        await self.session.execute(
            text(
                f"""
                INSERT INTO linkedin_outreach
                (id, workspace_id, client_id, contact_id, prospect_name, company, status, messages_json)
                VALUES (:id, :ws, :cid, :contact_id, :name, :company, :status, {json_bind(self.session, "msgs")})
                """
            ),
            {
                "id": oid,
                "ws": self.workspace_id,
                "cid": client_id,
                "contact_id": contact_id,
                "name": prospect_name,
                "company": company,
                "status": status,
                "msgs": json.dumps(messages),
            },
        )
        await self.session.commit()
        return {
            "outreach_id": oid,
            "status": status,
            "messages": messages,
            "mock": _mock_mode(),
        }

    async def start_sequence(
        self,
        *,
        client_id: str,
        contact_id: str,
        prospect_name: str,
        company: str,
        sector: str,
        role: str = "Director",
    ) -> dict[str, Any]:
        base = await self.send_connect(
            client_id=client_id,
            prospect_name=prospect_name,
            company=company,
            sector=sector,
            role=role,
            contact_id=contact_id,
        )
        steps = ["connection_request", "follow_up_1", "follow_up_2"]
        return {
            **base,
            "sequence_steps": steps,
            "sequence_status": "active",
        }

    async def stats(self, client_id: str) -> dict[str, Any]:
        await self._ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT status, COUNT(*) AS c FROM linkedin_outreach
                WHERE workspace_id = :ws AND client_id = :cid
                GROUP BY status
                """
            ),
            {"ws": self.workspace_id, "cid": client_id},
        )
        counts = {r["status"]: int(r["c"]) for r in rows.mappings().all()}
        total = sum(counts.values()) or 1
        connected = counts.get("connected", 0) + counts.get("responded", 0)
        responded = counts.get("responded", 0)
        return {
            "client_id": client_id,
            "pending": counts.get("pending", 0),
            "connected": connected,
            "responded": responded,
            "acceptance_rate_percent": round((connected / total) * 100, 1),
            "response_rate_percent": round((responded / total) * 100, 1),
            "meetings_booked": counts.get("meeting", 0),
            "mock": _mock_mode(),
        }

    async def inbox(self, client_id: str) -> dict[str, Any]:
        await self._ensure_schema()
        if _mock_mode():
            await self.session.execute(
                text(
                    """
                    INSERT INTO linkedin_inbox (id, workspace_id, client_id, from_name, message)
                    SELECT :id, :ws, :cid, :fn, :msg
                    WHERE NOT EXISTS (
                        SELECT 1 FROM linkedin_inbox WHERE workspace_id = :ws AND client_id = :cid LIMIT 1
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "ws": self.workspace_id,
                    "cid": client_id,
                    "fn": "Prospecto Demo",
                    "msg": "Me interesa, ¿podemos hablar el jueves?",
                },
            )
            await self.session.execute(
                text(
                    "UPDATE linkedin_outreach SET status = 'responded' WHERE workspace_id = :ws AND client_id = :cid"
                ),
                {"ws": self.workspace_id, "cid": client_id},
            )
            await self.session.commit()
        result = await self.session.execute(
            text(
                """
                SELECT id, from_name, message, received_at, outreach_id
                FROM linkedin_inbox
                WHERE workspace_id = :ws AND client_id = :cid
                ORDER BY received_at DESC
                LIMIT 50
                """
            ),
            {"ws": self.workspace_id, "cid": client_id},
        )
        return {"client_id": client_id, "items": [dict(r) for r in result.mappings().all()], "mock": _mock_mode()}

    async def list_prospects(self, client_id: str) -> dict[str, Any]:
        await self._ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT id, contact_id, prospect_name, company, status, messages_json, created_at
                FROM linkedin_outreach
                WHERE workspace_id = :ws AND client_id = :cid
                ORDER BY created_at DESC
                """
            ),
            {"ws": self.workspace_id, "cid": client_id},
        )
        items = []
        for r in rows.mappings().all():
            d = dict(r)
            try:
                d["messages"] = json.loads(d.pop("messages_json", "{}") or "{}")
            except json.JSONDecodeError:
                d["messages"] = {}
            items.append(d)
        return {"client_id": client_id, "prospects": items, "mock": _mock_mode()}


def get_linkedin_service(session: AsyncSession, workspace_id: int) -> LinkedInService:
    return LinkedInService(session, workspace_id)

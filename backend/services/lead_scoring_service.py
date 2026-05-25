"""AI lead scoring for CRM contacts — GPT-4o with heuristic fallback."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

SCORE_MODEL = "gpt-4o"


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


def tier_from_score(score: int) -> str:
    if score >= 80:
        return "ready"
    if score >= 60:
        return "hot"
    if score >= 30:
        return "warm"
    return "cold"


class LeadScoringService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = int(workspace_id)

    async def score_lead(self, lead_data: dict[str, Any]) -> dict[str, Any]:
        client = _openai_client()
        if client:
            try:
                return await self._score_with_gpt(client, lead_data)
            except Exception as exc:
                logger.warning("Lead scoring GPT failed, using heuristic: %s", exc)
        return self._heuristic_score(lead_data)

    async def _score_with_gpt(self, client: AsyncOpenAI, lead_data: dict[str, Any]) -> dict[str, Any]:
        prompt = (
            "Evalúa este lead y responde SOLO JSON: score (0-100 int), reasons (array), next_action (string).\n"
            f"Datos: {json.dumps(lead_data, ensure_ascii=False)}"
        )
        resp = await client.chat.completions.create(
            model=SCORE_MODEL,
            messages=[
                {"role": "system", "content": "Analista de ventas B2B. Solo JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=400,
        )
        content = (resp.choices[0].message.content or "").strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if match:
            content = match.group(1).strip()
        parsed = json.loads(content)
        score = max(0, min(100, int(parsed.get("score", 50))))
        reasons = parsed.get("reasons") or []
        if not isinstance(reasons, list):
            reasons = [str(reasons)]
        return {
            "score": score,
            "tier": tier_from_score(score),
            "reasons": [str(r) for r in reasons[:6]],
            "next_action": str(parsed.get("next_action") or "Seguimiento estándar"),
            "model": SCORE_MODEL,
        }

    def _heuristic_score(self, lead_data: dict[str, Any]) -> dict[str, Any]:
        score = 15
        score += min(20, int(lead_data.get("email_opens") or 0) * 4)
        score += min(15, int(lead_data.get("email_clicks") or 0) * 6)
        score += min(15, int(lead_data.get("web_visits") or 0) * 3)
        score += min(10, int(lead_data.get("pages_viewed") or 0) * 2)
        score += min(10, int(lead_data.get("chatbot_interactions") or 0) * 5)
        score += min(15, int(lead_data.get("purchase_count") or 0) * 8)
        score += min(10, int(lead_data.get("time_on_site_minutes") or 0) // 2)
        score = max(0, min(100, score))
        tier = tier_from_score(score)
        actions = {
            "cold": "Nurturing automatizado.",
            "warm": "Email personalizado + caso de éxito.",
            "hot": "Llamada comercial en 48h.",
            "ready": "Propuesta comercial inmediata.",
        }
        return {
            "score": score,
            "tier": tier,
            "reasons": [f"Opens: {lead_data.get('email_opens', 0)}", f"Visitas: {lead_data.get('web_visits', 0)}"],
            "next_action": actions[tier],
            "model": "heuristic",
        }

    async def _build_lead_data_from_contact(self, contact_id: str) -> dict[str, Any]:
        row = await self.session.execute(
            text(
                """
                SELECT id, name, email, company, status, score, metadata
                FROM crm_contacts
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            {"id": contact_id, "ws": self.workspace_id},
        )
        contact = row.mappings().first()
        if not contact:
            raise ValueError("Contact not found")
        meta = contact.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except json.JSONDecodeError:
                meta = {}
        act = await self.session.execute(
            text(
                "SELECT COUNT(*) FROM crm_activities WHERE contact_id = CAST(:cid AS uuid) AND workspace_id = :ws"
            ),
            {"cid": contact_id, "ws": self.workspace_id},
        )
        return {
            "contact_id": str(contact["id"]),
            "name": contact.get("name"),
            "email": contact.get("email"),
            "company": contact.get("company"),
            "email_opens": meta.get("email_opens", 0),
            "email_clicks": meta.get("email_clicks", 0),
            "web_visits": meta.get("web_visits", 0),
            "pages_viewed": meta.get("pages_viewed", 0),
            "time_on_site_minutes": meta.get("time_on_site_minutes", 0),
            "chatbot_interactions": meta.get("chatbot_interactions", 0),
            "purchase_count": meta.get("purchase_count", 0),
            "crm_activities": int(act.scalar_one() or 0),
            "demographics": meta.get("demographics", {}),
        }

    async def score_contact(self, contact_id: str) -> dict[str, Any]:
        lead_data = await self._build_lead_data_from_contact(contact_id)
        result = await self.score_lead(lead_data)
        scored_at = datetime.now(timezone.utc).isoformat()
        meta_patch = {
            "lead_score": result["score"],
            "lead_tier": result["tier"],
            "lead_reasons": result["reasons"],
            "lead_next_action": result["next_action"],
            "lead_scored_at": scored_at,
            "lead_model": result.get("model"),
        }
        await self.session.execute(
            text(
                """
                UPDATE crm_contacts
                SET score = :score,
                    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{lead_ai}', CAST(:patch AS jsonb), true),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            {
                "score": result["score"],
                "patch": json.dumps(meta_patch, ensure_ascii=False),
                "id": contact_id,
                "ws": self.workspace_id,
            },
        )
        return {"contact_id": contact_id, "lead_data": lead_data, **result, "scored_at": scored_at}

    async def auto_score_contact(self, contact_id: str) -> None:
        try:
            await self.score_contact(contact_id)
        except Exception as exc:
            logger.debug("auto_score_contact skipped for %s: %s", contact_id, exc)

    async def list_ranking(self, *, limit: int = 50) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT id, name, email, company, status, score, metadata
                FROM crm_contacts WHERE workspace_id = :ws
                ORDER BY score DESC NULLS LAST, updated_at DESC LIMIT :lim
                """
            ),
            {"ws": self.workspace_id, "lim": limit},
        )
        items = []
        for row in result.mappings().all():
            meta = row.get("metadata") or {}
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except json.JSONDecodeError:
                    meta = {}
            ai = meta.get("lead_ai") or {}
            score = int(row.get("score") or 0)
            items.append(
                {
                    "contact_id": str(row["id"]),
                    "name": row.get("name"),
                    "email": row.get("email"),
                    "company": row.get("company"),
                    "score": score,
                    "tier": ai.get("lead_tier") or tier_from_score(score),
                    "next_action": ai.get("lead_next_action"),
                    "reasons": ai.get("lead_reasons") or [],
                }
            )
        return {"total": len(items), "items": items}


def get_lead_scoring_service(session: AsyncSession, workspace_id: int) -> LeadScoringService:
    return LeadScoringService(session, workspace_id)

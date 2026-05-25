"""F64 — Intent scoring from behavior + CDP events."""

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

TIER_COLD = (0, 40)
TIER_WARM = (41, 70)
TIER_HOT = (71, 100)

SEQUENCE_BY_TIER = {
    "cold": "nurturing",
    "warm": "email_retargeting",
    "hot": "closing_alert",
}


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


def _tier(score: int) -> str:
    if score <= TIER_COLD[1]:
        return "cold"
    if score <= TIER_WARM[1]:
        return "warm"
    return "hot"


class IntentDataService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS intent_events (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    lead_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    page TEXT,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS intent_scores (
                    lead_id TEXT NOT NULL,
                    workspace_id INTEGER NOT NULL,
                    score INTEGER NOT NULL DEFAULT 0,
                    tier TEXT NOT NULL DEFAULT 'cold',
                    signals_json TEXT NOT NULL DEFAULT '[]',
                    recommendation TEXT,
                    lead_name TEXT,
                    company TEXT,
                    alerts_enabled INTEGER NOT NULL DEFAULT 1,
                    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (lead_id, workspace_id)
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def track_event(
        self,
        *,
        lead_id: str,
        event_type: str,
        page: str | None = None,
        metadata: dict | None = None,
        lead_name: str | None = None,
        company: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        eid = str(uuid.uuid4())
        meta = metadata or {}
        if page:
            meta["page"] = page
        await self.session.execute(
            text(
                f"""
                INSERT INTO intent_events (id, workspace_id, lead_id, event_type, page, metadata_json)
                VALUES (:id, :ws, :lid, :etype, :page, {json_bind(self.session, "meta")})
                """
            ),
            {
                "id": eid,
                "ws": self.workspace_id,
                "lid": lead_id,
                "etype": event_type,
                "page": page,
                "meta": json.dumps(meta, ensure_ascii=False),
            },
        )
        score_row = await self.recalculate_score(
            lead_id, lead_name=lead_name, company=company
        )
        await self.session.commit()
        return {"event_id": eid, **score_row}

    async def _cdp_events_for_lead(self, lead_id: str) -> list[dict[str, Any]]:
        try:
            rows = await self.session.execute(
                text(
                    """
                    SELECT event_type, properties, created_at
                    FROM cdp_events
                    WHERE workspace_id = :ws
                      AND (user_id = :lid OR properties LIKE :like)
                    ORDER BY created_at DESC LIMIT 100
                    """
                ),
                {"ws": self.workspace_id, "lid": lead_id, "like": f"%{lead_id}%"},
            )
            return [dict(r) for r in rows.mappings().all()]
        except Exception:
            return []

    def _score_from_events(self, events: list[dict[str, Any]]) -> tuple[int, list[str]]:
        score = 10
        signals: list[str] = []
        pricing_hits = 0
        email_opens = 0
        clicks = 0
        long_sessions = 0
        pages_seen: set[str] = set()

        for ev in events:
            etype = (ev.get("event_type") or "").lower()
            page = (ev.get("page") or "").lower()
            props = ev.get("metadata_json") or ev.get("properties") or "{}"
            if isinstance(props, str):
                try:
                    props = json.loads(props)
                except json.JSONDecodeError:
                    props = {}
            if not page and isinstance(props, dict):
                page = (props.get("page") or props.get("url") or "").lower()

            pages_seen.add(page or etype)
            if "pricing" in page or "/pricing" in page:
                pricing_hits += 1
            if etype in ("email_open", "email.open", "open"):
                email_opens += 1
            if etype in ("click", "cta_click", "email_click"):
                clicks += 1
            dur = props.get("duration_seconds") or props.get("time_on_page") if isinstance(props, dict) else 0
            try:
                if int(dur or 0) >= 180:
                    long_sessions += 1
            except (TypeError, ValueError):
                pass

        if pricing_hits:
            score += min(35, 20 + pricing_hits * 8)
            signals.append(f"Visitó pricing {pricing_hits}x")
        if email_opens:
            score += min(20, email_opens * 8)
            signals.append(f"Abrió {email_opens} email(s)")
        if clicks:
            score += min(25, clicks * 10)
            signals.append(f"Clics CTA: {clicks}")
        if long_sessions:
            score += min(20, long_sessions * 12)
            signals.append(f"Sesión >3 min: {long_sessions}")
        if len(pages_seen) >= 4:
            score += 12
            signals.append(f"Navegación amplia ({len(pages_seen)} páginas/eventos)")

        return min(100, max(0, score)), signals

    async def recalculate_score(
        self,
        lead_id: str,
        *,
        lead_name: str | None = None,
        company: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        local = await self.session.execute(
            text(
                """
                SELECT event_type, page, metadata_json, created_at
                FROM intent_events WHERE workspace_id = :ws AND lead_id = :lid
                ORDER BY created_at DESC LIMIT 200
                """
            ),
            {"ws": self.workspace_id, "lid": lead_id},
        )
        events = [dict(r) for r in local.mappings().all()]
        for cdp in await self._cdp_events_for_lead(lead_id):
            events.append(
                {
                    "event_type": cdp.get("event_type"),
                    "page": None,
                    "metadata_json": cdp.get("properties"),
                }
            )

        score, signals = self._score_from_events(events)
        tier = _tier(score)
        recommendation = await self._ai_recommendation(score, tier, signals)

        existing = await self.session.execute(
            text(
                "SELECT lead_name, company FROM intent_scores WHERE lead_id = :lid AND workspace_id = :ws"
            ),
            {"lid": lead_id, "ws": self.workspace_id},
        )
        ex = existing.mappings().first()
        name = lead_name or (ex["lead_name"] if ex else None) or f"Lead {lead_id[:8]}"
        comp = company or (ex["company"] if ex else None) or ""

        await self.session.execute(
            text(
                f"""
                INSERT INTO intent_scores (
                    lead_id, workspace_id, score, tier, signals_json, recommendation,
                    lead_name, company, last_updated
                )
                VALUES (
                    :lid, :ws, :score, :tier, {json_bind(self.session, "signals")},
                    :rec, :name, :comp, :now
                )
                ON CONFLICT(lead_id, workspace_id) DO UPDATE SET
                    score = :score, tier = :tier, signals_json = excluded.signals_json,
                    recommendation = :rec, lead_name = :name, company = :comp,
                    last_updated = :now
                """
            ),
            {
                "lid": lead_id,
                "ws": self.workspace_id,
                "score": score,
                "tier": tier,
                "signals": json.dumps(signals, ensure_ascii=False),
                "rec": recommendation,
                "name": name,
                "comp": comp,
                "now": datetime.now(timezone.utc).isoformat(),
            },
        )
        return {
            "lead_id": lead_id,
            "score": score,
            "tier": tier,
            "signals": signals,
            "recommendation": recommendation,
            "lead_name": name,
            "company": comp,
        }

    async def _ai_recommendation(self, score: int, tier: str, signals: list[str]) -> str:
        client = _openai_client()
        if not client:
            defaults = {
                "cold": "Activar secuencia nurturing 7 touchpoints.",
                "warm": "Email + retargeting Meta/Google 14 días.",
                "hot": "Alerta comercial inmediata + secuencia cierre 48h.",
            }
            return defaults.get(tier, defaults["cold"])
        try:
            resp = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Intent score {score} ({tier}). Señales: {signals}. "
                            "Una frase de acción comercial para el equipo (español)."
                        ),
                    }
                ],
                max_tokens=120,
                temperature=0.4,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.debug("intent AI rec skipped: %s", exc)
            return f"Prioridad {tier}: contactar según playbook NELVYON."

    async def get_score(self, lead_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        row = await self.session.execute(
            text("SELECT * FROM intent_scores WHERE lead_id = :lid AND workspace_id = :ws"),
            {"lid": lead_id, "ws": self.workspace_id},
        )
        r = row.mappings().first()
        if not r:
            return await self.recalculate_score(lead_id)
        data = dict(r)
        data["signals"] = json.loads(data.get("signals_json") or "[]")
        return data

    async def hot_leads(self, min_score: int = 70) -> dict[str, Any]:
        await self.ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT * FROM intent_scores
                WHERE workspace_id = :ws AND score >= :min
                ORDER BY score DESC, last_updated DESC
                LIMIT 100
                """
            ),
            {"ws": self.workspace_id, "min": min_score},
        )
        items = []
        for r in rows.mappings().all():
            d = dict(r)
            d["signals"] = json.loads(d.get("signals_json") or "[]")
            items.append(d)
        return {"leads": items, "min_score": min_score}

    async def score_distribution(self) -> dict[str, Any]:
        await self.ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT tier, COUNT(*) AS cnt FROM intent_scores
                WHERE workspace_id = :ws GROUP BY tier
                """
            ),
            {"ws": self.workspace_id},
        )
        dist = {"cold": 0, "warm": 0, "hot": 0}
        for r in rows.mappings().all():
            dist[r["tier"]] = int(r["cnt"])
        return {"distribution": dist, "total": sum(dist.values())}

    async def trigger_sequence(self, lead_id: str) -> dict[str, Any]:
        score_row = await self.get_score(lead_id)
        tier = score_row.get("tier") or _tier(int(score_row.get("score") or 0))
        seq = SEQUENCE_BY_TIER.get(tier, "nurturing")
        await self.session.execute(
            text(
                f"""
                INSERT INTO intent_events (id, workspace_id, lead_id, event_type, metadata_json)
                VALUES (:id, :ws, :lid, 'sequence_triggered', {json_bind(self.session, "meta")})
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "ws": self.workspace_id,
                "lid": lead_id,
                "meta": json.dumps({"sequence": seq, "tier": tier}, ensure_ascii=False),
            },
        )
        alert_sent = False
        if tier == "hot":
            settings = await self.get_alert_settings()
            if settings.get("alerts_enabled", True):
                alert_sent = True
                logger.info(
                    "intent hot lead alert ws=%s lead=%s score=%s",
                    self.workspace_id,
                    lead_id,
                    score_row.get("score"),
                )
        await self.session.commit()
        return {
            "lead_id": lead_id,
            "tier": tier,
            "sequence": seq,
            "score": score_row.get("score"),
            "alert_sent": alert_sent,
            "mock": not _openai_client(),
        }

    async def get_alert_settings(self) -> dict[str, Any]:
        await self.ensure_schema()
        row = await self.session.execute(
            text(
                """
                SELECT alerts_enabled FROM intent_scores
                WHERE workspace_id = :ws LIMIT 1
                """
            ),
            {"ws": self.workspace_id},
        )
        r = row.mappings().first()
        enabled = bool(r["alerts_enabled"]) if r else True
        return {"workspace_id": self.workspace_id, "alerts_enabled": enabled}

    async def set_alert_settings(self, enabled: bool) -> dict[str, Any]:
        await self.ensure_schema()
        await self.session.execute(
            text(
                "UPDATE intent_scores SET alerts_enabled = :en WHERE workspace_id = :ws"
            ),
            {"en": 1 if enabled else 0, "ws": self.workspace_id},
        )
        await self.session.commit()
        return {"alerts_enabled": enabled}


def get_intent_data_service(session: AsyncSession, workspace_id: int) -> IntentDataService:
    return IntentDataService(session, workspace_id)

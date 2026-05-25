"""Churn risk prediction — GPT-4o + Redis alerts (TTL 24h)."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.redis_adapter import redis_client

logger = logging.getLogger(__name__)

CHURN_MODEL = "gpt-4o"
ALERT_TTL_SECONDS = 86400
ALERT_RISK_THRESHOLD = 70
AT_RISK_THRESHOLD = 60


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class ChurnPredictionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _gather_signals(self, user_id: str, workspace_id: int) -> dict[str, Any]:
        ws_row = await self.session.execute(
            text("SELECT id, name, industry, status, updated_at FROM workspaces WHERE id = :ws"),
            {"ws": workspace_id},
        )
        ws = ws_row.mappings().first()
        sub = await self.session.execute(
            text(
                "SELECT plan_id, status, updated_at FROM subscriptions WHERE workspace_id = :ws AND status = 'active' ORDER BY id DESC LIMIT 1"
            ),
            {"ws": workspace_id},
        )
        subscription = sub.mappings().first()
        tickets = await self.session.execute(
            text(
                "SELECT COUNT(*) FROM helpdesk_tickets WHERE workspace_id = :ws AND status NOT IN ('resolved', 'closed')"
            ),
            {"ws": workspace_id},
        )
        open_tickets = int(tickets.scalar_one() or 0)
        days_since = 0
        if ws and ws.get("updated_at") and isinstance(ws["updated_at"], datetime):
            days_since = (datetime.now(timezone.utc) - ws["updated_at"].replace(tzinfo=timezone.utc)).days
        return {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "workspace_name": ws.get("name") if ws else None,
            "industry": ws.get("industry") if ws else None,
            "days_since_activity": days_since,
            "plan_id": str(subscription["plan_id"]) if subscription else "starter",
            "open_support_tickets": open_tickets,
            "feature_usage_trend": "declining" if days_since > 14 else "stable",
        }

    def _heuristic_risk(self, signals: dict[str, Any]) -> dict[str, Any]:
        risk = 10
        days = int(signals.get("days_since_activity") or 0)
        if days > 30:
            risk += 35
        elif days > 14:
            risk += 20
        elif days > 7:
            risk += 10
        risk += min(25, int(signals.get("open_support_tickets") or 0) * 8)
        if signals.get("feature_usage_trend") == "declining":
            risk += 15
        risk = max(0, min(100, risk))
        reasons = []
        if days > 14:
            reasons.append(f"Sin actividad en {days} días")
        if signals.get("open_support_tickets"):
            reasons.append(f"{signals['open_support_tickets']} tickets abiertos")
        return {
            "risk_score": risk,
            "risk_level": "high" if risk >= 70 else "medium" if risk >= 40 else "low",
            "reasons": reasons or ["Uso estable"],
            "preventive_actions": ["Check-in proactivo", "Revisar tickets abiertos"],
            "model": "heuristic",
        }

    async def _gpt_risk(self, signals: dict[str, Any]) -> dict[str, Any]:
        client = _openai_client()
        if not client:
            return self._heuristic_risk(signals)
        prompt = (
            "Riesgo de churn 0-100. JSON: risk_score, reasons (array), preventive_actions (array).\n"
            f"Señales: {json.dumps(signals, ensure_ascii=False, default=str)}"
        )
        resp = await client.chat.completions.create(
            model=CHURN_MODEL,
            messages=[
                {"role": "system", "content": "Analista retención SaaS. Solo JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=500,
        )
        raw = (resp.choices[0].message.content or "").strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        if match:
            raw = match.group(1).strip()
        parsed = json.loads(raw)
        risk = max(0, min(100, int(parsed.get("risk_score", 50))))
        return {
            "risk_score": risk,
            "risk_level": "high" if risk >= 70 else "medium" if risk >= 40 else "low",
            "reasons": parsed.get("reasons") or [],
            "preventive_actions": parsed.get("preventive_actions") or [],
            "model": CHURN_MODEL,
        }

    async def _maybe_alert(self, workspace_id: int, prediction: dict[str, Any]) -> None:
        risk = int(prediction.get("risk_score") or 0)
        if risk < ALERT_RISK_THRESHOLD:
            return
        key = f"churn:alert:{workspace_id}"
        if await redis_client.exists(key):
            return
        payload = json.dumps({"workspace_id": workspace_id, "risk_score": risk, "reasons": prediction.get("reasons")})
        await redis_client.set(key, payload, ttl=ALERT_TTL_SECONDS)

    async def predict_churn(self, user_id: str, workspace_id: int) -> dict[str, Any]:
        signals = await self._gather_signals(user_id, workspace_id)
        try:
            prediction = await self._gpt_risk(signals)
        except Exception as exc:
            logger.warning("Churn GPT failed: %s", exc)
            prediction = self._heuristic_risk(signals)
        await self._maybe_alert(workspace_id, prediction)
        return {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "signals": signals,
            **prediction,
            "alert_active": bool(await redis_client.exists(f"churn:alert:{workspace_id}")),
            "predicted_at": datetime.now(timezone.utc).isoformat(),
        }

    async def list_at_risk(self, user_id: str, *, threshold: int = AT_RISK_THRESHOLD) -> dict[str, Any]:
        ws_rows = await self.session.execute(
            text(
                """
                SELECT id FROM workspaces WHERE user_id = :uid
                UNION
                SELECT workspace_id FROM workspace_members WHERE user_id = :uid AND status = 'active'
                """
            ),
            {"uid": user_id},
        )
        items = []
        for (wid,) in ws_rows.fetchall():
            pred = await self.predict_churn(user_id, int(wid))
            if int(pred.get("risk_score") or 0) >= threshold:
                items.append(
                    {
                        "workspace_id": int(wid),
                        "workspace_name": pred.get("signals", {}).get("workspace_name"),
                        "risk_score": pred["risk_score"],
                        "risk_level": pred.get("risk_level"),
                        "reasons": pred.get("reasons"),
                        "preventive_actions": pred.get("preventive_actions"),
                        "alert_active": pred.get("alert_active"),
                    }
                )
        items.sort(key=lambda x: x["risk_score"], reverse=True)
        return {"threshold": threshold, "total": len(items), "items": items}


def get_churn_prediction_service(session: AsyncSession) -> ChurnPredictionService:
    return ChurnPredictionService(session)

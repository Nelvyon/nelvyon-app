"""Unified paid media agent — briefing → GPT strategy → Google + Meta launch → optimization."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from services.google_ads_service import get_google_ads_service
from services.meta_ads_service import get_meta_ads_service

logger = logging.getLogger(__name__)

DEFAULT_ROAS_THRESHOLD = 1.5


def _mock_gpt_strategy(briefing: dict[str, Any]) -> dict[str, Any]:
    product = briefing.get("product", "NELVYON")
    budget = float(briefing.get("daily_budget_eur", 80))
    audience = briefing.get("audience", "founders y CMOs en España")
    return {
        "strategy_summary": (
            f"Estrategia full-funnel para {product}: captación en Meta (IG) y intención en Google Search, "
            f"presupuesto diario {budget}€ repartido 45% Google / 55% Meta."
        ),
        "google": {
            "campaign_type": "SEARCH",
            "name": f"{product} — Search IA",
            "daily_budget_eur": round(budget * 0.45, 2),
            "headlines": [
                f"{product}: marketing IA autónomo",
                "ROAS medible desde día 1",
                "Agentes Google + Meta integrados",
            ],
            "descriptions": [
                "Automatiza campañas, copys y reporting en un solo panel.",
                "Briefing → lanzamiento → optimización cada 24h.",
            ],
        },
        "meta": {
            "objective": "OUTCOME_SALES",
            "name": f"{product} — Social IA",
            "daily_budget_eur": round(budget * 0.55, 2),
            "primary_text": f"Escala {product} con creatividades DALL·E y targeting IA para {audience}.",
            "headline": "Tu imperio empieza hoy",
            "targeting": {
                "geo_locations": {"countries": ["ES"]},
                "age_min": 25,
                "age_max": 55,
                "interests": ["marketing", "SaaS", "ecommerce"],
            },
        },
    }


async def _gpt_strategy(briefing: dict[str, Any]) -> dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return _mock_gpt_strategy(briefing)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=api_key,
            base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").strip(),
        )
        prompt = (
            "Eres director de paid media. Devuelve SOLO JSON con keys: strategy_summary, google, meta. "
            "google: campaign_type (SEARCH|DISPLAY|PERFORMANCE_MAX), name, daily_budget_eur, headlines[], descriptions[]. "
            "meta: objective, name, daily_budget_eur, primary_text, headline, targeting. "
            f"Briefing: {json.dumps(briefing, ensure_ascii=False)}"
        )
        resp = await client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        return json.loads(raw)
    except Exception as exc:
        logger.warning("ads_agent GPT fallback: %s", exc)
        return _mock_gpt_strategy(briefing)


class AdsAgentService:
    """Orchestrates cross-platform campaigns for workspace tenants."""

    async def run_briefing(
        self,
        *,
        workspace_id: int,
        briefing: dict[str, Any],
        launch: bool = False,
    ) -> dict[str, Any]:
        run_id = f"ads_{uuid.uuid4().hex[:12]}"
        strategy = await _gpt_strategy(briefing)
        result: dict[str, Any] = {
            "run_id": run_id,
            "workspace_id": workspace_id,
            "briefing": briefing,
            "strategy": strategy,
            "launched": False,
            "google": None,
            "meta": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if launch:
            result["launched"] = True
            result["google"] = await self._launch_google(strategy.get("google", {}))
            result["meta"] = await self._launch_meta(strategy.get("meta", {}), briefing)

        return result

    async def _launch_google(self, plan: dict[str, Any]) -> dict[str, Any]:
        svc = get_google_ads_service()
        created = await svc.create_campaign(
            name=plan.get("name", "NELVYON Search"),
            campaign_type=plan.get("campaign_type", "SEARCH"),
            daily_budget_eur=float(plan.get("daily_budget_eur", 40)),
            headlines=list(plan.get("headlines", [])),
            descriptions=list(plan.get("descriptions", [])),
        )
        if created.get("campaign_id"):
            await svc.upload_ad_copy(
                campaign_id=str(created["campaign_id"]),
                headlines=list(plan.get("headlines", [])),
                descriptions=list(plan.get("descriptions", [])),
            )
        return created

    async def _launch_meta(self, plan: dict[str, Any], briefing: dict[str, Any]) -> dict[str, Any]:
        svc = get_meta_ads_service()
        image_url = briefing.get("creative_image_url") or "https://nelvyon.com/og-image.png"
        created = await svc.create_campaign(
            name=plan.get("name", "NELVYON Meta"),
            objective=plan.get("objective", "OUTCOME_SALES"),
            daily_budget_eur=float(plan.get("daily_budget_eur", 45)),
            targeting=plan.get("targeting"),
            creative_image_url=image_url,
            primary_text=plan.get("primary_text"),
            headline=plan.get("headline"),
        )
        await svc.upload_creative(
            image_url=image_url,
            primary_text=plan.get("primary_text", ""),
            headline=plan.get("headline", ""),
        )
        return created

    async def unified_reporting(self) -> dict[str, Any]:
        google = await get_google_ads_service().get_reporting_summary()
        meta_raw = await get_meta_ads_service().get_campaigns()
        meta_campaigns = meta_raw.get("campaigns", [])
        impressions = sum(int(c.get("impressions", 0)) for c in meta_campaigns)
        clicks = sum(int(c.get("clicks", 0)) for c in meta_campaigns)
        spend = round(sum(float(c.get("spend", 0)) for c in meta_campaigns), 2)
        roas_vals = [float(c.get("roas", 0)) for c in meta_campaigns if c.get("roas")]
        meta_summary = {
            "reach": sum(int(c.get("reach", 0)) for c in meta_campaigns),
            "impressions": impressions,
            "clicks": clicks,
            "ctr": round((clicks / impressions) * 100, 2) if impressions else 0,
            "cpm": round((spend / impressions) * 1000, 2) if impressions else 0,
            "spend": spend,
            "roas": round(sum(roas_vals) / len(roas_vals), 2) if roas_vals else 0,
        }
        return {
            "google": google,
            "meta": {"campaigns": meta_campaigns, "summary": meta_summary, "mock": meta_raw.get("mock")},
            "unified": {
                "total_spend": round(
                    float(google.get("summary", {}).get("cost", 0)) + meta_summary["spend"],
                    2,
                ),
                "blended_roas": round(
                    (
                        float(google.get("summary", {}).get("roas", 0))
                        + meta_summary["roas"]
                    )
                    / 2,
                    2,
                ),
            },
        }

    async def optimize_all(self, *, roas_threshold: float = DEFAULT_ROAS_THRESHOLD) -> dict[str, Any]:
        """24h optimization pass — pause underperformers, boost winners (mock rules)."""
        report = await self.unified_reporting()
        actions: list[dict[str, Any]] = []
        for c in report.get("google", {}).get("campaigns", []):
            roas = float(c.get("conversions", 0)) / max(float(c.get("cost", 1)), 0.01) * 2
            if roas < roas_threshold:
                actions.append(
                    {
                        "platform": "google",
                        "campaign_id": c.get("campaign_id"),
                        "action": "reduce_budget_15pct",
                        "reason": f"ROAS estimado {roas:.2f} < {roas_threshold}",
                    }
                )
        for c in report.get("meta", {}).get("campaigns", []):
            roas = float(c.get("roas", 0))
            if roas < roas_threshold:
                actions.append(
                    {
                        "platform": "meta",
                        "campaign_id": c.get("campaign_id"),
                        "action": "refresh_creative",
                        "reason": f"ROAS {roas:.2f} bajo umbral",
                    }
                )
        return {
            "optimized_at": datetime.now(timezone.utc).isoformat(),
            "roas_threshold": roas_threshold,
            "actions": actions,
            "report_snapshot": report,
        }

    async def roas_alerts(self, *, threshold: float = DEFAULT_ROAS_THRESHOLD) -> dict[str, Any]:
        report = await self.unified_reporting()
        alerts: list[dict[str, Any]] = []
        g_roas = float(report.get("google", {}).get("summary", {}).get("roas", 0))
        m_roas = float(report.get("meta", {}).get("summary", {}).get("roas", 0))
        if g_roas and g_roas < threshold:
            alerts.append(
                {
                    "platform": "google",
                    "severity": "warning",
                    "message": f"ROAS Google ({g_roas}) por debajo de {threshold}",
                    "roas": g_roas,
                }
            )
        if m_roas and m_roas < threshold:
            alerts.append(
                {
                    "platform": "meta",
                    "severity": "warning",
                    "message": f"ROAS Meta ({m_roas}) por debajo de {threshold}",
                    "roas": m_roas,
                }
            )
        blended = float(report.get("unified", {}).get("blended_roas", 0))
        if blended and blended < threshold:
            alerts.append(
                {
                    "platform": "unified",
                    "severity": "critical",
                    "message": f"ROAS combinado ({blended}) bajo umbral {threshold}",
                    "roas": blended,
                }
            )
        return {"threshold": threshold, "alerts": alerts, "report": report}


_ads_agent_service: AdsAgentService | None = None


def get_ads_agent_service() -> AdsAgentService:
    global _ads_agent_service
    if _ads_agent_service is None:
        _ads_agent_service = AdsAgentService()
    return _ads_agent_service

"""F65 — Snapchat Marketing API campaigns + AI creative (mock without client id)."""

from __future__ import annotations

import json
import logging
import os
import random
import uuid
from typing import Any

import httpx
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
SNAP_API = "https://adsapi.snapchat.com/v1"
VALID_OBJECTIVES = frozenset({"awareness", "traffic", "conversions", "app_install"})


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class SnapchatAdsService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self._init_attempted = False
        self._mock = False
        self.client_id = ""
        self.client_secret = ""
        self.ad_account_id = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.client_id = os.environ.get("SNAPCHAT_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("SNAPCHAT_CLIENT_SECRET", "").strip()
        self.ad_account_id = os.environ.get("SNAPCHAT_AD_ACCOUNT_ID", "").strip()
        if not self.client_id:
            self._mock = True
            logger.info("SnapchatAdsService: SNAPCHAT_CLIENT_ID missing — mock mode")

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS snapchat_ads_campaigns (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    external_id TEXT,
                    name TEXT NOT NULL,
                    objective TEXT NOT NULL DEFAULT 'conversions',
                    daily_budget_eur REAL NOT NULL DEFAULT 50,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    metrics_json TEXT NOT NULL DEFAULT '{}',
                    creative_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        await self.session.commit()
        _SCHEMA_READY = True

    async def create_campaign(
        self,
        *,
        name: str,
        objective: str = "conversions",
        daily_budget_eur: float = 50,
        headline: str = "",
        visual_description: str = "",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        self._ensure_config()
        obj = objective.strip().lower()
        if obj not in VALID_OBJECTIVES:
            raise ValueError(f"objective must be one of: {', '.join(sorted(VALID_OBJECTIVES))}")
        cid = str(uuid.uuid4())
        external_id = f"mock_snap_{uuid.uuid4().hex[:12]}"
        metrics = self._mock_metrics()
        creative = {"headline": headline, "visual_description": visual_description}
        if not self._mock and self.ad_account_id:
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    resp = await client.post(
                        f"{SNAP_API}/adaccounts/{self.ad_account_id}/campaigns",
                        json={
                            "campaigns": [
                                {
                                    "name": name,
                                    "status": "ACTIVE",
                                    "objective": obj.upper(),
                                    "daily_budget_micro": int(daily_budget_eur * 1_000_000),
                                }
                            ]
                        },
                        headers={"Authorization": f"Bearer {self.client_secret}"},
                    )
                if resp.status_code < 400:
                    data = resp.json()
                    campaigns = (data.get("campaigns") or [{}])[0].get("campaign") or {}
                    external_id = str(campaigns.get("id") or external_id)
            except Exception as exc:
                logger.warning("Snapchat campaign create fallback mock: %s", exc)
        await self.session.execute(
            text(
                f"""
                INSERT INTO snapchat_ads_campaigns (
                    id, workspace_id, external_id, name, objective, daily_budget_eur,
                    metrics_json, creative_json
                )
                VALUES (
                    :id, :ws, :ext, :name, :obj, :budget,
                    {json_bind(self.session, "metrics")}, {json_bind(self.session, "creative")}
                )
                """
            ),
            {
                "id": cid,
                "ws": self.workspace_id,
                "ext": external_id,
                "name": name,
                "obj": obj,
                "budget": daily_budget_eur,
                "metrics": json.dumps(metrics, ensure_ascii=False),
                "creative": json.dumps(creative, ensure_ascii=False),
            },
        )
        await self.session.commit()
        return {
            "campaign_id": cid,
            "external_id": external_id,
            "name": name,
            "objective": obj,
            "metrics": metrics,
            "mock": self._mock,
        }

    async def list_campaigns(self) -> dict[str, Any]:
        await self.ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT * FROM snapchat_ads_campaigns
                WHERE workspace_id = :ws ORDER BY created_at DESC
                """
            ),
            {"ws": self.workspace_id},
        )
        campaigns = []
        for r in rows.mappings().all():
            d = dict(r)
            d["metrics"] = json.loads(d.get("metrics_json") or "{}")
            d["creative"] = json.loads(d.get("creative_json") or "{}")
            campaigns.append(d)
        return {"campaigns": campaigns, "mock": self.is_mock}

    async def get_metrics(self) -> dict[str, Any]:
        data = await self.list_campaigns()
        campaigns = data.get("campaigns", [])
        impressions = sum(int((c.get("metrics") or {}).get("impressions", 0)) for c in campaigns)
        swipe_ups = sum(int((c.get("metrics") or {}).get("swipe_ups", 0)) for c in campaigns)
        conversions = sum(int((c.get("metrics") or {}).get("conversions", 0)) for c in campaigns)
        spend = round(sum(float((c.get("metrics") or {}).get("spend", 0)) for c in campaigns), 2)
        ctr = round((swipe_ups / impressions) * 100, 2) if impressions else 0.0
        cpm = round((spend / impressions) * 1000, 2) if impressions else 0.0
        return {
            "impressions": impressions,
            "swipe_ups": swipe_ups,
            "ctr": ctr,
            "conversions": conversions,
            "spend": spend,
            "cpm": cpm,
            "mock": data.get("mock", True),
        }

    async def suggest_creative(
        self, *, product: str, audience: str, goal: str
    ) -> dict[str, Any]:
        self._ensure_config()
        client = _openai_client()
        if not client:
            return {
                "headline": f"{product} en tu bolsillo 📱",
                "body_copy": f"Para {audience}: consigue {goal} con NELVYON.",
                "visual_description": "Vertical 9:16, colores neón, swipe-up CTA, UGC style",
                "mock": True,
            }
        try:
            resp = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Creatividad Snapchat Ads JSON para {product}, audiencia {audience}, "
                            f"objetivo {goal}. Keys: headline, body_copy, visual_description (español)."
                        ),
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            return {**json.loads(resp.choices[0].message.content or "{}"), "mock": False}
        except Exception as exc:
            logger.warning("snapchat suggest fallback: %s", exc)
            return {
                "headline": f"{product} — swipe up",
                "body_copy": f"{audience}: {goal} en 14 días.",
                "visual_description": "Story vertical, producto + CTA swipe-up",
                "mock": True,
            }

    def _mock_metrics(self) -> dict[str, Any]:
        rng = random.Random()
        impressions = 40_000 + rng.randint(0, 60_000)
        swipe_ups = int(impressions * (0.012 + rng.random() * 0.02))
        conversions = int(swipe_ups * (0.04 + rng.random() * 0.06))
        spend = round(impressions * 0.004, 2)
        return {
            "impressions": impressions,
            "swipe_ups": swipe_ups,
            "ctr": round((swipe_ups / impressions) * 100, 2),
            "conversions": conversions,
            "spend": spend,
            "cpm": round((spend / impressions) * 1000, 2) if impressions else 0,
        }


def get_snapchat_ads_service(session: AsyncSession, workspace_id: int) -> SnapchatAdsService:
    return SnapchatAdsService(session, workspace_id)

"""F63 — TikTok Marketing API campaigns + AI creative (mock without app id)."""

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
TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3"


class TikTokAdsService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = workspace_id
        self._init_attempted = False
        self._mock = False
        self.app_id = ""
        self.app_secret = ""
        self.access_token = ""
        self.advertiser_id = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.app_id = os.environ.get("TIKTOK_APP_ID", "").strip()
        self.app_secret = os.environ.get("TIKTOK_APP_SECRET", "").strip()
        self.access_token = os.environ.get("TIKTOK_ACCESS_TOKEN", "").strip()
        self.advertiser_id = os.environ.get("TIKTOK_ADVERTISER_ID", "").strip()
        if not self.app_id or not self.access_token:
            self._mock = True
            logger.info("TikTokAdsService: TIKTOK_APP_ID or token missing — mock mode")

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
                CREATE TABLE IF NOT EXISTS tiktok_ads_campaigns (
                    id TEXT PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    external_id TEXT,
                    name TEXT NOT NULL,
                    objective TEXT NOT NULL DEFAULT 'CONVERSIONS',
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
        objective: str = "CONVERSIONS",
        daily_budget_eur: float = 50,
        hook: str = "",
        primary_text: str = "",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        self._ensure_config()
        cid = str(uuid.uuid4())
        external_id = f"mock_tt_{uuid.uuid4().hex[:12]}"
        metrics = self._mock_metrics()
        creative = {"hook": hook, "primary_text": primary_text}
        if not self._mock:
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    resp = await client.post(
                        f"{TIKTOK_API}/campaign/create/",
                        headers={"Access-Token": self.access_token},
                        json={
                            "advertiser_id": self.advertiser_id,
                            "campaign_name": name,
                            "objective_type": objective,
                            "budget_mode": "BUDGET_MODE_DAY",
                            "budget": daily_budget_eur,
                        },
                    )
                if resp.status_code < 400:
                    data = resp.json().get("data") or {}
                    external_id = str(data.get("campaign_id") or external_id)
            except Exception as exc:
                logger.warning("TikTok campaign create fallback mock: %s", exc)
        await self.session.execute(
            text(
                f"""
                INSERT INTO tiktok_ads_campaigns (
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
                "obj": objective,
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
            "metrics": metrics,
            "mock": self._mock,
        }

    async def list_campaigns(self) -> dict[str, Any]:
        await self.ensure_schema()
        rows = await self.session.execute(
            text(
                """
                SELECT * FROM tiktok_ads_campaigns
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
        clicks = sum(int((c.get("metrics") or {}).get("clicks", 0)) for c in campaigns)
        conversions = sum(int((c.get("metrics") or {}).get("conversions", 0)) for c in campaigns)
        spend = round(sum(float((c.get("metrics") or {}).get("spend", 0)) for c in campaigns), 2)
        revenue = round(sum(float((c.get("metrics") or {}).get("revenue", 0)) for c in campaigns), 2)
        roas = round(revenue / spend, 2) if spend else 0.0
        return {
            "impressions": impressions,
            "clicks": clicks,
            "ctr": round((clicks / impressions) * 100, 2) if impressions else 0,
            "conversions": conversions,
            "spend": spend,
            "roas": roas,
            "mock": data.get("mock", True),
        }

    async def suggest_creative(self, *, product: str, audience: str, goal: str) -> dict[str, Any]:
        self._ensure_config()
        client = _openai_client()
        if not client:
            return {
                "hook": f"¿{audience} aún sin escalar {product}?",
                "primary_text": f"Descubre cómo conseguir {goal} con IA en 14 días.",
                "video_script": "Problema 3s → prueba social 5s → CTA registro",
                "mock": True,
            }
        try:
            resp = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Genera creatividad TikTok Ads JSON para {product}, audiencia {audience}, "
                            f"objetivo {goal}. Keys: hook, primary_text, video_script (español, corto)."
                        ),
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            return {**json.loads(resp.choices[0].message.content or "{}"), "mock": False}
        except Exception as exc:
            logger.warning("tiktok suggest fallback: %s", exc)
            return {
                "hook": f"¿{audience} aún sin escalar {product}?",
                "primary_text": f"Consigue {goal} con NELVYON en 14 días.",
                "video_script": "Hook 3s → caso real → CTA /register",
                "mock": True,
            }

    def _mock_metrics(self) -> dict[str, Any]:
        rng = random.Random()
        impressions = 50_000 + rng.randint(0, 80_000)
        clicks = int(impressions * (0.008 + rng.random() * 0.015))
        conversions = int(clicks * (0.05 + rng.random() * 0.08))
        spend = round(clicks * 0.42, 2)
        revenue = round(spend * (1.8 + rng.random()), 2)
        return {
            "impressions": impressions,
            "clicks": clicks,
            "ctr": round((clicks / impressions) * 100, 2),
            "conversions": conversions,
            "spend": spend,
            "revenue": revenue,
            "roas": round(revenue / spend, 2) if spend else 0,
        }


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


def get_tiktok_ads_service(session: AsyncSession, workspace_id: int) -> TikTokAdsService:
    return TikTokAdsService(session, workspace_id)

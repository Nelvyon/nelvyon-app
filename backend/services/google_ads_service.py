"""Google Ads API — campaigns, stats, keywords (httpx, GAQL search)."""

from __future__ import annotations

import logging
import os
import random
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)

GOOGLE_ADS_API_VERSION = "v17"
GOOGLE_ADS_BASE = f"https://googleads.googleapis.com/{GOOGLE_ADS_API_VERSION}"
TIMEOUT_SECONDS = 60.0


def _round2(value: float) -> float:
    return round(value, 2)


def _micros_to_eur(micros: int | str) -> float:
    try:
        return _round2(int(micros) / 1_000_000)
    except (TypeError, ValueError):
        return 0.0


def _normalize_customer_id(customer_id: str) -> str:
    return re.sub(r"\D", "", customer_id.strip())


class GoogleAdsService:
    """Google Ads REST search (lazy config, mock fallback)."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.access_token = ""
        self.developer_token = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.access_token = os.environ.get("GOOGLE_ADS_TOKEN", "").strip()
        self.developer_token = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN", "").strip()
        if not self.access_token or not self.developer_token:
            self._mock = True
            logger.info(
                "GoogleAdsService: GOOGLE_ADS_TOKEN or GOOGLE_ADS_DEVELOPER_TOKEN missing — mock mode"
            )

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def default_customer_id(self) -> str:
        return _normalize_customer_id(os.environ.get("GOOGLE_ADS_CUSTOMER_ID", ""))

    def _resolve_customer_id(self, customer_id: str | None) -> str:
        cid = _normalize_customer_id(customer_id or self.default_customer_id())
        if not cid:
            raise ValueError("customer_id or GOOGLE_ADS_CUSTOMER_ID is required")
        return cid

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "developer-token": self.developer_token,
            "Content-Type": "application/json",
        }

    async def _search(self, customer_id: str, query: str) -> list[dict[str, Any]]:
        self._ensure_config()
        cid = self._resolve_customer_id(customer_id)

        if self._mock:
            return []

        url = f"{GOOGLE_ADS_BASE}/customers/{cid}/googleAds:search"
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                headers=self._headers(),
                json={"query": query},
            )
        if response.status_code >= 400:
            raise ValueError(
                f"Google Ads API error ({response.status_code}): {response.text[:500]}"
            )
        data = response.json()
        return list(data.get("results", []))

    def _parse_campaign_row(self, row: dict[str, Any]) -> dict[str, Any]:
        campaign = row.get("campaign", {})
        metrics = row.get("metrics", {})
        impressions = int(metrics.get("impressions", 0) or 0)
        clicks = int(metrics.get("clicks", 0) or 0)
        cost = _micros_to_eur(metrics.get("costMicros", 0))
        ctr = float(metrics.get("ctr", 0) or 0)
        if ctr <= 1:
            ctr = _round2(ctr * 100)
        return {
            "campaign_id": str(campaign.get("id", "")),
            "campaign_name": campaign.get("name", ""),
            "status": campaign.get("status", ""),
            "impressions": impressions,
            "clicks": clicks,
            "ctr": ctr,
            "cost": cost,
            "conversions": float(metrics.get("conversions", 0) or 0),
            "average_cpc": _micros_to_eur(metrics.get("averageCpc", 0)),
        }

    async def get_campaigns(self, customer_id: str | None) -> dict[str, Any]:
        cid = self._resolve_customer_id(customer_id)
        self._ensure_config()

        if self._mock:
            rng = random.Random(hash(cid) % 10_000)
            campaigns = []
            for i, name in enumerate(
                ["Brand - ES", "Performance Max", "Search - Generic", "Remarketing"], start=1
            ):
                impressions = 12000 + rng.randint(0, 8000) * i
                clicks = int(impressions * (0.02 + rng.random() * 0.03))
                cost = _round2(clicks * (0.45 + rng.random() * 0.8))
                campaigns.append(
                    {
                        "campaign_id": str(100000 + i),
                        "campaign_name": name,
                        "status": "ENABLED",
                        "impressions": impressions,
                        "clicks": clicks,
                        "ctr": _round2((clicks / impressions) * 100) if impressions else 0,
                        "cost": cost,
                        "conversions": _round2(clicks * 0.04),
                        "average_cpc": _round2(cost / clicks) if clicks else 0,
                    }
                )
            return {"mock": True, "customer_id": cid, "campaigns": campaigns}

        query = """
            SELECT
              campaign.id,
              campaign.name,
              campaign.status,
              metrics.impressions,
              metrics.clicks,
              metrics.ctr,
              metrics.average_cpc,
              metrics.conversions,
              metrics.cost_micros
            FROM campaign
            WHERE segments.date DURING LAST_30_DAYS
            ORDER BY metrics.cost_micros DESC
            LIMIT 50
        """
        results = await self._search(cid, query)
        campaigns = [self._parse_campaign_row(r) for r in results]
        return {"mock": False, "customer_id": cid, "campaigns": campaigns}

    async def get_campaign_stats(
        self,
        customer_id: str | None,
        campaign_id: str,
        start_date: str,
        end_date: str,
    ) -> dict[str, Any]:
        cid = self._resolve_customer_id(customer_id)
        camp_id = campaign_id.strip()
        if not camp_id:
            raise ValueError("campaign_id is required")

        self._ensure_config()
        if self._mock:
            rng = random.Random(hash(f"{cid}:{camp_id}") % 10_000)
            impressions = 45000 + rng.randint(0, 20000)
            clicks = int(impressions * 0.035)
            cost = _round2(clicks * 0.72)
            return {
                "mock": True,
                "customer_id": cid,
                "campaign_id": camp_id,
                "start_date": start_date,
                "end_date": end_date,
                "impressions": impressions,
                "clicks": clicks,
                "ctr": _round2((clicks / impressions) * 100),
                "cost": cost,
                "conversions": _round2(clicks * 0.05),
                "average_cpc": _round2(cost / clicks) if clicks else 0,
                "cost_per_conversion": _round2(cost / max(clicks * 0.05, 1)),
            }

        query = f"""
            SELECT
              campaign.id,
              campaign.name,
              metrics.impressions,
              metrics.clicks,
              metrics.ctr,
              metrics.average_cpc,
              metrics.conversions,
              metrics.cost_micros,
              metrics.cost_per_conversion
            FROM campaign
            WHERE campaign.id = {camp_id}
              AND segments.date >= '{start_date}'
              AND segments.date <= '{end_date}'
        """
        results = await self._search(cid, query)
        if not results:
            raise ValueError("Campaign not found or no data in date range")

        agg = {
            "impressions": 0,
            "clicks": 0,
            "cost": 0.0,
            "conversions": 0.0,
            "campaign_name": "",
        }
        for row in results:
            parsed = self._parse_campaign_row(row)
            agg["campaign_name"] = parsed.get("campaign_name") or agg["campaign_name"]
            agg["impressions"] += parsed["impressions"]
            agg["clicks"] += parsed["clicks"]
            agg["cost"] += parsed["cost"]
            agg["conversions"] += parsed["conversions"]

        impressions = agg["impressions"]
        clicks = agg["clicks"]
        cost = _round2(agg["cost"])
        conversions = _round2(agg["conversions"])

        return {
            "mock": False,
            "customer_id": cid,
            "campaign_id": camp_id,
            "campaign_name": agg["campaign_name"],
            "start_date": start_date,
            "end_date": end_date,
            "impressions": impressions,
            "clicks": clicks,
            "ctr": _round2((clicks / impressions) * 100) if impressions else 0,
            "cost": cost,
            "conversions": conversions,
            "average_cpc": _round2(cost / clicks) if clicks else 0,
            "cost_per_conversion": _round2(cost / conversions) if conversions else 0,
        }

    async def get_keywords(
        self,
        customer_id: str | None,
        campaign_id: str,
    ) -> dict[str, Any]:
        cid = self._resolve_customer_id(customer_id)
        camp_id = campaign_id.strip()
        if not camp_id:
            raise ValueError("campaign_id is required")

        self._ensure_config()
        if self._mock:
            rng = random.Random(hash(f"kw:{camp_id}") % 10_000)
            keywords = [
                ("software gestión", 8, 1.2),
                ("crm españa", 7, 0.95),
                ("automatización marketing", 6, 1.45),
                ("nelvyon", 10, 0.35),
            ]
            items = []
            for text, qs, cpc in keywords:
                clicks = 80 + rng.randint(0, 120)
                items.append(
                    {
                        "keyword": text,
                        "quality_score": qs,
                        "cpc": _round2(cpc),
                        "clicks": clicks,
                        "impressions": clicks * (8 + rng.randint(0, 12)),
                        "cost": _round2(clicks * cpc),
                    }
                )
            return {"mock": True, "customer_id": cid, "campaign_id": camp_id, "keywords": items}

        query = f"""
            SELECT
              ad_group_criterion.keyword.text,
              ad_group_criterion.quality_info.quality_score,
              metrics.clicks,
              metrics.impressions,
              metrics.average_cpc,
              metrics.cost_micros
            FROM keyword_view
            WHERE campaign.id = {camp_id}
              AND segments.date DURING LAST_30_DAYS
            ORDER BY metrics.clicks DESC
            LIMIT 50
        """
        results = await self._search(cid, query)
        items = []
        for row in results:
            criterion = row.get("adGroupCriterion", row.get("ad_group_criterion", {}))
            keyword_obj = criterion.get("keyword", {})
            quality = criterion.get("qualityInfo", criterion.get("quality_info", {}))
            metrics = row.get("metrics", {})
            items.append(
                {
                    "keyword": keyword_obj.get("text", ""),
                    "quality_score": int(quality.get("qualityScore", quality.get("quality_score", 0)) or 0),
                    "clicks": int(metrics.get("clicks", 0) or 0),
                    "impressions": int(metrics.get("impressions", 0) or 0),
                    "cpc": _micros_to_eur(metrics.get("averageCpc", 0)),
                    "cost": _micros_to_eur(metrics.get("costMicros", 0)),
                }
            )
        return {"mock": False, "customer_id": cid, "campaign_id": camp_id, "keywords": items}


_google_ads_service: GoogleAdsService | None = None


def get_google_ads_service() -> GoogleAdsService:
    global _google_ads_service
    if _google_ads_service is None:
        _google_ads_service = GoogleAdsService()
    return _google_ads_service

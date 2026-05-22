"""
Semrush + DataForSEO integrations for NELVYON SEO agents (real API data).
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx

_NOT_CONFIGURED = "API key not configured"


class SemrushService:
    def __init__(self):
        self.api_key = os.environ.get("SEMRUSH_API_KEY")
        self.base_url = "https://api.semrush.com"

    def _configured(self) -> bool:
        return bool(self.api_key and str(self.api_key).strip())

    async def domain_overview(self, domain: str) -> dict:
        if not self._configured():
            return {"error": _NOT_CONFIGURED, "domain": domain}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{self.base_url}/",
                params={
                    "type": "domain_ranks",
                    "key": self.api_key,
                    "display_limit": 5,
                    "export_columns": "Dn,Rk,Or,Ot,Oc,Ad",
                    "domain": domain,
                    "database": "es",
                },
            )
            return {
                "raw": response.text,
                "domain": domain,
                "status_code": response.status_code,
            }

    async def keyword_overview(self, keyword: str, database: str = "es") -> dict:
        if not self._configured():
            return {"error": _NOT_CONFIGURED, "keyword": keyword}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{self.base_url}/",
                params={
                    "type": "phrase_this",
                    "key": self.api_key,
                    "phrase": keyword,
                    "database": database,
                    "export_columns": "Ph,Nq,Cp,Co,Nr,Td",
                },
            )
            return {
                "raw": response.text,
                "keyword": keyword,
                "database": database,
                "status_code": response.status_code,
            }

    async def competitors(self, domain: str) -> dict:
        if not self._configured():
            return {"error": _NOT_CONFIGURED, "domain": domain}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{self.base_url}/",
                params={
                    "type": "domain_organic_organic",
                    "key": self.api_key,
                    "domain": domain,
                    "database": "es",
                    "display_limit": 10,
                },
            )
            return {
                "raw": response.text,
                "domain": domain,
                "status_code": response.status_code,
            }


class DataForSEOService:
    def __init__(self):
        self.login = os.environ.get("DATAFORSEO_LOGIN")
        self.password = os.environ.get("DATAFORSEO_PASSWORD")
        self.base_url = "https://api.dataforseo.com/v3"

    def _configured(self) -> bool:
        return bool(
            self.login
            and str(self.login).strip()
            and self.password
            and str(self.password).strip()
        )

    async def serp_analysis(self, keyword: str, location_code: int = 2724) -> dict:
        if not self._configured():
            return {"error": _NOT_CONFIGURED, "keyword": keyword}
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/serp/google/organic/live/advanced",
                auth=(self.login, self.password),
                json=[
                    {
                        "keyword": keyword,
                        "location_code": location_code,
                        "language_code": "es",
                        "device": "desktop",
                    }
                ],
            )
            try:
                payload = response.json()
            except Exception:
                payload = {"raw": response.text}
            return {
                "keyword": keyword,
                "location_code": location_code,
                "status_code": response.status_code,
                "data": payload,
            }

    async def keyword_ideas(self, keyword: str) -> dict:
        if not self._configured():
            return {"error": _NOT_CONFIGURED, "keyword": keyword}
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/keywords_data/google_ads/keywords_for_keywords/live",
                auth=(self.login, self.password),
                json=[
                    {
                        "keywords": [keyword],
                        "location_code": 2724,
                        "language_code": "es",
                    }
                ],
            )
            try:
                payload = response.json()
            except Exception:
                payload = {"raw": response.text}
            return {
                "keyword": keyword,
                "status_code": response.status_code,
                "data": payload,
            }


async def build_seo_premium_context(
    *,
    domain: Optional[str],
    keywords: list[str],
) -> Dict[str, Any]:
    """
    Fetch Semrush domain + competitors and DataForSEO SERP for primary keywords.
    Never raises — returns partial data when APIs are missing or fail.
    """
    semrush = SemrushService()
    dataforseo = DataForSEOService()

    result: Dict[str, Any] = {
        "domain": domain,
        "keywords": keywords,
        "semrush": {},
        "dataforseo": {},
    }

    if domain:
        result["semrush"]["domain_overview"] = await semrush.domain_overview(domain)
        result["semrush"]["competitors"] = await semrush.competitors(domain)
    else:
        result["semrush"]["domain_overview"] = {"error": "domain not provided"}
        result["semrush"]["competitors"] = {"error": "domain not provided"}

    serp_by_keyword: Dict[str, Any] = {}
    for kw in keywords[:5]:
        serp_by_keyword[kw] = await dataforseo.serp_analysis(kw)
    result["dataforseo"]["serp_analysis"] = serp_by_keyword

    if keywords:
        primary = keywords[0]
        result["semrush"]["keyword_overview"] = await semrush.keyword_overview(primary)
        result["dataforseo"]["keyword_ideas"] = await dataforseo.keyword_ideas(primary)
    else:
        result["semrush"]["keyword_overview"] = {"error": "keyword not provided"}
        result["dataforseo"]["keyword_ideas"] = {"error": "keyword not provided"}

    return result

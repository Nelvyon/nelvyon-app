"""Google Analytics 4 Data API — traffic, pages, sources, conversions, realtime."""

from __future__ import annotations

import asyncio
import logging
import os
import random
from datetime import date, datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GA4_SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]


def _normalize_property_id(property_id: str) -> str:
    return property_id.strip().replace("properties/", "")


def _parse_report_rows(response: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    dim_headers = [h.name for h in response.dimension_headers]
    met_headers = [h.name for h in response.metric_headers]
    for row in response.rows:
        item: dict[str, Any] = {"dimensions": {}, "metrics": {}}
        for i, val in enumerate(row.dimension_values):
            key = dim_headers[i] if i < len(dim_headers) else f"dimension_{i}"
            item["dimensions"][key] = val.value
        for i, val in enumerate(row.metric_values):
            key = met_headers[i] if i < len(met_headers) else f"metric_{i}"
            item["metrics"][key] = val.value
        rows.append(item)
    return rows


def _metric_float(metrics: dict[str, str], key: str, default: float = 0.0) -> float:
    raw = metrics.get(key)
    if raw is None:
        return default
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


class AnalyticsService:
    """GA4 reporting via google-analytics-data (lazy OAuth, mock fallback)."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.client_id = ""
        self.client_secret = ""
        self.refresh_token = ""
        self._client: Any | None = None

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        self.client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
        self.refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN", "").strip()
        if not self.client_id or not self.client_secret or not self.refresh_token:
            self._mock = True
            logger.info("AnalyticsService: Google OAuth missing — mock mode")

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def default_property_id(self) -> str:
        return _normalize_property_id(os.environ.get("GA4_PROPERTY_ID", "").strip())

    def _get_client(self) -> Any:
        self._ensure_config()
        if self._mock:
            raise RuntimeError("GA4 not configured (mock mode)")
        if self._client is not None:
            return self._client

        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials

        creds = Credentials(
            token=None,
            refresh_token=self.refresh_token,
            token_uri=GOOGLE_TOKEN_URL,
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=GA4_SCOPES,
        )
        creds.refresh(Request())
        self._client = BetaAnalyticsDataClient(credentials=creds)
        logger.info("AnalyticsService: GA4 Data API client ready")
        return self._client

    async def _run_sync(self, fn: Any) -> Any:
        return await asyncio.to_thread(fn)

    def _resolve_property(self, property_id: str | None) -> str:
        pid = _normalize_property_id(property_id or self.default_property_id())
        if not pid:
            raise ValueError("property_id or GA4_PROPERTY_ID is required")
        return pid

    @staticmethod
    def _mock_seed(property_id: str, start_date: str, end_date: str) -> int:
        return hash(f"{property_id}:{start_date}:{end_date}") % 10_000

    async def get_traffic_overview(
        self,
        property_id: str | None,
        start_date: str,
        end_date: str,
    ) -> dict[str, Any]:
        pid = self._resolve_property(property_id)
        self._ensure_config()

        if self._mock:
            seed = self._mock_seed(pid, start_date, end_date)
            rng = random.Random(seed)
            sessions = 8000 + rng.randint(0, 6000)
            users = int(sessions * (0.62 + rng.random() * 0.15))
            pageviews = int(sessions * (2.1 + rng.random() * 0.8))
            return {
                "mock": True,
                "property_id": pid,
                "start_date": start_date,
                "end_date": end_date,
                "sessions": sessions,
                "users": users,
                "pageviews": pageviews,
                "bounce_rate": round(35 + rng.random() * 25, 2),
            }

        from google.analytics.data_v1beta.types import (
            DateRange,
            Metric,
            RunReportRequest,
        )

        client = self._get_client()

        def _run() -> dict[str, Any]:
            request = RunReportRequest(
                property=f"properties/{pid}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                metrics=[
                    Metric(name="sessions"),
                    Metric(name="activeUsers"),
                    Metric(name="screenPageViews"),
                    Metric(name="bounceRate"),
                ],
            )
            response = client.run_report(request)
            rows = _parse_report_rows(response)
            m = rows[0]["metrics"] if rows else {}
            return {
                "mock": False,
                "property_id": pid,
                "start_date": start_date,
                "end_date": end_date,
                "sessions": int(_metric_float(m, "sessions")),
                "users": int(_metric_float(m, "activeUsers")),
                "pageviews": int(_metric_float(m, "screenPageViews")),
                "bounce_rate": round(_metric_float(m, "bounceRate") * 100, 2)
                if _metric_float(m, "bounceRate") <= 1
                else round(_metric_float(m, "bounceRate"), 2),
            }

        return await self._run_sync(_run)

    async def get_top_pages(
        self,
        property_id: str | None,
        start_date: str,
        end_date: str,
        limit: int = 10,
    ) -> dict[str, Any]:
        pid = self._resolve_property(property_id)
        limit = max(1, min(int(limit), 50))
        self._ensure_config()

        if self._mock:
            seed = self._mock_seed(pid, start_date, end_date)
            rng = random.Random(seed + 1)
            pages = [
                ("/", 4200),
                ("/pricing", 1800),
                ("/product", 1500),
                ("/blog", 980),
                ("/contact", 640),
            ]
            items = []
            for path, base in pages[:limit]:
                views = base + rng.randint(0, 400)
                items.append(
                    {
                        "page_path": path,
                        "pageviews": views,
                        "users": int(views * 0.7),
                    }
                )
            return {
                "mock": True,
                "property_id": pid,
                "items": items,
            }

        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            OrderBy,
            RunReportRequest,
        )

        client = self._get_client()

        def _run() -> dict[str, Any]:
            request = RunReportRequest(
                property=f"properties/{pid}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="pagePath")],
                metrics=[
                    Metric(name="screenPageViews"),
                    Metric(name="activeUsers"),
                ],
                limit=limit,
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"),
                        desc=True,
                    )
                ],
            )
            response = client.run_report(request)
            items = []
            for row in _parse_report_rows(response):
                items.append(
                    {
                        "page_path": row["dimensions"].get("pagePath", ""),
                        "pageviews": int(_metric_float(row["metrics"], "screenPageViews")),
                        "users": int(_metric_float(row["metrics"], "activeUsers")),
                    }
                )
            return {"mock": False, "property_id": pid, "items": items}

        return await self._run_sync(_run)

    async def get_traffic_sources(
        self,
        property_id: str | None,
        start_date: str,
        end_date: str,
    ) -> dict[str, Any]:
        pid = self._resolve_property(property_id)
        self._ensure_config()

        if self._mock:
            return {
                "mock": True,
                "property_id": pid,
                "items": [
                    {"channel": "Organic Search", "sessions": 5200, "users": 4100},
                    {"channel": "Direct", "sessions": 2800, "users": 2400},
                    {"channel": "Paid Search", "sessions": 1900, "users": 1650},
                    {"channel": "Social", "sessions": 980, "users": 920},
                    {"channel": "Referral", "sessions": 540, "users": 480},
                ],
            }

        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            OrderBy,
            RunReportRequest,
        )

        client = self._get_client()

        def _run() -> dict[str, Any]:
            request = RunReportRequest(
                property=f"properties/{pid}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="sessionDefaultChannelGroup")],
                metrics=[
                    Metric(name="sessions"),
                    Metric(name="activeUsers"),
                ],
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="sessions"),
                        desc=True,
                    )
                ],
                limit=25,
            )
            response = client.run_report(request)
            items = []
            for row in _parse_report_rows(response):
                items.append(
                    {
                        "channel": row["dimensions"].get("sessionDefaultChannelGroup", ""),
                        "sessions": int(_metric_float(row["metrics"], "sessions")),
                        "users": int(_metric_float(row["metrics"], "activeUsers")),
                    }
                )
            return {"mock": False, "property_id": pid, "items": items}

        return await self._run_sync(_run)

    async def get_conversions(
        self,
        property_id: str | None,
        start_date: str,
        end_date: str,
    ) -> dict[str, Any]:
        pid = self._resolve_property(property_id)
        self._ensure_config()

        if self._mock:
            return {
                "mock": True,
                "property_id": pid,
                "items": [
                    {"event_name": "purchase", "event_count": 186, "conversion_value": 12450.0},
                    {"event_name": "sign_up", "event_count": 420, "conversion_value": 0.0},
                    {"event_name": "generate_lead", "event_count": 312, "conversion_value": 0.0},
                    {"event_name": "begin_checkout", "event_count": 540, "conversion_value": 0.0},
                ],
            }

        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Filter,
            FilterExpression,
            Metric,
            OrderBy,
            RunReportRequest,
        )

        client = self._get_client()

        def _run() -> dict[str, Any]:
            request = RunReportRequest(
                property=f"properties/{pid}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="eventName")],
                metrics=[
                    Metric(name="eventCount"),
                    Metric(name="eventValue"),
                ],
                dimension_filter=FilterExpression(
                    filter=Filter(
                        field_name="isConversionEvent",
                        string_filter=Filter.StringFilter(value="true"),
                    )
                ),
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="eventCount"),
                        desc=True,
                    )
                ],
                limit=50,
            )
            response = client.run_report(request)
            items = []
            for row in _parse_report_rows(response):
                items.append(
                    {
                        "event_name": row["dimensions"].get("eventName", ""),
                        "event_count": int(_metric_float(row["metrics"], "eventCount")),
                        "conversion_value": round(_metric_float(row["metrics"], "eventValue"), 2),
                    }
                )
            return {"mock": False, "property_id": pid, "items": items}

        return await self._run_sync(_run)

    async def get_realtime(self, property_id: str | None) -> dict[str, Any]:
        pid = self._resolve_property(property_id)
        self._ensure_config()

        if self._mock:
            seed = int(datetime.now(timezone.utc).timestamp()) // 60
            rng = random.Random(seed)
            active = 12 + rng.randint(0, 48)
            return {
                "mock": True,
                "property_id": pid,
                "active_users": active,
                "pageviews_last_30_min": active * (3 + rng.randint(0, 5)),
            }

        from google.analytics.data_v1beta.types import Metric, RunRealtimeReportRequest

        client = self._get_client()

        def _run() -> dict[str, Any]:
            request = RunRealtimeReportRequest(
                property=f"properties/{pid}",
                metrics=[
                    Metric(name="activeUsers"),
                    Metric(name="screenPageViews"),
                ],
            )
            response = client.run_realtime_report(request)
            rows = _parse_report_rows(response)
            m = rows[0]["metrics"] if rows else {}
            return {
                "mock": False,
                "property_id": pid,
                "active_users": int(_metric_float(m, "activeUsers")),
                "pageviews_last_30_min": int(_metric_float(m, "screenPageViews")),
            }

        return await self._run_sync(_run)


_analytics_service: AnalyticsService | None = None


def get_analytics_service() -> AnalyticsService:
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service


def default_date_range(days: int = 30) -> tuple[str, str]:
    end = date.today()
    start = end - timedelta(days=max(1, days) - 1)
    return start.isoformat(), end.isoformat()

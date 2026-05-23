"""Social monitoring — alerts, public web/RSS search, GPT sentiment."""

from __future__ import annotations

import json
import logging
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

import httpx
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
SENTIMENT_MODEL = "gpt-4o"
USER_AGENT = "NELVYON-SocialMonitor/1.0 (+https://nelvyon.com)"
PLATFORMS = frozenset({"web", "news", "rss", "twitter", "reddit"})


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class SocialMonitoringService:
    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "social_monitoring.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def create_alert(
        self,
        workspace_id: int,
        keyword: str,
        platforms: list[str],
        notify_email: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        kw = (keyword or "").strip()
        if not kw:
            raise ValueError("keyword is required")
        plats = [p.lower() for p in (platforms or ["web", "news"]) if p.lower() in PLATFORMS]
        if not plats:
            plats = ["web", "news"]

        result = await self.session.execute(
            text(
                """
                INSERT INTO social_alerts (workspace_id, keyword, platforms, notify_email)
                VALUES (:ws, :keyword, CAST(:platforms AS jsonb), :email)
                RETURNING *
                """
            ),
            {
                "ws": int(workspace_id),
                "keyword": kw,
                "platforms": json.dumps(plats),
                "email": notify_email,
            },
        )
        alert = _row(result.mappings().first())
        await self.session.commit()

        try:
            mentions = await self.search_mentions(kw, plats, since=datetime.now(timezone.utc) - timedelta(days=7))
            for m in mentions[:30]:
                await self._store_mention(alert["id"], m)
        except Exception as exc:
            logger.warning("initial mention search failed: %s", exc)

        return alert

    async def get_alerts(self, workspace_id: int | None = None) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        result = await self.session.execute(
            text(
                """
                SELECT * FROM social_alerts
                WHERE workspace_id = :ws AND is_active = true
                ORDER BY created_at DESC
                """
            ),
            {"ws": ws},
        )
        return [_row(r) for r in result.mappings().all()]

    async def delete_alert(self, alert_id: str, workspace_id: int | None = None) -> bool:
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        result = await self.session.execute(
            text(
                """
                UPDATE social_alerts SET is_active = false
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING id
                """
            ),
            {"id": alert_id, "ws": ws},
        )
        row = result.mappings().first()
        await self.session.commit()
        return row is not None

    async def search_mentions(
        self,
        keyword: str,
        platforms: list[str],
        since: datetime | None = None,
    ) -> list[dict[str, Any]]:
        kw = (keyword or "").strip()
        if not kw:
            return []
        since_dt = since or (datetime.now(timezone.utc) - timedelta(days=1))
        plats = {p.lower() for p in (platforms or ["web", "news"])}
        raw: list[dict[str, Any]] = []

        if "news" in plats or "rss" in plats or "web" in plats:
            raw.extend(await self._search_google_news_rss(kw, since_dt))
        if "web" in plats:
            raw.extend(await self._search_duckduckgo(kw))
        if "twitter" in plats:
            raw.extend(await self._search_twitter_public(kw))

        deduped: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in raw:
            key = (item.get("url") or item.get("text", ""))[:200]
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)

        if deduped:
            deduped = await self._classify_sentiments(deduped)
        return deduped

    async def _search_google_news_rss(self, keyword: str, since: datetime) -> list[dict[str, Any]]:
        url = f"https://news.google.com/rss/search?q={quote_plus(keyword)}&hl=es&gl=ES&ceid=ES:es"
        mentions: list[dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": USER_AGENT}) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                root = ET.fromstring(resp.text)
                for item in root.findall(".//item"):
                    title = (item.findtext("title") or "").strip()
                    link = (item.findtext("link") or "").strip()
                    pub = item.findtext("pubDate") or ""
                    found_at = self._parse_rss_date(pub) or datetime.now(timezone.utc)
                    if found_at.replace(tzinfo=timezone.utc) < since.replace(tzinfo=timezone.utc):
                        continue
                    source = item.find("source")
                    author = source.text if source is not None and source.text else "Google News"
                    mentions.append(
                        {
                            "text": title,
                            "author": author,
                            "platform": "news",
                            "url": link,
                            "found_at": found_at.isoformat(),
                            "sentiment": "neutral",
                            "sentiment_score": 0.0,
                        }
                    )
        except Exception as exc:
            logger.warning("google news rss: %s", exc)
        return mentions

    async def _search_duckduckgo(self, keyword: str) -> list[dict[str, Any]]:
        mentions: list[dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": USER_AGENT}) as client:
                resp = await client.post(
                    "https://html.duckduckgo.com/html/",
                    data={"q": keyword, "kl": "es-es"},
                )
                resp.raise_for_status()
                html = resp.text
                for match in re.finditer(
                    r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                    html,
                    re.DOTALL,
                ):
                    link = match.group(1)
                    title = re.sub(r"<[^>]+>", "", match.group(2)).strip()
                    if not title:
                        continue
                    mentions.append(
                        {
                            "text": title,
                            "author": "DuckDuckGo",
                            "platform": "web",
                            "url": link,
                            "found_at": datetime.now(timezone.utc).isoformat(),
                            "sentiment": "neutral",
                            "sentiment_score": 0.0,
                        }
                    )
                    if len(mentions) >= 15:
                        break
        except Exception as exc:
            logger.warning("duckduckgo search: %s", exc)
        return mentions

    async def _search_twitter_public(self, keyword: str) -> list[dict[str, Any]]:
        """Best-effort public syndication (no API key)."""
        mentions: list[dict[str, Any]] = []
        syndication_url = f"https://syndication.twitter.com/srv/timeline-profile/screen-name/search?q={quote_plus(keyword)}"
        try:
            async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": USER_AGENT}) as client:
                resp = await client.get(syndication_url, follow_redirects=True)
                if resp.status_code != 200:
                    return mentions
                for match in re.finditer(r'data-tweet-id="(\d+)"', resp.text):
                    tid = match.group(1)
                    mentions.append(
                        {
                            "text": f"Mención en X sobre «{keyword}» (#{tid})",
                            "author": "X",
                            "platform": "twitter",
                            "url": f"https://twitter.com/i/web/status/{tid}",
                            "found_at": datetime.now(timezone.utc).isoformat(),
                            "sentiment": "neutral",
                            "sentiment_score": 0.0,
                        }
                    )
                    if len(mentions) >= 5:
                        break
        except Exception as exc:
            logger.debug("twitter public search unavailable: %s", exc)
        return mentions

    def _parse_rss_date(self, raw: str) -> datetime | None:
        if not raw:
            return None
        for fmt in (
            "%a, %d %b %Y %H:%M:%S %Z",
            "%a, %d %b %Y %H:%M:%S %z",
            "%Y-%m-%dT%H:%M:%S%z",
        ):
            try:
                dt = datetime.strptime(raw.strip(), fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except ValueError:
                continue
        return None

    async def _classify_sentiments(self, mentions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        client = _openai_client()
        if not client:
            return mentions

        texts = [m.get("text", "")[:500] for m in mentions]
        try:
            resp = await client.chat.completions.create(
                model=SENTIMENT_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Clasifica el sentimiento de cada texto. "
                            'Responde JSON: {"items":[{"index":0,"sentiment":"positive|neutral|negative","score":-1..1}]}'
                        ),
                    },
                    {"role": "user", "content": json.dumps({"texts": texts}, ensure_ascii=False)},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            payload = json.loads(resp.choices[0].message.content or "{}")
            items = payload.get("items") or []
            by_idx = {int(i.get("index", -1)): i for i in items if isinstance(i, dict)}
            for idx, m in enumerate(mentions):
                info = by_idx.get(idx, {})
                sent = str(info.get("sentiment", "neutral")).lower()
                if sent not in ("positive", "neutral", "negative"):
                    sent = "neutral"
                score = float(info.get("score", 0) or 0)
                m["sentiment"] = sent
                m["sentiment_score"] = max(-1.0, min(1.0, score))
        except Exception as exc:
            logger.warning("sentiment classify: %s", exc)
        return mentions

    async def _store_mention(self, alert_id: str, mention: dict[str, Any]) -> dict[str, Any] | None:
        found_at = mention.get("found_at")
        if isinstance(found_at, str):
            try:
                found_at = datetime.fromisoformat(found_at.replace("Z", "+00:00"))
            except ValueError:
                found_at = datetime.now(timezone.utc)
        elif not isinstance(found_at, datetime):
            found_at = datetime.now(timezone.utc)

        if mention.get("url"):
            dup = await self.session.execute(
                text(
                    """
                    SELECT id FROM social_mentions
                    WHERE workspace_id = :ws AND url = :url
                    LIMIT 1
                    """
                ),
                {"ws": self.workspace_id, "url": mention.get("url")},
            )
            if dup.scalar_one_or_none():
                return None

        result = await self.session.execute(
            text(
                """
                INSERT INTO social_mentions (
                    alert_id, workspace_id, text, author, platform, url,
                    sentiment, sentiment_score, found_at
                )
                VALUES (
                    CAST(:alert_id AS uuid), :ws, :text, :author, :platform, :url,
                    :sentiment, :score, :found_at
                )
                RETURNING *
                """
            ),
            {
                "alert_id": alert_id,
                "ws": self.workspace_id,
                "text": mention.get("text", "")[:4000],
                "author": mention.get("author"),
                "platform": mention.get("platform", "web"),
                "url": mention.get("url"),
                "sentiment": mention.get("sentiment", "neutral"),
                "score": float(mention.get("sentiment_score", 0) or 0),
                "found_at": found_at,
            },
        )
        row = result.mappings().first()
        if row:
            await self.session.commit()
            return _row(row)
        return None

    async def refresh_alerts(self) -> int:
        """Pull new mentions for all active alerts."""
        alerts = await self.get_alerts()
        stored = 0
        for alert in alerts:
            plats = alert.get("platforms") or ["web", "news"]
            if isinstance(plats, str):
                plats = json.loads(plats)
            mentions = await self.search_mentions(
                alert["keyword"],
                plats,
                since=datetime.now(timezone.utc) - timedelta(hours=24),
            )
            for m in mentions[:20]:
                if await self._store_mention(alert["id"], m):
                    stored += 1
        return stored

    async def list_mentions(
        self,
        *,
        alert_id: str | None = None,
        sentiment: str | None = None,
        platform: str | None = None,
        since: datetime | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        await self.ensure_schema()
        where = "workspace_id = :ws"
        params: dict[str, Any] = {"ws": self.workspace_id, "limit": limit}
        if alert_id:
            where += " AND alert_id = CAST(:alert_id AS uuid)"
            params["alert_id"] = alert_id
        if sentiment:
            where += " AND sentiment = :sentiment"
            params["sentiment"] = sentiment.lower()
        if platform:
            where += " AND platform = :platform"
            params["platform"] = platform.lower()
        if since:
            where += " AND found_at >= :since"
            params["since"] = since

        result = await self.session.execute(
            text(
                f"""
                SELECT * FROM social_mentions
                WHERE {where}
                ORDER BY found_at DESC
                LIMIT :limit
                """
            ),
            params,
        )
        return [_row(r) for r in result.mappings().all()]

    async def mark_handled(self, mention_id: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                UPDATE social_mentions SET is_handled = true
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {"id": mention_id, "ws": self.workspace_id},
        )
        row = result.mappings().first()
        await self.session.commit()
        return _row(row) if row else None

    async def get_dashboard(self, workspace_id: int | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(hours=24)
        week_ago = now - timedelta(days=7)

        counts = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE found_at >= :day_ago) AS mentions_24h,
                    COUNT(*) FILTER (WHERE found_at >= :day_ago AND sentiment = 'positive') AS positive_24h,
                    COUNT(*) FILTER (WHERE found_at >= :day_ago AND sentiment = 'negative') AS negative_24h,
                    COUNT(*) FILTER (WHERE found_at >= :day_ago AND sentiment = 'neutral') AS neutral_24h,
                    COALESCE(AVG(sentiment_score) FILTER (WHERE found_at >= :day_ago), 0) AS avg_score_24h
                FROM social_mentions
                WHERE workspace_id = :ws
                """
            ),
            {"ws": ws, "day_ago": day_ago},
        )
        c = counts.mappings().first()
        total_24h = int(c["mentions_24h"] or 0)
        pos = int(c["positive_24h"] or 0)
        neg = int(c["negative_24h"] or 0)

        alerts = await self.get_alerts(ws)
        recent = await self.list_mentions(since=day_ago, limit=30)

        keywords_result = await self.session.execute(
            text(
                """
                SELECT a.keyword, COUNT(m.id) AS cnt
                FROM social_alerts a
                LEFT JOIN social_mentions m ON m.alert_id = a.id AND m.found_at >= :day_ago
                WHERE a.workspace_id = :ws AND a.is_active = true
                GROUP BY a.keyword
                ORDER BY cnt DESC
                LIMIT 10
                """
            ),
            {"ws": ws, "day_ago": day_ago},
        )
        top_keywords = [{"keyword": r["keyword"], "count": int(r["cnt"] or 0)} for r in keywords_result.mappings().all()]

        chart_result = await self.session.execute(
            text(
                """
                SELECT
                    DATE(found_at AT TIME ZONE 'UTC') AS day,
                    AVG(sentiment_score) AS avg_score,
                    COUNT(*) FILTER (WHERE sentiment = 'positive') AS positive,
                    COUNT(*) FILTER (WHERE sentiment = 'negative') AS negative,
                    COUNT(*) FILTER (WHERE sentiment = 'neutral') AS neutral,
                    COUNT(*) AS total
                FROM social_mentions
                WHERE workspace_id = :ws AND found_at >= :week_ago
                GROUP BY DATE(found_at AT TIME ZONE 'UTC')
                ORDER BY day ASC
                """
            ),
            {"ws": ws, "week_ago": week_ago},
        )
        sentiment_by_day = [
            {
                "day": str(r["day"]),
                "avg_score": round(float(r["avg_score"] or 0), 3),
                "positive": int(r["positive"] or 0),
                "negative": int(r["negative"] or 0),
                "neutral": int(r["neutral"] or 0),
                "total": int(r["total"] or 0),
            }
            for r in chart_result.mappings().all()
        ]

        pct_pos = round((pos / total_24h) * 100, 1) if total_24h else 0.0
        pct_neg = round((neg / total_24h) * 100, 1) if total_24h else 0.0

        return {
            "mentions_24h": total_24h,
            "positive_percent": pct_pos,
            "negative_percent": pct_neg,
            "avg_sentiment_score": round(float(c["avg_score_24h"] or 0), 3),
            "active_alerts": len(alerts),
            "alerts": alerts,
            "recent_mentions": recent,
            "top_keywords": top_keywords,
            "sentiment_by_day": sentiment_by_day,
        }


def get_social_monitoring_service(session: AsyncSession, workspace_id: int) -> SocialMonitoringService:
    return SocialMonitoringService(session, workspace_id)

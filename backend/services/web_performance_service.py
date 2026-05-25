"""Frente 59 — PageSpeed Insights + historical metrics."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
ALERT_SCORE_THRESHOLD = 80


def _extract_vitals(lighthouse: dict[str, Any]) -> dict[str, Any]:
    audits = lighthouse.get("audits") or {}
    categories = lighthouse.get("categories") or {}
    perf = categories.get("performance") or {}

    def audit_ms(key: str) -> float | None:
        a = audits.get(key) or {}
        nv = a.get("numericValue")
        return float(nv) if nv is not None else None

    lcp = audit_ms("largest-contentful-paint")
    cls = audit_ms("cumulative-layout-shift")
    fid = audit_ms("max-potential-fid") or audit_ms("total-blocking-time")

    score = perf.get("score")
    performance_score = int(round(float(score) * 100)) if score is not None else None

    return {
        "lcp_ms": lcp,
        "cls": cls,
        "fid_ms": fid,
        "performance_score": performance_score,
    }


async def run_pagespeed(url: str) -> dict[str, Any]:
    api_key = (
        os.environ.get("PAGESPEED_API_KEY", "").strip()
        or os.environ.get("GOOGLE_PAGESPEED_API_KEY", "").strip()
    )
    params = f"url={quote(url, safe='')}&category=performance&strategy=mobile"
    if api_key:
        params += f"&key={quote(api_key)}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(f"{PAGESPEED_URL}?{params}")
        resp.raise_for_status()
        data = resp.json()

    lighthouse = (data.get("lighthouseResult") or {})
    vitals = _extract_vitals(lighthouse)
    return {
        **vitals,
        "measured_url": url,
        "raw_report": data,
        "measured_at": datetime.now(timezone.utc).isoformat(),
    }


async def save_metrics(
    session: AsyncSession,
    *,
    website_id: str,
    workspace_id: int,
    metrics: dict[str, Any],
) -> dict[str, Any]:
    await session.execute(
        text(
            """
            INSERT INTO web_performance_metrics (
                website_id, workspace_id, lcp_ms, cls, fid_ms,
                performance_score, measured_url, raw_report, measured_at
            ) VALUES (
                :wid::uuid, :ws, :lcp, :cls, :fid,
                :score, :url, CAST(:raw AS jsonb), NOW()
            )
            """
        ),
        {
            "wid": website_id,
            "ws": workspace_id,
            "lcp": metrics.get("lcp_ms"),
            "cls": metrics.get("cls"),
            "fid": metrics.get("fid_ms"),
            "score": metrics.get("performance_score"),
            "url": metrics.get("measured_url"),
            "raw": json.dumps(metrics.get("raw_report") or {}, default=str)[:500000],
        },
    )
    await session.commit()
    return metrics


async def get_latest_metrics(
    session: AsyncSession, website_id: str, workspace_id: int
) -> dict[str, Any] | None:
    r = await session.execute(
        text(
            """
            SELECT lcp_ms, cls, fid_ms, performance_score, measured_url, measured_at
            FROM web_performance_metrics
            WHERE website_id = :wid::uuid AND workspace_id = :ws
            ORDER BY measured_at DESC
            LIMIT 1
            """
        ),
        {"wid": website_id, "ws": workspace_id},
    )
    row = r.fetchone()
    if not row:
        return None
    m = dict(row._mapping)
    for k, v in list(m.items()):
        if isinstance(v, datetime):
            m[k] = v.isoformat()
    return m


async def maybe_alert_low_score(
    session: AsyncSession,
    *,
    workspace_id: int,
    website_id: str,
    score: int | None,
    project_name: str,
) -> None:
    if score is None or score >= ALERT_SCORE_THRESHOLD:
        return
    try:
        await session.execute(
            text(
                """
                INSERT INTO security_events (event_type, severity, message, metadata, created_at)
                VALUES (
                    'web.performance.alert',
                    'warning',
                    :msg,
                    CAST(:meta AS jsonb),
                    NOW()
                )
                """
            ),
            {
                "msg": f"Performance score {score} for website {project_name}",
                "meta": json.dumps(
                    {
                        "workspace_id": workspace_id,
                        "website_id": website_id,
                        "score": score,
                        "threshold": ALERT_SCORE_THRESHOLD,
                    }
                ),
            },
        )
        await session.commit()
    except Exception as exc:
        logger.warning("performance alert insert failed: %s", exc)

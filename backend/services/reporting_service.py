"""Frente 55 — Executive reporting: metrics aggregation, PDF export, automated delivery."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import BytesIO
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from openai import AsyncOpenAI
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.benchmarking_service import get_benchmarking_service
from services.churn_prediction_service import get_churn_prediction_service
from services.lead_scoring_service import tier_from_score as lead_tier
from services.reports_service import REPORTS_BUCKET, SimpleBarChart
from services.ses_service import get_ses_service
from services.supabase_service import get_supabase_service
from services.whitelabel_service import get_whitelabel_service

logger = logging.getLogger(__name__)

EXEC_REPORTS_PREFIX = "reports"
_SCHEMA_READY = False
GPT_MODEL = "gpt-4o"


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


def _period_bounds(period: str, *, now: datetime | None = None) -> tuple[datetime, datetime, datetime, datetime]:
    now = now or datetime.now(timezone.utc)
    if period == "monthly":
        current_start = now - timedelta(days=30)
        current_end = now
        prev_start = now - timedelta(days=60)
        prev_end = current_start
    else:
        current_start = now - timedelta(days=7)
        current_end = now
        prev_start = now - timedelta(days=14)
        prev_end = current_start
    return current_start, current_end, prev_start, prev_end


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


def _arrow(delta: float | None) -> str:
    if delta is None:
        return "—"
    if delta > 0:
        return f"↑ {delta:+.1f}%"
    if delta < 0:
        return f"↓ {delta:+.1f}%"
    return "→ 0%"


class ReportingService:
    """Workspace executive reports — metrics, PDF, email delivery."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = int(workspace_id)

    async def ensure_schema(self) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        migration = Path(__file__).resolve().parent.parent / "migrations" / "report_schedules.sql"
        if migration.is_file():
            raw = migration.read_text(encoding="utf-8")
            for stmt in raw.split(";"):
                s = stmt.strip()
                if s:
                    try:
                        await self.session.execute(text(s))
                    except Exception as exc:
                        logger.debug("report_schedules migration stmt skipped: %s", exc)
            await self.session.commit()
        _SCHEMA_READY = True

    async def generate_executive_report(
        self,
        workspace_id: int,
        period: str,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        period = period if period in ("weekly", "monthly") else "weekly"
        cur_start, cur_end, prev_start, prev_end = _period_bounds(period)

        email = await self._email_metrics(cur_start, cur_end, prev_start, prev_end)
        crm = await self._crm_metrics(cur_start, cur_end, prev_start, prev_end)
        campaigns = await self._campaign_metrics(cur_start, cur_end)
        web = await self._web_metrics(cur_start, cur_end, prev_start, prev_end)
        social = await self._social_metrics(cur_start, cur_end, prev_start, prev_end)
        chatbot = await self._chatbot_metrics(cur_start, cur_end, prev_start, prev_end)
        lead_scoring = await self._lead_scoring_distribution()
        churn = await self._churn_metrics()
        benchmarking = await self._benchmarking_metrics(email, crm, web)

        workspace = await self._workspace_info()
        recommendations = await self._generate_ai_recommendations(
            {
                "email": email,
                "crm": crm,
                "campaigns": campaigns,
                "web": web,
                "social": social,
                "chatbot": chatbot,
                "benchmarking": benchmarking,
                "lead_scoring": lead_scoring,
                "churn": churn,
            }
        )

        report = {
            "workspace_id": workspace_id,
            "period": period,
            "period_label": "Semanal" if period == "weekly" else "Mensual",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "date_range": {
                "start": cur_start.isoformat(),
                "end": cur_end.isoformat(),
                "previous_start": prev_start.isoformat(),
                "previous_end": prev_end.isoformat(),
            },
            "workspace": workspace,
            "email": email,
            "crm": crm,
            "campaigns": campaigns,
            "web": web,
            "social": social,
            "chatbot": chatbot,
            "benchmarking": benchmarking,
            "lead_scoring": lead_scoring,
            "churn": churn,
            "recommendations": recommendations,
        }
        return report

    async def generate_pdf_report(self, workspace_id: int, period: str) -> dict[str, Any]:
        metrics = await self.generate_executive_report(workspace_id, period)
        pdf_bytes = await asyncio.to_thread(self._build_pdf_bytes, metrics)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        pdf_path = f"{EXEC_REPORTS_PREFIX}/{workspace_id}/{period}_{ts}.pdf"
        storage = get_supabase_service()
        await storage.upload_bytes(
            REPORTS_BUCKET, pdf_path, pdf_bytes, content_type="application/pdf"
        )

        report_id = str(uuid.uuid4())
        await self.session.execute(
            text(
                """
                INSERT INTO executive_reports (id, workspace_id, period, metrics, recommendations, pdf_path)
                VALUES (CAST(:id AS uuid), :ws, :period, CAST(:metrics AS jsonb), CAST(:recs AS jsonb), :pdf_path)
                """
            ),
            {
                "id": report_id,
                "ws": workspace_id,
                "period": period,
                "metrics": json.dumps(metrics, ensure_ascii=False, default=str),
                "recs": json.dumps(metrics.get("recommendations") or [], ensure_ascii=False),
                "pdf_path": pdf_path,
            },
        )
        await self.session.commit()

        return {
            "report_id": report_id,
            "workspace_id": workspace_id,
            "period": period,
            "pdf_path": pdf_path,
            "pdf_url": storage.public_url(REPORTS_BUCKET, pdf_path),
            "metrics": metrics,
            "generated_at": metrics.get("generated_at"),
        }

    async def list_history(self, *, limit: int = 50) -> list[dict[str, Any]]:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, period, generated_at, sent_at, pdf_path, recommendations
                FROM executive_reports
                WHERE workspace_id = :ws
                ORDER BY generated_at DESC
                LIMIT :lim
                """
            ),
            {"ws": self.workspace_id, "lim": limit},
        )
        items = []
        for row in result.mappings().all():
            recs = row.get("recommendations") or []
            if isinstance(recs, str):
                try:
                    recs = json.loads(recs)
                except json.JSONDecodeError:
                    recs = []
            items.append(
                {
                    "id": str(row["id"]),
                    "workspace_id": row["workspace_id"],
                    "period": row["period"],
                    "generated_at": row["generated_at"].isoformat() if row.get("generated_at") else None,
                    "sent_at": row["sent_at"].isoformat() if row.get("sent_at") else None,
                    "pdf_path": row.get("pdf_path"),
                    "recommendations": recs,
                }
            )
        return items

    async def get_report(self, report_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, period, metrics, recommendations, pdf_path, generated_at, sent_at
                FROM executive_reports
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            {"id": report_id, "ws": self.workspace_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Report not found")
        metrics = row.get("metrics") or {}
        if isinstance(metrics, str):
            metrics = json.loads(metrics)
        recs = row.get("recommendations") or []
        if isinstance(recs, str):
            recs = json.loads(recs)
        return {
            "id": str(row["id"]),
            "workspace_id": row["workspace_id"],
            "period": row["period"],
            "metrics": metrics,
            "recommendations": recs,
            "pdf_path": row.get("pdf_path"),
            "generated_at": row["generated_at"].isoformat() if row.get("generated_at") else None,
            "sent_at": row["sent_at"].isoformat() if row.get("sent_at") else None,
        }

    async def download_pdf(self, report_id: str) -> tuple[bytes, str]:
        report = await self.get_report(report_id)
        pdf_path = report.get("pdf_path")
        if pdf_path:
            content = await get_supabase_service().download_bytes(REPORTS_BUCKET, pdf_path)
            if content:
                return content, f"nelvyon-executive-{report['period']}-{report_id[:8]}.pdf"
        metrics = report.get("metrics") or {}
        pdf_bytes = await asyncio.to_thread(self._build_pdf_bytes, metrics)
        return pdf_bytes, f"nelvyon-executive-{report['period']}-{report_id[:8]}.pdf"

    async def get_schedule(self) -> dict[str, Any]:
        await self.ensure_schema()
        row = await self.session.execute(
            text("SELECT * FROM report_schedules WHERE workspace_id = :ws"),
            {"ws": self.workspace_id},
        )
        sched = row.mappings().first()
        if not sched:
            admin_emails = await self._default_recipient_emails()
            return {
                "workspace_id": self.workspace_id,
                "weekly_enabled": True,
                "monthly_enabled": True,
                "send_day_of_week": 0,
                "send_hour": 9,
                "send_minute": 0,
                "timezone": "Europe/Madrid",
                "recipient_emails": admin_emails,
            }
        emails = sched.get("recipient_emails") or []
        if isinstance(emails, str):
            emails = json.loads(emails)
        return {
            "workspace_id": self.workspace_id,
            "weekly_enabled": bool(sched.get("weekly_enabled", True)),
            "monthly_enabled": bool(sched.get("monthly_enabled", True)),
            "send_day_of_week": int(sched.get("send_day_of_week") or 0),
            "send_hour": int(sched.get("send_hour") or 9),
            "send_minute": int(sched.get("send_minute") or 0),
            "timezone": sched.get("timezone") or "Europe/Madrid",
            "recipient_emails": emails,
            "last_weekly_sent_at": sched.get("last_weekly_sent_at"),
            "last_monthly_sent_at": sched.get("last_monthly_sent_at"),
        }

    async def update_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        emails = payload.get("recipient_emails") or []
        if not isinstance(emails, list):
            emails = [str(emails)]
        await self.session.execute(
            text(
                """
                INSERT INTO report_schedules (
                    workspace_id, weekly_enabled, monthly_enabled,
                    send_day_of_week, send_hour, send_minute, timezone, recipient_emails, updated_at
                ) VALUES (
                    :ws, :weekly, :monthly, :dow, :hour, :minute, :tz, CAST(:emails AS jsonb), NOW()
                )
                ON CONFLICT (workspace_id) DO UPDATE SET
                    weekly_enabled = EXCLUDED.weekly_enabled,
                    monthly_enabled = EXCLUDED.monthly_enabled,
                    send_day_of_week = EXCLUDED.send_day_of_week,
                    send_hour = EXCLUDED.send_hour,
                    send_minute = EXCLUDED.send_minute,
                    timezone = EXCLUDED.timezone,
                    recipient_emails = EXCLUDED.recipient_emails,
                    updated_at = NOW()
                """
            ),
            {
                "ws": self.workspace_id,
                "weekly": bool(payload.get("weekly_enabled", True)),
                "monthly": bool(payload.get("monthly_enabled", True)),
                "dow": int(payload.get("send_day_of_week", 0)),
                "hour": int(payload.get("send_hour", 9)),
                "minute": int(payload.get("send_minute", 0)),
                "tz": str(payload.get("timezone") or "Europe/Madrid"),
                "emails": json.dumps([str(e) for e in emails if e], ensure_ascii=False),
            },
        )
        await self.session.commit()
        return await self.get_schedule()

    async def send_report_email(
        self,
        *,
        period: str = "weekly",
        report_id: str | None = None,
    ) -> dict[str, Any]:
        if report_id:
            report = await self.get_report(report_id)
            pdf_bytes, filename = await self.download_pdf(report_id)
            metrics = report.get("metrics") or {}
        else:
            saved = await self.generate_pdf_report(self.workspace_id, period)
            report_id = saved["report_id"]
            metrics = saved.get("metrics") or {}
            pdf_bytes, filename = await self.download_pdf(report_id)

        schedule = await self.get_schedule()
        recipients = schedule.get("recipient_emails") or []
        if not recipients:
            recipients = await self._default_recipient_emails()
        if not recipients:
            raise ValueError("No recipient emails configured")

        html = await self._email_html_body(metrics, period)
        brand = (metrics.get("workspace") or {}).get("name") or "Portal"
        subject = f"Reporte ejecutivo {metrics.get('period_label', period)} — {brand}"
        sent_to: list[str] = []
        for email in recipients:
            try:
                await self._send_email_with_pdf(
                    to_email=str(email),
                    subject=subject,
                    html_body=html,
                    pdf_bytes=pdf_bytes,
                    filename=filename,
                )
                sent_to.append(str(email))
            except Exception as exc:
                logger.warning("Executive report email failed for %s: %s", email, exc)

        await self.session.execute(
            text(
                "UPDATE executive_reports SET sent_at = NOW() WHERE id = CAST(:id AS uuid) AND workspace_id = :ws"
            ),
            {"id": report_id, "ws": self.workspace_id},
        )
        await self.session.commit()
        return {"report_id": report_id, "sent_to": sent_to, "period": period}

    # ─── Metrics collectors ─────────────────────────────────────────────────

    async def _email_metrics(
        self, cur_start: datetime, cur_end: datetime, prev_start: datetime, prev_end: datetime
    ) -> dict[str, Any]:
        async def _range(start: datetime, end: datetime) -> dict[str, float]:
            r = await self.session.execute(
                text(
                    """
                    SELECT
                        COALESCE(SUM(c.sent_count), 0) AS sent,
                        COALESCE(SUM(c.open_count), 0) AS opens,
                        COALESCE(SUM(c.click_count), 0) AS clicks
                    FROM campaigns c
                    WHERE c.workspace_id = :ws
                      AND c.sent_at >= :start AND c.sent_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            row = r.mappings().first() or {}
            sent = float(row.get("sent") or 0)
            opens = float(row.get("opens") or 0)
            clicks = float(row.get("clicks") or 0)
            conv = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM crm_deals
                    WHERE workspace_id = :ws AND stage = 'closed_won'
                      AND updated_at >= :start AND updated_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            conversions = float(conv.scalar_one() or 0)
            return {
                "sent": sent,
                "open_rate": round((opens / sent * 100), 2) if sent else 0.0,
                "ctr": round((clicks / sent * 100), 2) if sent else 0.0,
                "conversions": conversions,
            }

        current = await _range(cur_start, cur_end)
        previous = await _range(prev_start, prev_end)
        return {
            "current": current,
            "previous": previous,
            "comparison": {
                "sent": _pct_change(current["sent"], previous["sent"]),
                "open_rate": _pct_change(current["open_rate"], previous["open_rate"]),
                "ctr": _pct_change(current["ctr"], previous["ctr"]),
                "conversions": _pct_change(current["conversions"], previous["conversions"]),
            },
        }

    async def _crm_metrics(
        self, cur_start: datetime, cur_end: datetime, prev_start: datetime, prev_end: datetime
    ) -> dict[str, Any]:
        async def _range(start: datetime, end: datetime) -> dict[str, float]:
            contacts = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM crm_contacts
                    WHERE workspace_id = :ws AND created_at >= :start AND created_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            deals = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) AS won, COALESCE(SUM(value), 0) AS revenue
                    FROM crm_deals
                    WHERE workspace_id = :ws AND stage = 'closed_won'
                      AND updated_at >= :start AND updated_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            d = deals.mappings().first() or {}
            return {
                "new_contacts": float(contacts.scalar_one() or 0),
                "leads_converted": float(d.get("won") or 0),
                "revenue": round(float(d.get("revenue") or 0), 2),
            }

        current = await _range(cur_start, cur_end)
        previous = await _range(prev_start, prev_end)
        return {
            "current": current,
            "previous": previous,
            "comparison": {k: _pct_change(current[k], previous[k]) for k in current},
        }

    async def _campaign_metrics(self, cur_start: datetime, cur_end: datetime) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT id, name, sent_count, open_count, click_count, status
                FROM campaigns
                WHERE workspace_id = :ws AND sent_at >= :start AND sent_at < :end
                ORDER BY sent_count DESC
                """
            ),
            {"ws": self.workspace_id, "start": cur_start, "end": cur_end},
        )
        ranked: list[dict[str, Any]] = []
        for row in result.mappings().all():
            sent = int(row.get("sent_count") or 0)
            opens = int(row.get("open_count") or 0)
            clicks = int(row.get("click_count") or 0)
            ranked.append(
                {
                    "id": row["id"],
                    "name": row.get("name"),
                    "sent": sent,
                    "open_rate": round(opens / sent * 100, 2) if sent else 0.0,
                    "ctr": round(clicks / sent * 100, 2) if sent else 0.0,
                }
            )
        ranked.sort(key=lambda x: x["open_rate"], reverse=True)
        best = ranked[:3]
        worst = list(reversed(ranked[-3:])) if len(ranked) >= 3 else list(reversed(ranked))
        return {"total": len(ranked), "best": best, "worst": worst}

    async def _web_metrics(
        self, cur_start: datetime, cur_end: datetime, prev_start: datetime, prev_end: datetime
    ) -> dict[str, Any]:
        async def _range(start: datetime, end: datetime) -> dict[str, float]:
            visits = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM public_analytics_events
                    WHERE workspace_id = :ws AND event_name IN ('page_view', 'visit')
                      AND created_at >= :start AND created_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            bounces = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM public_analytics_events
                    WHERE workspace_id = :ws AND event_name = 'bounce'
                      AND created_at >= :start AND created_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            conv = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM public_analytics_events
                    WHERE workspace_id = :ws AND event_name IN ('conversion', 'signup', 'purchase')
                      AND created_at >= :start AND created_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            v = float(visits.scalar_one() or 0)
            b = float(bounces.scalar_one() or 0)
            return {
                "visits": v,
                "bounce_rate": round((b / v * 100), 2) if v else 0.0,
                "conversions": float(conv.scalar_one() or 0),
            }

        current = await _range(cur_start, cur_end)
        previous = await _range(prev_start, prev_end)
        return {
            "current": current,
            "previous": previous,
            "comparison": {k: _pct_change(current[k], previous[k]) for k in current},
        }

    async def _social_metrics(
        self, cur_start: datetime, cur_end: datetime, prev_start: datetime, prev_end: datetime
    ) -> dict[str, Any]:
        async def _range(start: datetime, end: datetime) -> dict[str, float]:
            posts = await self.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM social_posts
                    WHERE tenant_id = :ws AND status = 'published'
                      AND COALESCE(published_at, created_at) >= :start
                      AND COALESCE(published_at, created_at) < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            engagement = await self.session.execute(
                text(
                    """
                    SELECT COALESCE(SUM(a.likes + a.comments + a.shares + a.reach), 0)
                    FROM social_post_analytics a
                    JOIN social_posts p ON p.id = a.post_id
                    WHERE p.tenant_id = :ws
                      AND a.fetched_at >= :start AND a.fetched_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            return {
                "posts_published": float(posts.scalar_one() or 0),
                "engagement_total": float(engagement.scalar_one() or 0),
            }

        current = await _range(cur_start, cur_end)
        previous = await _range(prev_start, prev_end)
        return {
            "current": current,
            "previous": previous,
            "comparison": {k: _pct_change(current[k], previous[k]) for k in current},
        }

    async def _chatbot_metrics(
        self, cur_start: datetime, cur_end: datetime, prev_start: datetime, prev_end: datetime
    ) -> dict[str, Any]:
        async def _range(start: datetime, end: datetime) -> dict[str, float]:
            r = await self.session.execute(
                text(
                    """
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE escalated) AS escalated
                    FROM chatbot_conversations
                    WHERE workspace_id = :ws
                      AND started_at >= :start AND started_at < :end
                    """
                ),
                {"ws": self.workspace_id, "start": start, "end": end},
            )
            row = r.mappings().first() or {}
            total = float(row.get("total") or 0)
            escalated = float(row.get("escalated") or 0)
            resolved = max(total - escalated, 0)
            return {
                "conversations": total,
                "resolution_rate": round((resolved / total * 100), 2) if total else 0.0,
            }

        current = await _range(cur_start, cur_end)
        previous = await _range(prev_start, prev_end)
        return {
            "current": current,
            "previous": previous,
            "comparison": {k: _pct_change(current[k], previous[k]) for k in current},
        }

    async def _lead_scoring_distribution(self) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT score, metadata FROM crm_contacts WHERE workspace_id = :ws
                """
            ),
            {"ws": self.workspace_id},
        )
        dist = {"cold": 0, "warm": 0, "hot": 0, "ready": 0}
        for row in result.mappings().all():
            score = int(row.get("score") or 0)
            meta = row.get("metadata") or {}
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except json.JSONDecodeError:
                    meta = {}
            tier = (meta.get("lead_ai") or {}).get("lead_tier") or lead_tier(score)
            if tier in dist:
                dist[tier] += 1
            else:
                dist[lead_tier(score)] += 1
        return {"distribution": dist, "total_scored": sum(dist.values())}

    async def _churn_metrics(self) -> dict[str, Any]:
        admin_id = await self._admin_user_id()
        if not admin_id:
            return {"at_risk_count": 0, "clients": []}
        try:
            pred = await get_churn_prediction_service(self.session).predict_churn(
                admin_id, self.workspace_id
            )
            contacts_r = await self.session.execute(
                text(
                    """
                    SELECT id, name, email, score, status FROM crm_contacts
                    WHERE workspace_id = :ws AND (COALESCE(score, 0) < 30 OR status = 'at_risk')
                    ORDER BY score ASC NULLS LAST LIMIT 10
                    """
                ),
                {"ws": self.workspace_id},
            )
            clients = [
                {
                    "contact_id": str(r["id"]),
                    "name": r.get("name"),
                    "email": r.get("email"),
                    "score": r.get("score"),
                }
                for r in contacts_r.mappings().all()
            ]
            risk = int(pred.get("risk_score") or 0)
            return {
                "workspace_risk_score": risk,
                "workspace_risk_level": pred.get("risk_level"),
                "at_risk_count": len(clients) or (1 if risk >= 60 else 0),
                "clients": clients
                or [
                    {
                        "name": pred.get("signals", {}).get("workspace_name"),
                        "risk_score": risk,
                        "reasons": pred.get("reasons"),
                    }
                ],
            }
        except Exception as exc:
            logger.debug("churn metrics skipped: %s", exc)
            return {"at_risk_count": 0, "clients": []}

    async def _benchmarking_metrics(
        self, email: dict, crm: dict, web: dict
    ) -> dict[str, Any]:
        ws = await self._workspace_info()
        sector = ws.get("industry") or "startup"
        client_metrics = {
            "email_open_rate": email["current"]["open_rate"],
            "email_ctr": email["current"]["ctr"],
            "conversion_rate": web["current"]["conversions"] / max(web["current"]["visits"], 1) * 100,
            "cac_eur": 0.0,
            "churn_rate": 0.0,
        }
        if crm["current"]["leads_converted"] > 0 and crm["current"]["revenue"] > 0:
            client_metrics["cac_eur"] = round(
                crm["current"]["revenue"] / max(crm["current"]["new_contacts"], 1), 2
            )
        return get_benchmarking_service().compare_client_vs_industry(
            str(self.workspace_id),
            client_metrics,
            sector=sector,
        )

    async def _workspace_info(self) -> dict[str, Any]:
        r = await self.session.execute(
            text(
                """
                SELECT id, name, industry, logo_url, website_url
                FROM workspaces WHERE id = :ws
                """
            ),
            {"ws": self.workspace_id},
        )
        row = r.mappings().first()
        if not row:
            return {"id": self.workspace_id, "name": f"Workspace {self.workspace_id}"}
        return {
            "id": row["id"],
            "name": row.get("name"),
            "industry": row.get("industry"),
            "logo_url": row.get("logo_url"),
            "website_url": row.get("website_url"),
        }

    async def _admin_user_id(self) -> str | None:
        r = await self.session.execute(
            text(
                """
                SELECT user_id FROM workspace_members
                WHERE workspace_id = :ws AND role IN ('owner', 'admin') AND status = 'active'
                ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END
                LIMIT 1
                """
            ),
            {"ws": self.workspace_id},
        )
        row = r.mappings().first()
        return str(row["user_id"]) if row else None

    async def _default_recipient_emails(self) -> list[str]:
        r = await self.session.execute(
            text(
                """
                SELECT email FROM workspace_members
                WHERE workspace_id = :ws AND role IN ('owner', 'admin') AND status = 'active'
                  AND email IS NOT NULL AND email != ''
                """
            ),
            {"ws": self.workspace_id},
        )
        return [str(row["email"]) for row in r.mappings().all() if row.get("email")]

    async def _generate_ai_recommendations(self, metrics: dict[str, Any]) -> list[str]:
        client = _openai_client()
        fallback = [
            "Optimiza el asunto de campañas con open rate por debajo de la media del sector.",
            "Prioriza contactos en tier 'hot' y 'ready' para llamadas comerciales esta semana.",
            "Implementa secuencia de retención para clientes identificados en riesgo de churn.",
            "A/B test en landing pages con bounce rate elevado.",
            "Incrementa frecuencia de publicación social si el engagement cae vs periodo anterior.",
        ]
        if not client:
            return fallback[:5]
        summary = json.dumps(metrics, ensure_ascii=False, default=str)[:12000]
        try:
            resp = await client.chat.completions.create(
                model=GPT_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Analista de negocio. Responde SOLO JSON: "
                            '{"recommendations": ["acción concreta 1", "..."]} '
                            "Entre 3 y 5 acciones en español, específicas y medibles."
                        ),
                    },
                    {"role": "user", "content": f"Métricas del periodo:\n{summary}"},
                ],
                temperature=0.4,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            recs = data.get("recommendations") or []
            if isinstance(recs, list) and recs:
                return [str(r) for r in recs[:5]]
        except Exception as exc:
            logger.warning("AI recommendations failed: %s", exc)
        return fallback[:5]

    # ─── PDF & email ────────────────────────────────────────────────────────

    def _chart_image(self, items: list[tuple[str, float]], title: str) -> Image | None:
        if not items:
            return None
        try:
            import matplotlib

            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            fig, ax = plt.subplots(figsize=(6, 2.5))
            labels = [str(l)[:18] for l, _ in items]
            values = [float(v) for _, v in items]
            ax.barh(labels, values, color="#4F46E5")
            ax.set_title(title, fontsize=10)
            ax.tick_params(labelsize=8)
            fig.tight_layout()
            buf = BytesIO()
            fig.savefig(buf, format="png", dpi=120)
            plt.close(fig)
            buf.seek(0)
            return Image(buf, width=14 * cm, height=5 * cm)
        except Exception as exc:
            logger.debug("matplotlib chart skipped: %s", exc)
            return SimpleBarChart(items)

    def _build_pdf_bytes(self, metrics: dict[str, Any]) -> bytes:
        ws = metrics.get("workspace") or {}
        period_label = metrics.get("period_label") or metrics.get("period", "")
        dr = metrics.get("date_range") or {}
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm)
        styles = getSampleStyleSheet()
        story: list[Any] = []

        story.append(Paragraph(f"<b>{ws.get('name', 'NELVYON')}</b>", styles["Title"]))
        story.append(Paragraph(f"Reporte ejecutivo {period_label}", styles["Heading1"]))
        story.append(
            Paragraph(
                f"Periodo: {dr.get('start', '')[:10]} → {dr.get('end', '')[:10]}",
                styles["Normal"],
            )
        )
        story.append(Spacer(1, 0.5 * cm))

        def metric_table(section: str, current: dict, comparison: dict, labels: dict[str, str]) -> None:
            rows = [["Métrica", "Actual", "vs anterior"]]
            for key, label in labels.items():
                rows.append(
                    [
                        label,
                        str(current.get(key, "—")),
                        _arrow(comparison.get(key)),
                    ]
                )
            t = Table(rows, colWidths=[7 * cm, 4 * cm, 4 * cm])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ]
                )
            )
            story.append(Paragraph(f"<b>{section}</b>", styles["Heading2"]))
            story.append(t)
            story.append(Spacer(1, 0.3 * cm))

        email = metrics.get("email") or {}
        metric_table(
            "Email",
            email.get("current") or {},
            email.get("comparison") or {},
            {"sent": "Enviados", "open_rate": "Open rate %", "ctr": "CTR %", "conversions": "Conversiones"},
        )

        crm = metrics.get("crm") or {}
        metric_table(
            "CRM",
            crm.get("current") or {},
            crm.get("comparison") or {},
            {"new_contacts": "Nuevos contactos", "leads_converted": "Leads convertidos", "revenue": "Revenue €"},
        )

        web = metrics.get("web") or {}
        metric_table(
            "Web / Landing",
            web.get("current") or {},
            web.get("comparison") or {},
            {"visits": "Visitas", "bounce_rate": "Bounce rate %", "conversions": "Conversiones"},
        )

        ls = (metrics.get("lead_scoring") or {}).get("distribution") or {}
        chart = self._chart_image(
            [(k, float(v)) for k, v in ls.items()],
            "Lead scoring (cold/warm/hot/ready)",
        )
        if chart:
            story.append(Paragraph("<b>Lead Scoring</b>", styles["Heading2"]))
            story.append(chart)
            story.append(Spacer(1, 0.3 * cm))

        recs = metrics.get("recommendations") or []
        story.append(Paragraph("<b>Recomendaciones IA</b>", styles["Heading2"]))
        for i, rec in enumerate(recs, 1):
            story.append(Paragraph(f"{i}. {rec}", styles["Normal"]))
        story.append(Spacer(1, 0.5 * cm))

        gen_at = metrics.get("generated_at", "")[:19].replace("T", " ")
        story.append(
            Paragraph(
                f"Generado: {gen_at} · Powered by NELVYON",
                styles["Normal"],
            )
        )

        doc.build(story)
        return buffer.getvalue()

    async def _email_html_body(self, metrics: dict[str, Any], period: str) -> str:
        ws = metrics.get("workspace") or {}
        email = (metrics.get("email") or {}).get("current") or {}
        crm = (metrics.get("crm") or {}).get("current") or {}
        web = (metrics.get("web") or {}).get("current") or {}
        label = metrics.get("period_label") or period
        recs = metrics.get("recommendations") or []
        rec_html = "".join(f"<li>{r}</li>" for r in recs[:5])

        wl = get_whitelabel_service(self.session, self.workspace_id)
        cfg = await wl.get_whitelabel_config()
        brand = cfg.get("brand_name") or ws.get("name") or "Portal"
        hide = bool(cfg.get("hide_nelvyon_branding"))
        primary = cfg.get("primary_color") or "#6366f1"
        support = cfg.get("support_email") or ""
        footer = (
            f"<p style='color:#64748b;font-size:12px;'>{brand}"
            + (f" · <a href='mailto:{support}'>{support}</a>" if support else "")
            + "</p>"
            if hide
            else "<p style='color:#666;font-size:12px;'>Powered by NELVYON</p>"
        )

        return f"""
        <html><body style="font-family:Arial,sans-serif;color:#111;">
        <div style="background:{primary};color:#fff;padding:16px 24px;">
          <h1 style="margin:0;font-size:20px;">{brand}</h1>
        </div>
        <h2 style="margin-top:24px;">Reporte ejecutivo {label}</h2>
        <table cellpadding="8" style="border-collapse:collapse;">
          <tr><td><b>Emails enviados</b></td><td>{email.get('sent', 0)}</td></tr>
          <tr><td><b>Open rate</b></td><td>{email.get('open_rate', 0)}%</td></tr>
          <tr><td><b>Nuevos contactos</b></td><td>{crm.get('new_contacts', 0)}</td></tr>
          <tr><td><b>Revenue</b></td><td>{crm.get('revenue', 0)} €</td></tr>
          <tr><td><b>Visitas web</b></td><td>{web.get('visits', 0)}</td></tr>
        </table>
        <h3>Recomendaciones</h3><ul>{rec_html}</ul>
        <p>PDF adjunto con el informe completo.</p>
        {footer}
        </body></html>
        """

    async def _send_email_with_pdf(
        self,
        *,
        to_email: str,
        subject: str,
        html_body: str,
        pdf_bytes: bytes,
        filename: str,
    ) -> dict[str, Any]:
        ses = get_ses_service()
        wl = get_whitelabel_service(self.session, self.workspace_id)
        sender = await wl.get_email_sender()
        from_email = sender.get("from_email") or os.environ.get("SES_FROM_EMAIL", "").strip() or ses.default_from_email

        if ses.is_mock:
            return await ses.send_email(to_email, subject, html_body, from_email=from_email or None)

        if not from_email:
            raise ValueError("SES_FROM_EMAIL is required to send executive reports")

        def _send_raw() -> dict[str, Any]:
            import boto3

            ses._ensure_client()
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to_email
            alt = MIMEMultipart("alternative")
            alt.attach(MIMEText(html_body, "html", "utf-8"))
            msg.attach(alt)
            attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
            attachment.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(attachment)
            client = boto3.client(
                "ses",
                region_name=os.environ.get("AWS_REGION", "eu-west-1"),
            )
            client.send_raw_email(
                Source=from_email,
                Destinations=[to_email],
                RawMessage={"Data": msg.as_string()},
            )
            return {"status": "sent", "to": to_email}

        return await asyncio.to_thread(_send_raw)


def get_reporting_service(session: AsyncSession, workspace_id: int) -> ReportingService:
    return ReportingService(session, workspace_id)

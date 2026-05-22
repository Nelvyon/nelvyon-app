"""Client data reports — SEO, analytics, campaigns, CRM with PDF/CSV export."""

from __future__ import annotations

import asyncio
import csv
import json
import logging
import os
import uuid
from datetime import date, datetime, timezone
from io import BytesIO, StringIO
from typing import Any
from urllib.parse import urlparse

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.analytics_service import get_analytics_service
from services.campaign_service import CampaignService
from services.crm_service import CRMService
from services.gsc_service import get_gsc_service
from services.seo_apis import DataForSEOService, SemrushService
from services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

REPORTS_BUCKET = "agent-results"
REPORTS_PREFIX = "reports"


def _parse_semrush_table(raw: str) -> list[dict[str, str]]:
    lines = [line.strip() for line in (raw or "").strip().split("\n") if line.strip()]
    if not lines:
        return []
    headers = [h.strip() for h in lines[0].split(";")]
    rows: list[dict[str, str]] = []
    for line in lines[1:]:
        cells = [c.strip() for c in line.split(";")]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))
    return rows


def _gsc_top_rows(gsc_data: dict[str, Any], *, limit: int = 15) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in gsc_data.get("rows") or []:
        keys = row.get("keys") or []
        label = keys[0] if keys else "—"
        items.append(
            {
                "label": label,
                "clicks": int(row.get("clicks") or 0),
                "impressions": int(row.get("impressions") or 0),
                "ctr": round(float(row.get("ctr") or 0) * 100, 2),
                "position": round(float(row.get("position") or 0), 2),
            }
        )
    items.sort(key=lambda x: x["clicks"], reverse=True)
    return items[:limit]


class SimpleBarChart(Flowable):
    """Minimal horizontal bar chart for ReportLab PDFs."""

    def __init__(self, items: list[tuple[str, float]], width: float = 16 * cm, height: float = 4 * cm):
        self.items = items[:8]
        self.width = width
        self.height = height

    def wrap(self, avail_width: float, avail_height: float) -> tuple[float, float]:
        return self.width, self.height

    def draw(self) -> None:
        canvas = self.canv
        if not self.items:
            return
        max_val = max((float(v) for _, v in self.items), default=1.0) or 1.0
        bar_h = (self.height - 20) / max(len(self.items), 1)
        y = self.height - 15
        for label, value in self.items:
            val = float(value)
            bar_w = (val / max_val) * (self.width - 120)
            canvas.setFont("Helvetica", 8)
            canvas.drawString(5, y, str(label)[:28])
            canvas.setFillColor(colors.HexColor("#4F46E5"))
            canvas.rect(110, y - 2, max(bar_w, 2), bar_h - 6, fill=1, stroke=0)
            canvas.setFillColor(colors.black)
            canvas.drawRightString(self.width - 5, y, f"{val:,.0f}")
            y -= bar_h


class ReportsService:
    """Aggregates real client metrics and exports PDF/CSV to Supabase."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    def _storage_prefix(self) -> str:
        return f"{REPORTS_PREFIX}/workspace-{self.workspace_id}"

    async def _resolve_site_url(self, site_url: str | None = None) -> str:
        if site_url and site_url.strip():
            return site_url.strip()
        env_site = os.environ.get("GSC_SITE_URL", "").strip()
        if env_site:
            return env_site
        row = await self.session.execute(
            text(
                """
                SELECT website_url FROM nelvyon_clients
                WHERE workspace_id = :workspace_id AND website_url IS NOT NULL
                ORDER BY id DESC LIMIT 1
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        fetched = row.fetchone()
        if fetched and fetched._mapping.get("website_url"):
            url = str(fetched._mapping["website_url"]).strip()
            if not url.endswith("/"):
                url += "/"
            return url
        return "https://nelvyon.com/"

    async def _resolve_seo_domain(self, domain: str | None = None) -> str:
        if domain and domain.strip():
            return domain.strip().lower().replace("https://", "").replace("http://", "").strip("/")
        site = await self._resolve_site_url()
        parsed = urlparse(site if "://" in site else f"https://{site}")
        host = parsed.netloc or parsed.path.split("/")[0]
        return host or "nelvyon.com"

    async def generate_seo_report(
        self,
        start_date: str,
        end_date: str,
        *,
        site_url: str | None = None,
        domain: str | None = None,
        primary_keyword: str | None = None,
    ) -> dict[str, Any]:
        site = await self._resolve_site_url(site_url)
        seo_domain = await self._resolve_seo_domain(domain)
        keyword = (primary_keyword or os.environ.get("REPORTS_PRIMARY_KEYWORD", "")).strip() or seo_domain.split(".")[0]

        gsc = get_gsc_service()
        semrush = SemrushService()
        dataforseo = DataForSEOService()

        gsc_queries = await gsc.get_search_analytics(site, start_date, end_date, dimensions=["query"])
        gsc_pages = await gsc.get_search_analytics(site, start_date, end_date, dimensions=["page"])

        semrush_domain = await semrush.domain_overview(seo_domain)
        semrush_competitors = await semrush.competitors(seo_domain)
        semrush_keyword = await semrush.keyword_overview(keyword)
        serp = await dataforseo.serp_analysis(keyword)
        keyword_ideas = await dataforseo.keyword_ideas(keyword)

        total_clicks = sum(int(r.get("clicks") or 0) for r in gsc_queries.get("rows") or [])
        total_impressions = sum(int(r.get("impressions") or 0) for r in gsc_queries.get("rows") or [])

        data = {
            "report_type": "seo",
            "workspace_id": self.workspace_id,
            "period": {"start_date": start_date, "end_date": end_date},
            "site_url": site,
            "seo_domain": seo_domain,
            "primary_keyword": keyword,
            "organic_traffic": {
                "clicks": total_clicks,
                "impressions": total_impressions,
                "ctr_percent": round((total_clicks / total_impressions * 100), 2) if total_impressions else 0.0,
            },
            "top_queries": _gsc_top_rows(gsc_queries),
            "top_pages": _gsc_top_rows(gsc_pages),
            "semrush": {
                "domain_overview_rows": _parse_semrush_table(semrush_domain.get("raw", "")),
                "competitors_rows": _parse_semrush_table(semrush_competitors.get("raw", "")),
                "keyword_overview_rows": _parse_semrush_table(semrush_keyword.get("raw", "")),
            },
            "dataforseo": {
                "serp_analysis": serp,
                "keyword_ideas": keyword_ideas,
            },
            "sources": {
                "gsc_mock": gsc_queries.get("mock", False),
                "semrush_configured": bool(semrush.api_key),
                "dataforseo_configured": bool(dataforseo.login and dataforseo.password),
            },
        }
        return await self._persist_report(data, "seo")

    async def generate_analytics_report(
        self,
        start_date: str,
        end_date: str,
        *,
        property_id: str | None = None,
    ) -> dict[str, Any]:
        analytics = get_analytics_service()
        overview = await analytics.get_traffic_overview(property_id, start_date, end_date)
        sources = await analytics.get_traffic_sources(property_id, start_date, end_date)
        pages = await analytics.get_top_pages(property_id, start_date, end_date, limit=15)
        conversions = await analytics.get_conversions(property_id, start_date, end_date)

        data = {
            "report_type": "analytics",
            "workspace_id": self.workspace_id,
            "period": {"start_date": start_date, "end_date": end_date},
            "traffic": overview,
            "sources": sources.get("items") or [],
            "top_pages": pages.get("items") or [],
            "conversions": conversions.get("items") or [],
            "kpis": [
                {"label": "Sesiones", "value": overview.get("sessions", 0)},
                {"label": "Usuarios", "value": overview.get("users", 0)},
                {"label": "Páginas vistas", "value": overview.get("pageviews", 0)},
                {"label": "Bounce rate", "value": f"{overview.get('bounce_rate', 0)}%"},
            ],
            "sources_meta": {"mock": overview.get("mock", False), "property_id": overview.get("property_id")},
        }
        return await self._persist_report(data, "analytics")

    async def generate_campaign_report(self, campaign_id: int) -> dict[str, Any]:
        campaign_svc = CampaignService(self.session, self.workspace_id)
        stats = await campaign_svc.get_stats(campaign_id)

        sent = int(stats.get("sent_count") or 0)
        opened = int(stats.get("open_count") or 0)
        clicked = int(stats.get("click_count") or 0)
        avg_value = float(os.environ.get("REPORTS_CAMPAIGN_AVG_ORDER_VALUE", "75") or 75)
        estimated_conversions = max(1, int(clicked * 0.12)) if clicked else 0
        estimated_revenue = round(estimated_conversions * avg_value, 2)
        cost_estimate = round(sent * 0.02, 2)
        roi_percent = (
            round(((estimated_revenue - cost_estimate) / cost_estimate) * 100, 2)
            if cost_estimate > 0
            else 0.0
        )

        data = {
            "report_type": "campaign",
            "workspace_id": self.workspace_id,
            "campaign_id": campaign_id,
            "stats": stats,
            "deliverability": {
                "sent": sent,
                "opened": opened,
                "clicked": clicked,
                "bounce_rate_percent": stats.get("bounce_rate", 0),
                "failed_count": stats.get("failed_count", 0),
                "open_rate_percent": stats.get("open_rate", 0),
                "click_rate_percent": stats.get("click_rate", 0),
                "bounce_rate_percent": stats.get("bounce_rate", 0),
            },
            "roi": {
                "estimated_conversions": estimated_conversions,
                "estimated_revenue_eur": estimated_revenue,
                "estimated_cost_eur": cost_estimate,
                "roi_percent": roi_percent,
            },
            "kpis": [
                {"label": "Enviados", "value": sent},
                {"label": "Abiertos", "value": opened},
                {"label": "Clicks", "value": clicked},
                {"label": "ROI est.", "value": f"{roi_percent}%"},
            ],
        }
        return await self._persist_report(data, "campaign")

    async def generate_crm_report(self, start_date: str, end_date: str) -> dict[str, Any]:
        crm = CRMService(self.session, self.workspace_id)
        pipeline = await crm.get_pipeline_view()
        stats = await crm.get_stats()

        period_stats = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE stage = 'closed_won'
                        AND updated_at >= CAST(:start AS date)
                        AND updated_at < (CAST(:end AS date) + INTERVAL '1 day')) AS won_period,
                    COUNT(*) FILTER (WHERE stage = 'closed_lost'
                        AND updated_at >= CAST(:start AS date)
                        AND updated_at < (CAST(:end AS date) + INTERVAL '1 day')) AS lost_period,
                    COALESCE(SUM(value) FILTER (WHERE stage = 'closed_won'
                        AND updated_at >= CAST(:start AS date)
                        AND updated_at < (CAST(:end AS date) + INTERVAL '1 day')), 0) AS won_value
                FROM crm_deals
                WHERE workspace_id = :workspace_id
                """
            ),
            {"workspace_id": self.workspace_id, "start": start_date, "end": end_date},
        )
        ps = period_stats.fetchone()
        won_p = int(ps.won_period or 0) if ps else 0
        lost_p = int(ps.lost_period or 0) if ps else 0
        closed_p = won_p + lost_p
        win_rate_period = round((won_p / closed_p) * 100, 2) if closed_p else 0.0

        activities = await self.session.execute(
            text(
                """
                SELECT type, COUNT(*) AS cnt
                FROM crm_activities
                WHERE workspace_id = :workspace_id
                  AND created_at >= CAST(:start AS date)
                  AND created_at < (CAST(:end AS date) + INTERVAL '1 day')
                GROUP BY type
                ORDER BY cnt DESC
                """
            ),
            {"workspace_id": self.workspace_id, "start": start_date, "end": end_date},
        )
        activity_rows = [
            {"type": row.type, "count": int(row.cnt)} for row in activities.fetchall()
        ]

        data = {
            "report_type": "crm",
            "workspace_id": self.workspace_id,
            "period": {"start_date": start_date, "end_date": end_date},
            "pipeline_value": pipeline.get("totals", {}),
            "pipeline_columns": pipeline.get("columns", []),
            "stats": stats,
            "period_deals": {
                "closed_won": won_p,
                "closed_lost": lost_p,
                "win_rate_percent": win_rate_period,
                "won_value_eur": round(float(ps.won_value or 0) if ps else 0, 2),
            },
            "activities_by_type": activity_rows,
            "kpis": [
                {"label": "Pipeline (abierto)", "value": stats.get("pipeline_value", 0)},
                {"label": "Win rate global", "value": f"{stats.get('win_rate_percent', 0)}%"},
                {"label": "Deals ganados (periodo)", "value": won_p},
                {"label": "Actividades", "value": sum(a["count"] for a in activity_rows)},
            ],
        }
        return await self._persist_report(data, "crm")

    async def generate_full_report(
        self,
        start_date: str,
        end_date: str,
        *,
        site_url: str | None = None,
        domain: str | None = None,
        property_id: str | None = None,
    ) -> dict[str, Any]:
        seo = await self.generate_seo_report(
            start_date, end_date, site_url=site_url, domain=domain
        )
        analytics = await self.generate_analytics_report(
            start_date, end_date, property_id=property_id
        )
        crm = await self.generate_crm_report(start_date, end_date)

        data = {
            "report_type": "full",
            "workspace_id": self.workspace_id,
            "period": {"start_date": start_date, "end_date": end_date},
            "seo": seo.get("data"),
            "analytics": analytics.get("data"),
            "crm": crm.get("data"),
            "child_report_ids": {
                "seo": seo.get("report_id"),
                "analytics": analytics.get("report_id"),
                "crm": crm.get("report_id"),
            },
        }
        return await self._persist_report(data, "full")

    async def _persist_report(self, data: dict[str, Any], report_type: str) -> dict[str, Any]:
        report_id = uuid.uuid4().hex
        generated_at = datetime.now(timezone.utc).isoformat()
        envelope = {
            "report_id": report_id,
            "report_type": report_type,
            "workspace_id": self.workspace_id,
            "generated_at": generated_at,
            "data": data,
        }

        base = f"{self._storage_prefix()}/{report_id}"
        json_path = f"{base}.json"
        pdf_path = f"{base}.pdf"
        csv_path = f"{base}.csv"

        storage = get_supabase_service()
        await storage.upload_json(REPORTS_BUCKET, json_path, envelope)

        pdf_bytes = await asyncio.to_thread(self.export_pdf, envelope, report_type)
        csv_bytes = self.export_csv(envelope).encode("utf-8")

        await storage.upload_bytes(
            REPORTS_BUCKET, pdf_path, pdf_bytes, content_type="application/pdf"
        )
        await storage.upload_bytes(
            REPORTS_BUCKET, csv_path, csv_bytes, content_type="text/csv"
        )

        return {
            "report_id": report_id,
            "report_type": report_type,
            "workspace_id": self.workspace_id,
            "generated_at": generated_at,
            "data": data,
            "paths": {
                "json": json_path,
                "pdf": pdf_path,
                "csv": csv_path,
            },
            "public_urls": {
                "json": storage.public_url(REPORTS_BUCKET, json_path),
                "pdf": storage.public_url(REPORTS_BUCKET, pdf_path),
                "csv": storage.public_url(REPORTS_BUCKET, csv_path),
            },
        }

    async def get_report(self, report_id: str) -> dict[str, Any]:
        path = f"{self._storage_prefix()}/{report_id}.json"
        storage = get_supabase_service()
        raw = await storage.download_bytes(REPORTS_BUCKET, path)
        if not raw:
            raise ValueError("Report not found")
        return json.loads(raw.decode("utf-8"))

    async def list_history(self, *, limit: int = 50) -> list[dict[str, Any]]:
        storage = get_supabase_service()
        prefix = f"{self._storage_prefix()}/"
        objects = await storage.list_objects(REPORTS_BUCKET, prefix=prefix, limit=limit * 3)
        history: list[dict[str, Any]] = []
        for obj in objects:
            name = str(obj.get("name") or "")
            if not name.endswith(".json"):
                continue
            report_id = name.rsplit("/", 1)[-1].replace(".json", "")
            try:
                report = await self.get_report(report_id)
            except ValueError:
                continue
            history.append(
                {
                    "report_id": report_id,
                    "report_type": report.get("report_type"),
                    "generated_at": report.get("generated_at"),
                    "paths": {
                        "json": f"{self._storage_prefix()}/{report_id}.json",
                        "pdf": f"{self._storage_prefix()}/{report_id}.pdf",
                        "csv": f"{self._storage_prefix()}/{report_id}.csv",
                    },
                }
            )
        history.sort(key=lambda x: x.get("generated_at") or "", reverse=True)
        return history[:limit]

    async def download_pdf(self, report_id: str) -> tuple[bytes, str]:
        path = f"{self._storage_prefix()}/{report_id}.pdf"
        storage = get_supabase_service()
        content = await storage.download_bytes(REPORTS_BUCKET, path)
        if content:
            return content, f"nelvyon-report-{report_id}.pdf"
        report = await self.get_report(report_id)
        pdf_bytes = await asyncio.to_thread(
            self.export_pdf, report, str(report.get("report_type", "report"))
        )
        return pdf_bytes, f"nelvyon-report-{report_id}.pdf"

    async def download_csv(self, report_id: str) -> tuple[bytes, str]:
        path = f"{self._storage_prefix()}/{report_id}.csv"
        storage = get_supabase_service()
        content = await storage.download_bytes(REPORTS_BUCKET, path)
        if content:
            return content, f"nelvyon-report-{report_id}.csv"
        report = await self.get_report(report_id)
        return self.export_csv(report).encode("utf-8"), f"nelvyon-report-{report_id}.csv"

    def export_csv(self, report_data: dict[str, Any]) -> str:
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["section", "metric", "value"])
        report_type = report_data.get("report_type", "report")
        data = report_data.get("data") or report_data

        def write_kpis(kpis: list[dict[str, Any]], section: str) -> None:
            for kpi in kpis or []:
                writer.writerow([section, kpi.get("label"), kpi.get("value")])

        def write_rows(section: str, rows: list[dict[str, Any]], columns: list[str]) -> None:
            for row in rows or []:
                for col in columns:
                    writer.writerow([section, col, row.get(col)])

        if report_type == "seo":
            org = data.get("organic_traffic") or {}
            writer.writerow(["organic", "clicks", org.get("clicks")])
            writer.writerow(["organic", "impressions", org.get("impressions")])
            write_rows("top_queries", data.get("top_queries") or [], ["label", "clicks", "impressions", "ctr", "position"])
            write_rows("top_pages", data.get("top_pages") or [], ["label", "clicks", "impressions", "ctr", "position"])
        elif report_type == "analytics":
            traffic = data.get("traffic") or {}
            write_kpis(data.get("kpis") or [], "kpis")
            write_rows("sources", data.get("sources") or [], ["channel", "sessions", "users"])
            write_rows("top_pages", data.get("top_pages") or [], ["page_path", "pageviews", "users"])
            write_rows("conversions", data.get("conversions") or [], ["event_name", "event_count", "conversion_value"])
        elif report_type == "campaign":
            write_kpis(data.get("kpis") or [], "kpis")
            for key, val in (data.get("deliverability") or {}).items():
                writer.writerow(["deliverability", key, val])
            for key, val in (data.get("roi") or {}).items():
                writer.writerow(["roi", key, val])
        elif report_type == "crm":
            write_kpis(data.get("kpis") or [], "kpis")
            for key, val in (data.get("period_deals") or {}).items():
                writer.writerow(["period_deals", key, val])
            write_rows("activities", data.get("activities_by_type") or [], ["type", "count"])
        elif report_type == "full":
            for subsection in ("seo", "analytics", "crm"):
                nested = data.get(subsection) or {}
                writer.writerow(["full", subsection, "included"])
                if nested.get("kpis"):
                    write_kpis(nested.get("kpis") or [], f"{subsection}.kpis")
        else:
            writer.writerow(["report", "type", report_type])

        return buffer.getvalue()

    def export_pdf(self, report_data: dict[str, Any], report_type: str) -> bytes:
        data = report_data.get("data") or report_data
        period = data.get("period") or {}
        title_map = {
            "seo": "Informe SEO",
            "analytics": "Informe Analytics",
            "campaign": "Informe de Campaña",
            "crm": "Informe CRM",
            "full": "Informe Completo",
        }
        title = title_map.get(report_type, "Informe NELVYON")

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm)
        styles = getSampleStyleSheet()
        story: list[Any] = []

        story.append(Paragraph(f"<b>NELVYON</b> — {title}", styles["Title"]))
        story.append(
            Paragraph(
                f"Workspace {self.workspace_id} · "
                f"{period.get('start_date', '—')} → {period.get('end_date', '—')}",
                styles["Normal"],
            )
        )
        story.append(Spacer(1, 0.4 * cm))

        kpis = data.get("kpis") or []
        if not kpis and report_type == "seo":
            org = data.get("organic_traffic") or {}
            kpis = [
                {"label": "Clics orgánicos", "value": org.get("clicks", 0)},
                {"label": "Impresiones", "value": org.get("impressions", 0)},
                {"label": "CTR", "value": f"{org.get('ctr_percent', 0)}%"},
            ]
        if kpis:
            kpi_table = Table(
                [["KPI", "Valor"]] + [[k.get("label"), str(k.get("value"))] for k in kpis],
                colWidths=[10 * cm, 6 * cm],
            )
            kpi_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ]
                )
            )
            story.append(kpi_table)
            story.append(Spacer(1, 0.5 * cm))

        chart_items: list[tuple[str, float]] = []
        if report_type == "analytics":
            for item in (data.get("sources") or [])[:6]:
                chart_items.append((str(item.get("channel", ""))[:20], float(item.get("sessions") or 0)))
        elif report_type == "seo":
            for item in (data.get("top_queries") or [])[:6]:
                chart_items.append((str(item.get("label", ""))[:20], float(item.get("clicks") or 0)))
        elif report_type == "crm":
            for item in (data.get("activities_by_type") or [])[:6]:
                chart_items.append((str(item.get("type", ""))[:20], float(item.get("count") or 0)))
        elif report_type == "campaign":
            d = data.get("deliverability") or {}
            chart_items = [
                ("Enviados", float(d.get("sent") or 0)),
                ("Abiertos", float(d.get("opened") or 0)),
                ("Clicks", float(d.get("clicked") or 0)),
            ]

        if chart_items:
            story.append(Paragraph("<b>Gráfica</b>", styles["Heading2"]))
            story.append(SimpleBarChart(chart_items))
            story.append(Spacer(1, 0.4 * cm))

        def add_table(heading: str, rows: list[list[str]]) -> None:
            if len(rows) <= 1:
                return
            story.append(Paragraph(f"<b>{heading}</b>", styles["Heading2"]))
            table = Table(rows, repeatRows=1)
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ]
                )
            )
            story.append(table)
            story.append(Spacer(1, 0.3 * cm))

        if report_type in ("seo", "full"):
            seo_block = data if report_type == "seo" else data.get("seo") or {}
            qrows = [["Query", "Clics", "Impresiones", "CTR %", "Pos."]]
            for row in (seo_block.get("top_queries") or [])[:12]:
                qrows.append(
                    [
                        str(row.get("label", ""))[:40],
                        str(row.get("clicks", 0)),
                        str(row.get("impressions", 0)),
                        str(row.get("ctr", 0)),
                        str(row.get("position", 0)),
                    ]
                )
            add_table("Top keywords (GSC)", qrows)

        if report_type in ("analytics", "full"):
            ablock = data if report_type == "analytics" else data.get("analytics") or {}
            srows = [["Canal", "Sesiones", "Usuarios"]]
            for row in (ablock.get("sources") or [])[:12]:
                srows.append(
                    [
                        str(row.get("channel", "")),
                        str(row.get("sessions", 0)),
                        str(row.get("users", 0)),
                    ]
                )
            add_table("Fuentes de tráfico", srows)

        if report_type == "campaign":
            stats = data.get("stats") or {}
            add_table(
                "Campaña",
                [
                    ["Métrica", "Valor"],
                    ["Nombre", str(stats.get("name", ""))],
                    ["Enviados", str(stats.get("sent_count", 0))],
                    ["Open rate", f"{stats.get('open_rate', 0)}%"],
                    ["Click rate", f"{stats.get('click_rate', 0)}%"],
                    ["ROI est.", f"{(data.get('roi') or {}).get('roi_percent', 0)}%"],
                ],
            )

        doc.build(story)
        return buffer.getvalue()


def get_reports_service(session: AsyncSession, workspace_id: int) -> ReportsService:
    return ReportsService(session, workspace_id)


def default_date_range(days: int = 30) -> tuple[str, str]:
    end = date.today()
    start = end.fromordinal(end.toordinal() - max(days - 1, 1))
    return start.isoformat(), end.isoformat()

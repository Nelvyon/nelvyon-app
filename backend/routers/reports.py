"""Client data reports API — SEO, analytics, campaigns, CRM."""

from __future__ import annotations

import logging
from datetime import date

from core.rate_limiter import endpoint_rate_limit
from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.cache_service import cached
from services.reports_service import default_date_range, get_reports_service
from services.reporting_service import get_reporting_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["reports"])

REPORT_CACHE_TTL = 1800  # 30 minutes


def _svc(db: AsyncSession, ws: WorkspaceContext):
    return get_reports_service(db, ws.workspace_id)


def _exec_svc(db: AsyncSession, ws: WorkspaceContext):
    return get_reporting_service(db, ws.workspace_id)


class GenerateReportBody(BaseModel):
    period: str = Field(default="weekly", pattern="^(weekly|monthly)$")


class ScheduleBody(BaseModel):
    weekly_enabled: bool = True
    monthly_enabled: bool = True
    send_day_of_week: int = Field(default=0, ge=0, le=6)
    send_hour: int = Field(default=9, ge=0, le=23)
    send_minute: int = Field(default=0, ge=0, le=59)
    timezone: str = "Europe/Madrid"
    recipient_emails: list[str] = Field(default_factory=list)


class SendNowBody(BaseModel):
    period: str = Field(default="weekly", pattern="^(weekly|monthly)$")
    report_id: str | None = None


def _dates(
    start_date: date | None,
    end_date: date | None,
) -> tuple[str, str]:
    if start_date and end_date:
        return start_date.isoformat(), end_date.isoformat()
    return default_date_range(30)


@router.get("/seo")
@cached(ttl=REPORT_CACHE_TTL, prefix="reports:seo")
async def report_seo(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    site_url: str | None = Query(None),
    domain: str | None = Query(None),
    primary_keyword: str | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    start, end = _dates(start_date, end_date)
    try:
        return await _svc(db, ws_ctx).generate_seo_report(
            start, end, site_url=site_url, domain=domain, primary_keyword=primary_keyword
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("report_seo: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="SEO report generation failed") from e


@router.get("/analytics")
@cached(ttl=REPORT_CACHE_TTL, prefix="reports:analytics")
async def report_analytics(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    property_id: str | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    start, end = _dates(start_date, end_date)
    try:
        return await _svc(db, ws_ctx).generate_analytics_report(
            start, end, property_id=property_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("report_analytics: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="Analytics report generation failed") from e


@router.get("/campaigns/{campaign_id}")
@cached(ttl=REPORT_CACHE_TTL, prefix="reports:campaign")
async def report_campaign(
    campaign_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _svc(db, ws_ctx).generate_campaign_report(campaign_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e)) from e
    except Exception as e:
        logger.error("report_campaign: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="Campaign report generation failed") from e


@router.get("/crm")
@cached(ttl=REPORT_CACHE_TTL, prefix="reports:crm")
async def report_crm(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    start, end = _dates(start_date, end_date)
    try:
        return await _svc(db, ws_ctx).generate_crm_report(start, end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("report_crm: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="CRM report generation failed") from e


@router.get(
    "/full",
    dependencies=[Depends(endpoint_rate_limit(5, 3600, "reports_full"))],
)
@cached(ttl=REPORT_CACHE_TTL, prefix="reports:full")
async def report_full(
    response: Response,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    site_url: str | None = Query(None),
    domain: str | None = Query(None),
    property_id: str | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    start, end = _dates(start_date, end_date)
    try:
        return await _svc(db, ws_ctx).generate_full_report(
            start,
            end,
            site_url=site_url,
            domain=domain,
            property_id=property_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("report_full: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="Full report generation failed") from e


@router.post("/generate")
async def generate_executive_report(
    body: GenerateReportBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _exec_svc(db, ws_ctx).generate_pdf_report(ws_ctx.workspace_id, body.period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/schedule")
async def get_report_schedule(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _exec_svc(db, ws_ctx).get_schedule()


@router.put("/schedule")
async def update_report_schedule(
    body: ScheduleBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await _exec_svc(db, ws_ctx).update_schedule(body.model_dump())


@router.post("/send-now")
async def send_executive_report_now(
    body: SendNowBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _exec_svc(db, ws_ctx).send_report_email(
            period=body.period, report_id=body.report_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/executive/preview")
async def executive_preview(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    period: str = Query("weekly"),
):
    p = period if period in ("weekly", "monthly") else "weekly"
    metrics = await _exec_svc(db, ws_ctx).generate_executive_report(ws_ctx.workspace_id, p)
    return {"period": p, "metrics": metrics}


@router.get("/history")
@cached(ttl=REPORT_CACHE_TTL, prefix="reports:history")
async def report_history(
    limit: int = Query(50, ge=1, le=200),
    source: str = Query("client", pattern="^(client|executive)$"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    if source == "executive":
        items = await _exec_svc(db, ws_ctx).list_history(limit=limit)
        return {"workspace_id": ws_ctx.workspace_id, "source": "executive", "items": items, "count": len(items)}
    items = await _svc(db, ws_ctx).list_history(limit=limit)
    return {"workspace_id": ws_ctx.workspace_id, "source": "client", "items": items, "count": len(items)}


@router.get("/{report_id}/download")
async def download_executive_report(
    report_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        content, filename = await _exec_svc(db, ws_ctx).download_pdf(report_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{report_id}/pdf")
async def download_report_pdf(
    report_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        content, filename = await _svc(db, ws_ctx).download_pdf(report_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{report_id}/csv")
async def download_report_csv(
    report_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        content, filename = await _svc(db, ws_ctx).download_csv(report_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

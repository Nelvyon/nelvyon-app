"""
Dashboard Metrics Router — Aggregates real data from all NELVYON tables.
Provides unified endpoints for Dashboard, Analytics, and Sales pages.
Now supports workspace-scoped queries via X-Workspace-Id header.

Fase 1C — KPI contactos: saas_contacts vía saas_tenants.workspace_id (saas-first),
con fallback legacy (contacts + crm_contacts). Deals/campaigns siguen en tablas legacy.
Consumido por Vite /saas/dashboard (SaasDashboard.tsx) — ver docs/PHASE_1C_LEGACY_DASHBOARDS.md.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deal_stages import SQL_TERMINAL_STAGE_VALUES, SQL_WON_STAGE_VALUES
from dependencies.workspace import WorkspaceContext, require_workspace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard-metrics"])


def _date_range(period: str) -> datetime:
    """Convert period string to start datetime."""
    now = datetime.now(timezone.utc)
    mapping = {
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
        "6m": timedelta(days=180),
        "1y": timedelta(days=365),
        "ytd": timedelta(days=(now - datetime(now.year, 1, 1, tzinfo=timezone.utc)).days),
    }
    delta = mapping.get(period, timedelta(days=30))
    return now - delta


def _apply_scope(query, model, user_id: str, workspace_id: Optional[int]):
    """Apply user_id + optional workspace_id filter to a query."""
    query = query.where(model.user_id == user_id)
    if workspace_id is not None and hasattr(model, "workspace_id"):
        query = query.where(model.workspace_id == workspace_id)
    return query


@router.get("/metrics")
async def get_dashboard_metrics(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 6m, 1y, ytd"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Main dashboard metrics endpoint. Returns aggregated KPIs from all tables.
    Requires X-Workspace-Id (require_workspace); metrics are workspace-scoped.
    """
    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id
    since = _date_range(period)

    partial_errors: list[dict[str, str]] = []
    sales_scope_policy = "workspace_strict_excludes_null_workspace_id"

    def _record_partial(module: str, exc: Exception, code: str = "query_failed") -> None:
        msg = str(exc)[:240] if str(exc) else exc.__class__.__name__
        logger.warning(
            "dashboard_metrics partial error module=%s workspace_id=%s code=%s error=%s",
            module,
            ws_id,
            code,
            msg,
            exc_info=True,
        )
        partial_errors.append({"module": module, "code": code, "message": msg})

    def _compute_data_status(total_modules: int) -> str:
        if not partial_errors:
            return "ok"
        if len(partial_errors) >= total_modules:
            return "error"
        return "partial"

    try:
        from models.contacts import Contacts
        from models.deals import Deals
        from models.campaigns import Campaigns
        from models.conversations import Conversations
        from models.helpdesk_tickets import Helpdesk_tickets
        from models.activities import Activities
        from models.sales_records import Sales_records
        from models.funnel_items import Funnel_items
        from models.calendar_events import Calendar_events
        from models.subscriptions import Subscriptions
    except Exception as e:
        logger.error("Dashboard metrics import error workspace_id=%s: %s", ws_id, e, exc_info=True)
        return {
            "period": period,
            "workspace_id": ws_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "error_fallback",
            "data_status": "error",
            "partial_errors": [{"module": "bootstrap", "code": "import_error", "message": str(e)[:240]}],
            "sales_scope_policy": sales_scope_policy,
            "orphan_sales_records_count": 0,
            "error": str(e),
            "kpis": {
                "contacts": {"total": 0, "period": 0},
                "deals": {"total": 0, "period": 0, "value_total": 0, "value_period": 0, "won": 0, "open": 0, "win_rate": 0, "avg_deal": 0},
                "campaigns": {"total": 0, "sent": 0, "opened": 0, "clicked": 0, "open_rate": 0, "click_rate": 0},
                "conversations": {"total": 0, "unread": 0},
                "helpdesk": {"total": 0, "open": 0, "resolved": 0, "resolution_rate": 0},
                "activities": {"total": 0, "period": 0},
                "sales": {"total_amount": 0, "period_amount": 0, "count": 0, "closed": 0, "avg_ticket": 0},
                "funnels": {"total": 0, "visitors": 0, "conversions": 0, "conversion_rate": 0},
                "calendar": {"upcoming": 0},
                "subscriptions": {"active": 0, "mrr": 0, "arr": 0},
            },
        }

    async def _count(model, *extra_filters):
        q = func.count(model.id).select()
        q = _apply_scope(q, model, user_id, ws_id)
        for f in extra_filters:
            q = q.where(f)
        return (await db.execute(q)).scalar() or 0

    async def _sum(model, col, *extra_filters):
        q = func.coalesce(func.sum(col), 0).select()
        q = _apply_scope(q, model, user_id, ws_id)
        for f in extra_filters:
            q = q.where(f)
        return (await db.execute(q)).scalar() or 0

    # Defaults: if a block fails, values stay in 0 but error is explicit in partial_errors.
    contacts_total = contacts_period = 0
    deals_total = deals_period = deals_won = deals_open = 0
    deals_value_total = deals_value_period = 0.0
    campaigns_total = campaigns_sent = campaigns_opened = campaigns_clicked = 0
    conversations_total = conversations_unread = 0
    tickets_total = tickets_open = tickets_resolved = 0
    activities_total = activities_period = 0
    sales_total_amount = sales_period_amount = 0.0
    sales_count = sales_closed = 0
    funnels_total = funnels_visitors = funnels_conversions = 0
    events_upcoming = 0
    active_subs = 0
    mrr = 0.0
    orphan_sales_records_count = 0

    contacts_source = "empty"
    try:
        from services.saas_contact_quota import (
            count_contacts_breakdown,
            count_contacts_for_workspace,
            count_contacts_period_hybrid,
            contacts_count_source_label,
        )

        breakdown = await count_contacts_breakdown(db, ws_id)
        contacts_total = await count_contacts_for_workspace(db, ws_id, mode="hybrid")
        contacts_period = await count_contacts_period_hybrid(
            db, ws_id, since, user_id=user_id
        )
        contacts_source = contacts_count_source_label(
            breakdown["saas"], breakdown["legacy"]
        )
    except Exception as e:
        _record_partial("contacts", e)

    try:
        deals_total = await _count(Deals)
        deals_period = await _count(Deals, Deals.created_at >= since)
        deals_value_total = float(await _sum(Deals, Deals.value))
        deals_value_period = float(await _sum(Deals, Deals.value, Deals.created_at >= since))
        deals_won = await _count(Deals, Deals.stage.in_(SQL_WON_STAGE_VALUES))
        deals_open = await _count(Deals, Deals.stage.notin_(SQL_TERMINAL_STAGE_VALUES))
    except Exception as e:
        _record_partial("deals", e)

    try:
        campaigns_total = await _count(Campaigns)
        campaigns_sent = await _sum(Campaigns, Campaigns.sent_count)
        campaigns_opened = await _sum(Campaigns, Campaigns.open_count)
        campaigns_clicked = await _sum(Campaigns, Campaigns.click_count)
    except Exception as e:
        _record_partial("campaigns", e)

    try:
        conversations_total = await _count(Conversations)
        conversations_unread = await _sum(Conversations, Conversations.unread_count)
    except Exception as e:
        _record_partial("conversations", e)

    try:
        tickets_total = await _count(Helpdesk_tickets)
        tickets_open = await _count(Helpdesk_tickets, Helpdesk_tickets.status.in_(["open", "pending", "in_progress"]))
        tickets_resolved = await _count(Helpdesk_tickets, Helpdesk_tickets.status.in_(["resolved", "closed"]))
    except Exception as e:
        _record_partial("helpdesk", e)

    try:
        activities_total = await _count(Activities)
        activities_period = await _count(Activities, Activities.created_at >= since)
    except Exception as e:
        _record_partial("activities", e)

    try:
        sales_total_amount = float(await _sum(Sales_records, Sales_records.amount))
        sales_period_amount = float(await _sum(Sales_records, Sales_records.amount, Sales_records.created_at >= since))
        sales_count = await _count(Sales_records)
        sales_closed = await _count(Sales_records, Sales_records.status.in_(["closed", "paid"]))
    except Exception as e:
        _record_partial("sales", e)

    # Legacy visibility: rows without tenant are excluded from workspace KPIs, but tracked.
    try:
        orphan_q = select(func.count(Sales_records.id)).where(
            Sales_records.user_id == user_id,
            Sales_records.workspace_id.is_(None),
        )
        orphan_sales_records_count = int((await db.execute(orphan_q)).scalar() or 0)
        if orphan_sales_records_count > 0:
            logger.warning(
                "dashboard_metrics orphan sales detected module=sales workspace_id=%s user_id=%s count=%s",
                ws_id,
                user_id,
                orphan_sales_records_count,
            )
    except Exception as e:
        _record_partial("sales_orphans", e)

    try:
        funnels_total = await _count(Funnel_items)
        funnels_visitors = await _sum(Funnel_items, Funnel_items.visitors)
        funnels_conversions = await _sum(Funnel_items, Funnel_items.conversions)
    except Exception as e:
        _record_partial("funnels", e)

    try:
        events_upcoming = await _count(Calendar_events, Calendar_events.start_time >= datetime.now(timezone.utc))
    except Exception as e:
        _record_partial("calendar", e)

    try:
        active_subs_q = func.count(Subscriptions.id).select().where(
            Subscriptions.workspace_id == ws_id,
            Subscriptions.status == "active",
        )
        active_subs = (await db.execute(active_subs_q)).scalar() or 0

        mrr_q = func.coalesce(func.sum(Subscriptions.amount_paid), 0).select().where(
            Subscriptions.workspace_id == ws_id,
            Subscriptions.status == "active",
        )
        mrr = float((await db.execute(mrr_q)).scalar() or 0)
    except Exception as e:
        _record_partial("subscriptions", e)

    win_rate = round((deals_won / max(deals_total, 1)) * 100, 1)
    avg_deal = round(float(deals_value_total) / max(deals_total, 1), 2)
    open_rate = round((campaigns_opened / max(campaigns_sent, 1)) * 100, 1) if campaigns_sent > 0 else 0
    click_rate = round((campaigns_clicked / max(campaigns_sent, 1)) * 100, 1) if campaigns_sent > 0 else 0
    conversion_rate = round((funnels_conversions / max(funnels_visitors, 1)) * 100, 1) if funnels_visitors > 0 else 0
    ticket_resolution_rate = round((tickets_resolved / max(tickets_total, 1)) * 100, 1) if tickets_total > 0 else 0

    return {
        "period": period,
        "workspace_id": ws_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "postgresql_live",
        "data_status": _compute_data_status(total_modules=10),
        "partial_errors": partial_errors,
        "sales_scope_policy": sales_scope_policy,
        "orphan_sales_records_count": orphan_sales_records_count,
        "contacts_count_mode": "hybrid",
        "contacts_source": contacts_source,
        "kpis": {
            "contacts": {"total": contacts_total, "period": contacts_period},
            "deals": {
                "total": deals_total, "period": deals_period,
                "value_total": round(float(deals_value_total), 2),
                "value_period": round(float(deals_value_period), 2),
                "won": deals_won, "open": deals_open,
                "win_rate": win_rate, "avg_deal": avg_deal,
            },
            "campaigns": {
                "total": campaigns_total, "sent": campaigns_sent,
                "opened": campaigns_opened, "clicked": campaigns_clicked,
                "open_rate": open_rate, "click_rate": click_rate,
            },
            "conversations": {"total": conversations_total, "unread": conversations_unread},
            "helpdesk": {
                "total": tickets_total, "open": tickets_open,
                "resolved": tickets_resolved, "resolution_rate": ticket_resolution_rate,
            },
            "activities": {"total": activities_total, "period": activities_period},
            "sales": {
                "total_amount": round(float(sales_total_amount), 2),
                "period_amount": round(float(sales_period_amount), 2),
                "count": sales_count, "closed": sales_closed,
                "avg_ticket": round(float(sales_total_amount) / max(sales_count, 1), 2),
            },
            "funnels": {
                "total": funnels_total, "visitors": funnels_visitors,
                "conversions": funnels_conversions, "conversion_rate": conversion_rate,
            },
            "calendar": {"upcoming": events_upcoming},
            "subscriptions": {"active": active_subs, "mrr": round(float(mrr), 2), "arr": round(float(mrr) * 12, 2)},
        },
    }


@router.get("/activity-feed")
async def get_activity_feed(
    limit: int = Query(20, ge=1, le=100),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Returns the most recent activities, workspace-scoped."""
    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id

    try:
        from models.activities import Activities

        q = select(Activities).where(Activities.user_id == user_id)
        if ws_id is not None and hasattr(Activities, "workspace_id"):
            q = q.where(Activities.workspace_id == ws_id)
        q = q.order_by(Activities.created_at.desc()).limit(limit)

        result = await db.execute(q)
        activities = result.scalars().all()

        return {
            "items": [
                {
                    "id": a.id,
                    "type": a.type,
                    "title": a.title,
                    "description": a.description,
                    "is_completed": a.is_completed,
                    "contact_id": a.contact_id,
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in activities
            ],
            "total": len(activities),
        }
    except Exception:
        logger.error(
            "dashboard activity_feed failed workspace_id=%s",
            ws_id,
            exc_info=True,
        )
        return {"items": [], "total": 0}


@router.get("/revenue-chart")
async def get_revenue_chart(
    period: str = Query("30d", description="7d, 30d, 90d"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Returns daily revenue data, workspace-scoped."""
    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id
    since = _date_range(period)

    try:
        from models.sales_records import Sales_records
        from models.deals import Deals

        # Daily sales
        sales_q = (
            select(
                cast(Sales_records.created_at, Date).label("day"),
                func.coalesce(func.sum(Sales_records.amount), 0).label("amount"),
            )
            .where(Sales_records.user_id == user_id, Sales_records.created_at >= since)
        )
        if ws_id is not None and hasattr(Sales_records, "workspace_id"):
            sales_q = sales_q.where(Sales_records.workspace_id == ws_id)
        sales_q = sales_q.group_by(cast(Sales_records.created_at, Date)).order_by(cast(Sales_records.created_at, Date))

        sales_result = await db.execute(sales_q)
        sales_by_day = {str(row.day): float(row.amount) for row in sales_result.fetchall()}

        # Daily deals closed
        deals_q = (
            select(
                cast(Deals.created_at, Date).label("day"),
                func.coalesce(func.sum(Deals.value), 0).label("amount"),
            )
            .where(
                Deals.user_id == user_id,
                Deals.created_at >= since,
                Deals.stage.in_(SQL_WON_STAGE_VALUES),
            )
        )
        if ws_id is not None and hasattr(Deals, "workspace_id"):
            deals_q = deals_q.where(Deals.workspace_id == ws_id)
        deals_q = deals_q.group_by(cast(Deals.created_at, Date)).order_by(cast(Deals.created_at, Date))

        deals_result = await db.execute(deals_q)
        deals_by_day = {str(row.day): float(row.amount) for row in deals_result.fetchall()}

        all_days = sorted(set(list(sales_by_day.keys()) + list(deals_by_day.keys())))

        if not all_days:
            days_count = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
            now = datetime.now(timezone.utc)
            all_days = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days_count - 1, -1, -1)]

        chart_data = []
        for day in all_days:
            sales_amt = sales_by_day.get(day, 0)
            deals_amt = deals_by_day.get(day, 0)
            chart_data.append({
                "date": day,
                "sales": round(sales_amt, 2),
                "deals": round(deals_amt, 2),
                "total": round(sales_amt + deals_amt, 2),
            })

        return {"period": period, "workspace_id": ws_id, "data": chart_data}
    except Exception:
        logger.error(
            "dashboard revenue_chart failed workspace_id=%s period=%s",
            ws_id,
            period,
            exc_info=True,
        )
        return {"period": period, "data": []}


@router.get("/deals-by-stage")
async def get_deals_by_stage(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Returns deal count and value grouped by stage, workspace-scoped."""
    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id

    try:
        from models.deals import Deals

        q = (
            select(
                Deals.stage,
                func.count(Deals.id).label("count"),
                func.coalesce(func.sum(Deals.value), 0).label("value"),
            )
            .where(Deals.user_id == user_id)
        )
        if ws_id is not None and hasattr(Deals, "workspace_id"):
            q = q.where(Deals.workspace_id == ws_id)
        q = q.group_by(Deals.stage)

        result = await db.execute(q)
        stages = [
            {"stage": row.stage, "count": row.count, "value": round(float(row.value), 2)}
            for row in result.fetchall()
        ]

        return {"stages": stages, "workspace_id": ws_id}
    except Exception:
        logger.error(
            "dashboard deals_by_stage failed workspace_id=%s",
            ws_id,
            exc_info=True,
        )
        return {"stages": []}


@router.get("/recent-items")
async def get_recent_items(
    limit: int = Query(10, ge=1, le=50),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Returns the most recent items across modules, workspace-scoped."""
    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id
    items = []

    try:
        def _scope(q, model):
            q = q.where(model.user_id == user_id)
            if ws_id is not None and hasattr(model, "workspace_id"):
                q = q.where(model.workspace_id == ws_id)
            return q

        from models.contacts import Contacts
        cq = _scope(select(Contacts), Contacts).order_by(Contacts.created_at.desc()).limit(5)
        for c in (await db.execute(cq)).scalars().all():
            items.append({
                "type": "contact",
                "title": f"{c.first_name} {c.last_name or ''}".strip(),
                "subtitle": c.email,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            })

        from models.deals import Deals
        dq = _scope(select(Deals), Deals).order_by(Deals.created_at.desc()).limit(5)
        for d in (await db.execute(dq)).scalars().all():
            items.append({
                "type": "deal",
                "title": d.title,
                "subtitle": f"€{d.value:,.0f}" if d.value else "—",
                "status": d.stage,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            })

        from models.campaigns import Campaigns
        campq = _scope(select(Campaigns), Campaigns).order_by(Campaigns.created_at.desc()).limit(5)
        for camp in (await db.execute(campq)).scalars().all():
            items.append({
                "type": "campaign",
                "title": camp.name,
                "subtitle": f"Enviados: {camp.sent_count or 0}",
                "status": camp.status,
                "created_at": camp.created_at.isoformat() if camp.created_at else None,
            })

        from models.sales_records import Sales_records
        sq = _scope(select(Sales_records), Sales_records).order_by(Sales_records.created_at.desc()).limit(5)
        for s in (await db.execute(sq)).scalars().all():
            items.append({
                "type": "sale",
                "title": s.client_name,
                "subtitle": f"€{s.amount:,.0f}" if s.amount else "—",
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            })

        items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return {"items": items[:limit], "total": len(items), "workspace_id": ws_id}
    except Exception:
        logger.error(
            "dashboard recent_items failed workspace_id=%s",
            ws_id,
            exc_info=True,
        )
        return {"items": [], "total": 0}
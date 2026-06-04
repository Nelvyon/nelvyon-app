"""
Module Analytics Router — Per-module KPIs from real PostgreSQL data.
Endpoints for CRM, Contracts, Social, Helpdesk, and Agents.
Each returns aggregated metrics with current vs previous period comparison.

Fase 1C — totales de contactos: hybrid saas_contacts + legacy; desgloses source/status
siguen en tabla `contacts` hasta migración analítica. Vite: /saas/analytics.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, case, cast, Date, Float
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, get_workspace_context, require_workspace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/analytics", tags=["module-analytics"])


def _periods(period: str):
    """Return (current_start, previous_start, previous_end) for comparison."""
    now = datetime.now(timezone.utc)
    days = {"7d": 7, "30d": 30, "90d": 90, "6m": 180, "1y": 365}.get(period, 30)
    current_start = now - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)
    return current_start, previous_start, current_start


def _scope(q, model, user_id: str, ws_id: Optional[int]):
    q = q.where(model.user_id == user_id)
    if ws_id is not None and hasattr(model, "workspace_id"):
        q = q.where(model.workspace_id == ws_id)
    return q


def _delta(current: float, previous: float) -> dict:
    """Calculate delta percentage between two values."""
    if previous == 0:
        pct = 100.0 if current > 0 else 0.0
    else:
        pct = round(((current - previous) / previous) * 100, 1)
    return {"current": current, "previous": previous, "delta_pct": pct}


# ═══════════════════════════════════════════════════════════════
# CRM Analytics
# ═══════════════════════════════════════════════════════════════

@router.get("/crm")
async def crm_analytics(
    period: str = Query("30d"),
    ws_ctx: WorkspaceContext = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
):
    """
    CRM module analytics from contacts, deals, activities tables.
    KPIs: contacts total/new, deals pipeline value, win rate, avg score,
    contacts by source, contacts by status, deals by stage over time.
    """
    uid = ws_ctx.user_id
    wid = ws_ctx.workspace_id
    cur_start, prev_start, prev_end = _periods(period)

    try:
        from models.contacts import Contacts
        from models.deals import Deals
        from models.activities import Activities

        # ── Contacts KPIs ──
        async def _cnt(model, *filters):
            q = select(func.count(model.id))
            q = _scope(q, model, uid, wid)
            for f in filters:
                q = q.where(f)
            return (await db.execute(q)).scalar() or 0

        async def _avg_col(model, col, *filters):
            q = select(func.avg(col))
            q = _scope(q, model, uid, wid)
            for f in filters:
                q = q.where(f)
            return round(float((await db.execute(q)).scalar() or 0), 1)

        async def _sum_col(model, col, *filters):
            q = select(func.coalesce(func.sum(col), 0))
            q = _scope(q, model, uid, wid)
            for f in filters:
                q = q.where(f)
            return float((await db.execute(q)).scalar() or 0)

        from services.saas_contact_quota import (
            count_contacts_for_workspace,
            count_contacts_period_hybrid,
        )

        contacts_total = await count_contacts_for_workspace(db, wid, mode="hybrid")
        contacts_cur = await count_contacts_period_hybrid(
            db, wid, cur_start, user_id=uid
        )
        contacts_prev = await count_contacts_period_hybrid(
            db, wid, prev_start, until=prev_end, user_id=uid
        )
        avg_score = await _avg_col(Contacts, Contacts.score)

        # Contacts by source
        src_q = select(Contacts.source, func.count(Contacts.id).label("count"))
        src_q = _scope(src_q, Contacts, uid, wid).group_by(Contacts.source)
        src_res = await db.execute(src_q)
        by_source = [{"source": r.source or "unknown", "count": r.count} for r in src_res.fetchall()]

        # Contacts by status
        st_q = select(Contacts.status, func.count(Contacts.id).label("count"))
        st_q = _scope(st_q, Contacts, uid, wid).group_by(Contacts.status)
        st_res = await db.execute(st_q)
        by_status = [{"status": r.status or "unknown", "count": r.count} for r in st_res.fetchall()]

        # ── Deals KPIs ──
        deals_total = await _cnt(Deals)
        deals_cur = await _cnt(Deals, Deals.created_at >= cur_start)
        deals_prev = await _cnt(Deals, Deals.created_at >= prev_start, Deals.created_at < prev_end)
        deals_value_cur = await _sum_col(Deals, Deals.value, Deals.created_at >= cur_start)
        deals_value_prev = await _sum_col(Deals, Deals.value, Deals.created_at >= prev_start, Deals.created_at < prev_end)
        deals_won = await _cnt(Deals, Deals.stage.in_(["won", "closed", "closed_won"]))
        deals_lost = await _cnt(Deals, Deals.stage.in_(["lost", "closed_lost"]))
        win_rate = round((deals_won / max(deals_won + deals_lost, 1)) * 100, 1)

        # Deals by stage
        stage_q = select(Deals.stage, func.count(Deals.id).label("count"), func.coalesce(func.sum(Deals.value), 0).label("value"))
        stage_q = _scope(stage_q, Deals, uid, wid).group_by(Deals.stage)
        stage_res = await db.execute(stage_q)
        deals_by_stage = [{"stage": r.stage or "unknown", "count": r.count, "value": round(float(r.value), 2)} for r in stage_res.fetchall()]

        # ── Activities KPIs ──
        activities_cur = await _cnt(Activities, Activities.created_at >= cur_start)
        activities_prev = await _cnt(Activities, Activities.created_at >= prev_start, Activities.created_at < prev_end)

        # Daily new contacts trend
        trend_q = select(
            cast(Contacts.created_at, Date).label("day"),
            func.count(Contacts.id).label("count"),
        )
        trend_q = _scope(trend_q, Contacts, uid, wid).where(Contacts.created_at >= cur_start)
        trend_q = trend_q.group_by(cast(Contacts.created_at, Date)).order_by(cast(Contacts.created_at, Date))
        trend_res = await db.execute(trend_q)
        contacts_trend = [{"date": str(r.day), "count": r.count} for r in trend_res.fetchall()]

        return {
            "module": "crm",
            "period": period,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "postgresql_live",
            "contacts_count_mode": "hybrid",
            "contacts_charts_legacy_only": True,
            "kpis": {
                "contacts_total": contacts_total,
                "contacts_new": _delta(contacts_cur, contacts_prev),
                "avg_score": avg_score,
                "deals_total": deals_total,
                "deals_new": _delta(deals_cur, deals_prev),
                "deals_value": _delta(round(deals_value_cur, 2), round(deals_value_prev, 2)),
                "win_rate": win_rate,
                "deals_won": deals_won,
                "deals_lost": deals_lost,
                "activities": _delta(activities_cur, activities_prev),
            },
            "charts": {
                "contacts_by_source": by_source,
                "contacts_by_status": by_status,
                "deals_by_stage": deals_by_stage,
                "contacts_trend": contacts_trend,
            },
        }
    except Exception as e:
        logger.error(f"CRM analytics error: {e}", exc_info=True)
        return {"module": "crm", "period": period, "error": str(e), "kpis": {}, "charts": {}}


# ═══════════════════════════════════════════════════════════════
# Contracts Analytics
# ═══════════════════════════════════════════════════════════════

@router.get("/contracts")
async def contracts_analytics(
    period: str = Query("30d"),
    ws_ctx: WorkspaceContext = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Contracts module analytics from contracts table.
    KPIs: total, by status, by type, new in period, avg per client.
    """
    uid = ws_ctx.user_id
    wid = ws_ctx.workspace_id
    cur_start, prev_start, prev_end = _periods(period)

    try:
        from models.contracts import Contracts

        async def _cnt(*filters):
            q = select(func.count(Contracts.id))
            q = _scope(q, Contracts, uid, wid)
            for f in filters:
                q = q.where(f)
            return (await db.execute(q)).scalar() or 0

        total = await _cnt()
        cur_new = await _cnt(Contracts.created_at >= cur_start)
        prev_new = await _cnt(Contracts.created_at >= prev_start, Contracts.created_at < prev_end)
        active = await _cnt(Contracts.status.in_(["active", "signed", "vigente"]))
        draft = await _cnt(Contracts.status.in_(["draft", "borrador", "pending"]))
        expired = await _cnt(Contracts.status.in_(["expired", "vencido", "cancelled", "cancelado"]))

        # By type
        type_q = select(Contracts.contract_type, func.count(Contracts.id).label("count"))
        type_q = _scope(type_q, Contracts, uid, wid).group_by(Contracts.contract_type)
        type_res = await db.execute(type_q)
        by_type = [{"type": r.contract_type or "other", "count": r.count} for r in type_res.fetchall()]

        # By status
        status_q = select(Contracts.status, func.count(Contracts.id).label("count"))
        status_q = _scope(status_q, Contracts, uid, wid).group_by(Contracts.status)
        status_res = await db.execute(status_q)
        by_status = [{"status": r.status or "unknown", "count": r.count} for r in status_res.fetchall()]

        # Trend
        trend_q = select(
            cast(Contracts.created_at, Date).label("day"),
            func.count(Contracts.id).label("count"),
        )
        trend_q = _scope(trend_q, Contracts, uid, wid).where(Contracts.created_at >= cur_start)
        trend_q = trend_q.group_by(cast(Contracts.created_at, Date)).order_by(cast(Contracts.created_at, Date))
        trend_res = await db.execute(trend_q)
        trend = [{"date": str(r.day), "count": r.count} for r in trend_res.fetchall()]

        # Unique clients with contracts
        clients_q = select(func.count(func.distinct(Contracts.client_id)))
        clients_q = _scope(clients_q, Contracts, uid, wid).where(Contracts.client_id.isnot(None))
        unique_clients = (await db.execute(clients_q)).scalar() or 0

        return {
            "module": "contracts",
            "period": period,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "postgresql_live",
            "kpis": {
                "total": total,
                "new": _delta(cur_new, prev_new),
                "active": active,
                "draft": draft,
                "expired": expired,
                "unique_clients": unique_clients,
                "active_rate": round((active / max(total, 1)) * 100, 1),
            },
            "charts": {
                "by_type": by_type,
                "by_status": by_status,
                "trend": trend,
            },
        }
    except Exception as e:
        logger.error(f"Contracts analytics error: {e}", exc_info=True)
        return {"module": "contracts", "period": period, "error": str(e), "kpis": {}, "charts": {}}


# ═══════════════════════════════════════════════════════════════
# Social Analytics
# ═══════════════════════════════════════════════════════════════

@router.get("/social")
async def social_analytics(
    period: str = Query("30d"),
    ws_ctx: WorkspaceContext = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Social module analytics from social_posts table.
    KPIs: total posts, by platform, engagement (impressions, clicks, likes, shares),
    published vs scheduled, engagement rate.
    """
    uid = ws_ctx.user_id
    wid = ws_ctx.workspace_id
    cur_start, prev_start, prev_end = _periods(period)

    try:
        from models.social_posts import Social_posts
        M = Social_posts

        async def _cnt(*filters):
            q = select(func.count(M.id))
            q = _scope(q, M, uid, wid)
            for f in filters:
                q = q.where(f)
            return (await db.execute(q)).scalar() or 0

        async def _sum_col(col, *filters):
            q = select(func.coalesce(func.sum(col), 0))
            q = _scope(q, M, uid, wid)
            for f in filters:
                q = q.where(f)
            return int((await db.execute(q)).scalar() or 0)

        total = await _cnt()
        cur_new = await _cnt(M.created_at >= cur_start)
        prev_new = await _cnt(M.created_at >= prev_start, M.created_at < prev_end)
        published = await _cnt(M.status == "published")
        scheduled = await _cnt(M.status == "scheduled")
        failed = await _cnt(M.status == "failed")

        impressions = await _sum_col(M.impressions)
        clicks = await _sum_col(M.clicks)
        likes = await _sum_col(M.likes)
        comments_total = await _sum_col(M.comments)
        shares = await _sum_col(M.shares)

        impressions_cur = await _sum_col(M.impressions, M.created_at >= cur_start)
        impressions_prev = await _sum_col(M.impressions, M.created_at >= prev_start, M.created_at < prev_end)

        engagement_total = likes + comments_total + shares + clicks
        engagement_rate = round((engagement_total / max(impressions, 1)) * 100, 2)

        # By platform
        plat_q = select(
            M.platform,
            func.count(M.id).label("count"),
            func.coalesce(func.sum(M.impressions), 0).label("impressions"),
            func.coalesce(func.sum(M.likes), 0).label("likes"),
            func.coalesce(func.sum(M.clicks), 0).label("clicks"),
        )
        plat_q = _scope(plat_q, M, uid, wid).group_by(M.platform)
        plat_res = await db.execute(plat_q)
        by_platform = [
            {"platform": r.platform or "unknown", "count": r.count,
             "impressions": int(r.impressions), "likes": int(r.likes), "clicks": int(r.clicks)}
            for r in plat_res.fetchall()
        ]

        # Trend
        trend_q = select(
            cast(M.created_at, Date).label("day"),
            func.count(M.id).label("posts"),
            func.coalesce(func.sum(M.impressions), 0).label("impressions"),
        )
        trend_q = _scope(trend_q, M, uid, wid).where(M.created_at >= cur_start)
        trend_q = trend_q.group_by(cast(M.created_at, Date)).order_by(cast(M.created_at, Date))
        trend_res = await db.execute(trend_q)
        trend = [{"date": str(r.day), "posts": r.posts, "impressions": int(r.impressions)} for r in trend_res.fetchall()]

        return {
            "module": "social",
            "period": period,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "postgresql_live",
            "kpis": {
                "total_posts": total,
                "new_posts": _delta(cur_new, prev_new),
                "published": published,
                "scheduled": scheduled,
                "failed": failed,
                "impressions": _delta(impressions_cur, impressions_prev),
                "impressions_total": impressions,
                "clicks": clicks,
                "likes": likes,
                "comments": comments_total,
                "shares": shares,
                "engagement_rate": engagement_rate,
            },
            "charts": {
                "by_platform": by_platform,
                "trend": trend,
            },
        }
    except Exception as e:
        logger.error(f"Social analytics error: {e}", exc_info=True)
        return {"module": "social", "period": period, "error": str(e), "kpis": {}, "charts": {}}


# ═══════════════════════════════════════════════════════════════
# Helpdesk Analytics
# ═══════════════════════════════════════════════════════════════

@router.get("/helpdesk")
async def helpdesk_analytics(
    period: str = Query("30d"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Helpdesk module analytics from helpdesk_tickets table (workspace-strict).

    Requires X-Workspace-Id (same isolation as entities, SLA, /dashboard/metrics).
    KPIs: total, open, resolved, resolution rate, avg satisfaction,
    avg first response time, by priority, by category, by channel.
    """
    uid = ws_ctx.user_id
    wid = ws_ctx.workspace_id
    cur_start, prev_start, prev_end = _periods(period)

    try:
        from models.helpdesk_tickets import Helpdesk_tickets
        M = Helpdesk_tickets

        async def _cnt(*filters):
            q = select(func.count(M.id))
            q = _scope(q, M, uid, wid)
            for f in filters:
                q = q.where(f)
            return (await db.execute(q)).scalar() or 0

        total = await _cnt()
        cur_new = await _cnt(M.created_at >= cur_start)
        prev_new = await _cnt(M.created_at >= prev_start, M.created_at < prev_end)
        open_tickets = await _cnt(M.status.in_(["open", "pending", "in_progress"]))
        resolved = await _cnt(M.status.in_(["resolved", "closed"]))
        cur_resolved = await _cnt(M.status.in_(["resolved", "closed"]), M.created_at >= cur_start)
        prev_resolved = await _cnt(M.status.in_(["resolved", "closed"]), M.created_at >= prev_start, M.created_at < prev_end)

        resolution_rate = round((resolved / max(total, 1)) * 100, 1)

        # Avg satisfaction
        sat_q = select(func.avg(M.satisfaction_score))
        sat_q = _scope(sat_q, M, uid, wid).where(M.satisfaction_score.isnot(None))
        avg_satisfaction = round(float((await db.execute(sat_q)).scalar() or 0), 1)

        # Avg first response time
        frt_q = select(func.avg(M.first_response_minutes))
        frt_q = _scope(frt_q, M, uid, wid).where(M.first_response_minutes.isnot(None))
        avg_first_response = round(float((await db.execute(frt_q)).scalar() or 0), 1)

        # By priority
        pri_q = select(M.priority, func.count(M.id).label("count"))
        pri_q = _scope(pri_q, M, uid, wid).group_by(M.priority)
        pri_res = await db.execute(pri_q)
        by_priority = [{"priority": r.priority or "unknown", "count": r.count} for r in pri_res.fetchall()]

        # By category
        cat_q = select(M.category, func.count(M.id).label("count"))
        cat_q = _scope(cat_q, M, uid, wid).group_by(M.category)
        cat_res = await db.execute(cat_q)
        by_category = [{"category": r.category or "other", "count": r.count} for r in cat_res.fetchall()]

        # By channel
        ch_q = select(M.channel, func.count(M.id).label("count"))
        ch_q = _scope(ch_q, M, uid, wid).group_by(M.channel)
        ch_res = await db.execute(ch_q)
        by_channel = [{"channel": r.channel or "unknown", "count": r.count} for r in ch_res.fetchall()]

        # Trend
        trend_q = select(
            cast(M.created_at, Date).label("day"),
            func.count(M.id).label("opened"),
            func.sum(case((M.status.in_(["resolved", "closed"]), 1), else_=0)).label("resolved"),
        )
        trend_q = _scope(trend_q, M, uid, wid).where(M.created_at >= cur_start)
        trend_q = trend_q.group_by(cast(M.created_at, Date)).order_by(cast(M.created_at, Date))
        trend_res = await db.execute(trend_q)
        trend = [{"date": str(r.day), "opened": r.opened, "resolved": int(r.resolved)} for r in trend_res.fetchall()]

        return {
            "module": "helpdesk",
            "period": period,
            "workspace_id": wid,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "postgresql_live",
            "kpis": {
                "total": total,
                "new_tickets": _delta(cur_new, prev_new),
                "open": open_tickets,
                "resolved": _delta(cur_resolved, prev_resolved),
                "resolved_total": resolved,
                "resolution_rate": resolution_rate,
                "avg_satisfaction": avg_satisfaction,
                "avg_first_response_min": avg_first_response,
            },
            "charts": {
                "by_priority": by_priority,
                "by_category": by_category,
                "by_channel": by_channel,
                "trend": trend,
            },
        }
    except Exception as e:
        logger.error(
            "analytics helpdesk query failed period=%s workspace_id=%s",
            period,
            wid,
            exc_info=True,
        )
        return {
            "module": "helpdesk",
            "period": period,
            "workspace_id": wid,
            "error": str(e),
            "kpis": {},
            "charts": {},
        }


# ═══════════════════════════════════════════════════════════════
# Agents Analytics
# ═══════════════════════════════════════════════════════════════

@router.get("/agents")
async def agents_analytics(
    ws_ctx: WorkspaceContext = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Agents module analytics from nelvyon_agents table.
    KPIs: total agents, active, avg success rate, total tasks completed,
    by status, top performers.
    """
    uid = ws_ctx.user_id
    wid = ws_ctx.workspace_id

    try:
        from models.nelvyon_agents import Nelvyon_agents
        M = Nelvyon_agents

        async def _cnt(*filters):
            q = select(func.count(M.id))
            q = _scope(q, M, uid, wid)
            for f in filters:
                q = q.where(f)
            return (await db.execute(q)).scalar() or 0

        total = await _cnt()
        active = await _cnt(M.status == "active")
        idle = await _cnt(M.status.in_(["idle", "standby"]))
        error_agents = await _cnt(M.status.in_(["error", "offline"]))

        # Avg success rate
        sr_q = select(func.avg(M.success_rate))
        sr_q = _scope(sr_q, M, uid, wid).where(M.success_rate.isnot(None))
        avg_success = round(float((await db.execute(sr_q)).scalar() or 0), 1)

        # Total tasks completed
        tc_q = select(func.coalesce(func.sum(M.tasks_completed), 0))
        tc_q = _scope(tc_q, M, uid, wid)
        total_tasks = int((await db.execute(tc_q)).scalar() or 0)

        # Tasks today
        tt_q = select(func.coalesce(func.sum(M.tasks_today), 0))
        tt_q = _scope(tt_q, M, uid, wid)
        tasks_today = int((await db.execute(tt_q)).scalar() or 0)

        # By status
        st_q = select(M.status, func.count(M.id).label("count"))
        st_q = _scope(st_q, M, uid, wid).group_by(M.status)
        st_res = await db.execute(st_q)
        by_status = [{"status": r.status or "unknown", "count": r.count} for r in st_res.fetchall()]

        # Top performers (by tasks_completed)
        top_q = select(M.name, M.agent_id, M.status, M.tasks_completed, M.success_rate)
        top_q = _scope(top_q, M, uid, wid).order_by(M.tasks_completed.desc().nullslast()).limit(5)
        top_res = await db.execute(top_q)
        top_agents = [
            {"name": r.name, "agent_id": r.agent_id, "status": r.status,
             "tasks_completed": r.tasks_completed or 0, "success_rate": r.success_rate or 0}
            for r in top_res.fetchall()
        ]

        return {
            "module": "agents",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "postgresql_live",
            "kpis": {
                "total": total,
                "active": active,
                "idle": idle,
                "error": error_agents,
                "avg_success_rate": avg_success,
                "total_tasks_completed": total_tasks,
                "tasks_today": tasks_today,
                "uptime_rate": round((active / max(total, 1)) * 100, 1),
            },
            "charts": {
                "by_status": by_status,
                "top_agents": top_agents,
            },
        }
    except Exception as e:
        logger.error(f"Agents analytics error: {e}", exc_info=True)
        return {"module": "agents", "error": str(e), "kpis": {}, "charts": {}}
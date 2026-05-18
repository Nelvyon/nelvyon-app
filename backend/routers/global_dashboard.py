"""
Global Business Dashboard Router — Resumen ejecutivo del workspace activo.

Misma unidad de negocio que /api/v1/dashboard/metrics (workspace-first).
Requiere X-Workspace-Id (require_workspace).

Criterios de stage: core.deal_stages (SQL_WON / SQL_LOST / abiertos).
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deal_stages import (
    sql_fragment_alias_stage_not_lost,
    sql_fragment_stage_in_lost,
    sql_fragment_stage_in_won,
    sql_fragment_stage_is_open,
)
from dependencies.workspace import WorkspaceContext, require_workspace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/global-dashboard", tags=["global-dashboard"])


# ── Schemas ──

class RevenueMetrics(BaseModel):
    total_revenue: float = 0
    period_revenue: float = 0
    mrr: float = 0
    arr: float = 0
    avg_deal_value: float = 0
    revenue_growth_pct: float = 0


class PipelineMetrics(BaseModel):
    total_deals: int = 0
    open_deals: int = 0
    won_deals: int = 0
    lost_deals: int = 0
    pipeline_value: float = 0
    win_rate: float = 0
    avg_close_days: float = 0


class TicketMetrics(BaseModel):
    total_tickets: int = 0
    open_tickets: int = 0
    resolved_tickets: int = 0
    avg_resolution_hours: float = 0
    satisfaction_score: float = 0


class CampaignMetrics(BaseModel):
    total_campaigns: int = 0
    active_campaigns: int = 0
    total_sent: int = 0
    avg_open_rate: float = 0
    avg_click_rate: float = 0


class ContractMetrics(BaseModel):
    total_contracts: int = 0
    active_contracts: int = 0
    total_value: float = 0
    expiring_soon: int = 0


class AccountHealth(BaseModel):
    score: int = 0  # 0-100
    label: str = "Unknown"
    factors: List[Dict[str, Any]] = []


class GlobalDashboardResponse(BaseModel):
    workspace_id: Optional[int] = None
    period: str = "30d"
    generated_at: str = ""
    revenue: RevenueMetrics = RevenueMetrics()
    pipeline: PipelineMetrics = PipelineMetrics()
    tickets: TicketMetrics = TicketMetrics()
    campaigns: CampaignMetrics = CampaignMetrics()
    contracts: ContractMetrics = ContractMetrics()
    account_health: AccountHealth = AccountHealth()
    top_deals: List[Dict[str, Any]] = []
    recent_activities: List[Dict[str, Any]] = []
    data_status: str = "ok"
    partial_errors: List[Dict[str, str]] = Field(default_factory=list)
    sales_scope_policy: str = "workspace_strict_excludes_null_workspace_id"
    orphan_sales_records_count: int = 0
    contracts_value_computable: bool = False
    contracts_value_note: str = (
        "price está modelado como texto; total_value financiero no disponible en Fase 2"
    )


class ModuleSummary(BaseModel):
    module: str
    label: str
    icon: str
    primary_metric: str
    primary_value: Any
    secondary_metric: str
    secondary_value: Any
    trend: str = "stable"
    status: str = "healthy"
    scope: Optional[str] = None
    scope_note: Optional[str] = None


def _period_to_days(period: str) -> int:
    mapping = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    return mapping.get(period, 30)


@router.get("/overview", response_model=GlobalDashboardResponse)
async def get_global_dashboard(
    period: str = Query("30d", pattern="^(7d|30d|90d|1y)$"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Resumen ejecutivo del workspace activo (mismo ámbito que dashboard metrics)."""
    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id
    days = _period_to_days(period)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    now = datetime.now(timezone.utc)
    sales_scope_policy = "workspace_strict_excludes_null_workspace_id"
    orphan_sales_records_count = 0
    contracts_value_computable = False
    contracts_value_note = (
        "price está modelado como texto; total_value financiero no disponible en Fase 2"
    )
    partial_errors: List[Dict[str, str]] = []

    def _record_partial(module: str, exc: Exception, code: str = "query_failed") -> None:
        msg = str(exc)[:240] if str(exc) else exc.__class__.__name__
        logger.warning(
            "global_dashboard partial error module=%s workspace_id=%s code=%s error=%s",
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

    # ── Revenue (sales_records: workspace_id en modelo) ──
    revenue = RevenueMetrics()
    try:
        r = await db.execute(
            text("""
                SELECT
                    COALESCE(SUM(amount), 0) as total,
                    COALESCE(SUM(CASE WHEN created_at >= :cutoff THEN amount ELSE 0 END), 0) as period_total,
                    COALESCE(AVG(amount), 0) as avg_amount
                FROM sales_records
                WHERE user_id = :uid AND workspace_id = :ws_id
            """),
            {"uid": user_id, "ws_id": ws_id, "cutoff": cutoff},
        )
        row = r.mappings().first()
        if row:
            revenue.total_revenue = float(row.get("total", 0) or 0)
            revenue.period_revenue = float(row.get("period_total", 0) or 0)
            revenue.avg_deal_value = round(float(row.get("avg_amount", 0) or 0), 2)
    except Exception as e:
        _record_partial("revenue", e)

    # Legacy visibility: rows without tenant are excluded from workspace revenue, but tracked.
    try:
        orphan_r = await db.execute(
            text(
                """
                SELECT COUNT(*) AS c
                FROM sales_records
                WHERE user_id = :uid AND workspace_id IS NULL
                """
            ),
            {"uid": user_id},
        )
        orphan_sales_records_count = int((orphan_r.mappings().first() or {}).get("c", 0) or 0)
        if orphan_sales_records_count > 0:
            logger.warning(
                "global_dashboard orphan sales detected module=revenue workspace_id=%s user_id=%s count=%s",
                ws_id,
                user_id,
                orphan_sales_records_count,
            )
    except Exception as e:
        _record_partial("sales_orphans", e)

    # MRR: mismo criterio que dashboard_metrics (Subscriptions.workspace_id + amount_paid)
    try:
        r = await db.execute(
            text("""
                SELECT COALESCE(SUM(amount_paid), 0) as mrr
                FROM subscriptions
                WHERE workspace_id = :ws_id AND status = 'active'
            """),
            {"ws_id": ws_id},
        )
        row = r.mappings().first()
        if row:
            revenue.mrr = float(row.get("mrr", 0) or 0)
            revenue.arr = revenue.mrr * 12
    except Exception as e:
        _record_partial("subscriptions", e)

    # ── Pipeline (deals: user_id + workspace_id; stages alineados con dashboard_metrics) ──
    pipeline = PipelineMetrics()
    try:
        _open = sql_fragment_stage_is_open()
        _won = sql_fragment_stage_in_won()
        _lost = sql_fragment_stage_in_lost()
        r = await db.execute(
            text(f"""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN {_open} THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN {_won} THEN 1 ELSE 0 END) as won_count,
                    SUM(CASE WHEN {_lost} THEN 1 ELSE 0 END) as lost_count,
                    COALESCE(SUM(CASE WHEN {_open} THEN value ELSE 0 END), 0) as pipeline_val
                FROM deals
                WHERE user_id = :uid AND workspace_id = :ws_id
            """),
            {"uid": user_id, "ws_id": ws_id},
        )
        row = r.mappings().first()
        if row:
            pipeline.total_deals = int(row.get("total", 0) or 0)
            pipeline.open_deals = int(row.get("open_count", 0) or 0)
            pipeline.won_deals = int(row.get("won_count", 0) or 0)
            pipeline.lost_deals = int(row.get("lost_count", 0) or 0)
            pipeline.pipeline_value = float(row.get("pipeline_val", 0) or 0)
            # Misma fórmula que dashboard_metrics.py: won / total deals (no won/(won+lost))
            pipeline.win_rate = round(
                (pipeline.won_deals / max(pipeline.total_deals, 1)) * 100, 1
            )
    except Exception as e:
        _record_partial("pipeline", e)

    # ── Tickets ──
    tickets = TicketMetrics()
    try:
        r = await db.execute(
            text("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status IN ('open', 'in_progress', 'pending') THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_count
                FROM helpdesk_tickets
                WHERE user_id = :uid AND workspace_id = :ws_id
            """),
            {"uid": user_id, "ws_id": ws_id},
        )
        row = r.mappings().first()
        if row:
            tickets.total_tickets = int(row.get("total", 0) or 0)
            tickets.open_tickets = int(row.get("open_count", 0) or 0)
            tickets.resolved_tickets = int(row.get("resolved_count", 0) or 0)
    except Exception as e:
        _record_partial("tickets", e)

    # ── Campaigns (open_count/click_count/recipients_count; tasas derivadas) ──
    campaigns = CampaignMetrics()
    try:
        r = await db.execute(
            text("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                    COALESCE(SUM(recipients_count), 0) as total_recipients,
                    COALESCE(SUM(sent_count), 0) as total_sent,
                    COALESCE(SUM(open_count), 0) as total_open,
                    COALESCE(SUM(click_count), 0) as total_click
                FROM campaigns
                WHERE user_id = :uid AND workspace_id = :ws_id
            """),
            {"uid": user_id, "ws_id": ws_id},
        )
        row = r.mappings().first()
        if row:
            campaigns.total_campaigns = int(row.get("total", 0) or 0)
            campaigns.active_campaigns = int(row.get("active_count", 0) or 0)
            tr = int(row.get("total_recipients", 0) or 0)
            ts = int(row.get("total_sent", 0) or 0)
            sent = ts if ts > 0 else tr
            campaigns.total_sent = sent
            to = int(row.get("total_open", 0) or 0)
            tc = int(row.get("total_click", 0) or 0)
            campaigns.avg_open_rate = round((to / sent * 100) if sent > 0 else 0, 1)
            campaigns.avg_click_rate = round((tc / sent * 100) if sent > 0 else 0, 1)
    except Exception as e:
        _record_partial("campaigns", e)

    # ── Contracts (modelo: price es String; no SUM(value)) ──
    contracts = ContractMetrics()
    try:
        r = await db.execute(
            text("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
                FROM contracts
                WHERE user_id = :uid AND workspace_id = :ws_id
            """),
            {"uid": user_id, "ws_id": ws_id},
        )
        row = r.mappings().first()
        if row:
            contracts.total_contracts = int(row.get("total", 0) or 0)
            contracts.active_contracts = int(row.get("active_count", 0) or 0)
            contracts.total_value = 0.0
    except Exception as e:
        _record_partial("contracts", e)

    contacts_count = 0
    try:
        rc = await db.execute(
            text(
                "SELECT COUNT(*) AS c FROM contacts WHERE user_id = :uid AND workspace_id = :ws_id"
            ),
            {"uid": user_id, "ws_id": ws_id},
        )
        contacts_count = int((rc.mappings().first() or {}).get("c", 0) or 0)
    except Exception as e:
        _record_partial("contacts_signal", e)

    # ── Account Health ──
    health_score = 0
    factors = []

    has_crm_signal = contacts_count > 0 or pipeline.total_deals > 0
    if has_crm_signal:
        health_score += 20
        factors.append({"factor": "Datos CRM", "score": 20, "status": "good"})
    else:
        factors.append(
            {
                "factor": "Datos CRM",
                "score": 0,
                "status": "missing",
                "tip": "Añade contactos y deals",
            }
        )

    if campaigns.active_campaigns > 0:
        health_score += 20
        factors.append({"factor": "Campañas activas", "score": 20, "status": "good"})
    else:
        factors.append(
            {
                "factor": "Campañas activas",
                "score": 0,
                "status": "missing",
                "tip": "Lanza una campaña",
            }
        )

    if pipeline.win_rate > 20:
        health_score += 20
        factors.append({"factor": "Win rate", "score": 20, "status": "good"})
    elif pipeline.total_deals > 0:
        health_score += 10
        factors.append(
            {
                "factor": "Win rate",
                "score": 10,
                "status": "warning",
                "tip": "Mejora tu tasa de cierre",
            }
        )
    else:
        factors.append(
            {
                "factor": "Win rate",
                "score": 0,
                "status": "missing",
                "tip": "Crea deals en el pipeline",
            }
        )

    if revenue.total_revenue > 0:
        health_score += 20
        factors.append({"factor": "Revenue", "score": 20, "status": "good"})
    else:
        factors.append(
            {
                "factor": "Revenue",
                "score": 0,
                "status": "missing",
                "tip": "Registra ventas",
            }
        )

    if tickets.resolved_tickets > 0:
        health_score += 20
        factors.append({"factor": "Soporte", "score": 20, "status": "good"})
    elif tickets.total_tickets > 0:
        health_score += 10
        factors.append(
            {
                "factor": "Soporte",
                "score": 10,
                "status": "warning",
                "tip": "Resuelve tickets abiertos",
            }
        )
    else:
        factors.append({"factor": "Soporte", "score": 0, "status": "neutral"})

    health_label = (
        "Excelente"
        if health_score >= 80
        else "Bueno"
        if health_score >= 60
        else "En desarrollo"
        if health_score >= 40
        else "Inicial"
    )

    account_health = AccountHealth(
        score=health_score,
        label=health_label,
        factors=factors,
    )

    # ── Top Deals (solo columnas reales; contacto vía JOIN) ──
    top_deals: List[Dict[str, Any]] = []
    try:
        _not_lost = sql_fragment_alias_stage_not_lost("d")
        r = await db.execute(
            text(f"""
                SELECT d.title, d.value, d.stage,
                    TRIM(
                        COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')
                    ) AS contact_label,
                    d.created_at
                FROM deals d
                LEFT JOIN contacts c ON c.id = d.contact_id
                    AND c.workspace_id = d.workspace_id
                WHERE d.user_id = :uid AND d.workspace_id = :ws_id
                  AND {_not_lost}
                ORDER BY d.value DESC NULLS LAST
                LIMIT 5
            """),
            {"uid": user_id, "ws_id": ws_id},
        )
        for row in r.mappings().all():
            label = (row.get("contact_label") or "").strip() or "—"
            top_deals.append(
                {
                    "title": row.get("title", ""),
                    "value": float(row.get("value", 0) or 0),
                    "stage": row.get("stage", ""),
                    "contact": label,
                    "created_at": str(row["created_at"]) if row.get("created_at") else None,
                }
            )
    except Exception as e:
        _record_partial("top_deals", e)

    # ── Recent Activities ──
    recent: List[Dict[str, Any]] = []
    try:
        r = await db.execute(
            text("""
                SELECT type, description, entity_type, entity_id, created_at
                FROM activities
                WHERE user_id = :uid AND workspace_id = :ws_id
                ORDER BY created_at DESC NULLS LAST
                LIMIT 10
            """),
            {"uid": user_id, "ws_id": ws_id},
        )
        for row in r.mappings().all():
            recent.append(
                {
                    "type": row.get("type", ""),
                    "description": row.get("description", ""),
                    "entity_type": row.get("entity_type", ""),
                    "entity_id": row.get("entity_id", ""),
                    "created_at": str(row["created_at"]) if row.get("created_at") else None,
                }
            )
    except Exception as e:
        _record_partial("recent_activities", e)

    return GlobalDashboardResponse(
        workspace_id=ws_id,
        period=period,
        generated_at=now.isoformat(),
        revenue=revenue,
        pipeline=pipeline,
        tickets=tickets,
        campaigns=campaigns,
        contracts=contracts,
        account_health=account_health,
        top_deals=top_deals,
        recent_activities=recent,
        data_status=_compute_data_status(total_modules=9),
        partial_errors=partial_errors,
        sales_scope_policy=sales_scope_policy,
        orphan_sales_records_count=orphan_sales_records_count,
        contracts_value_computable=contracts_value_computable,
        contracts_value_note=contracts_value_note,
    )


@router.get("/modules-summary", response_model=List[ModuleSummary])
async def get_modules_summary(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Resumen por módulo del workspace activo."""
    user_id = ws_ctx.user_id
    ws_id = ws_ctx.workspace_id
    summaries: List[ModuleSummary] = []

    def _log_summary_error(module: str, exc: Exception) -> None:
        logger.warning(
            "global_dashboard modules-summary error module=%s workspace_id=%s error=%s",
            module,
            ws_id,
            str(exc)[:240] if str(exc) else exc.__class__.__name__,
            exc_info=True,
        )

    async def _count(table: str, where_extra: str = "") -> int:
        try:
            q = (
                f"SELECT COUNT(*) as cnt FROM {table} "
                f"WHERE user_id = :uid AND workspace_id = :ws_id"
            )
            if where_extra:
                q += f" AND {where_extra}"
            r = await db.execute(text(q), {"uid": user_id, "ws_id": ws_id})
            return int((r.mappings().first() or {}).get("cnt", 0))
        except Exception as e:
            _log_summary_error(f"{table}.count", e)
            return 0

    contacts_total = await _count("contacts")
    contacts_leads = await _count("contacts", "status = 'lead'")
    summaries.append(
        ModuleSummary(
            module="crm",
            label="CRM",
            icon="users",
            primary_metric="Contactos",
            primary_value=contacts_total,
            secondary_metric="Leads",
            secondary_value=contacts_leads,
            status="healthy" if contacts_total > 0 else "warning",
        )
    )

    deals_total = await _count("deals")
    deals_open_sql = sql_fragment_stage_is_open()
    try:
        r = await db.execute(
            text(
                f"SELECT COUNT(*) as cnt FROM deals WHERE user_id = :uid "
                f"AND workspace_id = :ws_id AND ({deals_open_sql})"
            ),
            {"uid": user_id, "ws_id": ws_id},
        )
        deals_open = int((r.mappings().first() or {}).get("cnt", 0))
    except Exception as e:
        _log_summary_error("deals.open_count", e)
        deals_open = 0

    summaries.append(
        ModuleSummary(
            module="pipelines",
            label="Pipeline",
            icon="target",
            primary_metric="Deals",
            primary_value=deals_total,
            secondary_metric="Abiertos",
            secondary_value=deals_open,
            status="healthy" if deals_total > 0 else "warning",
        )
    )

    camp_total = await _count("campaigns")
    camp_active = await _count("campaigns", "status = 'active'")
    summaries.append(
        ModuleSummary(
            module="campaigns",
            label="Campañas",
            icon="megaphone",
            primary_metric="Total",
            primary_value=camp_total,
            secondary_metric="Activas",
            secondary_value=camp_active,
            status="healthy" if camp_active > 0 else "warning",
        )
    )

    tickets_total = await _count("helpdesk_tickets")
    tickets_open = await _count(
        "helpdesk_tickets",
        "status IN ('open', 'in_progress', 'pending')",
    )
    summaries.append(
        ModuleSummary(
            module="helpdesk",
            label="Helpdesk",
            icon="headphones",
            primary_metric="Tickets",
            primary_value=tickets_total,
            secondary_metric="Abiertos",
            secondary_value=tickets_open,
            status="critical"
            if tickets_open > 10
            else "healthy"
            if tickets_total > 0
            else "warning",
        )
    )

    contracts_total = await _count("contracts")
    contracts_active = await _count("contracts", "status = 'active'")
    summaries.append(
        ModuleSummary(
            module="contracts",
            label="Contratos",
            icon="file-text",
            primary_metric="Total",
            primary_value=contracts_total,
            secondary_metric="Activos",
            secondary_value=contracts_active,
            status="healthy" if contracts_total > 0 else "warning",
        )
    )

    # social_posts no tiene workspace_id en el modelo: métrica por usuario (legacy)
    posts_total = 0
    posts_published = 0
    try:
        r = await db.execute(
            text(
                "SELECT COUNT(*) as c FROM social_posts WHERE user_id = :uid"
            ),
            {"uid": user_id},
        )
        posts_total = int((r.mappings().first() or {}).get("c", 0) or 0)
        r2 = await db.execute(
            text(
                "SELECT COUNT(*) as c FROM social_posts WHERE user_id = :uid "
                "AND status = 'published'"
            ),
            {"uid": user_id},
        )
        posts_published = int((r2.mappings().first() or {}).get("c", 0) or 0)
    except Exception as e:
        _log_summary_error("social", e)

    summaries.append(
        ModuleSummary(
            module="social",
            label="Social",
            icon="share-2",
            primary_metric="Posts",
            primary_value=posts_total,
            secondary_metric="Publicados",
            secondary_value=posts_published,
            status="healthy" if posts_total > 0 else "warning",
            scope="user_cross_workspace",
            scope_note="Actividad social personal (todas tus marcas)",
        )
    )

    return summaries

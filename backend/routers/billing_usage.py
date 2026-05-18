"""
Billing Usage Router — Real usage metrics and invoice generation from DB data.

Provides:
- GET /api/v1/billing/usage     → Real usage counters from DB tables
- GET /api/v1/billing/invoices  → Invoices derived from subscription history
- GET /api/v1/billing/summary   → Quick billing summary for dashboard widgets
- POST /api/v1/billing/alerts   → Configure usage alert thresholds

Plan activo: misma fuente que `services.plan_quota.get_active_plan_id_for_workspace`
(suscripción `active` del workspace; fallback `starter`).

Contadores: scope por `workspace_id` alineado con enforcement CRM/helpdesk (Fases 1–2).

GAP explícito (no en `pricing_plans` / no enforced por `plan_quota` hoy): límites
de visualización para `api_calls`, `storage_gb` y `emails` — heurística heredada
solo para el dashboard; cuotas reales de producto siguen siendo contacts /
active_campaigns / active_workflows / workspace_users + módulos.
"""
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.pricing_plans import get_plan_definition, get_plan_label, get_limit
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from models.activities import Activities
from models.contracts import Contracts
from models.deals import Deals
from models.helpdesk_tickets import Helpdesk_tickets
from models.workflow_rules import EmailQueue
from models.nelvyon_user_settings import Nelvyon_user_settings
from models.workspace_members import Workspace_members
from schemas.auth import UserResponse
from services.plan_quota import (
    count_active_workflows_in_workspace,
    count_contacts_in_workspace,
    count_non_terminal_campaigns_in_workspace,
    get_active_plan_id_for_workspace,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["billing-usage"])


# ─── Response Models ───

class UsageMeterResponse(BaseModel):
    id: str
    label: str
    current: float
    limit: float
    unit: str
    color: str
    overage_rate: Optional[float] = None
    percentage: float = 0.0
    status: str = "normal"  # normal, warning, critical, exceeded


class InvoiceResponse(BaseModel):
    id: str
    number: str
    date: str
    amount: float
    currency: str
    status: str  # paid, pending, overdue, draft
    plan: str
    period: str
    pdf_url: str


class UsageResponse(BaseModel):
    meters: List[UsageMeterResponse]
    updated_at: str
    plan_id: str = "starter"
    plan_label: str = "Starter"


class InvoicesResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total_paid: float
    currency: str


class BillingSummaryResponse(BaseModel):
    plan_id: str
    plan_label: str
    billing_cycle: str
    next_billing_date: Optional[str] = None
    monthly_cost: float
    usage_alerts: int = 0
    meters_at_risk: List[str] = []
    total_paid_ytd: float = 0.0
    currency: str = "EUR"


class UsageAlertRequest(BaseModel):
    meter_id: str = Field(..., description="ID of the usage meter (e.g., 'contacts', 'api_calls')")
    threshold_pct: float = Field(80.0, ge=50, le=100, description="Alert threshold percentage (50-100)")


UNLIMITED_LIMIT = 10**9


def _module_allowed(plan_id: str, module: str) -> bool:
    mods = get_plan_definition(plan_id).get("modules") or {}
    return bool(mods.get(module))


def _effective_quota_limit(plan_id: str, module: str, limit_key: str) -> float:
    """0 si el módulo está desactivado; ilimitado (tope display) si el límite es None."""
    if not _module_allowed(plan_id, module):
        return 0.0
    lim = get_limit(plan_id, limit_key)
    if lim is None:
        return float(UNLIMITED_LIMIT)
    return float(lim)


def _display_limits_non_pricing(plan_id: str) -> dict:
    """Solo UI: no están en `get_limit` ni en `plan_quota` enforcement."""
    tier = (plan_id or "").lower()
    if tier not in ("starter", "pro", "enterprise", "partner"):
        tier = "starter"
    api_calls = 25000 if tier == "starter" else 100000 if tier in ("pro", "partner") else 500000
    storage = 5 if tier == "starter" else 25 if tier in ("pro", "partner") else 100
    emails = 10000 if tier == "starter" else 50000 if tier in ("pro", "partner") else 200000
    return {"api_calls": float(api_calls), "storage_gb": float(storage), "emails": float(emails)}


def _usage_limits(plan_id: str) -> dict:
    extras = _display_limits_non_pricing(plan_id)
    users_lim = get_limit(plan_id, "workspace_users")
    users_f = float(UNLIMITED_LIMIT) if users_lim is None else float(users_lim)
    return {
        "contacts": _effective_quota_limit(plan_id, "contacts", "contacts"),
        "campaigns": _effective_quota_limit(plan_id, "campaigns", "active_campaigns"),
        "workflows": _effective_quota_limit(plan_id, "workflows", "active_workflows"),
        "helpdesk": float(UNLIMITED_LIMIT) if _module_allowed(plan_id, "helpdesk") else 0.0,
        "users": users_f,
        **extras,
    }


OVERAGE_RATES = {
    "contacts": 0.005,
    "campaigns": 0.005,
    "api_calls": 0.001,
    "storage_gb": 0.50,
    "users": 5.00,
    "emails": 0.002,
    "workflows": None,
    "helpdesk": None,
}


def _utc_month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _utc_year_start() -> datetime:
    now = datetime.now(timezone.utc)
    return datetime(now.year, 1, 1, tzinfo=timezone.utc)


async def _count_workspace_members(db: AsyncSession, workspace_id: int) -> int:
    q = select(func.count()).select_from(Workspace_members).where(Workspace_members.workspace_id == workspace_id)
    r = await db.execute(q)
    return int(r.scalar() or 0)


async def _count_helpdesk_tickets(db: AsyncSession, workspace_id: int) -> int:
    q = select(func.count()).select_from(Helpdesk_tickets).where(Helpdesk_tickets.workspace_id == workspace_id)
    r = await db.execute(q)
    return int(r.scalar() or 0)


async def _count_activities_since(db: AsyncSession, workspace_id: int, since: datetime) -> int:
    q = select(func.count()).select_from(Activities).where(
        Activities.workspace_id == workspace_id,
        Activities.created_at >= since,
    )
    r = await db.execute(q)
    return int(r.scalar() or 0)


async def _count_emails_since(db: AsyncSession, workspace_id: int, since: datetime) -> int:
    q = select(func.count()).select_from(EmailQueue).where(
        EmailQueue.workspace_id == workspace_id,
        EmailQueue.created_at >= since,
    )
    r = await db.execute(q)
    return int(r.scalar() or 0)


async def _count_contracts_workspace(db: AsyncSession, workspace_id: int) -> int:
    try:
        q = select(func.count()).select_from(Contracts).where(Contracts.workspace_id == workspace_id)
        r = await db.execute(q)
        return int(r.scalar() or 0)
    except Exception:
        return 0


async def _count_deals_workspace(db: AsyncSession, workspace_id: int) -> int:
    try:
        q = select(func.count()).select_from(Deals).where(Deals.workspace_id == workspace_id)
        r = await db.execute(q)
        return int(r.scalar() or 0)
    except Exception:
        return 0


def _build_meter(mid: str, label: str, current: float, limit_val: float, unit: str, color: str) -> UsageMeterResponse:
    if limit_val <= 0:
        pct = 100.0 if current > 0 else 0.0
        meter_status = "exceeded" if current > 0 else "normal"
    elif limit_val >= UNLIMITED_LIMIT - 1:
        pct = 0.0
        meter_status = "normal"
    else:
        pct = round((current / max(limit_val, 1.0)) * 100, 1)
        if pct >= 100:
            meter_status = "exceeded"
        elif pct >= 90:
            meter_status = "critical"
        elif pct >= 75:
            meter_status = "warning"
        else:
            meter_status = "normal"
    return UsageMeterResponse(
        id=mid,
        label=label,
        current=current,
        limit=limit_val,
        unit=unit,
        color=color,
        overage_rate=OVERAGE_RATES.get(mid),
        percentage=pct,
        status=meter_status,
    )


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get real usage metrics for the billing workspace (aligned with plan_quota)."""
    _ = current_user  # auth side-effect; counts are workspace-scoped
    ws_id = ws_ctx.workspace_id
    assert ws_id is not None

    plan_id = await get_active_plan_id_for_workspace(db, ws_id)
    limits = _usage_limits(plan_id)

    contacts_count = await count_contacts_in_workspace(db, ws_id)
    campaigns_count = await count_non_terminal_campaigns_in_workspace(db, ws_id)
    workflows_count = await count_active_workflows_in_workspace(db, ws_id)
    helpdesk_count = await _count_helpdesk_tickets(db, ws_id)
    members_count = await _count_workspace_members(db, ws_id)

    month_start = _utc_month_start()
    api_calls = await _count_activities_since(db, ws_id, month_start)
    emails_count = await _count_emails_since(db, ws_id, month_start)

    contracts_count = await _count_contracts_workspace(db, ws_id)
    deals_count = await _count_deals_workspace(db, ws_id)
    total_records = contacts_count + campaigns_count + contracts_count + helpdesk_count + deals_count
    storage_estimate = round(total_records * 0.001, 2)

    meters = [
        _build_meter("contacts", "Contactos", float(contacts_count), limits["contacts"], "contactos", "text-sky-400"),
        _build_meter(
            "campaigns",
            "Campañas activas",
            float(campaigns_count),
            limits["campaigns"],
            "campañas",
            "text-amber-400",
        ),
        _build_meter(
            "workflows",
            "Workflows activos",
            float(workflows_count),
            limits["workflows"],
            "workflows",
            "text-cyan-400",
        ),
        _build_meter(
            "helpdesk",
            "Tickets helpdesk",
            float(helpdesk_count),
            limits["helpdesk"],
            "tickets",
            "text-indigo-400",
        ),
        _build_meter("users", "Miembros workspace", float(members_count), limits["users"], "usuarios", "text-lime-400"),
        _build_meter(
            "api_calls",
            "Actividades (mes, aprox. API)",
            float(api_calls),
            limits["api_calls"],
            "requests",
            "text-violet-400",
        ),
        _build_meter("storage", "Almacenamiento (estim.)", storage_estimate, limits["storage_gb"], "GB", "text-emerald-400"),
        _build_meter("emails", "Cola email (mes)", float(emails_count), limits["emails"], "emails", "text-rose-400"),
    ]

    return UsageResponse(
        meters=meters,
        updated_at=datetime.now(timezone.utc).isoformat(),
        plan_id=plan_id,
        plan_label=get_plan_label(plan_id),
    )


@router.get("/invoices", response_model=InvoicesResponse)
async def get_invoices(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate invoices from real subscription payment history."""
    _ = current_user
    ws_id = ws_ctx.workspace_id

    try:
        result = await db.execute(
            text(
                "SELECT id, plan_id, billing_cycle, status, amount_paid, currency, "
                "started_at, expires_at, created_at "
                "FROM subscriptions WHERE workspace_id = :ws "
                "ORDER BY created_at DESC LIMIT 50"
            ),
            {"ws": ws_id},
        )
        rows = result.fetchall()
    except Exception as e:
        logger.error("Error fetching invoices: %s", e)
        rows = []

    invoices: List[InvoiceResponse] = []
    total_paid = 0.0

    for i, row in enumerate(rows):
        sub_id, plan_id, billing_cycle, status, amount_paid, currency, started_at, expires_at, created_at = row
        amount = float(amount_paid) if amount_paid else 0.0
        curr = currency or "EUR"
        dt = created_at or datetime.now(timezone.utc)

        if status == "active" and amount > 0:
            inv_status = "paid"
            total_paid += amount
        elif status == "pending":
            inv_status = "pending"
        elif status == "cancelled":
            inv_status = "draft"
        else:
            inv_status = "paid" if amount > 0 else "pending"
            if amount > 0:
                total_paid += amount

        date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
        month_str = dt.strftime("%b %Y") if hasattr(dt, "strftime") else str(dt)[:7]
        inv_number = f"NV-{dt.strftime('%Y-%m%d') if hasattr(dt, 'strftime') else '0000-0000'}-{sub_id:04d}"

        invoices.append(
            InvoiceResponse(
                id=f"inv_{sub_id}",
                number=inv_number,
                date=date_str,
                amount=amount,
                currency=curr.upper(),
                status=inv_status,
                plan=plan_id.capitalize() if plan_id else "Free",
                period=month_str,
                pdf_url=f"/api/v1/billing/invoices/{sub_id}/pdf",
            )
        )

    return InvoicesResponse(
        invoices=invoices,
        total_paid=round(total_paid, 2),
        currency="EUR",
    )


@router.get("/summary", response_model=BillingSummaryResponse)
async def get_billing_summary(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Quick billing summary for dashboard widgets."""
    _ = current_user
    ws_id = ws_ctx.workspace_id

    plan_id = "starter"
    billing_cycle = "monthly"
    next_billing = None
    monthly_cost = 0.0

    try:
        sub_result = await db.execute(
            text(
                "SELECT plan_id, billing_cycle, amount_paid, COALESCE(current_period_end, expires_at) AS period_end "
                "FROM subscriptions "
                "WHERE workspace_id = :ws AND status = 'active' "
                "ORDER BY id DESC LIMIT 1"
            ),
            {"ws": ws_id},
        )
        row = sub_result.fetchone()
        if row:
            plan_id = row[0] or "starter"
            billing_cycle = row[1] or "monthly"
            monthly_cost = float(row[2] or 0)
            if row[3]:
                next_billing = str(row[3])[:10]
    except Exception as e:
        logger.warning("Error fetching subscription summary: %s", e)

    usage_data = await get_usage(ws_ctx, current_user, db)
    meters_at_risk = []
    usage_alerts = 0
    for meter in usage_data.meters:
        if meter.limit > 0 and meter.limit < UNLIMITED_LIMIT - 1:
            pct = (meter.current / meter.limit) * 100
            if pct >= 80:
                meters_at_risk.append(meter.id)
                usage_alerts += 1

    total_paid_ytd = 0.0
    try:
        ys = _utc_year_start()
        ytd_result = await db.execute(
            text(
                "SELECT COALESCE(SUM(amount_paid), 0) "
                "FROM subscriptions "
                "WHERE workspace_id = :ws AND status = 'active' "
                "AND created_at >= :ys"
            ),
            {"ws": ws_id, "ys": ys},
        )
        total_paid_ytd = float(ytd_result.scalar() or 0)
    except Exception:
        pass

    return BillingSummaryResponse(
        plan_id=plan_id,
        plan_label=get_plan_label(plan_id),
        billing_cycle=billing_cycle,
        next_billing_date=next_billing,
        monthly_cost=monthly_cost,
        usage_alerts=usage_alerts,
        meters_at_risk=meters_at_risk,
        total_paid_ytd=round(total_paid_ytd, 2),
        currency="EUR",
    )


@router.post("/alerts")
async def configure_usage_alert(
    alert: UsageAlertRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Configure a usage alert threshold for a specific meter (JSON en `custom_theme_json` por user+workspace)."""
    user_id = str(current_user.id)
    ws_id = ws_ctx.workspace_id

    valid_meters = {
        "contacts",
        "campaigns",
        "workflows",
        "helpdesk",
        "users",
        "api_calls",
        "storage",
        "emails",
    }
    if alert.meter_id not in valid_meters:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid meter_id. Must be one of: {', '.join(sorted(valid_meters))}",
        )

    key = f"usage_alert_{alert.meter_id}"
    try:
        r = await db.execute(
            select(Nelvyon_user_settings).where(
                Nelvyon_user_settings.user_id == user_id,
                Nelvyon_user_settings.workspace_id == ws_id,
            )
        )
        row = r.scalar_one_or_none()
        payload: dict = {}
        if row and row.custom_theme_json:
            try:
                payload = json.loads(row.custom_theme_json)
            except (json.JSONDecodeError, TypeError):
                payload = {}
        payload[key] = alert.threshold_pct
        blob = json.dumps(payload)
        if row:
            row.custom_theme_json = blob
        else:
            db.add(
                Nelvyon_user_settings(
                    user_id=user_id,
                    workspace_id=ws_id,
                    custom_theme_json=blob,
                )
            )
        await db.commit()
    except Exception as e:
        logger.warning("Error saving usage alert: %s", e)
        await db.rollback()

    return {
        "meter_id": alert.meter_id,
        "threshold_pct": alert.threshold_pct,
        "status": "configured",
        "message": f"Alert configured: notify when {alert.meter_id} reaches {alert.threshold_pct}% of limit",
    }

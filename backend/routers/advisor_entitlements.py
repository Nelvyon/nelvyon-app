"""
ADVISOR EMPRESARIAL NELVYON v1 — plan-governed entitlements and session enforcement.

GET  /api/v1/advisor/entitlements     (requires workspace scope)
POST /api/v1/advisor/sessions/consume (requires workspace scope)
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.advisor_entitlements import AdvisorEntitlementResolved, resolve_advisor_entitlements
from dependencies.workspace import WorkspaceContext, require_workspace
from services.plan_quota import get_active_plan_id_for_workspace
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db

router = APIRouter(prefix="/api/v1/advisor", tags=["advisor"])


class AdvisorEntitlementsResponse(BaseModel):
    plan_id: str = Field(description="Underlying commercial plan id for this workspace")
    tier: str
    sessions_per_month: int = Field(description="Monthly session budget included in tier")
    modules: list[str] = Field(description="Unlocked focus areas for this tier")
    output_profile: str = Field(description="Depth of structured output: focus | growth_plan | executive_review")
    month_key: str = Field(description="Usage bucket key in YYYY-MM format")
    used_sessions_this_month: int = Field(description="Consumed sessions in current month for this workspace")
    remaining_sessions_this_month: int = Field(description="Available sessions remaining this month")
    limit_reached: bool = Field(description="True when no sessions remain in current month")


class AdvisorSessionConsumeResponse(BaseModel):
    consumed: bool = Field(description="True when one session unit was consumed")
    month_key: str
    used_sessions_this_month: int
    remaining_sessions_this_month: int
    limit_reached: bool


def _month_key_utc(now: datetime | None = None) -> str:
    source = now or datetime.utcnow()
    return source.strftime("%Y-%m")


async def _ensure_advisor_usage_table(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS advisor_session_usage (
                workspace_id INTEGER NOT NULL,
                month_key VARCHAR(7) NOT NULL,
                used_sessions INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                PRIMARY KEY (workspace_id, month_key)
            )
            """
        )
    )
    await db.commit()


async def _get_month_usage(db: AsyncSession, workspace_id: int, month_key: str) -> int:
    row = (
        await db.execute(
            text(
                """
                SELECT used_sessions
                FROM advisor_session_usage
                WHERE workspace_id = :workspace_id AND month_key = :month_key
                """
            ),
            {"workspace_id": workspace_id, "month_key": month_key},
        )
    ).fetchone()
    if not row:
        return 0
    return int(row[0] or 0)


async def _consume_month_usage(db: AsyncSession, workspace_id: int, month_key: str, monthly_limit: int) -> tuple[bool, int]:
    await db.execute(
        text(
            """
            INSERT INTO advisor_session_usage (workspace_id, month_key, used_sessions, created_at, updated_at)
            VALUES (:workspace_id, :month_key, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(workspace_id, month_key) DO NOTHING
            """
        ),
        {"workspace_id": workspace_id, "month_key": month_key},
    )
    await db.commit()

    result = await db.execute(
        text(
            """
            UPDATE advisor_session_usage
            SET used_sessions = used_sessions + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = :workspace_id
              AND month_key = :month_key
              AND used_sessions < :monthly_limit
            """
        ),
        {"workspace_id": workspace_id, "month_key": month_key, "monthly_limit": monthly_limit},
    )
    consumed = int(result.rowcount or 0) > 0
    await db.commit()
    used = await _get_month_usage(db, workspace_id, month_key)
    return consumed, used


@router.get("/entitlements", response_model=AdvisorEntitlementsResponse)
async def get_advisor_entitlements(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    ws_id = ws_ctx.workspace_id
    plan_id = "starter"
    if ws_id is not None:
        plan_id = await get_active_plan_id_for_workspace(db, ws_id)

    resolved: AdvisorEntitlementResolved = resolve_advisor_entitlements(plan_id)
    month_key = _month_key_utc()
    await _ensure_advisor_usage_table(db)
    used = await _get_month_usage(db, ws_id, month_key)
    monthly_limit = int(resolved["sessions_per_month"])
    remaining = max(0, monthly_limit - used)
    return AdvisorEntitlementsResponse(
        plan_id=plan_id,
        tier=resolved["tier"],
        sessions_per_month=monthly_limit,
        modules=resolved["modules"],
        output_profile=resolved["output_profile"],
        month_key=month_key,
        used_sessions_this_month=used,
        remaining_sessions_this_month=remaining,
        limit_reached=remaining <= 0,
    )


@router.post("/sessions/consume", response_model=AdvisorSessionConsumeResponse)
async def consume_advisor_session(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    ws_id = ws_ctx.workspace_id
    plan_id = "starter"
    if ws_id is not None:
        plan_id = await get_active_plan_id_for_workspace(db, ws_id)
    resolved: AdvisorEntitlementResolved = resolve_advisor_entitlements(plan_id)
    monthly_limit = int(resolved["sessions_per_month"])
    month_key = _month_key_utc()
    await _ensure_advisor_usage_table(db)
    consumed, used = await _consume_month_usage(db, ws_id, month_key, monthly_limit)
    remaining = max(0, monthly_limit - used)
    return AdvisorSessionConsumeResponse(
        consumed=consumed,
        month_key=month_key,
        used_sessions_this_month=used,
        remaining_sessions_this_month=remaining,
        limit_reached=remaining <= 0,
    )

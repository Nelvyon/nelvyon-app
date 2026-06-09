"""
Sync subscriptions (Python SSOT) → saas_tenants.plan.

Parity target: backend/saas/SaasBillingSyncService.ts + saasTenantMapper.ts.
Not wired to webhooks until Commit 3.2.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

SaasPlan = Literal["starter", "pro", "enterprise"]
SaasBillingSyncMode = Literal["dry-run", "apply"]
SaasBillingSyncSkipReason = Literal[
    "NO_TENANT",
    "NO_SUBSCRIPTION",
    "STATUS_NOT_SYNCABLE",
    "PLAN_UNCHANGED",
    "VALIDATION",
]

SYNCABLE_SUBSCRIPTION_STATUSES = frozenset({"active", "trialing", "past_due"})
VALID_SAAS_PLANS = frozenset({"starter", "pro", "enterprise"})

SUBSCRIPTION_BY_WORKSPACE_SQL = text(
    """
    SELECT plan_id, status
    FROM subscriptions
    WHERE workspace_id = :workspace_id
    ORDER BY
      CASE status
        WHEN 'active' THEN 0
        WHEN 'trialing' THEN 1
        WHEN 'past_due' THEN 2
        ELSE 9
      END,
      updated_at DESC NULLS LAST,
      id DESC
    LIMIT 1
    """
)

SUBSCRIPTION_LEGACY_BY_USER_SQL = text(
    """
    SELECT plan AS plan_id, status
    FROM subscriptions
    WHERE user_id::text = :user_id
    LIMIT 1
    """
)

TENANT_BY_WORKSPACE_SQL = text(
    """
    SELECT id, user_id, workspace_id, plan
    FROM saas_tenants
    WHERE workspace_id = :workspace_id
    LIMIT 1
    """
)

TENANT_BY_USER_SQL = text(
    """
    SELECT id, user_id, workspace_id, plan
    FROM saas_tenants
    WHERE user_id = CAST(:user_id AS uuid)
    LIMIT 1
    """
)

TENANTS_WITH_BRIDGE_SQL = text(
    """
    SELECT id, user_id, workspace_id, plan
    FROM saas_tenants
    WHERE workspace_id IS NOT NULL
    """
)

UPDATE_TENANT_PLAN_SQL = text(
    """
    UPDATE saas_tenants
    SET plan = :plan, updated_at = NOW()
    WHERE id = CAST(:tenant_id AS uuid)
      AND plan IS DISTINCT FROM :plan
    RETURNING id, plan
    """
)


def normalize_billable_plan_id(raw: Optional[str]) -> str:
    return str(raw or "").strip().lower()


def map_billable_plan_to_saas_plan(billable_plan_id: str) -> SaasPlan:
    normalized = normalize_billable_plan_id(billable_plan_id)
    if normalized == "starter":
        return "starter"
    if normalized == "pro":
        return "pro"
    if normalized == "enterprise":
        return "enterprise"
    if normalized == "agency":
        return "enterprise"
    if normalized == "partner":
        return "starter"
    return "starter"


def is_saas_plan_sync_status(status: str) -> bool:
    return normalize_billable_plan_id(status) in SYNCABLE_SUBSCRIPTION_STATUSES


def should_sync_saas_tenant_plan(status: str) -> bool:
    return is_saas_plan_sync_status(status)


def _parse_saas_plan(raw: str) -> SaasPlan:
    plan = normalize_billable_plan_id(raw)
    if plan in VALID_SAAS_PLANS:
        return plan  # type: ignore[return-value]
    return "starter"


@dataclass
class SaasBillingSyncResult:
    mode: SaasBillingSyncMode
    tenant_id: Optional[str]
    workspace_id: Optional[int]
    owner_user_id: Optional[str]
    previous_plan: Optional[SaasPlan]
    target_plan: Optional[SaasPlan]
    subscription_plan_id: Optional[str]
    subscription_status: Optional[str]
    synced: bool
    skipped: bool
    skip_reason: Optional[SaasBillingSyncSkipReason] = None
    executed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class SaasBillingSyncBatchReport:
    mode: SaasBillingSyncMode
    executed_at: str
    scanned: int
    synced: int
    skipped: int
    errors: list[dict[str, Any]]
    results: list[SaasBillingSyncResult]


@dataclass
class _TenantRow:
    id: str
    user_id: str
    workspace_id: Optional[int]
    plan: str


@dataclass
class _SubscriptionRow:
    plan_id: str
    status: str


async def sync_from_workspace_id(
    db: AsyncSession,
    workspace_id: int,
    mode: SaasBillingSyncMode = "dry-run",
    *,
    plan_id: Optional[str] = None,
    status: Optional[str] = None,
) -> SaasBillingSyncResult:
    if not isinstance(workspace_id, int) or workspace_id <= 0:
        return _skipped_result(mode, None, workspace_id, None, "VALIDATION")

    tenant = await _load_tenant_by_workspace(db, workspace_id)
    if tenant is None:
        return _skipped_result(mode, None, workspace_id, None, "NO_TENANT")

    subscription: Optional[_SubscriptionRow]
    if plan_id is not None and status is not None:
        subscription = _SubscriptionRow(plan_id=plan_id, status=status)
    else:
        subscription = await _load_subscription_by_workspace(db, workspace_id)

    return await _apply_sync(db, mode, tenant, workspace_id, subscription)


async def sync_from_user_id(
    db: AsyncSession,
    user_id: str,
    mode: SaasBillingSyncMode = "dry-run",
    *,
    plan_id: Optional[str] = None,
    status: Optional[str] = None,
) -> SaasBillingSyncResult:
    trimmed = (user_id or "").strip()
    if not trimmed:
        return _skipped_result(mode, None, None, None, "VALIDATION")

    tenant = await _load_tenant_by_user(db, trimmed)
    if tenant is None:
        return _skipped_result(mode, None, None, trimmed, "NO_TENANT")

    workspace_id = tenant.workspace_id
    if workspace_id is not None and isinstance(workspace_id, int):
        return await sync_from_workspace_id(
            db,
            workspace_id,
            mode,
            plan_id=plan_id,
            status=status,
        )

    subscription: Optional[_SubscriptionRow]
    if plan_id is not None and status is not None:
        subscription = _SubscriptionRow(plan_id=plan_id, status=status)
    else:
        subscription = await _load_subscription_legacy_by_user(db, trimmed)

    return await _apply_sync(db, mode, tenant, None, subscription)


async def sync_from_subscription_hint(
    db: AsyncSession,
    *,
    workspace_id: Optional[int] = None,
    user_id: Optional[str] = None,
    plan_id: str,
    status: str,
    mode: SaasBillingSyncMode = "dry-run",
) -> SaasBillingSyncResult:
    if workspace_id is not None and isinstance(workspace_id, int) and workspace_id > 0:
        return await sync_from_workspace_id(
            db,
            workspace_id,
            mode,
            plan_id=plan_id,
            status=status,
        )
    if user_id and user_id.strip():
        return await sync_from_user_id(
            db,
            user_id.strip(),
            mode,
            plan_id=plan_id,
            status=status,
        )
    return _skipped_result(mode, None, workspace_id, user_id, "VALIDATION")


async def run_batch(
    db: AsyncSession,
    mode: SaasBillingSyncMode = "dry-run",
) -> SaasBillingSyncBatchReport:
    executed_at = datetime.now(timezone.utc).isoformat()
    report = SaasBillingSyncBatchReport(
        mode=mode,
        executed_at=executed_at,
        scanned=0,
        synced=0,
        skipped=0,
        errors=[],
        results=[],
    )

    result = await db.execute(TENANTS_WITH_BRIDGE_SQL)
    rows = result.fetchall()
    report.scanned = len(rows)

    for row in rows:
        workspace_id = row[2]
        if workspace_id is None or not isinstance(workspace_id, int):
            continue
        try:
            sync_result = await sync_from_workspace_id(db, workspace_id, mode)
            report.results.append(sync_result)
            if sync_result.synced:
                report.synced += 1
            elif sync_result.skipped:
                report.skipped += 1
        except Exception as exc:
            report.errors.append(
                {
                    "workspaceId": workspace_id,
                    "userId": row[1],
                    "message": str(exc),
                }
            )

    return report


async def _apply_sync(
    db: AsyncSession,
    mode: SaasBillingSyncMode,
    tenant: _TenantRow,
    workspace_id: Optional[int],
    subscription: Optional[_SubscriptionRow],
) -> SaasBillingSyncResult:
    executed_at = datetime.now(timezone.utc).isoformat()
    previous_plan = _parse_saas_plan(tenant.plan)
    base = SaasBillingSyncResult(
        mode=mode,
        tenant_id=tenant.id,
        workspace_id=workspace_id,
        owner_user_id=tenant.user_id,
        previous_plan=previous_plan,
        target_plan=None,
        subscription_plan_id=None,
        subscription_status=None,
        synced=False,
        skipped=True,
        executed_at=executed_at,
    )

    if subscription is None:
        base.skip_reason = "NO_SUBSCRIPTION"
        return base

    base.subscription_plan_id = subscription.plan_id
    base.subscription_status = subscription.status

    if not should_sync_saas_tenant_plan(subscription.status):
        base.skip_reason = "STATUS_NOT_SYNCABLE"
        return base

    target_plan = map_billable_plan_to_saas_plan(subscription.plan_id)
    base.target_plan = target_plan

    if previous_plan == target_plan:
        base.skip_reason = "PLAN_UNCHANGED"
        return base

    if mode == "dry-run":
        base.synced = True
        base.skipped = False
        return base

    updated = await db.execute(
        UPDATE_TENANT_PLAN_SQL,
        {"plan": target_plan, "tenant_id": tenant.id},
    )
    if updated.fetchone() is None:
        base.skip_reason = "PLAN_UNCHANGED"
        return base

    base.synced = True
    base.skipped = False
    return base


def _skipped_result(
    mode: SaasBillingSyncMode,
    tenant_id: Optional[str],
    workspace_id: Optional[int],
    owner_user_id: Optional[str],
    skip_reason: SaasBillingSyncSkipReason,
) -> SaasBillingSyncResult:
    return SaasBillingSyncResult(
        mode=mode,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        owner_user_id=owner_user_id,
        previous_plan=None,
        target_plan=None,
        subscription_plan_id=None,
        subscription_status=None,
        synced=False,
        skipped=True,
        skip_reason=skip_reason,
        executed_at=datetime.now(timezone.utc).isoformat(),
    )


async def _load_tenant_by_workspace(db: AsyncSession, workspace_id: int) -> Optional[_TenantRow]:
    result = await db.execute(TENANT_BY_WORKSPACE_SQL, {"workspace_id": workspace_id})
    row = result.fetchone()
    if row is None:
        return None
    return _TenantRow(id=str(row[0]), user_id=str(row[1]), workspace_id=row[2], plan=str(row[3]))


async def _load_tenant_by_user(db: AsyncSession, user_id: str) -> Optional[_TenantRow]:
    result = await db.execute(TENANT_BY_USER_SQL, {"user_id": user_id})
    row = result.fetchone()
    if row is None:
        return None
    return _TenantRow(id=str(row[0]), user_id=str(row[1]), workspace_id=row[2], plan=str(row[3]))


async def _load_subscription_by_workspace(
    db: AsyncSession,
    workspace_id: int,
) -> Optional[_SubscriptionRow]:
    result = await db.execute(SUBSCRIPTION_BY_WORKSPACE_SQL, {"workspace_id": workspace_id})
    row = result.fetchone()
    if row is None:
        return None
    return _SubscriptionRow(plan_id=str(row[0]), status=str(row[1]))


async def _load_subscription_legacy_by_user(db: AsyncSession, user_id: str) -> Optional[_SubscriptionRow]:
    result = await db.execute(SUBSCRIPTION_LEGACY_BY_USER_SQL, {"user_id": user_id})
    row = result.fetchone()
    if row is None:
        return None
    return _SubscriptionRow(plan_id=str(row[0]), status=str(row[1]))

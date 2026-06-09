"""Unit tests for saas_billing_sync (parity with backend/saas TypeScript)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import pytest

from services.saas_billing_sync import (
    is_saas_plan_sync_status,
    map_billable_plan_to_saas_plan,
    normalize_billable_plan_id,
    run_batch,
    should_sync_saas_tenant_plan,
    sync_from_subscription_hint,
    sync_from_user_id,
    sync_from_workspace_id,
)


@dataclass
class _FakeTenant:
    id: str
    user_id: str
    workspace_id: Optional[int]
    plan: str


@dataclass
class _FakeSubscription:
    plan_id: str
    status: str
    workspace_id: Optional[int] = None


class _FakeResult:
    def __init__(self, rows: list[tuple[Any, ...]]):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)


class FakeBillingSyncDb:
    def __init__(
        self,
        *,
        tenant: Optional[_FakeTenant] = None,
        subscription: Optional[_FakeSubscription] = None,
        legacy_subscription: Optional[_FakeSubscription] = None,
        missing_tenant: bool = False,
    ):
        if missing_tenant:
            self.tenant: Optional[_FakeTenant] = None
        elif tenant is not None:
            self.tenant = tenant
        else:
            self.tenant = _FakeTenant(
                id="t-1",
                user_id="u-1",
                workspace_id=10,
                plan="starter",
            )
        self.subscription = subscription
        self.legacy_subscription = legacy_subscription
        self.update_calls: list[dict[str, Any]] = []

    async def execute(self, statement, params: Optional[dict[str, Any]] = None):
        sql = " ".join(str(statement).split()).lower()
        params = params or {}

        if "from saas_tenants" in sql and "where workspace_id = :workspace_id" in sql:
            ws = params.get("workspace_id")
            if self.tenant and self.tenant.workspace_id == ws:
                row = (
                    self.tenant.id,
                    self.tenant.user_id,
                    self.tenant.workspace_id,
                    self.tenant.plan,
                )
                return _FakeResult([row])
            return _FakeResult([])

        if "from saas_tenants" in sql and "where user_id = cast" in sql:
            uid = params.get("user_id")
            if self.tenant and self.tenant.user_id == uid:
                row = (
                    self.tenant.id,
                    self.tenant.user_id,
                    self.tenant.workspace_id,
                    self.tenant.plan,
                )
                return _FakeResult([row])
            return _FakeResult([])

        if "from subscriptions" in sql and "where workspace_id = :workspace_id" in sql:
            ws = params.get("workspace_id")
            sub = self.subscription
            if sub and (sub.workspace_id is None or sub.workspace_id == ws):
                return _FakeResult([(sub.plan_id, sub.status)])
            return _FakeResult([])

        if "from subscriptions" in sql and "where user_id::text = :user_id" in sql:
            if self.legacy_subscription:
                sub = self.legacy_subscription
                return _FakeResult([(sub.plan_id, sub.status)])
            return _FakeResult([])

        if sql.startswith("update saas_tenants"):
            self.update_calls.append(dict(params))
            if self.tenant:
                self.tenant.plan = str(params["plan"])
                return _FakeResult([(self.tenant.id, self.tenant.plan)])
            return _FakeResult([])

        if "from saas_tenants" in sql and "where workspace_id is not null" in sql:
            if self.tenant and self.tenant.workspace_id is not None:
                return _FakeResult(
                    [
                        (
                            self.tenant.id,
                            self.tenant.user_id,
                            self.tenant.workspace_id,
                            self.tenant.plan,
                        )
                    ]
                )
            return _FakeResult([])

        return _FakeResult([])


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("  PRO  ", "pro"),
        ("", ""),
    ],
)
def test_normalize_billable_plan_id(raw, expected):
    assert normalize_billable_plan_id(raw) == expected


def test_normalize_billable_plan_id_none():
    assert normalize_billable_plan_id(None) == ""


@pytest.mark.parametrize(
    ("billable", "saas_plan"),
    [
        ("starter", "starter"),
        ("pro", "pro"),
        ("enterprise", "enterprise"),
        ("agency", "enterprise"),
        ("partner", "starter"),
        ("AGENCY", "enterprise"),
        ("", "starter"),
        ("unknown", "starter"),
    ],
)
def test_map_billable_plan_to_saas_plan(billable, saas_plan):
    assert map_billable_plan_to_saas_plan(billable) == saas_plan


@pytest.mark.parametrize("status", ["active", "trialing", "past_due", "ACTIVE"])
def test_should_sync_allows_billable_statuses(status):
    assert should_sync_saas_tenant_plan(status) is True
    assert is_saas_plan_sync_status(status) is True


@pytest.mark.parametrize(
    "status",
    ["canceled", "pending", "suspended", "paused", "unpaid", "inactive"],
)
def test_should_sync_blocks_non_billable_statuses(status):
    assert should_sync_saas_tenant_plan(status) is False
    assert is_saas_plan_sync_status(status) is False


@pytest.mark.asyncio
async def test_syncs_pro_from_active_subscription_apply():
    db = FakeBillingSyncDb(
        subscription=_FakeSubscription(plan_id="pro", status="active", workspace_id=10),
    )
    result = await sync_from_workspace_id(db, 10, "apply")  # type: ignore[arg-type]
    assert result.synced is True
    assert result.skipped is False
    assert result.target_plan == "pro"
    assert db.tenant is not None
    assert db.tenant.plan == "pro"
    assert len(db.update_calls) == 1


@pytest.mark.asyncio
async def test_maps_agency_to_enterprise():
    db = FakeBillingSyncDb(
        subscription=_FakeSubscription(plan_id="agency", status="active", workspace_id=10),
    )
    result = await sync_from_workspace_id(db, 10, "apply")  # type: ignore[arg-type]
    assert result.target_plan == "enterprise"
    assert db.tenant is not None
    assert db.tenant.plan == "enterprise"


@pytest.mark.asyncio
async def test_skips_canceled_subscription():
    db = FakeBillingSyncDb(
        subscription=_FakeSubscription(plan_id="pro", status="canceled", workspace_id=10),
    )
    result = await sync_from_workspace_id(db, 10, "apply")  # type: ignore[arg-type]
    assert result.skipped is True
    assert result.skip_reason == "STATUS_NOT_SYNCABLE"
    assert db.update_calls == []
    assert db.tenant is not None
    assert db.tenant.plan == "starter"


@pytest.mark.asyncio
async def test_skips_when_no_tenant():
    db = FakeBillingSyncDb(missing_tenant=True)
    result = await sync_from_workspace_id(db, 99, "apply")  # type: ignore[arg-type]
    assert result.skip_reason == "NO_TENANT"
    assert db.update_calls == []


@pytest.mark.asyncio
async def test_skips_when_no_subscription():
    db = FakeBillingSyncDb(subscription=None)
    result = await sync_from_workspace_id(db, 10, "apply")  # type: ignore[arg-type]
    assert result.skip_reason == "NO_SUBSCRIPTION"
    assert db.update_calls == []


@pytest.mark.asyncio
async def test_skips_when_plan_unchanged():
    db = FakeBillingSyncDb(
        tenant=_FakeTenant(id="t-1", user_id="u-1", workspace_id=10, plan="pro"),
        subscription=_FakeSubscription(plan_id="pro", status="active", workspace_id=10),
    )
    result = await sync_from_workspace_id(db, 10, "apply")  # type: ignore[arg-type]
    assert result.skip_reason == "PLAN_UNCHANGED"
    assert db.update_calls == []


@pytest.mark.asyncio
async def test_dry_run_reports_synced_without_update():
    db = FakeBillingSyncDb(
        subscription=_FakeSubscription(plan_id="pro", status="active", workspace_id=10),
    )
    result = await sync_from_workspace_id(db, 10)
    assert result.mode == "dry-run"
    assert result.synced is True
    assert result.target_plan == "pro"
    assert db.update_calls == []
    assert db.tenant is not None
    assert db.tenant.plan == "starter"


@pytest.mark.asyncio
async def test_sync_from_subscription_hint_without_subscription_row():
    db = FakeBillingSyncDb(subscription=None)
    result = await sync_from_subscription_hint(
        db,  # type: ignore[arg-type]
        workspace_id=10,
        plan_id="pro",
        status="active",
        mode="apply",
    )
    assert result.synced is True
    assert result.target_plan == "pro"
    assert db.tenant is not None
    assert db.tenant.plan == "pro"


@pytest.mark.asyncio
async def test_sync_from_user_id_legacy_subscription_without_workspace():
    db = FakeBillingSyncDb(
        tenant=_FakeTenant(id="t-2", user_id="u-2", workspace_id=None, plan="starter"),
        legacy_subscription=_FakeSubscription(plan_id="pro", status="active"),
    )
    result = await sync_from_user_id(db, "u-2", "apply")  # type: ignore[arg-type]
    assert result.synced is True
    assert result.target_plan == "pro"


@pytest.mark.asyncio
async def test_run_batch_dry_run():
    db = FakeBillingSyncDb(
        subscription=_FakeSubscription(plan_id="pro", status="active", workspace_id=10),
    )
    report = await run_batch(db, "dry-run")  # type: ignore[arg-type]
    assert report.scanned == 1
    assert report.synced == 1
    assert report.skipped == 0
    assert db.update_calls == []


@pytest.mark.asyncio
async def test_run_batch_apply():
    db = FakeBillingSyncDb(
        subscription=_FakeSubscription(plan_id="pro", status="active", workspace_id=10),
    )
    report = await run_batch(db, "apply")  # type: ignore[arg-type]
    assert report.synced == 1
    assert db.tenant is not None
    assert db.tenant.plan == "pro"


@pytest.mark.asyncio
async def test_defaults_to_dry_run():
    db = FakeBillingSyncDb(
        subscription=_FakeSubscription(plan_id="pro", status="active", workspace_id=10),
    )
    result = await sync_from_workspace_id(db, 10)
    assert result.mode == "dry-run"
    assert db.update_calls == []

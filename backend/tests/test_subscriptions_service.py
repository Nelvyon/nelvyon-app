"""
Unit tests for SubscriptionsService (workspace-scoped filters, PR #1).
"""

from datetime import datetime, timezone

import pytest

from services.subscriptions import SubscriptionsService


@pytest.mark.asyncio
async def test_get_list_filters_by_workspace_id(db_session):
    """Rows are filterable by billing titular workspace_id."""
    svc = SubscriptionsService(db_session)
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    now = datetime.now(timezone.utc)
    base = {
        "user_id": uid,
        "workspace_id": 1,
        "plan_id": "starter",
        "billing_cycle": "monthly",
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await svc.create(dict(base), user_id=None)
    await svc.create({**base, "workspace_id": 2, "plan_id": "pro"}, user_id=None)

    only_ws1 = await svc.get_list(workspace_id=1, limit=20)
    assert only_ws1["total"] >= 1
    assert all(item.workspace_id == 1 for item in only_ws1["items"])


@pytest.mark.asyncio
async def test_get_by_id_with_workspace_id(db_session):
    svc = SubscriptionsService(db_session)
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    now = datetime.now(timezone.utc)
    created = await svc.create(
        {
            "user_id": uid,
            "workspace_id": 1,
            "plan_id": "starter",
            "billing_cycle": "monthly",
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        },
        user_id=None,
    )
    assert created is not None

    found = await svc.get_by_id(created.id, workspace_id=1)
    assert found is not None
    assert found.id == created.id

    wrong_ws = await svc.get_by_id(created.id, workspace_id=999)
    assert wrong_ws is None

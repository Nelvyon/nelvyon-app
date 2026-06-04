"""Enterprise workspace management — plans, limits, usage, billing."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import stripe
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.billing_catalog import resolve_stripe_price_id
from core.database import db_manager
from models.workspaces import Workspaces
from services.onboarding_service import OnboardingService
from services.payment import CheckoutSessionRequest, PaymentService
from services.subscriptions import SubscriptionsService
from services.workspaces import WorkspacesService

logger = logging.getLogger(__name__)

WORKSPACE_PLANS: dict[str, dict[str, Any]] = {
    "free": {
        "label": "Free",
        "price_eur_month": 0,
        "limits": {
            "agents": 2,
            "campaigns": 3,
            "contacts": 500,
            "storage_mb": 256,
        },
    },
    "starter": {
        "label": "Starter",
        "price_eur_month": 49,
        "limits": {
            "agents": 5,
            "campaigns": 25,
            "contacts": 2500,
            "storage_mb": 2048,
        },
    },
    "pro": {
        "label": "Pro",
        "price_eur_month": 149,
        "limits": {
            "agents": 15,
            "campaigns": 200,
            "contacts": 25000,
            "storage_mb": 10240,
        },
    },
    "agency": {
        "label": "Agency",
        "price_eur_month": 299,
        "limits": {
            "agents": 50,
            "campaigns": 500,
            "contacts": 100000,
            "storage_mb": 51200,
        },
    },
    "enterprise": {
        "label": "Enterprise",
        "price_eur_month": None,
        "limits": {
            "agents": None,
            "campaigns": None,
            "contacts": None,
            "storage_mb": None,
        },
    },
}

RESOURCE_KEYS = frozenset({"agents", "campaigns", "contacts", "storage_mb"})
_PERIOD = "monthly"


class WorkspaceService:
    """Plan limits, usage tracking, suspension, and Stripe upgrades."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    @staticmethod
    def get_plan_limits(plan: str) -> dict[str, Any]:
        key = (plan or "free").strip().lower()
        cfg = WORKSPACE_PLANS.get(key, WORKSPACE_PLANS["free"])
        return {
            "plan": key,
            "label": cfg["label"],
            "price_eur_month": cfg["price_eur_month"],
            "limits": dict(cfg["limits"]),
        }

    async def get_current_plan(self) -> str:
        return await self._workspace_plan()

    async def _workspace_plan(self) -> str:
        r = await self.session.execute(
            select(Workspaces.plan).where(Workspaces.id == self.workspace_id)
        )
        plan = r.scalar_one_or_none()
        return (plan or "free").strip().lower()

    async def _count_resource(self, resource: str) -> int:
        if resource == "contacts":
            from services.saas_contact_quota import count_contacts_for_workspace

            return await count_contacts_for_workspace(
                self.session, self.workspace_id, mode="hybrid"
            )

        queries = {
            "campaigns": """
                SELECT COUNT(*) AS c FROM campaigns WHERE workspace_id = :ws
            """,
            "agents": """
                SELECT COUNT(*) AS c FROM nelvyon_agents WHERE workspace_id = :ws
            """,
            "storage_mb": """
                SELECT COALESCE(
                    (SELECT count FROM workspace_usage
                     WHERE workspace_id = :ws AND resource = 'storage_mb' AND period = :period),
                    0
                ) AS c
            """,
        }
        q = queries.get(resource)
        if not q:
            return 0
        params: dict[str, Any] = {"ws": self.workspace_id}
        if resource == "storage_mb":
            params["period"] = _PERIOD
        try:
            r = await self.session.execute(text(q), params)
            row = r.fetchone()
            return int(row._mapping["c"]) if row else 0
        except Exception as exc:
            logger.debug("count resource %s failed: %s", resource, exc)
            return 0

    async def _sync_usage_row(self, resource: str, count: int) -> None:
        await OnboardingService.ensure_schema()
        await self.session.execute(
            text(
                """
                INSERT INTO workspace_usage (workspace_id, resource, count, period, updated_at)
                VALUES (:ws, :resource, :count, :period, NOW())
                ON CONFLICT (workspace_id, resource, period)
                DO UPDATE SET count = EXCLUDED.count, updated_at = NOW()
                """
            ),
            {
                "ws": self.workspace_id,
                "resource": resource,
                "count": count,
                "period": _PERIOD,
            },
        )

    async def check_plan_limit(self, resource: str) -> dict[str, Any]:
        """Return whether workspace is within plan limit for a resource."""
        resource = resource.strip().lower()
        if resource not in RESOURCE_KEYS:
            raise ValueError(f"Unknown resource: {resource}")

        plan = await self._workspace_plan()
        limits = self.get_plan_limits(plan)["limits"]
        limit = limits.get(resource)

        current = await self._count_resource(resource)
        if resource != "storage_mb":
            await self._sync_usage_row(resource, current)

        unlimited = limit is None
        allowed = unlimited or current < int(limit)
        return {
            "resource": resource,
            "plan": plan,
            "current": current,
            "limit": limit,
            "allowed": allowed,
            "remaining": None if unlimited else max(0, int(limit) - current),
        }

    async def get_usage_stats(self) -> dict[str, Any]:
        plan = await self._workspace_plan()
        plan_info = self.get_plan_limits(plan)
        usage: dict[str, Any] = {}
        for resource in RESOURCE_KEYS:
            check = await self.check_plan_limit(resource)
            usage[resource] = {
                "current": check["current"],
                "limit": check["limit"],
                "remaining": check["remaining"],
                "percent_used": (
                    round(check["current"] / check["limit"] * 100, 1)
                    if check["limit"]
                    else 0
                ),
            }
        await self.session.commit()
        return {
            "workspace_id": self.workspace_id,
            "plan": plan_info,
            "usage": usage,
            "period": _PERIOD,
        }

    async def upgrade_plan(
        self,
        new_plan: str,
        *,
        billing_cycle: str = "monthly",
        success_url: str,
        cancel_url: str,
        user_id: str,
        user_email: str,
    ) -> dict[str, Any]:
        plan_key = new_plan.strip().lower()
        if plan_key not in WORKSPACE_PLANS:
            raise ValueError(f"Invalid plan: {new_plan}")
        if plan_key == "free":
            ws_svc = WorkspacesService(self.session)
            await ws_svc.update(self.workspace_id, {"plan": "free"})
            await self.session.commit()
            return {"workspace_id": self.workspace_id, "plan": "free", "checkout": None}

        if plan_key == "enterprise":
            ws_svc = WorkspacesService(self.session)
            await ws_svc.update(
                self.workspace_id,
                {"plan": "enterprise", "status": "active"},
            )
            await self.session.commit()
            return {
                "workspace_id": self.workspace_id,
                "plan": "enterprise",
                "checkout": None,
                "note": "Enterprise plan — contact sales for custom billing",
            }

        stripe_plan = plan_key
        if plan_key == "agency":
            stripe_plan = os.environ.get("STRIPE_AGENCY_PLAN_ID", "agency")
            if stripe_plan not in ("starter", "pro", "enterprise", "partner", "agency"):
                stripe_plan = "pro"

        try:
            price_id = resolve_stripe_price_id(
                stripe_plan if stripe_plan in ("starter", "pro", "enterprise", "partner") else "pro",
                billing_cycle,
            )
        except ValueError as exc:
            ws_svc = WorkspacesService(self.session)
            await ws_svc.update(self.workspace_id, {"plan": plan_key})
            await self.session.commit()
            return {
                "workspace_id": self.workspace_id,
                "plan": plan_key,
                "checkout": None,
                "warning": str(exc),
            }

        customer_id = await self._stripe_customer(user_email)
        checkout = await PaymentService().create_checkout_session(
            CheckoutSessionRequest(
                stripe_price_id=price_id,
                mode="subscription",
                ui_mode="hosted",
                success_url=success_url,
                cancel_url=cancel_url,
                customer=customer_id,
                metadata={
                    "workspace_id": str(self.workspace_id),
                    "plan_id": plan_key,
                    "billing_cycle": billing_cycle,
                    "upgraded_by": user_id,
                },
            )
        )

        sub_svc = SubscriptionsService(self.session)
        await sub_svc.create(
            {
                "workspace_id": self.workspace_id,
                "plan_id": plan_key,
                "billing_cycle": billing_cycle,
                "status": "pending",
                "stripe_session_id": checkout.session_id,
                "stripe_customer_id": customer_id,
            },
            user_id=user_id,
        )
        await self.session.commit()

        return {
            "workspace_id": self.workspace_id,
            "plan": plan_key,
            "checkout": {
                "session_id": checkout.session_id,
                "url": checkout.url,
            },
        }

    async def get_billing_history(self) -> dict[str, Any]:
        sub_svc = SubscriptionsService(self.session)
        subs = await sub_svc.get_list(workspace_id=self.workspace_id, limit=50, sort="-id")
        items = []
        for row in subs["items"]:
            items.append(
                {
                    "id": row.id,
                    "plan_id": row.plan_id,
                    "status": row.status,
                    "amount_paid": row.amount_paid,
                    "currency": row.currency,
                    "billing_cycle": row.billing_cycle,
                    "started_at": row.started_at.isoformat() if row.started_at else None,
                    "current_period_end": (
                        row.current_period_end.isoformat() if row.current_period_end else None
                    ),
                    "stripe_subscription_id": row.stripe_subscription_id,
                }
            )

        stripe_invoices: list[dict[str, Any]] = []
        customer_id = None
        for row in subs["items"]:
            if row.stripe_customer_id:
                customer_id = row.stripe_customer_id
                break

        if customer_id and os.environ.get("STRIPE_SECRET_KEY"):
            try:
                await PaymentService._auto_reload_stripe_config()
                inv = await stripe.Invoice.list_async(customer=customer_id, limit=24)
                for inv_row in inv.data:
                    stripe_invoices.append(
                        {
                            "id": inv_row.id,
                            "amount_paid": (inv_row.amount_paid or 0) / 100.0,
                            "currency": inv_row.currency,
                            "status": inv_row.status,
                            "created": datetime.fromtimestamp(
                                inv_row.created, tz=timezone.utc
                            ).isoformat(),
                            "invoice_pdf": inv_row.invoice_pdf,
                        }
                    )
            except Exception as exc:
                logger.warning("Stripe invoice list failed: %s", exc)

        return {
            "workspace_id": self.workspace_id,
            "subscriptions": items,
            "stripe_invoices": stripe_invoices,
        }

    async def suspend_workspace(self, reason: str) -> dict[str, Any]:
        ws_svc = WorkspacesService(self.session)
        ws = await ws_svc.update(
            self.workspace_id,
            {
                "status": "suspended",
                "features_json": json.dumps(
                    {"suspended_reason": reason, "suspended_at": datetime.now(timezone.utc).isoformat()}
                ),
            },
        )
        await self.session.commit()
        if not ws:
            raise ValueError("Workspace not found")
        return {"workspace_id": self.workspace_id, "status": "suspended", "reason": reason}

    async def restore_workspace(self) -> dict[str, Any]:
        ws_svc = WorkspacesService(self.session)
        ws = await ws_svc.update(self.workspace_id, {"status": "active"})
        await self.session.commit()
        if not ws:
            raise ValueError("Workspace not found")
        return {"workspace_id": self.workspace_id, "status": "active"}

    async def _stripe_customer(self, user_email: str) -> str:
        sub_svc = SubscriptionsService(self.session)
        subs = await sub_svc.get_list(workspace_id=self.workspace_id, limit=20)
        for row in subs["items"]:
            if row.stripe_customer_id:
                return str(row.stripe_customer_id)
        await PaymentService._auto_reload_stripe_config()
        cust = await stripe.Customer.create_async(
            email=user_email or None,
            metadata={"workspace_id": str(self.workspace_id)},
        )
        return str(cust.id)


def get_workspace_service(session: AsyncSession, workspace_id: int) -> WorkspaceService:
    return WorkspaceService(session, workspace_id)

"""
ADVISOR EMPRESARIAL NELVYON v1 — Tier and limits derived from workspace commercial plan.

Maps billing plan_id (starter / pro / enterprise / …) to product tiers basic / growth / executive.
Server-side enforcement for future advisor sessions applies this module only — do not expose
internal methodology payloads to clients.
"""
from __future__ import annotations

from typing import List, Literal, TypedDict


AdvisorTier = Literal["basic", "growth", "executive"]
OutputProfile = Literal["focus", "growth_plan", "executive_review"]


class AdvisorEntitlementResolved(TypedDict):
    tier: AdvisorTier
    sessions_per_month: int
    modules: List[str]
    output_profile: OutputProfile


# Module keys are stable identifiers; UI translates to customer-facing labels.
_BASIC_MODULES = ["priorities_clarity", "customer_problem", "next_milestone"]
_GROWTH_EXTRA = ["traction_signals", "offers_packaging", "channels_focus"]
_EXEC_EXTRA = ["org_scaling", "unit_economics", "risk_register"]


def resolve_advisor_entitlements(plan_id: str | None) -> AdvisorEntitlementResolved:
    normalized = (plan_id or "starter").lower()
    # Partner legacy: advisory at basic tier only (narrow surface).
    if normalized == "partner":
        return {
            "tier": "basic",
            "sessions_per_month": _tier_sessions("basic"),
            "modules": list(_BASIC_MODULES),
            "output_profile": "focus",
        }
    if normalized in {"enterprise"}:
        return {
            "tier": "executive",
            "sessions_per_month": _tier_sessions("executive"),
            "modules": list(_BASIC_MODULES) + list(_GROWTH_EXTRA) + list(_EXEC_EXTRA),
            "output_profile": "executive_review",
        }
    if normalized in {"pro"}:
        return {
            "tier": "growth",
            "sessions_per_month": _tier_sessions("growth"),
            "modules": list(_BASIC_MODULES) + list(_GROWTH_EXTRA),
            "output_profile": "growth_plan",
        }
    # starter and unknown commercial ids → baseline entry tier
    return {
        "tier": "basic",
        "sessions_per_month": _tier_sessions("basic"),
        "modules": list(_BASIC_MODULES),
        "output_profile": "focus",
    }


def _tier_sessions(tier: AdvisorTier) -> int:
    if tier == "executive":
        return 80
    if tier == "growth":
        return 24
    return 6

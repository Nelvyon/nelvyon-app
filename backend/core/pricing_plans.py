"""
PRICING-PLANS-1 FASE 1
Single source of truth for base SaaS plans and soft limits.
"""

from __future__ import annotations

from typing import Dict, Optional

PlanLimitValue = Optional[int]


PRICING_PLANS: Dict[str, dict] = {
    "starter": {
        "label": "Starter",
        "modules": {
            "contacts": True,
            "helpdesk": True,
            "campaigns": True,
            "workflows": True,
            "analytics": False,
            "integrations": False,
        },
        "limits": {
            "contacts": 2500,
            "active_campaigns": 10,
            "active_workflows": 10,
            "workspace_users": 3,
        },
    },
    "pro": {
        "label": "Pro",
        "modules": {
            "contacts": True,
            "helpdesk": True,
            "campaigns": True,
            "workflows": True,
            "analytics": True,
            "integrations": True,
        },
        "limits": {
            "contacts": 25000,
            "active_campaigns": 200,
            "active_workflows": 100,
            "workspace_users": 20,
        },
    },
    "enterprise": {
        "label": "Enterprise",
        "modules": {
            "contacts": True,
            "helpdesk": True,
            "campaigns": True,
            "workflows": True,
            "analytics": True,
            "integrations": True,
        },
        "limits": {
            "contacts": None,
            "active_campaigns": None,
            "active_workflows": None,
            "workspace_users": None,
        },
    },
    # Legacy/support plan kept for compatibility (not part of 3 core public plans).
    "partner": {
        "label": "Partner",
        "modules": {
            "contacts": False,
            "helpdesk": False,
            "campaigns": False,
            "workflows": False,
            "analytics": False,
            "integrations": False,
        },
        "limits": {
            "contacts": None,
            "active_campaigns": None,
            "active_workflows": None,
            "workspace_users": 1,
        },
    },
    "agency_partner": {
        "label": "Agency Partner",
        "modules": {
            "contacts": True,
            "helpdesk": True,
            "campaigns": True,
            "workflows": True,
            "analytics": True,
            "integrations": True,
        },
        "limits": {
            "contacts": None,
            "active_campaigns": None,
            "active_workflows": None,
            "workspace_users": 50,
            "partner_client_slots": 50,
        },
    },
}


def get_plan_definition(plan_id: str) -> dict:
    normalized = (plan_id or "starter").lower()
    return PRICING_PLANS.get(normalized, PRICING_PLANS["starter"])


def get_plan_label(plan_id: str) -> str:
    return str(get_plan_definition(plan_id).get("label") or "Starter")


def get_limit(plan_id: str, key: str) -> PlanLimitValue:
    limits = get_plan_definition(plan_id).get("limits") or {}
    return limits.get(key)

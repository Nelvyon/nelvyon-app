"""Agency Partner wholesale catalog — mirrors apps/web wholesaleCatalog.ts (P1)."""
from __future__ import annotations

from typing import Any, Dict, List

AGENCY_PARTNER_PLAN_ID = "agency_partner"

AGENCY_PARTNER_SUBSCRIPTION: Dict[str, Any] = {
    "plan_id": AGENCY_PARTNER_PLAN_ID,
    "label": "Agency Partner",
    "wholesale_eur": 197.0,
    "included_client_slots": 10,
    "extra_client_slot_wholesale_eur": 29.0,
}

WHOLESALE_CLIENT_PLANS: List[Dict[str, Any]] = [
    {"id": "starter", "label": "Starter cliente", "retail_eur": 79.0, "wholesale_eur": 39.0},
    {"id": "pro", "label": "Pro cliente", "retail_eur": 249.0, "wholesale_eur": 129.0},
]

WHOLESALE_GROWTH_PACKS: List[Dict[str, Any]] = [
    {
        "id": "local-business-growth",
        "label": "Local Growth Pack",
        "wholesale_eur": 149.0,
        "suggested_retail_eur": 497.0,
    },
    {
        "id": "ecommerce-growth",
        "label": "Ecommerce Growth Pack",
        "wholesale_eur": 199.0,
        "suggested_retail_eur": 697.0,
    },
    {
        "id": "saas-b2b-growth",
        "label": "SaaS B2B Growth Pack",
        "wholesale_eur": 249.0,
        "suggested_retail_eur": 897.0,
    },
]


def _with_margins(items: List[Dict[str, Any]], retail_key: str, wholesale_key: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for item in items:
        row = dict(item)
        row["margin_eur"] = round(float(row[retail_key]) - float(row[wholesale_key]), 2)
        out.append(row)
    return out


def build_wholesale_payload() -> Dict[str, Any]:
    return {
        "subscription": AGENCY_PARTNER_SUBSCRIPTION,
        "client_plans": _with_margins(WHOLESALE_CLIENT_PLANS, "retail_eur", "wholesale_eur"),
        "growth_packs": _with_margins(WHOLESALE_GROWTH_PACKS, "suggested_retail_eur", "wholesale_eur"),
    }

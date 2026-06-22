"""
Single source of truth for billing: Stripe Price IDs (env) + display amounts for GET /payment/plans.

Nelvyon Web checkout (@nelvyon/web) uses:
  STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_AGENCY

This Python API uses the same STRIPE_PRICE_ID_* for monthly cycles (no legacy fallback).
Non-monthly cycles use STRIPE_PRICE_<PLAN>_<CYCLE> if configured.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from core.pricing_plans import PRICING_PLANS
from core.agency_wholesale import build_wholesale_payload

# Canonical monthly Price ID env vars — must match backend/billing/planConfig.ts (Web service).
STRIPE_PRICE_ID_ENV_MONTHLY: Dict[str, str] = {
    "starter": "STRIPE_PRICE_ID_STARTER",
    "pro": "STRIPE_PRICE_ID_PRO",
    "enterprise": "STRIPE_PRICE_ID_AGENCY",
    "agency": "STRIPE_PRICE_ID_AGENCY",          # TS/webhook canonical name for the same tier
    "agency_partner": "STRIPE_PRICE_ID_AGENCY_PARTNER",
}

# Display-only EUR / month (UI); Stripe collects real amounts via Price IDs.
# Must match backend/billing/planConfig.ts PLAN_PRICES.
DISPLAY_BASE_PRICE_EUR: Dict[str, float] = {
    "starter": 97.0,
    "pro": 297.0,
    "enterprise": 797.0,
    "agency": 797.0,              # alias for enterprise (TS/webhook canonical name)
    "partner": 50.0,
    "agency_partner": 297.0,
}

# Must match PRICING_PLANS (single source for plan ids / gating).
VALID_PLAN_IDS = frozenset(PRICING_PLANS.keys())
_missing_display = VALID_PLAN_IDS - frozenset(DISPLAY_BASE_PRICE_EUR.keys())
if _missing_display:
    raise RuntimeError(f"billing_catalog: DISPLAY_BASE_PRICE_EUR missing plans: {_missing_display}")

BILLING_MONTHS: Dict[str, int] = {
    "monthly": 1,
    "quarterly": 3,
    "semiannual": 6,
    "annual": 12,
    "biennial": 24,
}

BILLING_DISCOUNTS: Dict[str, float] = {
    "monthly": 0.0,
    "quarterly": 10.0,
    "semiannual": 15.0,
    "annual": 25.0,
    "biennial": 35.0,
}

VALID_BILLING_CYCLES = frozenset(BILLING_MONTHS.keys())


def _price_env_key(plan_id: str, billing_cycle: str) -> str:
    return f"STRIPE_PRICE_{plan_id.upper()}_{billing_cycle.upper()}"


def resolve_stripe_price_id(plan_id: str, billing_cycle: str) -> str:
    """Return Stripe Price ID for plan + cycle. Raises ValueError if missing or unset."""
    if plan_id not in VALID_PLAN_IDS:
        raise ValueError(f"Plan no configurado: {plan_id}")
    if billing_cycle not in VALID_BILLING_CYCLES:
        raise ValueError(f"Ciclo inválido: {billing_cycle}")

    if billing_cycle == "monthly":
        id_env = STRIPE_PRICE_ID_ENV_MONTHLY.get(plan_id)
        if id_env:
            val = os.environ.get(id_env, "").strip()
            if val:
                return val
            raise ValueError(
                f"Falta variable de entorno {id_env} con el Price ID Live de Stripe para {plan_id}/monthly"
            )

    key = _price_env_key(plan_id, billing_cycle)
    val = os.environ.get(key, "").strip()
    if not val:
        raise ValueError(
            f"Falta variable de entorno {key} con el Price ID de Stripe para {plan_id}/{billing_cycle}"
        )
    return val


def estimated_display_total_eur(plan_id: str, billing_cycle: str, promo_code: Optional[str] = None) -> float:
    """Rough total for API response / UI; not the Stripe charge amount for subscriptions."""
    base = DISPLAY_BASE_PRICE_EUR.get(plan_id, 0.0)
    months = BILLING_MONTHS.get(billing_cycle, 1)
    discount = BILLING_DISCOUNTS.get(billing_cycle, 0.0)
    monthly_discounted = base * (1.0 - discount / 100.0)
    total = round(monthly_discounted * months, 2)
    if promo_code and len(promo_code) > 3:
        total = round(total * 0.95, 2)
    return total


def build_plans_payload() -> Dict[str, Any]:
    """Same shape as legacy GET /payment/plans: { plans: [ ... ] }."""
    plans: List[Dict[str, Any]] = []
    for plan_id, base_price in DISPLAY_BASE_PRICE_EUR.items():
        cycles: List[Dict[str, Any]] = []
        for cycle, months in BILLING_MONTHS.items():
            discount = BILLING_DISCOUNTS[cycle]
            monthly = round(base_price * (1 - discount / 100), 2)
            total = round(monthly * months, 2)
            savings = round(base_price * months - total, 2)
            cycles.append(
                {
                    "cycle": cycle,
                    "months": months,
                    "discount_percent": discount,
                    "monthly_price": monthly,
                    "total_price": total,
                    "savings": savings,
                }
            )
        plans.append(
            {
                "plan_id": plan_id,
                "name": plan_id.capitalize(),
                "base_price": base_price,
                "currency": "eur",
                "cycles": cycles,
            }
        )
    return {"plans": plans, "wholesale": build_wholesale_payload()}

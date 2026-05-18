"""Validación de `plan_id` frente a `core.pricing_plans` (fuente única comercial)."""
from __future__ import annotations

from typing import Optional

from core.pricing_plans import PRICING_PLANS


def normalize_plan_id(plan_id: Optional[str]) -> str:
    return str(plan_id or "").strip().lower()


def is_known_commercial_plan(plan_id: Optional[str]) -> bool:
    return normalize_plan_id(plan_id) in PRICING_PLANS


def assert_known_plan_or_raise(plan_id: Optional[str]) -> str:
    """Devuelve plan normalizado o lanza ValueError para mapear a HTTP 400."""
    pid = normalize_plan_id(plan_id)
    if not pid or pid not in PRICING_PLANS:
        raise ValueError(f"plan_id no válido o no definido en pricing_plans: {plan_id!r}")
    return pid

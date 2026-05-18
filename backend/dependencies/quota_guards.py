"""
NELVYON-REMEDIATION-1 FASE 3 — capa fina: un solo punto de import de cuotas/planes desde routers.

Delega en `services.plan_quota` (lógica real). Evita duplicar imports largos y documenta el patrón.
"""
from __future__ import annotations

from typing import Any, Iterable

from services.plan_quota import (
    enforce_campaign_headroom,
    enforce_campaign_reopen_transition,
    enforce_contact_headroom,
    enforce_contacts_plan_module_for_crm_writes,
    enforce_helpdesk_module_allowed,
    enforce_workflow_active_headroom,
    enforce_workflow_activation_transition,
    enforce_workflow_engine_rules_write_allowed,
    enforce_workflow_engine_trigger_execute_allowed,
)

__all__ = [
    "enforce_contact_headroom",
    "enforce_campaign_headroom",
    "enforce_workflow_active_headroom",
    "enforce_workflow_activation_transition",
    "enforce_campaign_reopen_transition",
    "enforce_contacts_plan_module_for_crm_writes",
    "enforce_helpdesk_module_allowed",
    "enforce_workflow_engine_rules_write_allowed",
    "enforce_workflow_engine_trigger_execute_allowed",
    "count_workflow_batch_active_additions",
]


def count_workflow_batch_active_additions(items: Iterable[Any]) -> int:
    """
    Batch create: filas que acabarán como activas a efectos de cupo.
    None / vacío se trata como active (misma suposición conservadora que un create único típico en UI).
    """
    n = 0
    for it in items:
        raw = getattr(it, "status", None)
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            eff = "active"
        else:
            eff = str(raw).strip().lower()
        if eff == "active":
            n += 1
    return n

"""
Contrato mínimo helpdesk: status/priority canónicos y alias de entrada.

Fuente única para entidades `helpdesk_tickets`, SLA/lifecycle y (en D1-5) UI.
"""
from __future__ import annotations

from typing import Optional, Tuple

# Estados persistidos / transiciones (alineado con VALID_TICKET_TRANSITIONS en SLA).
CANONICAL_TICKET_STATUSES: Tuple[str, ...] = (
    "open",
    "in_progress",
    "waiting",
    "resolved",
    "closed",
)

# Alias de lectura/legacy → canónico (p. ej. dashboard analytics usa "pending").
TICKET_STATUS_ALIASES: dict[str, str] = {
    "pending": "open",
}

# Prioridades persistidas (alineado con SLA_TARGETS en helpdesk_notifications).
CANONICAL_TICKET_PRIORITIES: Tuple[str, ...] = ("low", "medium", "high", "urgent")

# UI legacy / marketing → SLA canónico
TICKET_PRIORITY_ALIASES: dict[str, str] = {
    "critical": "urgent",
}


def normalize_ticket_status(raw: Optional[str]) -> str:
    if raw is None or not str(raw).strip():
        return "open"
    s = str(raw).strip().lower()
    s = TICKET_STATUS_ALIASES.get(s, s)
    if s not in CANONICAL_TICKET_STATUSES:
        allowed = ", ".join(CANONICAL_TICKET_STATUSES)
        raise ValueError(f"Invalid ticket status {raw!r}. Use one of: {allowed}")
    return s


def normalize_ticket_priority(raw: Optional[str]) -> str:
    if raw is None or not str(raw).strip():
        return "medium"
    s = str(raw).strip().lower()
    s = TICKET_PRIORITY_ALIASES.get(s, s)
    if s not in CANONICAL_TICKET_PRIORITIES:
        allowed = ", ".join(CANONICAL_TICKET_PRIORITIES)
        raise ValueError(f"Invalid ticket priority {raw!r}. Use one of: {allowed}")
    return s

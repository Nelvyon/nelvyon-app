"""Fase 1B — guardrails para escrituras CRM legacy (Python)."""

from __future__ import annotations

import logging
import warnings

logger = logging.getLogger(__name__)

_WARNED: set[str] = set()

SAAS_CRM_OFFICIAL = "saas_contacts / SaasCrmService"


def warn_legacy_crm_write(caller: str, table: str) -> None:
    key = f"{caller}:{table}"
    if key in _WARNED:
        return
    _WARNED.add(key)
    msg = (
        f"[NELVYON CRM LEGACY] {caller} escribe en '{table}'. "
        f"Use {SAAS_CRM_OFFICIAL} para desarrollo nuevo. "
        "Ver docs/PHASE_1B_CRM_ETL.md"
    )
    warnings.warn(msg, stacklevel=3, category=DeprecationWarning)
    logger.debug(msg)

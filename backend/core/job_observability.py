"""
Fase 6 — observabilidad mínima de jobs (contadores + log estructurado).

Los contadores son proceso-local (suficiente para tests y visibilidad básica en runtime);
un exporter externo puede suscribirse ampliando ``record_job_outcome`` más adelante.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Dict, Optional

from core.structured_log import log_structured

logger = logging.getLogger("nelvyon.jobs")

_COUNTERS: defaultdict[str, int] = defaultdict(int)


def record_job_outcome(
    *,
    job_type: str,
    terminal: str,
    job_id: str,
    error: Optional[str] = None,
) -> None:
    """terminal: completed | failed | no_handler"""
    key = f"{job_type}|{terminal}"
    _COUNTERS[key] += 1
    log_structured(
        logger,
        logging.INFO,
        "nelvyon.job.outcome",
        terminal,
        job_type=job_type,
        job_id=job_id,
        terminal_status=terminal,
        error_preview=(error or "")[:500] if error else None,
    )


def snapshot_job_counters() -> Dict[str, int]:
    return dict(_COUNTERS)


def reset_job_counters_for_tests() -> None:
    _COUNTERS.clear()

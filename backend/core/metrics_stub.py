"""
OBS-1 FASE 1 — Enganche central para métricas (stub sin dependencias externas).

Las implementaciones son no-op hasta OBS-1 FASE 2; las firmas quedan fijas
para sustituir el cuerpo por un exporter (Prometheus, Datadog, etc.) sin
tocar los call sites.
"""
from __future__ import annotations

from typing import Mapping, Optional


def record_counter(name: str, value: int = 1, tags: Optional[Mapping[str, str]] = None) -> None:
    """Incrementar (o registrar) un contador; hoy no hace efecto lateral."""
    return


def observe_latency(name: str, seconds: float, tags: Optional[Mapping[str, str]] = None) -> None:
    """Histograma / timing; hoy no hace efecto lateral."""
    return

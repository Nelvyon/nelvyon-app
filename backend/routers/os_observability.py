from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.http_observability import snapshot_http_events_last_24h
from core.job_queue import job_queue
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace
from models.automation_jobs import Automation_jobs
from schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/os/observability", tags=["os_observability"])


class HealthSignalsResponse(BaseModel):
    window: str
    five_xx_rate: float
    latency_p95_ms: int
    failed_jobs: int
    queue_backlog: int
    status: str


class IncidentItem(BaseModel):
    kind: str
    key: str
    failures: int
    last_error: str
    correlation_id: str | None = None
    cta_runbook: str = "/backend/ops/runbooks/phase9_observability_jobs.md"


class AlertsRule(BaseModel):
    key: str
    label: str
    current: float
    threshold_warn: float
    threshold_crit: float
    unit: str
    status: str
    would_fire: bool


class AlertsSimulationResponse(BaseModel):
    window: str
    note: str
    rules: list[AlertsRule]


def _to_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    t = raw.strip()
    if not t:
        return None
    try:
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        d = datetime.fromisoformat(t)
        if d.tzinfo is None:
            return d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception:
        return None


def _status_from_signals(*, five_xx_rate: float, latency_p95_ms: int, failed_jobs: int, queue_backlog: int) -> str:
    if five_xx_rate >= 0.1 or latency_p95_ms >= 1500 or failed_jobs >= 5 or queue_backlog >= 20:
        return "crit"
    if five_xx_rate >= 0.03 or latency_p95_ms >= 800 or failed_jobs >= 1 or queue_backlog >= 8:
        return "warn"
    return "ok"


@router.get("", response_model=HealthSignalsResponse)
async def get_observability_health(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)
    events = [e for e in snapshot_http_events_last_24h() if e.at >= cutoff and e.path.startswith("/api/")]
    total_http = len(events)
    failed_http = len([e for e in events if e.status >= 500])
    five_xx_rate = (failed_http / total_http) if total_http else 0.0
    durations = sorted([int(round(e.duration_seconds * 1000.0)) for e in events])
    if durations:
        idx = max(0, min(len(durations) - 1, int(0.95 * (len(durations) - 1))))
        p95_ms = durations[idx]
    else:
        p95_ms = 0

    q = select(Automation_jobs).where(
        Automation_jobs.workspace_id == ws_ctx.workspace_id,
        Automation_jobs.user_id == str(ws_ctx.user_id),
        Automation_jobs.status == "failed",
    )
    rows = (await db.execute(q)).scalars().all()
    failed_24h = 0
    for r in rows:
        created_dt = _to_dt(r.created_at)
        if created_dt and created_dt >= cutoff:
            failed_24h += 1

    qstats = job_queue.get_stats()
    backlog = int(qstats.get("queue_size") or max(0, int(qstats.get("total_enqueued", 0)) - int(qstats.get("total_completed", 0)) - int(qstats.get("total_failed", 0))))

    return HealthSignalsResponse(
        window="24h",
        five_xx_rate=round(five_xx_rate, 4),
        latency_p95_ms=p95_ms,
        failed_jobs=failed_24h,
        queue_backlog=backlog,
        status=_status_from_signals(
            five_xx_rate=five_xx_rate,
            latency_p95_ms=p95_ms,
            failed_jobs=failed_24h,
            queue_backlog=backlog,
        ),
    )


@router.get("/incidents", response_model=list[IncidentItem])
async def get_observability_incidents(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    out: list[IncidentItem] = []

    endpoint_groups: dict[str, dict[str, Any]] = {}
    for e in snapshot_http_events_last_24h():
        if e.at < cutoff or e.status < 500 or not e.path.startswith("/api/"):
            continue
        key = f"{e.method} {e.path}"
        g = endpoint_groups.setdefault(
            key,
            {"failures": 0, "last_error": "", "last_at": datetime.min.replace(tzinfo=timezone.utc), "request_id": None},
        )
        g["failures"] += 1
        if e.at >= g["last_at"]:
            g["last_at"] = e.at
            g["last_error"] = f"HTTP {e.status} within 24h window."
            g["request_id"] = e.request_id

    top_endpoints = sorted(endpoint_groups.items(), key=lambda kv: kv[1]["failures"], reverse=True)[:5]
    for key, g in top_endpoints:
        out.append(
            IncidentItem(
                kind="endpoint",
                key=key,
                failures=int(g["failures"]),
                last_error=g["last_error"] or "Server-side failure observed.",
                correlation_id=g["request_id"],
            )
        )

    q = select(Automation_jobs).where(
        Automation_jobs.workspace_id == ws_ctx.workspace_id,
        Automation_jobs.user_id == str(ws_ctx.user_id),
        Automation_jobs.status == "failed",
    )
    failed_jobs = (await db.execute(q)).scalars().all()
    job_groups: dict[str, dict[str, Any]] = {}
    for j in failed_jobs:
        created_dt = _to_dt(j.created_at)
        if not created_dt or created_dt < cutoff:
            continue
        key = j.job_type or "unknown"
        g = job_groups.setdefault(key, {"failures": 0, "last_at": datetime.min.replace(tzinfo=timezone.utc), "last_error": "", "job_id": None})
        g["failures"] += 1
        if created_dt >= g["last_at"]:
            g["last_at"] = created_dt
            g["last_error"] = (j.error_message or "Automation job failed without explicit error message.")[:280]
            g["job_id"] = j.id

    top_jobs = sorted(job_groups.items(), key=lambda kv: kv[1]["failures"], reverse=True)[:5]
    for key, g in top_jobs:
        out.append(
            IncidentItem(
                kind="job_type",
                key=key,
                failures=int(g["failures"]),
                last_error=g["last_error"],
                correlation_id=f"job:{g['job_id']}" if g["job_id"] else None,
            )
        )

    return out


@router.get("/alerts", response_model=AlertsSimulationResponse)
async def get_alert_rules_simulation(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    summary = await get_observability_health(ws_ctx=ws_ctx, _user=_user, db=db)
    rules = [
        AlertsRule(
            key="http_5xx_ratio",
            label="HTTP 5xx ratio",
            current=summary.five_xx_rate,
            threshold_warn=0.03,
            threshold_crit=0.1,
            unit="ratio",
            status="crit" if summary.five_xx_rate >= 0.1 else ("warn" if summary.five_xx_rate >= 0.03 else "ok"),
            would_fire=summary.five_xx_rate >= 0.1,
        ),
        AlertsRule(
            key="job_failure_count_24h",
            label="Failed jobs in last 24h",
            current=float(summary.failed_jobs),
            threshold_warn=1,
            threshold_crit=5,
            unit="count",
            status="crit" if summary.failed_jobs >= 5 else ("warn" if summary.failed_jobs >= 1 else "ok"),
            would_fire=summary.failed_jobs >= 5,
        ),
        AlertsRule(
            key="queue_backlog",
            label="Queue backlog",
            current=float(summary.queue_backlog),
            threshold_warn=8,
            threshold_crit=20,
            unit="count",
            status="crit" if summary.queue_backlog >= 20 else ("warn" if summary.queue_backlog >= 8 else "ok"),
            would_fire=summary.queue_backlog >= 20,
        ),
    ]
    return AlertsSimulationResponse(
        window="24h",
        note="Alert guardrails simulation only: no external pager/on-call integration in this version.",
        rules=rules,
    )

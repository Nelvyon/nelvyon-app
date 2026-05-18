from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.http_observability import snapshot_http_events_last_24h
from core.job_queue import job_queue
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace
from schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/os/global", tags=["os_global"])


class WorkspaceRiskItem(BaseModel):
    workspace_id: int
    workspace_name: str
    status: str
    failed_jobs_24h: int
    reason: str
    updated_at: str
    cta: str


class CrossWorkspaceSnapshotResponse(BaseModel):
    window: str
    five_xx_rate: float
    latency_p95_ms: int
    failed_jobs_24h: int
    queue_backlog: int
    status: str
    workspaces_seen: int
    top_risky_workspaces: list[WorkspaceRiskItem]


class ChangeJournalItem(BaseModel):
    event_type: str
    workspace_id: int
    workspace_name: str
    actor_user_id: str
    actor_email: str | None = None
    from_value: str
    to_value: str
    note: str | None = None
    created_at: str


def _status_from_numbers(five_xx_rate: float, latency_p95_ms: int, failed_jobs: int, queue_backlog: int) -> str:
    if five_xx_rate >= 0.1 or latency_p95_ms >= 1500 or failed_jobs >= 10 or queue_backlog >= 20:
        return "crit"
    if five_xx_rate >= 0.03 or latency_p95_ms >= 800 or failed_jobs >= 3 or queue_backlog >= 8:
        return "warn"
    return "ok"


def _allowed_workspace_ids(rows: list[dict[str, Any]], current_ws: int) -> list[int]:
    ids = {int(current_ws)}
    for r in rows:
        ws = r.get("workspace_id")
        if ws is not None:
            ids.add(int(ws))
    return sorted(ids)


@router.get("", response_model=CrossWorkspaceSnapshotResponse)
async def get_os_global_snapshot(
    ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)

    memberships = (
        await db.execute(
            text("SELECT workspace_id FROM workspace_members WHERE user_id = :uid AND status = 'active'"),
            {"uid": str(ctx.user_id)},
        )
    ).mappings().all()
    ws_ids = _allowed_workspace_ids(memberships, int(ctx.workspace_id))
    ws_csv = ",".join(str(i) for i in ws_ids)

    ws_rows = (
        await db.execute(
            text(f"SELECT id, name FROM workspaces WHERE id IN ({ws_csv})"),
        )
    ).mappings().all()
    ws_map = {int(r["id"]): str(r["name"]) for r in ws_rows}

    http_events = [e for e in snapshot_http_events_last_24h() if e.at >= cutoff and e.path.startswith("/api/")]
    total_http = len(http_events)
    failed_http = len([e for e in http_events if e.status >= 500])
    five_xx_rate = (failed_http / total_http) if total_http else 0.0
    durations = sorted([int(round(e.duration_seconds * 1000.0)) for e in http_events])
    p95_ms = durations[max(0, min(len(durations) - 1, int(0.95 * (len(durations) - 1))))] if durations else 0

    failed_rows = (
        await db.execute(
            text(
                f"""
                SELECT workspace_id, COALESCE(created_at, '') AS created_at, COALESCE(error_message, '') AS error_message
                FROM automation_jobs
                WHERE status = 'failed' AND workspace_id IN ({ws_csv})
                """
            )
        )
    ).mappings().all()

    counts: dict[int, int] = {i: 0 for i in ws_ids}
    for r in failed_rows:
        ws = int(r["workspace_id"])
        created_raw = str(r.get("created_at") or "").strip()
        if created_raw.endswith("Z"):
            created_raw = created_raw[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(created_raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dt = dt.astimezone(timezone.utc)
        except Exception:
            continue
        if dt >= cutoff:
            counts[ws] = counts.get(ws, 0) + 1

    qstats = job_queue.get_stats()
    backlog = int(
        qstats.get("queue_size")
        or max(
            0,
            int(qstats.get("total_enqueued", 0))
            - int(qstats.get("total_completed", 0))
            - int(qstats.get("total_failed", 0)),
        )
    )
    total_failed_24h = sum(counts.values())
    status = _status_from_numbers(five_xx_rate, p95_ms, total_failed_24h, backlog)

    risky = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
    risky_items: list[WorkspaceRiskItem] = []
    for ws_id, failed in risky:
        if failed <= 0:
            continue
        lvl = "crit" if failed >= 5 else "warn"
        risky_items.append(
            WorkspaceRiskItem(
                workspace_id=ws_id,
                workspace_name=ws_map.get(ws_id, f"Workspace {ws_id}"),
                status=lvl,
                failed_jobs_24h=failed,
                reason=f"{failed} failed automation jobs in last 24h.",
                updated_at=now.isoformat(),
                cta="/os/observability/incidents",
            )
        )

    return CrossWorkspaceSnapshotResponse(
        window="24h",
        five_xx_rate=round(five_xx_rate, 4),
        latency_p95_ms=p95_ms,
        failed_jobs_24h=total_failed_24h,
        queue_backlog=backlog,
        status=status,
        workspaces_seen=len(ws_ids),
        top_risky_workspaces=risky_items,
    )


@router.get("/risk-queue", response_model=list[WorkspaceRiskItem])
async def get_os_global_risk_queue(
    ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    snap = await get_os_global_snapshot(ctx=ctx, _user=_user, db=db)
    out = sorted(snap.top_risky_workspaces, key=lambda i: (0 if i.status == "crit" else 1, -i.failed_jobs_24h))
    return out


@router.get("/change-journal", response_model=list[ChangeJournalItem])
async def get_os_global_change_journal(
    ctx: WorkspaceContext = Depends(require_workspace),
    _user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    memberships = (
        await db.execute(
            text("SELECT workspace_id FROM workspace_members WHERE user_id = :uid AND status = 'active'"),
            {"uid": str(ctx.user_id)},
        )
    ).mappings().all()
    ws_ids = _allowed_workspace_ids(memberships, int(ctx.workspace_id))
    ws_csv = ",".join(str(i) for i in ws_ids)

    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS tenant_branding_activation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                actor_user_id VARCHAR NOT NULL,
                actor_email VARCHAR,
                from_enabled INTEGER NOT NULL DEFAULT 0,
                to_enabled INTEGER NOT NULL DEFAULT 0,
                note VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )
    await db.commit()

    rows = (
        await db.execute(
            text(
                f"""
                SELECT l.workspace_id, w.name AS workspace_name, l.actor_user_id, l.actor_email,
                       l.from_enabled, l.to_enabled, l.note, l.created_at
                FROM tenant_branding_activation_logs l
                LEFT JOIN workspaces w ON w.id = l.workspace_id
                WHERE l.workspace_id IN ({ws_csv})
                ORDER BY l.id DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        )
    ).mappings().all()

    out: list[ChangeJournalItem] = []
    for r in rows:
        out.append(
            ChangeJournalItem(
                event_type="tenant_branding_v2_activation",
                workspace_id=int(r["workspace_id"]),
                workspace_name=str(r.get("workspace_name") or f"Workspace {r['workspace_id']}"),
                actor_user_id=str(r["actor_user_id"]),
                actor_email=r.get("actor_email"),
                from_value="ON" if int(r.get("from_enabled") or 0) == 1 else "OFF",
                to_value="ON" if int(r.get("to_enabled") or 0) == 1 else "OFF",
                note=r.get("note"),
                created_at=str(r.get("created_at") or ""),
            )
        )
    return out

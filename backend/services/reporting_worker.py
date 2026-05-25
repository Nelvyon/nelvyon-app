"""Background worker — weekly/monthly executive report generation & email delivery."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import text

from core.database import db_manager
from services.reporting_service import ReportingService

logger = logging.getLogger(__name__)

_worker_task: asyncio.Task | None = None
_CHECK_INTERVAL_SEC = 900  # 15 minutes


def _in_send_window(local: datetime, hour: int, minute: int, *, window_minutes: int = 15) -> bool:
    target = hour * 60 + minute
    current = local.hour * 60 + local.minute
    return target <= current < target + window_minutes


async def _process_workspace(session, workspace_id: int, sched: dict) -> None:
    svc = ReportingService(session, workspace_id)
    tz_name = sched.get("timezone") or "Europe/Madrid"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    now_utc = datetime.now(timezone.utc)
    local = now_utc.astimezone(tz)
    hour = int(sched.get("send_hour") or 9)
    minute = int(sched.get("send_minute") or 0)

    if sched.get("weekly_enabled") and local.weekday() == int(sched.get("send_day_of_week") or 0):
        if _in_send_window(local, hour, minute):
            last = sched.get("last_weekly_sent_at")
            if not last or (now_utc - _parse_dt(last)).days >= 6:
                try:
                    await svc.send_report_email(period="weekly")
                    await session.execute(
                        text(
                            "UPDATE report_schedules SET last_weekly_sent_at = NOW() WHERE workspace_id = :ws"
                        ),
                        {"ws": workspace_id},
                    )
                    await session.commit()
                    logger.info("Executive weekly report sent ws=%s", workspace_id)
                except Exception as exc:
                    logger.warning("Weekly executive report failed ws=%s: %s", workspace_id, exc)

    if sched.get("monthly_enabled") and local.day == 1:
        if _in_send_window(local, hour, minute):
            last = sched.get("last_monthly_sent_at")
            if not last or _parse_dt(last).month != local.month or _parse_dt(last).year != local.year:
                try:
                    await svc.send_report_email(period="monthly")
                    await session.execute(
                        text(
                            "UPDATE report_schedules SET last_monthly_sent_at = NOW() WHERE workspace_id = :ws"
                        ),
                        {"ws": workspace_id},
                    )
                    await session.commit()
                    logger.info("Executive monthly report sent ws=%s", workspace_id)
                except Exception as exc:
                    logger.warning("Monthly executive report failed ws=%s: %s", workspace_id, exc)


def _parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.min.replace(tzinfo=timezone.utc)


async def _tick() -> None:
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()
    if not db_manager.async_session_maker:
        return

    async with db_manager.async_session_maker() as session:
        svc = ReportingService(session, 0)
        await svc.ensure_schema()
        rows = await session.execute(text("SELECT * FROM report_schedules"))
        scheduled = {int(r["workspace_id"]): dict(r) for r in rows.mappings().all()}

        ws_rows = await session.execute(
            text(
                """
                SELECT DISTINCT workspace_id FROM workspace_members
                WHERE status = 'active'
                """
            )
        )
        workspace_ids = [int(r[0]) for r in ws_rows.fetchall()]

        for ws in workspace_ids:
            sched = scheduled.get(ws)
            if not sched:
                tmp = ReportingService(session, ws)
                sched = await tmp.get_schedule()
            else:
                ws_tz = await session.execute(
                    text("SELECT timezone FROM workspaces WHERE id = :ws"),
                    {"ws": ws},
                )
                tz_val = ws_tz.scalar_one_or_none()
                if tz_val:
                    sched = {**sched, "timezone": tz_val}
            await _process_workspace(session, ws, sched)


async def _scheduler_loop() -> None:
    await asyncio.sleep(45)
    while True:
        try:
            await _tick()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("Executive report worker tick error: %s", exc)
        await asyncio.sleep(_CHECK_INTERVAL_SEC)


async def start_reporting_worker() -> None:
    global _worker_task
    if _worker_task and not _worker_task.done():
        return
    _worker_task = asyncio.create_task(_scheduler_loop())
    logger.info("Executive reporting worker started (interval=%ss)", _CHECK_INTERVAL_SEC)


async def stop_reporting_worker() -> None:
    global _worker_task
    if _worker_task is None:
        return
    _worker_task.cancel()
    try:
        await _worker_task
    except asyncio.CancelledError:
        pass
    _worker_task = None

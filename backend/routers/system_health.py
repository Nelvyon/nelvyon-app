"""
System Health Router — Comprehensive health checks for NELVYON OS.
Checks database connectivity, table row counts, service uptime, and API latency.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/system", tags=["system-health"])

# Track server start time for uptime calculation
_server_start = time.time()

# Core tables to check
CORE_TABLES = [
    "contacts", "deals", "campaigns", "conversations", "helpdesk_tickets",
    "activities", "sales_records", "funnel_items", "calendar_events",
    "subscriptions", "contracts", "social_posts", "nelvyon_agents",
    "nelvyon_projects", "nelvyon_outputs", "nelvyon_assets",
    "platform_metrics", "nelvyon_quality_metrics", "workflows",
    "automation_jobs", "blog_posts", "website_pages",
]

# Service endpoints to report
SERVICE_MODULES = [
    {"name": "CRM", "route": "/saas/crm", "endpoints": ["/api/v1/entities/contacts", "/api/v1/entities/deals"]},
    {"name": "Campaigns", "route": "/saas/campaigns", "endpoints": ["/api/v1/entities/campaigns"]},
    {"name": "Social Media", "route": "/saas/social", "endpoints": ["/api/v1/entities/social_posts"]},
    {"name": "Helpdesk", "route": "/saas/helpdesk", "endpoints": ["/api/v1/entities/helpdesk_tickets"]},
    {"name": "Contracts", "route": "/saas/contracts", "endpoints": ["/api/v1/entities/contracts"]},
    {"name": "AI Agents", "route": "/saas/agents", "endpoints": ["/api/v1/entities/nelvyon_agents"]},
    {"name": "Automation", "route": "/saas/automation", "endpoints": ["/api/v1/entities/workflows"]},
    {"name": "Analytics", "route": "/saas/analytics", "endpoints": ["/api/v1/dashboard/metrics"]},
    {"name": "Funnels", "route": "/saas/funnels", "endpoints": ["/api/v1/entities/funnel_items"]},
    {"name": "Calendar", "route": "/saas/calendar", "endpoints": ["/api/v1/entities/calendar_events"]},
    {"name": "Website Builder", "route": "/saas/website", "endpoints": ["/api/v1/entities/website_pages"]},
    {"name": "Auth", "route": "/auth", "endpoints": ["/api/v1/auth/me"]},
]


@router.get("/health")
async def comprehensive_health_check(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """
    Comprehensive system health check.
    Returns DB status, table counts, service status, uptime, and latency.
    """
    start = time.time()
    result: dict[str, Any] = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - _server_start, 1),
        "database": {"status": "unknown", "latency_ms": 0, "tables": {}},
        "services": [],
        "summary": {},
    }

    # ── 1. Database connectivity + latency ──
    db_start = time.time()
    try:
        await db.execute(text("SELECT 1"))
        db_latency = round((time.time() - db_start) * 1000, 1)
        result["database"]["status"] = "connected"
        result["database"]["latency_ms"] = db_latency
    except Exception as e:
        db_latency = round((time.time() - db_start) * 1000, 1)
        result["database"]["status"] = "disconnected"
        result["database"]["latency_ms"] = db_latency
        result["database"]["error"] = str(e)
        result["status"] = "degraded"
        logger.error(f"DB health check failed: {e}")

    # ── 2. Table row counts ──
    table_counts: dict[str, int] = {}
    tables_ok = 0
    tables_error = 0
    for table in CORE_TABLES:
        try:
            row = await db.execute(text(f'SELECT COUNT(*) FROM "{table}"'))
            count = row.scalar() or 0
            table_counts[table] = count
            tables_ok += 1
        except Exception:
            table_counts[table] = -1  # -1 means table doesn't exist or error
            tables_error += 1

    result["database"]["tables"] = table_counts
    result["database"]["tables_ok"] = tables_ok
    result["database"]["tables_error"] = tables_error

    # ── 3. Service status (based on table existence + data) ──
    services = []
    for svc in SERVICE_MODULES:
        # Determine health based on whether related tables have data
        svc_status = "operational"
        svc_tables = []
        for ep in svc["endpoints"]:
            # Extract table name from endpoint pattern /api/v1/entities/{table}
            parts = ep.strip("/").split("/")
            tbl = parts[-1] if len(parts) >= 4 else None
            if tbl and tbl in table_counts:
                count = table_counts[tbl]
                if count == -1:
                    svc_status = "error"
                svc_tables.append({"table": tbl, "rows": count})
            elif tbl:
                svc_tables.append({"table": tbl, "rows": -1})

        services.append({
            "name": svc["name"],
            "route": svc["route"],
            "status": svc_status,
            "tables": svc_tables,
            "endpoints": svc["endpoints"],
        })

    result["services"] = services

    # ── 4. Platform metrics summary (last 1h) ──
    try:
        recent_q = text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'success') as successes,
                ROUND(AVG(latency_ms)::numeric, 1) as avg_latency,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
                COUNT(*) FILTER (WHERE is_ai = true) as ai_calls
            FROM platform_metrics
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        """)
        row = (await db.execute(recent_q)).fetchone()
        if row:
            total = row.total or 0
            result["summary"]["last_hour"] = {
                "total_requests": total,
                "successes": row.successes or 0,
                "success_rate": round(((row.successes or 0) / max(total, 1)) * 100, 1),
                "avg_latency_ms": float(row.avg_latency or 0),
                "p95_latency_ms": float(row.p95_latency or 0),
                "ai_calls": row.ai_calls or 0,
            }
        else:
            result["summary"]["last_hour"] = {
                "total_requests": 0, "successes": 0, "success_rate": 100,
                "avg_latency_ms": 0, "p95_latency_ms": 0, "ai_calls": 0,
            }
    except Exception as e:
        logger.warning(f"Metrics summary query failed: {e}")
        result["summary"]["last_hour"] = {
            "total_requests": 0, "successes": 0, "success_rate": 100,
            "avg_latency_ms": 0, "p95_latency_ms": 0, "ai_calls": 0,
        }

    # ── 5. Overall status ──
    if result["database"]["status"] != "connected":
        result["status"] = "critical"
    elif tables_error > 3:
        result["status"] = "degraded"
    else:
        result["status"] = "healthy"

    result["check_duration_ms"] = round((time.time() - start) * 1000, 1)

    return result


@router.post("/metrics/track")
async def track_metric(
    metric_type: str = "api_call",
    module_name: str = "unknown",
    endpoint: str = "",
    latency_ms: int = 0,
    status: str = "success",
    status_code: int = 200,
    is_ai: bool = False,
    user_id: str = "anonymous",
    db: AsyncSession = Depends(get_db),
):
    """
    Lightweight metric tracking endpoint.
    Frontend can POST metrics here for automatic observability.
    """
    try:
        await db.execute(
            text("""
                INSERT INTO platform_metrics 
                    (user_id, metric_type, module_name, endpoint, latency_ms, status, status_code, is_ai, created_at)
                VALUES 
                    (:user_id, :metric_type, :module_name, :endpoint, :latency_ms, :status, :status_code, :is_ai, NOW())
            """),
            {
                "user_id": user_id,
                "metric_type": metric_type,
                "module_name": module_name,
                "endpoint": endpoint,
                "latency_ms": latency_ms,
                "status": status,
                "status_code": status_code,
                "is_ai": is_ai,
            },
        )
        await db.commit()
        return {"ok": True}
    except Exception as e:
        logger.error(f"Failed to track metric: {e}")
        return {"ok": False, "error": str(e)}
"""Operations monitoring — SES quota, suppressions, health, regions, rate limits."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict

from core.health_monitor import health_monitor
from core.rate_limiter import get_workspace_rate_limit_status
from core.regions import CURRENT_REGION, get_optimal_region, list_regions
from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager, get_db
from core.redis_adapter import redis_client
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin
from services.ses_service import get_ses_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


class VerifyEmailBody(BaseModel):
    email: EmailStr


@router.get("/ses/quota")
async def ses_quota(
    _ctx: WorkspaceContext = Depends(require_workspace_admin),
):
    try:
        return await get_ses_service().get_sending_quota()
    except Exception as e:
        logger.error("ses_quota: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to fetch SES quota") from e


@router.get("/ses/suppressions")
async def ses_suppressions(
    limit: int = Query(200, ge=1, le=500),
    _ctx: WorkspaceContext = Depends(require_workspace_admin),
):
    items = await get_ses_service().list_suppressions(limit=limit)
    return {"count": len(items), "items": items}


@router.post("/ses/verify-email")
async def ses_verify_email(
    body: VerifyEmailBody,
    _ctx: WorkspaceContext = Depends(require_workspace_admin),
):
    try:
        return await get_ses_service().verify_email_identity(str(body.email))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("ses_verify_email: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="SES verify email failed") from e


@router.post("/ses/bounce-webhook")
async def ses_bounce_webhook(request: Request) -> Dict[str, Any]:
    """SES SNS bounce/complaint notifications (no auth — SNS subscription)."""
    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON") from e

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Expected JSON object")

    try:
        return await get_ses_service().bounce_handler(payload)
    except Exception as e:
        logger.error("ses_bounce_webhook: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=502, detail="Bounce handler failed") from e


@router.get("/health")
async def health_global():
    """Global health check with circuit breakers and service latencies."""
    result = await health_monitor.get_system_health()
    status_code = 200 if result["status"] == "healthy" else 503
    return JSONResponse(status_code=status_code, content=result)


@router.get("/regions")
async def regions_status(request: Request):
    """Regional latency estimates and availability."""
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not client_ip and request.client:
        client_ip = request.client.host
    optimal = get_optimal_region(client_ip)
    regions = list_regions()
    for r in regions:
        r["latency_estimate_ms"] = r["expected_latency_ms"]
        if r["id"] != CURRENT_REGION:
            r["latency_estimate_ms"] = r["expected_latency_ms"] + 80
    return {
        "current_region": CURRENT_REGION,
        "optimal_region": optimal,
        "client_ip": client_ip or "unknown",
        "regions": regions,
    }


@router.get("/rate-limits")
async def rate_limits_usage(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Current rate limit usage for the workspace."""
    if ws.workspace_id is None:
        raise HTTPException(status_code=400, detail="X-Workspace-Id required")
    return await get_workspace_rate_limit_status(db, int(ws.workspace_id))


@router.get("/health/detailed")
async def health_detailed():
    """Detailed health: database, Redis, SES, Sentry (legacy)."""
    legacy = await _legacy_health_detailed()
    global_health = await health_monitor.get_system_health(use_cache=False)
    legacy["global"] = global_health
    legacy["circuit_breakers"] = global_health.get("circuit_breakers", {})
    return legacy


async def _legacy_health_detailed() -> dict[str, Any]:
    from sqlalchemy import text

    result: dict[str, Any] = {
        "status": "healthy",
        "environment": os.environ.get("ENVIRONMENT", "production"),
        "checks": {},
    }

    # Database
    db_status = "ok"
    try:
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        if db_manager.async_session_maker:
            async with db_manager.async_session_maker() as session:
                await session.execute(text("SELECT 1"))
        else:
            db_status = "not_ready"
    except Exception as exc:
        db_status = "error"
        result["checks"]["database_error"] = str(exc)
    result["checks"]["database"] = db_status

    # Redis
    try:
        if not redis_client._initialized:
            await redis_client.initialize()
        redis_health = await redis_client.health()
        result["checks"]["redis"] = redis_health
    except Exception as exc:
        result["checks"]["redis"] = {"backend": "error", "error": str(exc)}

    # SES
    ses = get_ses_service()
    try:
        quota = await ses.get_sending_quota()
        result["checks"]["ses"] = {
            "mock": ses.is_mock,
            "quota": quota,
        }
    except Exception as exc:
        result["checks"]["ses"] = {"mock": ses.is_mock, "error": str(exc)}

    # Sentry
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    sentry_ok = False
    if dsn:
        try:
            import sentry_sdk

            hub = sentry_sdk.Hub.current
            client = hub.client
            sentry_ok = client is not None
        except Exception:
            sentry_ok = False
    result["checks"]["sentry"] = {
        "configured": bool(dsn),
        "initialized": sentry_ok,
    }

    if db_status != "ok":
        result["status"] = "degraded"

    return result

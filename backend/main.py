import importlib
import logging
import os
import pkgutil
import sys
import traceback
from datetime import datetime

from core.config import settings
from core.secrets import sanitize_text
from core.structured_log import log_structured
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter

# MODULE_IMPORTS_START
from services.database import initialize_database, close_database
from services.mock_data import initialize_mock_data
from services.auth import initialize_admin_user
from core.redis_adapter import redis_client
from core.job_queue import job_queue
from core.nelvyon_job_handlers import register_nelvyon_job_handlers
from core.staging import apply_staging_overrides
# MODULE_IMPORTS_END


# ─── Environment Detection ───
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
IS_DEV = ENVIRONMENT in ("dev", "development", "test")
IS_STAGING = ENVIRONMENT == "staging"
IS_PRODUCTION = ENVIRONMENT in ("production", "prod")


def setup_logging():
    """Configure OBS-ABCD-1 structured logging (JSON en prod/staging por defecto, texto en dev/test)."""
    if os.environ.get("IS_LAMBDA") == "true":
        return

    from core.observability import (
        NelvyonJsonFormatter,
        NelvyonTextFormatter,
        ObservabilityFilter,
        log_format_from_environment,
    )

    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"{log_dir}/app_{timestamp}.log"

    log_level = logging.DEBUG if IS_DEV else logging.INFO
    use_json = log_format_from_environment() == "json"
    formatter: logging.Formatter = NelvyonJsonFormatter() if use_json else NelvyonTextFormatter()
    obs_filter = ObservabilityFilter()

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(log_level)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    stream_handler = logging.StreamHandler(sys.stdout)
    for h in (file_handler, stream_handler):
        h.setLevel(log_level)
        h.addFilter(obs_filter)
        h.setFormatter(formatter)
        root.addHandler(h)

    if not IS_DEV:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    else:
        logging.getLogger("uvicorn").setLevel(logging.DEBUG)
        logging.getLogger("fastapi").setLevel(logging.DEBUG)

    logger = logging.getLogger(__name__)
    logger.info(
        "=== Logging system initialized (format=%s) ===",
        "json" if use_json else "text",
    )
    logger.info("Environment: %s", ENVIRONMENT)
    logger.info("Log file: %s", log_file)
    logger.info("Log level: %s", logging.getLevelName(log_level))


app = FastAPI(
    title="NELVYON OS API",
    description="NELVYON OS + SaaS Platform — Enterprise-grade API for CRM, contracts, billing, helpdesk, campaigns, and AI agents.",
    version="2.0.0",
    docs_url="/docs" if not IS_PRODUCTION else None,
    redoc_url="/redoc" if not IS_PRODUCTION else None,
)


# Liveness probe for Railway — no auth, DB, or Redis (see backend/railway.json healthcheckPath)
@app.get("/health", status_code=200)
async def health():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    logger = logging.getLogger(__name__)
    logger.info("=== Application startup initiated ===")
    logger.info("Environment: %s | Version: 2.0.0", ENVIRONMENT)

    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(
                dsn=dsn,
                environment=ENVIRONMENT,
                traces_sample_rate=0.1,
            )
            logger.info("Sentry initialized (environment=%s)", ENVIRONMENT)
        except Exception as e:
            logger.warning("Sentry init skipped: %s", sanitize_text(str(e)))
    else:
        logger.info("SENTRY_DSN not set — Sentry disabled")

    # MODULE_STARTUP_START
    try:
        await initialize_database()
    except Exception as e:
        logger.warning("DB init failed: %s", e)

    try:
        from core.performance_indexes import ensure_performance_indexes

        await ensure_performance_indexes()
    except Exception as e:
        logger.warning("Performance indexes failed: %s", e)

    try:
        await initialize_mock_data()
    except Exception as e:
        logger.warning("Mock data init failed: %s", e)

    try:
        await initialize_admin_user()
    except Exception as e:
        logger.warning("Admin user init failed: %s", e)

    try:
        await redis_client.initialize()
        logger.info(
            "Cache backend: %s",
            "Redis" if redis_client.is_redis else "in-memory",
        )
    except Exception as e:
        logger.warning("Redis init failed: %s", e)

    try:
        register_nelvyon_job_handlers()
        await job_queue.start()
        qstats = job_queue.get_stats()
        logger.info(
            "Job queue started backend=%s max_workers=%s handlers=%s",
            qstats.get("backend"),
            qstats.get("max_workers"),
            qstats.get("registered_handlers"),
        )
    except Exception as e:
        logger.warning("Job queue init failed: %s", e)

    try:
        apply_staging_overrides()
    except Exception as e:
        logger.warning("Staging overrides failed: %s", e)

    try:
        from services.social_scheduler_worker import start_social_scheduler_worker

        await start_social_scheduler_worker()
    except Exception as e:
        logger.warning("Social scheduler worker failed to start: %s", e)

    try:
        from services.finetuning_worker import start_finetuning_worker

        await start_finetuning_worker()
    except Exception as e:
        logger.warning("Fine-tuning worker failed to start: %s", e)

    try:
        from services.reporting_worker import start_reporting_worker

        await start_reporting_worker()
    except Exception as e:
        logger.warning("Executive reporting worker failed to start: %s", e)
    # MODULE_STARTUP_END

    logger.info("=== Application startup completed ===")


@app.on_event("shutdown")
async def shutdown_event():
    logger = logging.getLogger(__name__)
    logger.info("=== Application shutdown initiated ===")

    # MODULE_SHUTDOWN_START
    try:
        from services.social_scheduler_worker import stop_social_scheduler_worker

        await stop_social_scheduler_worker()
    except Exception as e:
        logger.warning("Social scheduler worker shutdown failed: %s", e)

    try:
        from services.finetuning_worker import stop_finetuning_worker

        await stop_finetuning_worker()
    except Exception as e:
        logger.warning("Fine-tuning worker shutdown failed: %s", e)

    try:
        from services.reporting_worker import stop_reporting_worker

        await stop_reporting_worker()
    except Exception as e:
        logger.warning("Executive reporting worker shutdown failed: %s", e)

    try:
        from services.os_web_builder_worker import stop_website_generation_workers

        await stop_website_generation_workers()
    except Exception as e:
        logger.warning("OS web builder worker shutdown failed: %s", e)

    try:
        from services.os_store_builder_worker import stop_store_generation_workers

        await stop_store_generation_workers()
    except Exception as e:
        logger.warning("OS store builder worker shutdown failed: %s", e)

    try:
        await job_queue.stop()
    except Exception as e:
        logger.warning("Job queue shutdown failed: %s", e)

    try:
        await redis_client.close()
    except Exception as e:
        logger.warning("Redis shutdown failed: %s", e)

    try:
        await close_database()
    except Exception as e:
        logger.warning("DB shutdown failed: %s", e)
    # MODULE_SHUTDOWN_END

    logger.info("=== Application shutdown completed ===")


# MODULE_MIDDLEWARE_START

# Error handler middleware (innermost — catches unhandled exceptions from route handlers)
from middlewares.error_handler import ErrorHandlerMiddleware
app.add_middleware(ErrorHandlerMiddleware)

# Security middleware (adds security headers, input sanitization)
from middlewares.security import SecurityMiddleware
app.add_middleware(SecurityMiddleware, scan_bodies=True)

# Rate limiting middleware (phase-1 sensitive routes)
from middlewares.rate_limiter import RateLimiterMiddleware
app.add_middleware(RateLimiterMiddleware, enabled=True)

# Frente 58 — intelligent tiered rate limits
from middleware.rate_limit import IntelligentRateLimitMiddleware
app.add_middleware(IntelligentRateLimitMiddleware, enabled=True)

# Frente 58 — anti-scraping & fingerprinting
from middleware.anti_scraping import AntiScrapingMiddleware
app.add_middleware(AntiScrapingMiddleware)

# Request ID middleware (outermost custom — assigns X-Request-ID for traceability)
from middlewares.request_id import RequestIDMiddleware
app.add_middleware(RequestIDMiddleware)

# Multi-tenant isolation — JWT / X-Workspace-Id → ContextVar + RLS session
from middleware.tenant import TenantMiddleware
app.add_middleware(TenantMiddleware)

# CORS middleware (must be outermost to handle preflight OPTIONS correctly)
from core.cors_policy import cors_origin_regex

_allowed_origin_regex = cors_origin_regex(ENVIRONMENT)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=_allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Workspace-Id", "X-API-Key", "X-Request-ID"],
    expose_headers=["X-Request-ID", "Retry-After"],
)
# MODULE_MIDDLEWARE_END


# Auto-discover and include all routers from the local `routers` package
def include_routers_from_package(app: FastAPI, package_name: str = "routers") -> None:
    """Discover and include all APIRouter objects from a package.

    This scans the given package (and subpackages) for module-level variables that
    are instances of FastAPI's APIRouter. It supports "router", "admin_router" names.
    """

    logger = logging.getLogger(__name__)

    try:
        pkg = importlib.import_module(package_name)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.debug("Routers package '%s' not loaded: %s", package_name, exc)
        return

    discovered: int = 0
    for _finder, module_name, is_pkg in pkgutil.walk_packages(pkg.__path__, pkg.__name__ + "."):
        # Only import leaf modules; subpackages will be walked automatically
        if is_pkg:
            continue
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("Failed to import module '%s': %s", module_name, exc)
            continue

        # Check for router variable names: router and admin_router
        for attr_name in ("router", "admin_router"):
            if not hasattr(module, attr_name):
                continue

            attr = getattr(module, attr_name)

            if isinstance(attr, APIRouter):
                app.include_router(attr)
                discovered += 1
                logger.info("Included router: %s.%s", module_name, attr_name)
            elif isinstance(attr, (list, tuple)):
                for idx, item in enumerate(attr):
                    if isinstance(item, APIRouter):
                        app.include_router(item)
                        discovered += 1
                        logger.info("Included router from list: %s.%s[%d]", module_name, attr_name, idx)

    if discovered == 0:
        logger.debug("No routers discovered in package '%s'", package_name)
    else:
        logger.info("Total routers discovered: %d", discovered)


# Setup logging before router discovery (includes routers/ses.py — Amazon SES cold email)
setup_logging()
include_routers_from_package(app, "routers")

# Explicit audit router (FRENTE 32); GDPR at /api/gdpr via auto-discovery
from routers.audit import router as audit_compliance_router
from routers.chat import livechat_router
from routers.social import social_router
from routers.landing_builder import landing_router, public_page_router
from routers.funnel_builder import funnel_router
from routers.os_web_builder import os_web_router, site_router
from routers.os_store_builder import os_store_router, store_public_router
from routers.sms import sms_router
from routers.voice_commands import voice_commands_router
from routers.social_monitoring import social_monitoring_router
from routers.chatbot import chatbot_router
from routers.lms import lms_router
from routers.ab_testing import ab_router
from routers.loyalty import loyalty_router
from routers.webinars import webinar_router
from routers.cdp import cdp_router
from routers.dialer import dialer_router
from routers.qr import qr_router, qr_public_router
from routers.forms import forms_router

app.include_router(audit_compliance_router)
app.include_router(livechat_router)
app.include_router(social_router)
app.include_router(landing_router)
app.include_router(public_page_router)
app.include_router(funnel_router)
app.include_router(os_web_router)
app.include_router(site_router)
app.include_router(os_store_router)
app.include_router(store_public_router)
app.include_router(sms_router)
app.include_router(voice_commands_router)
app.include_router(social_monitoring_router)
app.include_router(chatbot_router)
app.include_router(lms_router)
app.include_router(ab_router)
app.include_router(loyalty_router)
app.include_router(webinar_router)
app.include_router(cdp_router)
app.include_router(dialer_router)
app.include_router(qr_router)
app.include_router(qr_public_router)
app.include_router(forms_router)
from routers.workflows_visual import workflows_visual_router
from routers.omnichannel import omnichannel_router

app.include_router(workflows_visual_router)
app.include_router(omnichannel_router)
from routers.finetuning import finetuning_router

app.include_router(finetuning_router)
from routers.public_api import public_api_router

app.include_router(public_api_router)

# Static embeddable chatbot widget
from pathlib import Path as _Path

from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse, Response

_static_dir = _Path(__file__).resolve().parent / "static"
if _static_dir.is_dir():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


@app.get("/widget.js", include_in_schema=False)
async def serve_widget_js_root():
    widget_path = _static_dir / "widget.js"
    if not widget_path.is_file():
        raise HTTPException(status_code=404, detail="widget.js not found")
    return FileResponse(widget_path, media_type="application/javascript")


@app.middleware("http")
async def chatbot_embed_cors(request: Request, call_next):
    """Allow any origin for embeddable chatbot public API."""
    path = request.url.path
    if path == "/api/chatbot/chat" or path.startswith("/api/chatbot/widget/"):
        if request.method == "OPTIONS":
            return Response(
                status_code=204,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                },
            )
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response
    return await call_next(request)


# Sanitize HTTP errors in production (no internal module/stack leakage)
@app.exception_handler(HTTPException)
async def sanitized_http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", "unknown")
    if IS_PRODUCTION and exc.status_code >= 500:
        detail = "An error occurred"
    elif IS_PRODUCTION and isinstance(exc.detail, str) and any(
        token in exc.detail.lower() for token in ("traceback", "sqlalchemy", "module", "file ", "line ")
    ):
        detail = "An error occurred"
    else:
        detail = exc.detail
    headers = dict(exc.headers or {})
    headers.setdefault("X-Request-ID", request_id)
    return JSONResponse(status_code=exc.status_code, content={"detail": detail}, headers=headers)


# Add exception handler for all exceptions except HTTPException
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions except HTTPException.

    - Dev environment: Return full stack trace and exception details
    - Prod environment: Return only generic error with request ID
    """
    # Re-raise HTTPException to let FastAPI handle it normally
    if isinstance(exc, HTTPException):
        raise exc

    logger = logging.getLogger(__name__)
    error_type = type(exc).__name__
    request_id = getattr(request.state, "request_id", "unknown")
    obs_ws = getattr(request.state, "obs_workspace_id", None) or getattr(
        request.state, "obs_workspace_hint", ""
    )
    obs_user = getattr(request.state, "obs_user_id", "")

    log_structured(
        logger,
        logging.ERROR,
        "http.unhandled_exception",
        sanitize_text(str(exc)),
        path=str(request.url.path),
        method=request.method,
        state_request_id=request_id,
        state_workspace=str(obs_ws) if obs_ws else None,
        state_user=obs_user or None,
        error_type=error_type,
        exc_info=exc,
    )

    try:
        from core.sentry_utils import capture_exception

        capture_exception(
            exc,
            path=str(request.url.path),
            method=request.method,
            request_id=request_id,
        )
    except Exception:
        pass

    if IS_DEV:
        error_detail = {
            "detail": f"{error_type}: {exc!s}",
            "traceback": traceback.format_exc(),
            "request_id": request_id,
        }
    else:
        error_detail = {
            "detail": "An error occurred",
            "request_id": request_id,
        }

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_detail,
        headers={"X-Request-ID": request_id},
    )


@app.get("/")
def root():
    return {
        "service": "NELVYON OS API",
        "version": "2.0.0",
        "status": "operational",
        "environment": ENVIRONMENT,
    }


@app.get("/health/ready")
async def health_ready():
    """Readiness — includes database check (503 if DB unavailable)."""
    from sqlalchemy import text

    from core.database import db_manager
    from core.metrics_stub import record_counter

    body: dict = {
        "status": "healthy",
        "version": "2.0.0",
        "environment": ENVIRONMENT,
        "process": "up",
        "database": "ok",
    }
    if not db_manager.async_session_maker:
        try:
            await db_manager.ensure_initialized()
        except Exception:
            body["database"] = "error"
            body["status"] = "degraded"
            record_counter("nelvyon.health", tags={"result": "degraded", "reason": "init"})
            return JSONResponse(status_code=503, content=body)
    if not db_manager.async_session_maker:
        body["database"] = "not_ready"
        body["status"] = "degraded"
        record_counter("nelvyon.health", tags={"result": "degraded", "reason": "no_session"})
        return JSONResponse(status_code=503, content=body)
    try:
        async with db_manager.async_session_maker() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        body["database"] = "error"
        body["status"] = "degraded"
        record_counter("nelvyon.health", tags={"result": "degraded", "reason": "db_query"})
        return JSONResponse(status_code=503, content=body)
    record_counter("nelvyon.health", tags={"result": "ok"})
    return body


def run_in_debug_mode(app: FastAPI):
    """Run the FastAPI app in debug mode with proper asyncio handling.

    This function handles the special case of running in a debugger (PyCharm, VS Code, etc.)
    where asyncio is patched, causing conflicts with uvicorn's asyncio_run.

    It loads environment variables from ../.env and uses asyncio.run() directly
    to avoid uvicorn's asyncio_run conflicts.

    Args:
        app: The FastAPI application instance
    """
    import asyncio
    from pathlib import Path

    import uvicorn
    from dotenv import load_dotenv

    # Load environment variables from ../.env in debug mode
    # If `LOCAL_DEBUG=true` is set, then MetaGPT's `ProjectBuilder.build()` will generate the `.env` file
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=True)
        logger = logging.getLogger(__name__)
        logger.info(f"Loaded environment variables from {env_path}")

    # In debug mode, use asyncio.run() directly to avoid uvicorn's asyncio_run conflicts
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=int(settings.port),
        log_level="info",
    )
    server = uvicorn.Server(config)
    asyncio.run(server.serve())


# Sentry ASGI middleware (wraps app when DSN is configured)
if os.environ.get("SENTRY_DSN", "").strip():
    try:
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

        app = SentryAsgiMiddleware(app)
    except Exception as _sentry_mw_exc:
        logging.getLogger(__name__).warning(
            "SentryAsgiMiddleware not applied: %s",
            sanitize_text(str(_sentry_mw_exc)),
        )


if __name__ == "__main__":
    import sys

    import uvicorn

    # Detect if running in debugger (PyCharm, VS Code, etc.)
    # Debuggers patch asyncio which conflicts with uvicorn's asyncio_run
    is_debugging = "pydevd" in sys.modules or (hasattr(sys, "gettrace") and sys.gettrace() is not None)

    if is_debugging:
        run_in_debug_mode(app)
    else:
        # Enable reload in normal mode
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=int(settings.port),
            reload_excludes=["**/*.py"],
        )
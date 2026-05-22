import importlib
import logging
import os
import pkgutil
import sys
import traceback
from contextlib import asynccontextmanager
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = logging.getLogger(__name__)
    logger.info("=== Application startup initiated ===")
    logger.info(f"Environment: {ENVIRONMENT} | Version: 2.0.0")

    # MODULE_STARTUP_START
    await initialize_database()
    # Mock JSON fixtures: no-op in production/staging unless ALLOW_MOCK_SEED=true (see services.mock_data)
    await initialize_mock_data()
    await initialize_admin_user()

    # Initialize Redis adapter (falls back to in-memory if REDIS_URL not set)
    await redis_client.initialize()
    logger.info(f"Cache backend: {'Redis' if redis_client.is_redis else 'in-memory'}")

    # Start async job queue workers (handlers registered before start — ARQ + in-process)
    register_nelvyon_job_handlers()
    try:
        await job_queue.start()
    except Exception as e:
        logger.warning("Job queue unavailable: %s", e)
    qstats = job_queue.get_stats()
    logger.info(
        "Job queue started backend=%s max_workers=%s handlers=%s",
        qstats.get("backend"),
        qstats.get("max_workers"),
        qstats.get("registered_handlers"),
    )

    # Apply staging overrides if applicable
    apply_staging_overrides()
    # MODULE_STARTUP_END

    logger.info("=== Application startup completed successfully ===")
    yield

    # Graceful shutdown
    logger.info("=== Application shutdown initiated ===")
    # MODULE_SHUTDOWN_START
    await job_queue.stop()
    await redis_client.close()
    await close_database()
    # MODULE_SHUTDOWN_END
    logger.info("=== Application shutdown completed ===")


app = FastAPI(
    title="NELVYON OS API",
    description="NELVYON OS + SaaS Platform — Enterprise-grade API for CRM, contracts, billing, helpdesk, campaigns, and AI agents.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not IS_PRODUCTION else None,  # Disable Swagger in production
    redoc_url="/redoc" if not IS_PRODUCTION else None,  # Disable ReDoc in production
)


# MODULE_MIDDLEWARE_START

# Error handler middleware (innermost — catches unhandled exceptions from route handlers)
from middlewares.error_handler import ErrorHandlerMiddleware
app.add_middleware(ErrorHandlerMiddleware)

# Security middleware (adds security headers, input sanitization)
from middlewares.security import SecurityMiddleware
app.add_middleware(SecurityMiddleware, scan_bodies=True)

# Rate limiting middleware
from middlewares.rate_limiter import RateLimiterMiddleware
app.add_middleware(RateLimiterMiddleware, enabled=True)

# Request ID middleware (outermost custom — assigns X-Request-ID for traceability)
from middlewares.request_id import RequestIDMiddleware
app.add_middleware(RequestIDMiddleware)

# CORS middleware (must be outermost to handle preflight OPTIONS correctly)
# Environment-aware CORS configuration
_allowed_origin_regex = r".*"  # Default: allow all (dev/staging)
if IS_PRODUCTION:
    # In production, restrict to known domains
    _allowed_origin_regex = r"https?://(.*\.)?nelvyon\.(com|dev|app)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=_allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
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


# Setup logging before router discovery
setup_logging()
include_routers_from_package(app, "routers")


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

    if IS_DEV:
        error_detail = {
            "detail": f"{error_type}: {exc!s}",
            "traceback": traceback.format_exc(),
            "request_id": request_id,
        }
    else:
        error_detail = {
            "detail": "Internal Server Error",
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


@app.get("/health")
async def health():
    return {"status": "healthy"}


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
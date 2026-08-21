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

# La superficie de documentacion se cierra ENTERA o no se cierra.
#
# Antes solo se anulaban `docs_url` y `redoc_url`. `openapi_url` conservaba su
# valor por defecto `/openapi.json`, asi que el esquema completo del API se
# seguia publicando aunque las dos paginas estuvieran cerradas: quien quisiera
# el inventario de rutas lo tenia igual, sin la interfaz. Cerrar dos de tres no
# es cerrar, y se comprobo en produccion: /docs, /redoc y /openapi.json
# respondian 200 los tres.
#
# Con `openapi_url=None` FastAPI ya no monta ni /docs ni /redoc aunque se les
# pase ruta, porque no hay esquema que mostrar: la decision queda en un solo
# sitio en vez de repartida en tres parametros que pueden divergir.
DOCS_PUBLICAS = not IS_PRODUCTION


def setup_logging():
    """Configure OBS-ABCD-1 structured logging (JSON en prod/staging por defecto, texto en dev/test)."""
    if os.environ.get("IS_LAMBDA") == "true":
        return

    from logging.handlers import RotatingFileHandler

    from core.observability import (
        NelvyonJsonFormatter,
        NelvyonTextFormatter,
        ObservabilityFilter,
        log_format_from_environment,
    )

    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    log_file = f"{log_dir}/app.log"
    max_bytes = int(os.environ.get("LOG_ROTATE_MAX_BYTES", str(10 * 1024 * 1024)))
    backup_count = int(os.environ.get("LOG_ROTATE_BACKUP_COUNT", "5"))

    log_level = logging.DEBUG if IS_DEV else logging.INFO
    use_json = log_format_from_environment() == "json"
    formatter: logging.Formatter = NelvyonJsonFormatter() if use_json else NelvyonTextFormatter()
    obs_filter = ObservabilityFilter()

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(log_level)

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
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
    docs_url="/docs" if DOCS_PUBLICAS else None,
    redoc_url="/redoc" if DOCS_PUBLICAS else None,
    openapi_url="/openapi.json" if DOCS_PUBLICAS else None,
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

    # Lo PRIMERO, antes de abrir nada: si en produccion falta un secreto sin el
    # que el servicio no puede funcionar, es mejor no arrancar que arrancar roto
    # y responder al health check mientras la autenticacion rechaza todo.
    from core.config import settings as _settings

    _settings.assert_production_ready()

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

    # Vigilante de negocio: cada 15 minutos revisa la salud de NEGOCIO, abre
    # incidentes, intenta recuperarlos solo y avisa de lo que sobrevive. Vive
    # aqui, con los demas barridos, para no depender de infraestructura nueva ni
    # del ordenador de nadie.
    try:
        from services.vigilante_negocio import arrancar as arrancar_vigilante

        app.state.vigilante = arrancar_vigilante()
    except Exception as e:
        logger.error("Vigilante de negocio no arranco: %s", e, exc_info=True)

    # Autopilot: planner y executor, cada uno con su intervalo. Separados del
    # vigilante a proposito — un planner lento no puede frenar la ejecucion, y un
    # executor atascado no puede impedir que se programe el trabajo de mañana.
    try:
        from services.autopilot_loop import arrancar as arrancar_autopilot

        app.state.autopilot = arrancar_autopilot()
    except Exception as e:
        # Que Autopilot no arranque NO puede tumbar el API: los 14 servicios OS
        # siguen sirviendo peticiones manuales exactamente igual.
        logger.error("Autopilot no arranco: %s", e, exc_info=True)
        app.state.autopilot = []
    # MODULE_STARTUP_END

    # Critical configuration warnings (non-fatal — allow graceful degradation)
    _stripe_key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    _stripe_wh = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    _frontend_url = os.environ.get("FRONTEND_APP_URL", "").strip() or os.environ.get("NEXT_PUBLIC_APP_URL", "").strip()
    if not _stripe_key:
        logger.error("STARTUP: STRIPE_SECRET_KEY is not set — payment endpoints will fail")
    elif not _stripe_key.startswith("sk_live_") and ENVIRONMENT.lower() in ("production", "prod"):
        logger.warning("STARTUP: STRIPE_SECRET_KEY appears to be a test key in production environment")
    if not _stripe_wh and ENVIRONMENT.lower() in ("production", "prod"):
        logger.error("STARTUP: STRIPE_WEBHOOK_SECRET is not set — webhook endpoint will return 503")
    if not _frontend_url:
        logger.warning("STARTUP: FRONTEND_APP_URL not set — Stripe checkout success/cancel URLs may be relative")

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

    tarea_vigilante = getattr(app.state, "vigilante", None)
    if tarea_vigilante is not None:
        tarea_vigilante.cancel()
        logger.info("Vigilante de negocio detenido")

    tareas_autopilot = getattr(app.state, "autopilot", None)
    if tareas_autopilot:
        try:
            from services.autopilot_loop import detener as detener_autopilot

            await detener_autopilot(tareas_autopilot)
        except Exception as e:
            logger.warning("Autopilot no se detuvo limpiamente: %s", e)

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


@app.get("/health/autopilot")
async def health_autopilot():
    """Salud de AUTOPILOT, separada de la del API a proposito.

    Que el proceso viva no dice nada sobre si Autopilot esta trabajando: sus
    bucles pueden estar estancados con el API perfectamente sano. Esta ruta
    responde esa otra pregunta, y nunca devuelve 5xx — un Autopilot degradado no
    puede hacer que el orquestador reinicie el contenedor y tumbe el trafico.
    """
    try:
        from services.autopilot_loop import estado

        return estado()
    except Exception as exc:  # noqa: BLE001
        return {"status": "unknown", "reason": type(exc).__name__}


@app.get("/health/business")
async def health_business():
    """Salud de NEGOCIO. Separada de `/health/ready` a proposito.

    `/health/ready` decide si este proceso puede recibir trafico, y por eso lo
    consulta el orquestador. Esta ruta responde otra pregunta: si la EMPRESA esta
    funcionando. Son independientes — el fallo que motivo este endpoint tenia
    `/health/ready` en verde y el producto vacio para todos los clientes.

    Nunca devuelve 5xx por una anomalia de negocio: mezclarlas haria que Railway
    reiniciara el contenedor por una caida de ventas. El estado va en el cuerpo.
    """
    from core.database import db_manager, sesion_de_barrido
    from core.salud_negocio import revisar

    try:
        await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            return {"status": "unknown", "reason": "sin sesion de base de datos"}
        # SESION DE BARRIDO, no la normal. Esta ruta no tiene peticion autenticada
        # detras, asi que con `nelvyon_app` RLS le ocultaria TODAS las filas de
        # inquilino: se desplego asi y produccion informo 0 clientes teniendo 1101.
        # La vigilancia es cross-tenant por definicion; esa es la via certificada.
        async with await sesion_de_barrido() as sesion:
            return await revisar(sesion)
    except Exception as exc:  # noqa: BLE001
        # `logger` no existe a nivel de modulo en este fichero. Tal cual estaba,
        # este `except` lanzaba NameError y la ruta devolvia 500 — justo lo que
        # su docstring promete que nunca pasa, y solo en el momento en que algo
        # ya iba mal.
        logging.getLogger(__name__).error(
            "health/business fallo: %s", exc, exc_info=True)
        return {"status": "unknown", "reason": type(exc).__name__}


@app.get("/control-center")
async def control_center(request: Request):
    """El panel del fundador. CERRADO salvo que haya un secreto configurado.

    POR QUE NO REUSA LA AUTENTICACION NORMAL
    ----------------------------------------
    Porque esta vista cruza inquilinos por definicion: muestra el estado de TODA
    la empresa. No hay ningun rol de producto que deba poder verla, asi que no se
    cuelga de la sesion de un usuario. Se cuelga de un secreto que solo tiene el
    operador.

    FAIL-CLOSED
    -----------
    Sin `NELVYON_CONTROL_CENTER_TOKEN` en el entorno, la ruta responde 404 y no
    consulta nada. Un panel de plataforma que se abriera solo porque alguien
    olvido configurarlo seria peor que no tenerlo: expondria todos los inquilinos
    sin que nadie hubiera decidido abrirlo.

    La comparacion es en tiempo constante. El token va en cabecera, nunca en la
    URL: las URLs acaban en logs de acceso, en historiales y en referers.
    """
    import hmac
    import os as _os

    esperado = _os.environ.get("NELVYON_CONTROL_CENTER_TOKEN", "")
    if not esperado:
        raise HTTPException(status_code=404, detail="Not Found")

    recibido = request.headers.get("x-control-token", "")
    if not hmac.compare_digest(recibido, esperado):
        # 404 y no 401: quien no tiene el secreto no debe ni saber que existe.
        raise HTTPException(status_code=404, detail="Not Found")

    from core.centro_de_control import componer
    from core.database import db_manager, sesion_de_barrido

    try:
        await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            return {"generado_en": None, "veredicto": {
                "estado": "desconocido", "requiere_atencion": True,
                "frase": "Sin sesion de base de datos"}, "bloques": {}}
        async with await sesion_de_barrido() as sesion:
            return await componer(sesion)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        # `logger` local, como el resto de este fichero: aqui no hay uno de
        # modulo, y usarlo sin definirlo daria NameError justo en el camino de
        # error, tapando el fallo original con otro distinto.
        logging.getLogger(__name__).error(
            "control-center fallo: %s", exc, exc_info=True)
        return {"generado_en": None, "veredicto": {
            "estado": "desconocido", "requiere_atencion": True,
            "frase": f"El panel no se pudo componer: {type(exc).__name__}"},
            "bloques": {}}


@app.get("/health/workers")
async def health_workers():
    """Los bucles de fondo: ¿siguen vivos y cuando dieron su ultima vuelta?

    POR QUE HACE FALTA UNA RUTA APARTE
    ----------------------------------
    `/health/ready` dice si el proceso puede recibir trafico. `/health/business`
    dice si la empresa funciona. Esta responde una tercera pregunta que ninguna
    de las dos cubre: si el TRABAJO DE FONDO se esta haciendo.

    Tres de los seis bucles no publicaban nada. Arrancaban y a partir de ahi eran
    invisibles: si uno moria o se quedaba mudo, el API respondia 200, el proceso
    vivia y el trabajo simplemente dejaba de hacerse. Es el mismo modo de fallo
    del cerrojo del planner, que si se vio porque Autopilot si publica su estado.

    Nunca devuelve 5xx: un bucle degradado no puede hacer que el orquestador
    reinicie el contenedor y tumbe el trafico.
    """
    try:
        from core import latidos

        return latidos.estado()
    except Exception as exc:  # noqa: BLE001
        return {"status": "unknown", "reason": type(exc).__name__}


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

    # Dependencias, cada una con su criticidad DECLARADA.
    #
    # No basta con decir que algo esta caido: hay que decir si eso importa. Una
    # base inalcanzable y un Redis inalcanzable no son la misma noticia, y
    # mezclarlos en un mismo campo obliga a quien lee a saberse de memoria cual
    # es cual. Aqui la criticidad viaja con el estado.
    #
    # `required` decide el codigo de respuesta; `optional` nunca. Por eso Redis
    # degradado no convierte readiness en 503 —seria un falso rojo— y la base
    # caida si —seria un falso verde—.
    body["dependencies"] = {
        "postgres": {"criticality": "required", "state": "ok"},
        "redis": {"criticality": "optional", **_estado_de_redis()},
    }
    # Se conserva el campo plano por compatibilidad con lo ya desplegado.
    body["redis"] = body["dependencies"]["redis"]["state"]

    record_counter("nelvyon.health", tags={"result": "ok"})
    return body


def _estado_de_redis() -> dict:
    """Estado de Redis y que se pierde exactamente sin el. Nunca lanza.

    POR QUE ES `optional` Y NO UN EUFEMISMO
    ---------------------------------------
    Se trazaron todos sus consumidores. Cada uno degrada, ninguno falla:

        limitador     cuenta por proceso en vez de global. NO abre la mano: si
                      la consulta al almacen revienta, responde 429.
        colas         `QueueService` encola y desencola en memoria; la cola ARQ
                      queda inerte porque nada la alimenta.
        cache         por proceso, solo menos eficaz.
        pub/sub chat  canales en memoria.
        estado OAuth  en memoria, con su TTL.

    Los dos ultimos solo serian correctos con UN proceso, y hoy lo es: el API
    arranca `uvicorn` sin `--workers` y sin replicas declaradas. Si algun dia se
    escala horizontalmente, Redis pasa a ser REQUIRED y esto hay que revisarlo
    —queda dicho aqui para que no se descubra por sorpresa—.

    Lo que si se pierde siempre es DURABILIDAD: un reinicio se lleva por delante
    la cache, los contadores, las tareas encoladas y los `state` de OAuth en
    vuelo.
    """
    url = (os.environ.get("REDIS_URL") or "").strip()
    if not url:
        return {"state": "not_configured", "impact": "sin durabilidad entre reinicios"}
    try:
        from core.redis_adapter import redis_client

        if getattr(redis_client, "_using_redis", False):
            return {"state": "ok", "impact": None}
        return {
            "state": "degraded_memory",
            "impact": "cache, colas, pub/sub y contadores en memoria del proceso; se pierden al reiniciar",
        }
    except Exception:  # noqa: BLE001 — el diagnostico no puede tumbar readiness
        return {"state": "unknown", "impact": "no se pudo consultar el adaptador"}


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
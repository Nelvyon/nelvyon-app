"""
Global Error Handler Middleware for NELVYON Backend.

Catches unhandled exceptions and returns structured JSON error responses.
Ensures no stack traces leak to clients in production.
Logs full exception details server-side with request ID for traceability.
"""

import logging
import os
import traceback

from core.secrets import sanitize_text
from core.structured_log import log_structured
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catches unhandled exceptions and returns structured error responses."""

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            request_id = getattr(request.state, "request_id", "unknown")
            obs_ws = getattr(request.state, "obs_workspace_id", None) or getattr(
                request.state, "obs_workspace_hint", ""
            )
            obs_user = getattr(request.state, "obs_user_id", "")
            is_dev = os.getenv("ENVIRONMENT", "production").lower() in ("dev", "development", "test")

            log_structured(
                logger,
                logging.ERROR,
                "http.middleware_exception",
                sanitize_text(str(exc)),
                method=request.method,
                path=request.url.path,
                error_type=type(exc).__name__,
                state_workspace=str(obs_ws) if obs_ws else None,
                state_user=obs_user or None,
                exc_info=exc,
            )

            if is_dev:
                detail = {
                    "error": sanitize_text(str(exc)),
                    "type": type(exc).__name__,
                    "traceback": sanitize_text(traceback.format_exc()),
                    "request_id": request_id,
                }
            else:
                detail = {
                    "detail": "An error occurred",
                    "request_id": request_id,
                }

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=detail,
                headers={"X-Request-ID": request_id},
            )
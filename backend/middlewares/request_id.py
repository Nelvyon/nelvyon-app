"""
Request ID Middleware for NELVYON Backend.

Assigns a unique X-Request-ID to every request for end-to-end traceability.
If the client sends an X-Request-ID header, it is reused (validated);
otherwise a new UUID4 is generated.

The request ID is:
- Injected into `request.state.request_id` for use in route handlers
- Added to the response as `X-Request-ID` header
- Propagated via `core.observability.request_id_ctx` for structured logging

Workspace hint (header sin validar) y user_id se limpian al final de la petición;
los valores canónicos los fijan `get_current_user` / `get_workspace_context`.
"""

import logging
import re
import time
import uuid
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from core.observability import (
    clear_log_context_tail,
    request_id_ctx,
    workspace_id_ctx,
    user_id_ctx,
)
from core.http_observability import record_http_request

logger = logging.getLogger(__name__)

# Valid UUID pattern
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def get_request_id() -> str:
    """Compat: delegación a observabilidad."""
    from core.observability import get_request_id as _gid

    return _gid()


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Adds X-Request-ID to every request/response for traceability."""

    async def dispatch(self, request: Request, call_next) -> Response:
        incoming_id = request.headers.get("x-request-id", "")
        if incoming_id and _UUID_RE.match(incoming_id):
            rid = incoming_id
        else:
            rid = str(uuid.uuid4())

        ws_hint = (
            request.headers.get("X-Workspace-Id")
            or request.headers.get("x-workspace-id")
            or ""
        ).strip()

        request.state.request_id = rid
        request.state.obs_workspace_hint = ws_hint
        rid_tok = request_id_ctx.set(rid)

        workspace_id_ctx.set(ws_hint)
        user_id_ctx.set("")

        start = time.time()
        try:
            response: Optional[Response] = await call_next(request)
            response.headers["X-Request-ID"] = rid

            duration_ms = round((time.time() - start) * 1000, 1)
            path = request.url.path
            method = request.method
            status = response.status_code

            if path.startswith("/api/"):
                logger.info(
                    "http_request request_id=%s method=%s path=%s status=%d duration_ms=%.1f",
                    rid,
                    method,
                    path,
                    status,
                    duration_ms,
                )
            record_http_request(method, path, status, duration_ms / 1000.0, request_id=rid)
            return response
        finally:
            request_id_ctx.reset(rid_tok)
            clear_log_context_tail()

"""
Security Middleware for NELVYON Backend.

Provides:
1. Security headers (CSP, X-Frame-Options, etc.)
2. Input sanitization for request bodies
3. Request size limiting
4. Path traversal prevention
"""

import logging
import os
import re
from typing import Optional

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Maximum request body size (10MB)
MAX_BODY_SIZE = 10 * 1024 * 1024

# Patterns that indicate potential attacks
DANGEROUS_PATTERNS = [
    re.compile(r"<script[\s>]", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),  # onclick=, onerror=, etc.
    re.compile(r"(\b)(union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*set|alter\s+table)(\b)", re.IGNORECASE),
    re.compile(r";\s*(drop|delete|update|insert|alter|create|exec)\s", re.IGNORECASE),
    re.compile(r"--\s*$", re.MULTILINE),  # SQL comment injection
    re.compile(r"\.\./", re.IGNORECASE),  # Path traversal
    re.compile(r"\\x[0-9a-f]{2}", re.IGNORECASE),  # Hex encoding attacks
]

# Paths excluded from body scanning (e.g., file uploads, Stripe webhook raw JSON + signature,
# Stripe checkout URLs that legitimately contain "session_id={CHECKOUT_SESSION_ID}").
SCAN_EXCLUDED_PATHS = {
    "/api/v1/storage/upload",
    "/api/v1/stripe/webhook",
    "/api/whatsapp/webhook",
    "/api/v1/payment/create_payment_session",
    "/api/v1/payment/verify_payment",
}

# Liveness/readiness — Railway healthcheck and probes (no auth, no body scan)
PUBLIC_LIVENESS_PATHS = {"/health", "/health/ready"}

# Security headers base (always-on for API responses)
SECURITY_HEADERS_BASE = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    # Legacy header; harmless for older user agents.
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https: blob:; "
        "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co; "
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
        "frame-ancestors 'none'; "
        "object-src 'none'; "
        "base-uri 'self';"
    ),
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Embedder-Policy": "unsafe-none",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
}


def _is_secure_request(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", "").strip().lower()
    if proto:
        return proto == "https"
    return request.url.scheme == "https"


def _build_security_headers(request: Request) -> dict:
    headers = dict(SECURITY_HEADERS_BASE)
    env = os.environ.get("ENVIRONMENT", "").lower()
    # HSTS solo en prod/staging y sobre requests HTTPS.
    if env in ("production", "prod", "staging") and _is_secure_request(request):
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return headers


def scan_for_injection(text: str) -> Optional[str]:
    """Scan text for potential injection patterns. Returns matched pattern name or None."""
    if not text or not isinstance(text, str):
        return None
    for pattern in DANGEROUS_PATTERNS:
        if pattern.search(text):
            return pattern.pattern
    return None


def sanitize_string(value: str) -> str:
    """Basic sanitization: strip null bytes and control characters."""
    if not isinstance(value, str):
        return value
    # Remove null bytes
    value = value.replace("\x00", "")
    # Remove other control characters except newline, tab, carriage return
    value = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    return value


def deep_scan_dict(data, path: str = "") -> Optional[str]:
    """Recursively scan a dict/list for injection patterns."""
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{path}.{key}" if path else key
            # Scan key
            if isinstance(key, str):
                match = scan_for_injection(key)
                if match:
                    return f"Suspicious pattern in key '{current_path}'"
            # Scan value
            result = deep_scan_dict(value, current_path)
            if result:
                return result
    elif isinstance(data, list):
        for i, item in enumerate(data):
            result = deep_scan_dict(item, f"{path}[{i}]")
            if result:
                return result
    elif isinstance(data, str):
        match = scan_for_injection(data)
        if match:
            return f"Suspicious pattern in field '{path}'"
    return None


class SecurityMiddleware(BaseHTTPMiddleware):
    """Adds security headers and validates request bodies."""

    def __init__(self, app, scan_bodies: bool = True):
        super().__init__(app)
        self.scan_bodies = scan_bodies

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in PUBLIC_LIVENESS_PATHS:
            return await call_next(request)

        # 1. Check request size via Content-Length header
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            logger.warning(
                "Request too large: %s bytes from %s",
                content_length, request.client.host if request.client else "unknown",
            )
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"detail": "Request body too large"},
            )

        # 2. Path traversal check
        if ".." in request.url.path:
            logger.warning("Path traversal attempt: %s", request.url.path)
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "Invalid request path"},
            )

        # 3. Scan query parameters
        for key, value in request.query_params.items():
            match = scan_for_injection(value)
            if match:
                logger.warning(
                    "Injection attempt in query param '%s': %s from %s",
                    key, match, request.client.host if request.client else "unknown",
                )
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": f"Invalid characters in query parameter '{key}'"},
                )

        # 4. Scan request body for JSON requests
        if (
            self.scan_bodies
            and request.method in ("POST", "PUT", "PATCH")
            and request.url.path not in SCAN_EXCLUDED_PATHS
        ):
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    body = await request.body()
                    if body:
                        import json
                        data = json.loads(body)
                        threat = deep_scan_dict(data)
                        if threat:
                            logger.warning(
                                "Injection attempt in body: %s from %s path=%s",
                                threat,
                                request.client.host if request.client else "unknown",
                                request.url.path,
                            )
                            return JSONResponse(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                content={"detail": "Request contains potentially dangerous content"},
                            )
                except (ValueError, TypeError):
                    pass  # Non-JSON body, skip scanning

        # 5. Process request
        response = await call_next(request)

        # 6. Add security headers (skip for CORS preflight)
        if request.method != "OPTIONS":
            for header, value in _build_security_headers(request).items():
                response.headers[header] = value

        return response
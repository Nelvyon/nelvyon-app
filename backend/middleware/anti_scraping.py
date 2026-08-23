"""Anti-scraping middleware — fingerprinting, enumeration decoys, header sanitization."""

from __future__ import annotations

import logging
import os
import re
import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core.secrets import sanitize_text

logger = logging.getLogger(__name__)

_BOT_UA = re.compile(
    r"(bot|crawler|spider|scraper|curl|wget|python-requests|httpx|aiohttp|go-http|java/|libwww)",
    re.I,
)
_ENUM_PATH = re.compile(r"^/api/(?:v1/)?(?:entities|resources|items)/(\d+)(?:/|$)")
_SUSPICIOUS_HEADERS = frozenset({"x-scan", "x-debug", "x-original-url"})

# In-memory counters (Redis preferred in production via rate_limit module)
_ip_hits: dict[str, list[float]] = defaultdict(list)
_blocked_ips: dict[str, float] = {}
IP_WINDOW = 60
IP_MAX = 100
BLOCK_TTL = 3600


def _client_ip(request: Request) -> str:
    """Origen de red fiable. Ver `core.identidad_peticion.ip_del_cliente`.

    Aqui la clave no solo cuenta: tambien BLOQUEA, y durante `BLOCK_TTL` = una
    hora. Leyendo `x-forwarded-for.split(",")[0]` esa clave la elegia el cliente,
    asi que ademas de poder evadir el bloqueo mandando un valor distinto cada
    vez, se podia mandar la IP de OTRO, gastarle el cupo y dejar a esa persona
    bloqueada sesenta minutos sin haber hecho nada.
    """
    from core.identidad_peticion import ip_del_cliente

    return ip_del_cliente(request)


def _is_suspicious_request(request: Request) -> bool:
    ua = request.headers.get("user-agent") or ""
    if not ua.strip():
        return True
    if _BOT_UA.search(ua):
        return True
    for h in _SUSPICIOUS_HEADERS:
        if request.headers.get(h):
            return True
    return False


#: A partir de aqui se barren las entradas sin actividad reciente.
#:
#: `_ip_hits` es un `defaultdict`: cada IP distinta crea una clave, y la poda de
#: dentro —`hits[:] = [...]`— vacia la lista pero NO quita la entrada. En un SaaS
#: publico eso es memoria que solo sube mientras el proceso viva. `_blocked_ips`
#: si se podaba; este no.
#:
#: El barrido va por umbral y no en cada peticion: recorrer el diccionario
#: entero con cada llamada seria pagar O(n) por peticion para un problema que
#: solo aparece con muchas IPs distintas.
_MAX_ENTRADAS = 10_000


def _barrer_inactivas(now: float) -> None:
    """Suelta las entradas cuya ultima peticion quedo fuera de la ventana."""
    for clave, marcas in list(_ip_hits.items()):
        if not marcas or now - marcas[-1] >= IP_WINDOW:
            del _ip_hits[clave]


def _track_ip(ip: str, suspicious: bool) -> bool:
    now = time.time()
    for k, exp in list(_blocked_ips.items()):
        if exp <= now:
            del _blocked_ips[k]
    if len(_ip_hits) > _MAX_ENTRADAS:
        _barrer_inactivas(now)
    if ip in _blocked_ips:
        return False

    hits = _ip_hits[ip]
    hits[:] = [t for t in hits if now - t < IP_WINDOW]
    hits.append(now)
    threshold = IP_MAX // 2 if suspicious else IP_MAX
    if len(hits) > threshold:
        _blocked_ips[ip] = now + BLOCK_TTL
        logger.warning("Anti-scraping blocked IP %s (%d req/%ds)", ip, len(hits), IP_WINDOW)
        return False
    return True


class AntiScrapingMiddleware(BaseHTTPMiddleware):
    """Detect systematic scraping and hide technology fingerprints."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        env = os.environ.get("ENVIRONMENT", "production").lower()
        if env == "test" and os.environ.get("ANTI_SCRAPING_ENABLE_IN_TEST", "").lower() not in ("1", "true"):
            response = await call_next(request)
            return _sanitize_response(response)

        path = request.url.path
        ip = _client_ip(request)
        suspicious = _is_suspicious_request(request)

        if path.startswith("/api/") and not _track_ip(ip, suspicious):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests"},
                headers={"Retry-After": "3600"},
            )

        # Enumeration decoy — don't reveal 404 for sequential probes
        if request.method == "GET" and _ENUM_PATH.match(path):
            seq = _ENUM_PATH.match(path)
            if seq and int(seq.group(1)) < 10000:
                return JSONResponse(status_code=200, content={"items": [], "count": 0})

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error("Anti-scraping upstream error: %s", sanitize_text(str(exc)))
            return JSONResponse(
                status_code=500,
                content={"detail": "An error occurred"},
            )

        return _sanitize_response(response)


def _sanitize_response(response: Response) -> Response:
    for header in ("server", "x-powered-by", "x-framework", "x-aspnet-version"):
        if header in response.headers:
            del response.headers[header]
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    return response

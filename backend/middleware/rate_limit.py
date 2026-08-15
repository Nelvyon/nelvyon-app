"""Limitacion de peticiones por niveles — anonimo, clave de API y autenticado.

La identidad NO se resuelve aqui: la da `core.identidad_peticion`, el mismo
resolutor que conoce los dos esquemas de token del producto. Ver ese modulo para
el fallo que motivo separarlo — resumido: esta capa solo probaba el JWT nativo,
asi que los usuarios autenticados por el BFF acababan en el cubo anonimo y con
la IP bloqueada una hora.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Callable, Optional

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core.identidad_peticion import identificar_token, ip_del_cliente, token_de_la_peticion
from core.secrets import sanitize_text

logger = logging.getLogger(__name__)

TIER_ANON_LIMIT = 10
TIER_ANON_WINDOW = 60
TIER_FREE_LIMIT = 100
TIER_FREE_WINDOW = 3600
TIER_PAID_LIMIT = 1000
TIER_PAID_WINDOW = 3600
ABUSE_BLOCK_SECONDS = 3600

#: Cupo del trafico autenticado.
#:
#: Antes un JWT valido salia del middleware sin contarse. Reconocerlo bien
#: —que es el arreglo— habria convertido esa exencion en barra libre para
#: cualquiera con cuenta, asi que se le pone cubo propio, generoso: veinte
#: peticiones por segundo sostenidas estan muy por encima de lo que hace la
#: interfaz y siguen acotando un cliente desbocado o una cuenta abusiva.
TIER_AUTH_LIMIT = 1200
TIER_AUTH_WINDOW = 60

FREE_PLANS = frozenset({"free", "starter", "trial", ""})
PAID_PLANS = frozenset({"pro", "growth", "business", "enterprise", "agency", "partner", "whitelabel"})

_EXCLUDED = frozenset({"/health", "/health/ready", "/docs", "/openapi.json", "/redoc"})


def _client_ip(request: Request) -> str:
    """Origen de red fiable. Ver `core.identidad_peticion.ip_del_cliente`."""
    return ip_del_cliente(request)


def _resolve_tier(request: Request) -> tuple[str, str, int, int]:
    """Nivel, clave del cubo, limite y ventana para esta peticion."""
    identidad = identificar_token(token_de_la_peticion(request))
    if identidad is not None and identidad.esquema != "clave_api":
        # Autenticado: cubo POR SUJETO, no por IP.
        #
        # Que la clave sea el usuario y no su origen de red es parte del
        # arreglo: con clave por IP, un cliente desbocado detras de una salida
        # compartida —una oficina, un movil en NAT de operador— agotaba el cupo
        # de todos los demas y les provocaba el bloqueo.
        return "auth", f"auth:{identidad.clave}", TIER_AUTH_LIMIT, TIER_AUTH_WINDOW

    api_key = (request.headers.get("X-API-Key") or request.headers.get("x-api-key") or "").strip()
    if not api_key and identidad is not None and identidad.esquema == "clave_api":
        api_key = identidad.sujeto
    if api_key:
        plan = (request.headers.get("X-Workspace-Plan") or "free").lower()
        if plan in PAID_PLANS:
            return "paid_key", f"apikey:{api_key[:16]}", TIER_PAID_LIMIT, TIER_PAID_WINDOW
        return "free_key", f"apikey:{api_key[:16]}", TIER_FREE_LIMIT, TIER_FREE_WINDOW

    # Anonimo: SOLO el origen de red.
    #
    # Antes la clave incluia `X-Workspace-Id`, que lo pone el cliente: bastaba
    # con ir cambiandolo en cada peticion para estrenar cubo y no alcanzar
    # jamas el limite. Un identificador que elige quien es limitado no puede
    # formar parte de la clave que lo limita.
    return "anon", f"ip:{_client_ip(request)}", TIER_ANON_LIMIT, TIER_ANON_WINDOW


class IntelligentRateLimitMiddleware(BaseHTTPMiddleware):
    """Tiered rate limits with abuse blocking — no limit details in responses."""

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled
        self._redis = None
        self._local_blocks: dict[str, float] = {}

    def _get_redis(self):
        if self._redis is None:
            from core.redis_adapter import redis_client
            self._redis = redis_client
        return self._redis

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        env = os.environ.get("ENVIRONMENT", "production").lower()
        if not self.enabled or (env == "test" and os.environ.get("RATE_LIMIT_ENABLE_IN_TEST", "").lower() not in ("1", "true")):
            return await call_next(request)

        path = request.url.path
        if path in _EXCLUDED or not path.startswith("/api/"):
            return await call_next(request)

        tier, subject, limit, window = _resolve_tier(request)

        now = time.time()
        # El bloqueo por abuso castiga al MISMO sujeto que se paso de la raya.
        #
        # Antes la clave era siempre la IP, aunque el cupo agotado fuera el de
        # una cuenta o una clave de API: una sola cuenta desbocada dejaba fuera
        # durante una hora a todo el que compartiera salida a internet con ella.
        block_key = f"block:{subject}"
        if block_key in self._local_blocks and self._local_blocks[block_key] > now:
            return self._rate_response(int(self._local_blocks[block_key] - now))

        redis = self._get_redis()
        rl_key = f"rl:tier:{tier}:{subject}"
        try:
            result = await redis.check_rate_limit(rl_key, limit, window)
        except Exception as exc:
            logger.warning("Rate limit redis fail-closed: %s", sanitize_text(str(exc)))
            return self._rate_response(window)

        if not result.get("allowed"):
            self._local_blocks[block_key] = now + ABUSE_BLOCK_SECONDS
            # `subject` no lleva el token ni la clave de API completos: para los
            # JWT es el id de usuario y para las claves un prefijo recortado.
            logger.warning("Rate limit abuse block tier=%s subject=%s", tier, sanitize_text(subject))
            return self._rate_response(max(1, int(result.get("reset_in") or 60)))

        response = await call_next(request)
        retry = str(max(1, int(result.get("reset_in") or window)))
        response.headers["Retry-After"] = retry
        return response

    @staticmethod
    def _rate_response(retry_after: int) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many requests"},
            headers={"Retry-After": str(retry_after)},
        )

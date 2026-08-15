"""Verificacion de firma de los webhooks entrantes de Zoom.

QUE PASABA
----------
`POST /api/v1/bookings/webhook/zoom` aceptaba cualquier cuerpo de cualquiera, y
el inquilino se elegia con `?workspace_id=`. Con eso se podian inventar eventos
de reunion en la agenda de un cliente.

EL ESQUEMA, TAL Y COMO LO DEFINE ZOOM
-------------------------------------
Zoom envia dos cabeceras:

    x-zm-request-timestamp: <epoch en segundos>
    x-zm-signature:         v0=<hex hmac_sha256(secret_token, "v0:<ts>:<cuerpo>")>

El secreto es el «Secret Token» de la app, distinto de las credenciales OAuth
que ya usa `zoom_service`.

REPLAY: AQUI SI SE PUEDE, Y SE HACE
-----------------------------------
Como el timestamp entra en la firma, un mensaje capturado solo puede reutilizarse
mientras el timestamp siga siendo aceptable. Se exige una tolerancia de cinco
minutos, que es la que Zoom recomienda. Sin esa comprobacion la firma seguiria
siendo valida para siempre y reproducir el mensaje bastaria.

VALIDACION DE URL
-----------------
Al configurar el webhook, Zoom envia `endpoint.url_validation` y espera de vuelta
el `plainToken` y su HMAC. Ese intercambio TAMBIEN se firma, asi que pasa por la
misma verificacion: no es una puerta trasera.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

CABECERA_FIRMA = "x-zm-signature"
CABECERA_TS = "x-zm-request-timestamp"

#: Cinco minutos, la tolerancia que recomienda Zoom. Mas ancha alarga la ventana
#: de reproduccion; mas estrecha empieza a rechazar mensajes legitimos cuando los
#: relojes se separan un poco.
TOLERANCIA_SEGUNDOS = 300


def _secreto() -> str:
    return (os.environ.get("ZOOM_WEBHOOK_SECRET_TOKEN") or "").strip()


def firma_esperada(secreto: str, timestamp: str, cuerpo: bytes) -> str:
    """Formato exacto de Zoom, incluido el prefijo de version."""
    mensaje = b"v0:" + timestamp.encode("utf-8") + b":" + cuerpo
    return "v0=" + hmac.new(secreto.encode("utf-8"), mensaje, hashlib.sha256).hexdigest()


def token_de_validacion(secreto: str, plain_token: str) -> str:
    """Respuesta al reto `endpoint.url_validation`."""
    return hmac.new(
        secreto.encode("utf-8"), plain_token.encode("utf-8"), hashlib.sha256
    ).hexdigest()


def verificar_firma_zoom(
    cuerpo: bytes,
    firma: str | None,
    timestamp: str | None,
    *,
    ahora: float | None = None,
) -> None:
    """Corta si la firma no casa o el mensaje es viejo. O pasa, o lanza."""
    secreto = _secreto()
    if not secreto:
        logger.error("zoom_webhook_secret_missing")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook signature secret is not configured",
        )

    recibida = (firma or "").strip()
    ts = (timestamp or "").strip()
    if not recibida or not ts:
        raise HTTPException(
            status_code=400, detail=f"Missing {CABECERA_FIRMA} or {CABECERA_TS}"
        )

    try:
        enviado_en = float(ts)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid timestamp") from exc

    referencia = time.time() if ahora is None else ahora
    if abs(referencia - enviado_en) > TOLERANCIA_SEGUNDOS:
        # Se comprueba ANTES que la firma: un mensaje caducado se rechaza aunque
        # su firma sea autentica, que es justo lo que impide reproducirlo.
        logger.warning("zoom_webhook_timestamp_fuera_de_tolerancia")
        raise HTTPException(status_code=400, detail="Timestamp outside tolerance")

    if not hmac.compare_digest(recibida, firma_esperada(secreto, ts, cuerpo)):
        logger.warning("zoom_webhook_signature_mismatch")
        raise HTTPException(status_code=400, detail="Invalid signature")

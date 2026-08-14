"""
Verificacion de firma de los webhooks de Meta (Instagram, Messenger).

Los tres webhooks entrantes de esta familia aceptaban cualquier cuerpo:
`await request.json()` y directo al servicio. Cualquiera podia inyectar
mensajes falsos en la bandeja de un workspace — un DM que nadie envio, con el
remitente que quisiera— y el sistema los trataria como reales.

Meta firma con `X-Hub-Signature-256: sha256=<hmac_sha256(app_secret, cuerpo)>`
sobre el cuerpo CRUDO. Es el mismo esquema para Instagram y Messenger, asi que
se implementa una vez.

ALCANCE
-------
Cubre la familia Meta completa: Instagram, Messenger y WhatsApp Business. Los
tres son el mismo proveedor y el mismo algoritmo. Los proveedores con otro
esquema —Twilio firma sobre la URL mas los parametros ordenados, Zoom sobre
`v0:timestamp:cuerpo`— tienen su propio verificador, porque hacerlos aqui a
medias daria una sensacion de proteccion peor que no tenerla.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

#: Variable de entorno con el secreto de aplicacion, por plataforma.
_SECRETO_POR_PLATAFORMA = {
    "instagram": "INSTAGRAM_APP_SECRET",
    "facebook": "FACEBOOK_APP_SECRET",
    "messenger": "FACEBOOK_APP_SECRET",
    # WhatsApp Business tambien es Meta y firma con el mismo esquema. Se acepta
    # su propio secreto y, si no esta puesto, el de la app de Meta: en muchas
    # instalaciones es la misma aplicacion. Lo que NO se hace es dejarlo pasar
    # sin secreto.
    "whatsapp": ("WHATSAPP_APP_SECRET", "META_APP_SECRET", "FACEBOOK_APP_SECRET"),
}


def _secreto(plataforma: str) -> str:
    nombres = _SECRETO_POR_PLATAFORMA.get(plataforma.lower(), "")
    if isinstance(nombres, str):
        nombres = (nombres,) if nombres else ()
    for nombre in nombres:
        valor = (os.environ.get(nombre) or "").strip()
        if valor:
            return valor
    return ""


def firma_esperada(secreto: str, cuerpo: bytes) -> str:
    """Formato exacto de Meta, incluido el prefijo del algoritmo."""
    return "sha256=" + hmac.new(secreto.encode("utf-8"), cuerpo, hashlib.sha256).hexdigest()


def verificar_firma_meta(plataforma: str, cuerpo: bytes, cabecera: str | None) -> None:
    """
    Corta si la firma no casa. No devuelve nada: o pasa, o lanza.

    Sin secreto configurado tambien se corta. Aceptar el webhook "porque aun no
    hay secreto" es justo el estado en el que cualquiera puede escribir en la
    bandeja, y no produce ningun sintoma que lo delate.
    """
    secreto = _secreto(plataforma)
    if not secreto:
        logger.error(
            "meta_webhook_secret_missing",
            extra={"webhook_platform": plataforma},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook signature secret is not configured",
        )

    recibida = (cabecera or "").strip()
    if not recibida:
        raise HTTPException(status_code=400, detail="Missing X-Hub-Signature-256")

    # `compare_digest` para no filtrar por tiempo cuantos bytes coincidian.
    if not hmac.compare_digest(recibida, firma_esperada(secreto, cuerpo)):
        logger.warning(
            "meta_webhook_signature_mismatch",
            extra={"webhook_platform": plataforma},
        )
        raise HTTPException(status_code=400, detail="Invalid signature")

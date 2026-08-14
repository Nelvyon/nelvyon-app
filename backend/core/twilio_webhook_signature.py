"""Verificacion de firma de los webhooks entrantes de Twilio.

QUE PASABA
----------
`POST /api/v1/dialer/webhook/twilio` y `POST /api/v1/sms/webhook/twilio`
aceptaban cualquier cuerpo, de cualquiera. Con eso se podia:

  * inventar llamadas y SMS entrantes en la bandeja de un cliente;
  * marcar llamadas como completadas o fallidas, alterando sus metricas;
  * y —peor— elegir el inquilino, porque el `workspace_id` viaja en el query
    string y nadie comprobaba que quien lo envia tenga nada que ver con el.

EL ESQUEMA, TAL Y COMO LO DEFINE TWILIO
---------------------------------------
Twilio firma con `X-Twilio-Signature`:

    base64( HMAC-SHA1( auth_token, URL + concat(clave+valor por clave ordenada) ) )

La URL es la COMPLETA que Twilio invoco, con su query string. Los parametros
son los del formulario, concatenados sin separadores, ordenados por nombre.

Cuando el cuerpo es JSON en vez de formulario, Twilio firma
`URL + "?bodySHA256=" + sha256(cuerpo)`. Los dos casos estan cubiertos.

LA URL DETRAS DE UN PROXY
-------------------------
Twilio firma sobre la URL PUBLICA. Detras de un balanceador, `request.url` puede
decir `http://` y el host interno, y la firma nunca casaria. Se reconstruye con
`X-Forwarded-Proto` y `X-Forwarded-Host`, y se admite `TWILIO_WEBHOOK_BASE_URL`
para fijarla explicitamente cuando el despliegue no propague esas cabeceras.

SIN SECRETO SE CORTA
--------------------
Aceptar el webhook «porque aun no hay token» es exactamente el estado en el que
cualquiera puede escribir, y no produce ningun sintoma que lo delate.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
from urllib.parse import urlsplit, urlunsplit

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)

CABECERA = "X-Twilio-Signature"


def _token() -> str:
    return (os.environ.get("TWILIO_AUTH_TOKEN") or "").strip()


def url_publica(request: Request) -> str:
    """La URL que Twilio vio, no la que llego al proceso."""
    fijada = (os.environ.get("TWILIO_WEBHOOK_BASE_URL") or "").strip()
    partes = urlsplit(str(request.url))
    esquema = partes.scheme
    host = partes.netloc

    if fijada:
        base = urlsplit(fijada if "//" in fijada else f"https://{fijada}")
        esquema, host = base.scheme or esquema, base.netloc or host
    else:
        reenviado_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
        reenviado_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()
        esquema = reenviado_proto or esquema
        host = reenviado_host or host

    return urlunsplit((esquema, host, partes.path, partes.query, ""))


def firma_esperada(token: str, url: str, parametros: dict[str, str]) -> str:
    """Formato exacto de Twilio para un POST de formulario."""
    cadena = url + "".join(
        f"{clave}{parametros[clave]}" for clave in sorted(parametros)
    )
    return base64.b64encode(
        hmac.new(token.encode("utf-8"), cadena.encode("utf-8"), hashlib.sha1).digest()
    ).decode("ascii")


def firma_esperada_json(token: str, url: str, cuerpo: bytes) -> str:
    """Variante de Twilio cuando el cuerpo es JSON en vez de formulario."""
    con_hash = f"{url}{'&' if '?' in url else '?'}bodySHA256={hashlib.sha256(cuerpo).hexdigest()}"
    return base64.b64encode(
        hmac.new(token.encode("utf-8"), con_hash.encode("utf-8"), hashlib.sha1).digest()
    ).decode("ascii")


async def verificar_firma_twilio(request: Request) -> None:
    """Corta si la firma no casa. O pasa, o lanza; no devuelve nada."""
    token = _token()
    if not token:
        logger.error("twilio_webhook_secret_missing")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook signature secret is not configured",
        )

    recibida = (request.headers.get(CABECERA) or "").strip()
    if not recibida:
        raise HTTPException(status_code=400, detail=f"Missing {CABECERA}")

    url = url_publica(request)
    tipo = (request.headers.get("content-type") or "").lower()

    if "application/x-www-form-urlencoded" in tipo or "multipart/form-data" in tipo:
        formulario = await request.form()
        parametros = {k: str(v) for k, v in formulario.items()}
        esperada = firma_esperada(token, url, parametros)
    else:
        esperada = firma_esperada_json(token, url, await request.body())

    # `compare_digest` para no filtrar por tiempo cuantos bytes coincidian.
    if not hmac.compare_digest(recibida, esperada):
        logger.warning("twilio_webhook_signature_mismatch", extra={"webhook_url": url})
        raise HTTPException(status_code=400, detail="Invalid signature")

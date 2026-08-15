"""Verificacion de firma de las notificaciones de Amazon SNS.

QUE PASABA
----------
`POST /api/v1/monitoring/ses/bounce-webhook` y `POST /api/v1/helpdesk/inbound/email`
aceptaban cualquier cuerpo de cualquiera. Con eso se podia:

  * declarar rebotada o denunciada como spam la direccion de un cliente, que es
    como se le deja de entregar correo — un ataque de denegacion barato y
    silencioso;
  * inyectar tickets de helpdesk con el remitente que se quisiera.

EL MECANISMO OFICIAL
--------------------
SNS firma cada mensaje y publica el certificado con el que lo hizo:

    Signature          firma en base64
    SignatureVersion   "1" (RSA-SHA1) o "2" (RSA-SHA256)
    SigningCertURL     donde esta el certificado

La cadena firmada son pares `clave\\nvalor\\n` de un conjunto FIJO de campos, en
orden alfabetico, distinto segun el tipo de mensaje. No es libre: lo define AWS.

POR QUE EL CERTIFICADO SE DESCARGA
----------------------------------
Los certificados de SNS rotan, asi que no se puede fijar uno. Se descarga del
`SigningCertURL` del propio mensaje — y ahi esta el peligro evidente: si se
aceptara cualquier URL, un atacante firmaria con su certificado y nos diria
donde mirarlo. Por eso el host se valida contra un patron de AWS ANTES de pedir
nada, y el resultado se cachea para no ir a la red en cada mensaje.

CONFIRMACION DE SUSCRIPCION
---------------------------
`SubscriptionConfirmation` tambien viene firmado, asi que pasa por la misma
puerta. Confirmar a ciegas seria dejar que cualquiera nos suscriba a su tema.

SIN CONFIGURACION SE CORTA
--------------------------
Si la verificacion no puede completarse —no hay red, el certificado no valida,
falta `cryptography`— se rechaza. Aceptar «porque no se pudo comprobar» es
exactamente el estado que esto viene a cerrar.
"""
from __future__ import annotations

import base64
import logging
import os
import re
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

#: Campos firmados por tipo de mensaje, tal y como los define AWS. El orden de
#: la cadena es alfabetico, no el de esta lista.
_CAMPOS = {
    "Notification": ("Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"),
    "SubscriptionConfirmation": (
        "Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type",
    ),
    "UnsubscribeConfirmation": (
        "Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type",
    ),
}

#: Solo certificados servidos por AWS. Sin esto, el mensaje elegiria su propia
#: autoridad de firma y la verificacion no valdria nada.
_HOST_AWS = re.compile(r"^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$", re.IGNORECASE)

_cache_certificados: dict[str, bytes] = {}


def _arns_permitidos() -> set[str]:
    """Temas aceptados. Vacio = no se restringe por tema, solo por firma."""
    crudo = os.environ.get("AWS_SNS_TOPIC_ARNS", "")
    return {a.strip() for a in crudo.split(",") if a.strip()}


def cadena_firmada(mensaje: dict) -> bytes:
    """La cadena canonica de AWS: `clave\\nvalor\\n` por campo, en orden."""
    campos = _CAMPOS.get(str(mensaje.get("Type", "")))
    if not campos:
        raise HTTPException(status_code=400, detail="Unsupported SNS message type")
    partes = []
    for clave in sorted(campos):
        if clave in mensaje and mensaje[clave] is not None:
            partes.append(f"{clave}\n{mensaje[clave]}\n")
    return "".join(partes).encode("utf-8")


def _descargar_certificado(url: str) -> bytes:
    host = (urlparse(url).hostname or "").lower()
    if urlparse(url).scheme != "https" or not _HOST_AWS.match(host):
        raise HTTPException(status_code=400, detail="Untrusted SigningCertURL")
    if url in _cache_certificados:
        return _cache_certificados[url]
    try:
        respuesta = httpx.get(url, timeout=5.0)
        respuesta.raise_for_status()
    except Exception as exc:
        logger.error("sns_cert_fetch_failed", extra={"sns_cert_host": host})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot verify SNS signature",
        ) from exc
    _cache_certificados[url] = respuesta.content
    return respuesta.content


def verificar_firma_sns(mensaje: dict) -> None:
    """Corta si la firma no casa. O pasa, o lanza; no devuelve nada."""
    if not isinstance(mensaje, dict):
        raise HTTPException(status_code=400, detail="Expected JSON object")

    permitidos = _arns_permitidos()
    if permitidos and str(mensaje.get("TopicArn", "")) not in permitidos:
        logger.warning("sns_topic_no_permitido")
        raise HTTPException(status_code=403, detail="SNS topic not allowed")

    firma_b64 = str(mensaje.get("Signature") or "")
    url_cert = str(mensaje.get("SigningCertURL") or mensaje.get("SigningCertUrl") or "")
    version = str(mensaje.get("SignatureVersion") or "1")
    if not firma_b64 or not url_cert:
        raise HTTPException(status_code=400, detail="Missing SNS signature fields")

    try:
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.x509 import load_pem_x509_certificate
    except ImportError as exc:  # pragma: no cover - dependencia declarada
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot verify SNS signature",
        ) from exc

    certificado = load_pem_x509_certificate(_descargar_certificado(url_cert))
    algoritmo = hashes.SHA256() if version == "2" else hashes.SHA1()

    try:
        certificado.public_key().verify(
            base64.b64decode(firma_b64),
            cadena_firmada(mensaje),
            padding.PKCS1v15(),
            algoritmo,
        )
    except Exception as exc:
        logger.warning("sns_signature_mismatch", extra={"sns_type": mensaje.get("Type")})
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

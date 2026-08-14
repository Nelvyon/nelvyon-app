"""Autenticidad de webhooks cuyo proveedor NO publica esquema de firma.

CUANDO SE USA ESTO Y CUANDO NO
------------------------------
Si el proveedor firma, se verifica su firma y punto: Meta con
`X-Hub-Signature-256`, Twilio con `X-Twilio-Signature`, Zoom con
`v0:<ts>:<cuerpo>`, SNS con su certificado. Cada uno tiene su verificador.

Este modulo es para los que NO publican ninguno —hoy TikTok DM y Signaturit—,
donde inventarse una firma seria peor que inutil: daria sensacion de proteccion
sin serlo, porque el proveedor no la enviaria nunca.

NO ES UN PROTOCOLO NUEVO
------------------------
Es el mismo patron que el repositorio ya usa en
`POST /webhook/trigger/{webhook_key}`: un secreto opaco que solo conocen el
proveedor y nosotros, configurado al dar de alta la URL del webhook en su panel.
Todos estos proveedores permiten fijar la URL de destino, asi que el secreto
viaja en ella o en una cabecera.

QUE APORTA Y QUE NO
-------------------
Aporta: nadie que no conozca el secreto puede disparar el efecto. Eso cierra la
inyeccion anonima, que es el riesgo real de un endpoint publico.

No aporta: no prueba integridad del cuerpo ni impide reproducir un mensaje
capturado. Si algun dia el proveedor publica firma, se sustituye por ella; queda
anotado en `docs/TODO.md`.

SIN SECRETO SE CORTA
--------------------
Un endpoint publico sin secreto configurado es exactamente el estado que esto
viene a cerrar, asi que no se acepta «todavia no lo hemos puesto».
"""
from __future__ import annotations

import hmac
import logging
import os

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)

#: Variable de entorno con el secreto, por proveedor.
_SECRETO_POR_PROVEEDOR = {
    "tiktok": "TIKTOK_WEBHOOK_SECRET",
    "signaturit": "SIGNATURIT_WEBHOOK_SECRET",
}

CABECERA = "X-Nelvyon-Webhook-Secret"
PARAMETRO = "webhook_secret"


def _secreto(proveedor: str) -> str:
    nombre = _SECRETO_POR_PROVEEDOR.get(proveedor.lower(), "")
    return (os.environ.get(nombre) or "").strip() if nombre else ""


def verificar_secreto_compartido(proveedor: str, request: Request) -> None:
    """Corta si el secreto no coincide. O pasa, o lanza."""
    esperado = _secreto(proveedor)
    if not esperado:
        logger.error(
            "webhook_shared_secret_missing", extra={"webhook_provider": proveedor}
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook secret is not configured",
        )

    # Cabecera si el proveedor deja ponerla; si no, en el query string, que es
    # lo unico configurable en algunos paneles.
    recibido = (
        request.headers.get(CABECERA)
        or request.query_params.get(PARAMETRO)
        or ""
    ).strip()
    if not recibido:
        raise HTTPException(status_code=400, detail=f"Missing {CABECERA}")

    # `compare_digest` para no filtrar por tiempo cuantos bytes coincidian.
    if not hmac.compare_digest(recibido, esperado):
        logger.warning(
            "webhook_shared_secret_mismatch", extra={"webhook_provider": proveedor}
        )
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

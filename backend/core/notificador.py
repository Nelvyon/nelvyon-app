"""El canal por el que sale un aviso. Hoy no hay ninguno configurado.

ESTADO: BLOCKED_EXTERNALLY
--------------------------
Todo lo que hay antes del envio esta construido y probado: deteccion, incidentes,
deduplicacion, cooldown, recuperacion automatica y clasificacion por severidad.
Lo unico que falta es una credencial de salida, y esa no se puede inventar.

Basta con definir UNA de estas variables en el servicio del API:

    NELVYON_ALERTA_WEBHOOK   URL a la que hacer POST (Slack, Discord, cualquier
                             receptor que acepte JSON). Es la mas simple: no
                             necesita cuenta de correo ni servicio de terceros.

    NELVYON_ALERTA_EMAIL     Destinatario. Requiere ademas que el envio de correo
                             del proyecto este configurado.

En cuanto exista una, `hay_canal()` pasa a True y el vigilante empieza a enviar
sin ningun otro cambio.

POR QUE NO MARCA COMO AVISADO LO QUE NO PUDO ENVIAR
---------------------------------------------------
Seria la peor variante posible: un incidente que consta como notificado y que
nadie ha visto. Sin canal, los incidentes se acumulan en `business_incidents` con
`notificado_en` a NULL y el log lo dice en ERROR una vez por pasada. El dia que se
configure el canal, se envian todos los pendientes.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

TIEMPO_LIMITE_SEG = 10


def _webhook() -> str:
    return (os.environ.get("NELVYON_ALERTA_WEBHOOK") or "").strip()


def _email() -> str:
    return (os.environ.get("NELVYON_ALERTA_EMAIL") or "").strip()


def hay_canal() -> bool:
    return bool(_webhook() or _email())


def componer(incidente: dict[str, Any]) -> dict[str, Any]:
    """El cuerpo del aviso.

    Lleva lo necesario para decidir SIN abrir nada: que paso, con que evidencia,
    que impacto tiene, que se intento solo y si hace falta una persona. Un aviso
    que obliga a investigar antes de entender no sirve cuando no hay nadie.
    """
    return {
        "sistema": "NELVYON",
        "severidad": incidente["severidad"],
        "metrica": incidente["metrica"],
        "que_paso": incidente["que_paso"],
        "evidencia": incidente.get("evidencia"),
        "impacto": incidente.get("impacto"),
        "accion_automatica": incidente.get("ultima_accion") or "ninguna todavia",
        "intentos": incidente.get("intentos", 0),
        "estado": incidente.get("estado"),
        "requiere_humano": bool(incidente.get("requiere_humano")),
        "incidente_id": incidente.get("id"),
    }


def _ses_configurado() -> bool:
    """SES necesita las cuatro. Sin credenciales no hay envio posible."""
    return all(os.environ.get(v) for v in (
        "SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY",
        "SES_FROM_EMAIL", "SES_REGION"))


async def _enviar_por_ses(destino: str, cuerpo: dict[str, Any]) -> tuple[bool, str]:
    """Envia por SES, la infraestructura que NELVYON ya tiene.

    POR QUE NO SE USA `services/email_service`
    ------------------------------------------
    Ese servicio habla SendGrid, y `SENDGRID_API_KEY` no existe en produccion.
    Ademas `send_email` es un METODO de clase, no una funcion de modulo: el import
    que habia aqui habria fallado en cuanto hubiera un incidente que enviar. Un
    canal de alertas que se rompe la primera vez que hace falta es peor que no
    tenerlo.

    boto3 es sincrono, asi que va a un hilo: bloquear el bucle de eventos por un
    envio de correo degradaria el trafico HTTP del API.
    """
    if not _ses_configurado():
        return False, "BLOCKED_EXTERNALLY: SES incompleto en este servicio"

    import asyncio

    asunto = f"[NELVYON {cuerpo['severidad'].upper()}] {cuerpo['metrica']}"
    texto = json.dumps(cuerpo, indent=2, ensure_ascii=False)

    def _enviar_sincrono() -> str:
        import boto3

        cliente = boto3.client(
            "ses",
            region_name=os.environ["SES_REGION"],
            aws_access_key_id=os.environ["SES_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["SES_SECRET_ACCESS_KEY"],
        )
        respuesta = cliente.send_email(
            Source=os.environ["SES_FROM_EMAIL"],
            Destination={"ToAddresses": [destino]},
            Message={
                "Subject": {"Data": asunto, "Charset": "UTF-8"},
                "Body": {"Text": {"Data": texto, "Charset": "UTF-8"}},
            },
        )
        return respuesta.get("MessageId", "")

    try:
        ident = await asyncio.wait_for(
            asyncio.to_thread(_enviar_sincrono), timeout=TIEMPO_LIMITE_SEG)
        # El identificador de SES es la prueba de que salio de verdad.
        return (True, "") if ident else (False, "SES no devolvio MessageId")
    except Exception as exc:  # noqa: BLE001
        # NUNCA se devuelve True ante un fallo: `notificado_en` solo se rellena
        # si esta funcion confirma el envio.
        return False, f"{type(exc).__name__}: {exc}"[:300]


async def enviar(incidente: dict[str, Any]) -> tuple[bool, str]:
    """Envia el aviso. Devuelve (enviado, error)."""
    cuerpo = componer(incidente)

    url = _webhook()
    if url:
        try:
            import httpx

            async with httpx.AsyncClient(timeout=TIEMPO_LIMITE_SEG) as cli:
                r = await cli.post(url, json=cuerpo)
            if 200 <= r.status_code < 300:
                return True, ""
            return False, f"webhook respondio {r.status_code}"
        except Exception as exc:  # noqa: BLE001
            return False, f"{type(exc).__name__}: {exc}"[:300]

    destino = _email()
    if destino:
        return await _enviar_por_ses(destino, cuerpo)

    return False, "BLOCKED_EXTERNALLY: no hay canal configurado"

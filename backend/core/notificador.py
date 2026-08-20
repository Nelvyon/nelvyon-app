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
        try:
            from services.email_service import send_email  # type: ignore

            asunto = f"[NELVYON {cuerpo['severidad'].upper()}] {cuerpo['metrica']}"
            await send_email(destino, asunto, json.dumps(cuerpo, indent=2,
                                                        ensure_ascii=False))
            return True, ""
        except Exception as exc:  # noqa: BLE001
            return False, f"{type(exc).__name__}: {exc}"[:300]

    return False, "BLOCKED_EXTERNALLY: no hay canal configurado"

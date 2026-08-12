"""
Binding de mensajeria por workspace: WhatsApp y remitente de email.

QUE SE MIDIO
------------
`services/whatsapp_service.py` y `services/ses_service.py` tienen CERO
referencias a workspace. Sus credenciales salen de variables de entorno
globales (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `AWS_*`,
`SES_FROM_EMAIL`), asi que cualquier workspace que alcanzase esos endpoints
enviaba desde el numero y el remitente corporativos de NELVYON.

Ademas, `POST /api/ses/send` aceptaba `from_email` en el CUERPO de la peticion:
el remitente lo elegia quien llamaba, sin comprobar que el workspace tuviera
derecho a esa direccion.

POR QUE ES WORKSPACE_INTEGRATION Y NO PLATFORM_SERVICE
-----------------------------------------------------
No es una deduccion: el producto ya lo modela asi para WhatsApp.

  * `db/migrations/030_integration_whatsapp.sql` crea `integration_whatsapp`
    con `phone_number_id`, `waba_id` y `access_token` PROPIOS del tenant;
  * `backend/integrations/WhatsAppService.ts` los lee y hace `requireCredentials`,
    que falla cerrado con `whatsapp_auth` si el tenant no ha conectado;
  * el frontend tiene el flujo entero:
    `/api/integrations/whatsapp/{connect,send,bulk,history,revoke}`.

Es decir: el camino correcto EXISTE y es por tenant. El router Python es una
superficie paralela que se salta ese modelo y usa la cuenta corporativa. Ningun
componente del frontend lo llama — ni `/api/whatsapp/*` ni `/api/ses/*`— pero
sigue expuesto por HTTP, que es lo que importa.

Lo mismo para el email en frio de `/api/ses/*`: se dirige a los prospectos DEL
CLIENTE, luego la identidad remitente es del cliente.

QUE NO ENTRA AQUI
-----------------
El correo operativo del propio SaaS —alta, reset de contrasena, avisos de
workflow y de ticket, notificaciones de OS— es infraestructura de NELVYON con
la identidad de NELVYON, y asi debe seguir. Ese camino va por
`services/email_service.py` y no pasa por este modulo.

POR QUE HOY DEVUELVE SIEMPRE None
---------------------------------
Porque no existe ninguna fuente de credencial ligada a WORKSPACE:

  * `integration_whatsapp` esta keyed por `user_id`, no por `workspace_id`, y
    ningun modulo Python la lee;
  * no hay tabla alguna de identidad remitente por workspace: `SES_FROM_EMAIL`
    es global y `campaigns.from_email` existe en el esquema pero nadie la lee.

Fingir la integracion seria peor que no tenerla. Mientras no exista, toda
operacion que alcance al proveedor falla cerrado ANTES de la red. Es una perdida
funcional asumida a proposito, y aqui no cuesta nada: estos endpoints no los
consume el producto.

Mismo patron ya certificado en `core/ads_integration.py`. Cuando exista
integracion real por workspace, las unicas piezas que cambian son las dos
funciones `resolve_*`.
"""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status


class WorkspaceWhatsAppIntegration:
    """Numero y credencial de WhatsApp PROPIOS de un workspace."""

    def __init__(self, phone_number_id: str, waba_id: str, access_token: str) -> None:
        self.phone_number_id = phone_number_id
        self.waba_id = waba_id
        self.access_token = access_token


class WorkspaceEmailSender:
    """Identidad remitente verificada y PROPIA de un workspace."""

    def __init__(self, from_email: str, from_name: str = "", reply_to: str = "") -> None:
        self.from_email = from_email
        self.from_name = from_name
        self.reply_to = reply_to


async def resolve_workspace_whatsapp_integration(
    workspace_id: Optional[int],
) -> Optional[WorkspaceWhatsAppIntegration]:
    """
    Integracion propia del workspace, o `None`.

    Devuelve `None` incondicionalmente: no hay fuente de credencial por
    workspace. Deliberadamente NO cae a `WHATSAPP_TOKEN` /
    `WHATSAPP_PHONE_NUMBER_ID` — ese fallback es el defecto que se cierra.
    """
    _ = workspace_id
    return None


async def resolve_workspace_email_sender(
    workspace_id: Optional[int],
) -> Optional[WorkspaceEmailSender]:
    """
    Remitente verificado del workspace, o `None`.

    NO cae a `SES_FROM_EMAIL` ni acepta una direccion propuesta por quien llama:
    un remitente sin verificar contra el workspace permite suplantar tanto a
    otro tenant como a NELVYON.
    """
    _ = workspace_id
    return None


async def assert_workspace_whatsapp_integration(
    workspace_id: Optional[int],
) -> WorkspaceWhatsAppIntegration:
    """Se llama ANTES de tocar la red. Sin integracion se corta, no se sustituye."""
    integracion = await resolve_workspace_whatsapp_integration(workspace_id)
    if integracion is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workspace WhatsApp integration is not configured",
        )
    return integracion


async def assert_workspace_email_sender(
    workspace_id: Optional[int],
) -> WorkspaceEmailSender:
    """Se llama ANTES de tocar la red. Sin remitente propio se corta."""
    remitente = await resolve_workspace_email_sender(workspace_id)
    if remitente is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workspace email sender identity is not configured",
        )
    return remitente

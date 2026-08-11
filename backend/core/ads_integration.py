"""
Binding de integracion publicitaria por workspace.

REGLA DE PRODUCTO
-----------------
Un workspace cliente NUNCA puede operar sobre la cuenta publicitaria corporativa
de NELVYON. Snapchat Ads y TikTok Ads son customer-facing: sus servicios reciben
`workspace_id` y guardan filas por workspace, pero las credenciales y la cuenta
externa salian de variables de entorno GLOBALES
(`SNAPCHAT_AD_ACCOUNT_ID`, `TIKTOK_ADVERTISER_ID`). Eso convertia la cuenta de
NELVYON en el fallback de facto de cualquier cliente.

POR QUE ESTO FALLA SIEMPRE HOY
------------------------------
Porque hoy no existe ninguna fuente fiable de credencial por workspace:

  * `oauth_connections` esta keyed por `user_id`, no por `workspace_id`;
  * su CHECK de `provider` ni siquiera admite `snapchat`;
  * ningun modulo Python lee esa tabla.

Fingir que la integracion existe seria peor que no tenerla. Mientras no exista,
toda operacion que alcance al proveedor falla cerrado. Es una perdida funcional
aceptada a proposito: es preferible a que un miembro de un workspace gaste
dinero de NELVYON.

Este modulo NO es el modelo multi-tenant definitivo — es el corte de seguridad
mientras se disena. Cuando exista integracion real por workspace, la unica pieza
que cambia es `resolve_workspace_ads_integration`.
"""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status


class WorkspaceAdsIntegration:
    """Credencial y cuenta externa PROPIAS de un workspace."""

    def __init__(self, provider: str, external_account_id: str, access_token: str) -> None:
        self.provider = provider
        self.external_account_id = external_account_id
        self.access_token = access_token


async def resolve_workspace_ads_integration(
    workspace_id: int,
    provider: str,
) -> Optional[WorkspaceAdsIntegration]:
    """
    Integracion propia del workspace, o `None` si no la tiene.

    Devuelve `None` de forma incondicional: no hay ninguna fuente de credencial
    por workspace en el sistema. Deliberadamente NO cae a la configuracion
    global — ese fallback es justamente el defecto que se esta cerrando.
    """
    _ = (workspace_id, provider)
    return None


async def assert_workspace_ads_integration(
    workspace_id: int,
    provider: str,
) -> WorkspaceAdsIntegration:
    """
    Exige integracion propia antes de cualquier operacion contra el proveedor.

    Se llama ANTES de tocar la red. Sin integracion no se elige otra cuenta: se
    corta.
    """
    integracion = await resolve_workspace_ads_integration(workspace_id, provider)
    if integracion is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Workspace {provider} ads integration is not configured",
        )
    return integracion

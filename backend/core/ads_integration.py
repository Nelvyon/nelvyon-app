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

import logging

from typing import Optional

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class WorkspaceAdsIntegration:
    """Credencial y cuenta externa PROPIAS de un workspace."""

    def __init__(self, provider: str, external_account_id: str, access_token: str) -> None:
        self.provider = provider
        self.external_account_id = external_account_id
        self.access_token = access_token


async def resolve_workspace_ads_integration(
    workspace_id: Optional[int],
    provider: str,
) -> Optional[WorkspaceAdsIntegration]:
    """
    Integracion propia del workspace, o `None` si no la tiene.

    Lee `oauth_connections` por `workspace_id`, que desde la migracion 529 es el
    propietario funcional de la integracion. NUNCA cae a la configuracion global:
    ese fallback es el defecto que este modulo existe para cerrar.

    Una fila con `workspace_id` NULL —pertenencia que no se pudo demostrar al
    migrar— no se resuelve. Es deliberado: adivinar el propietario podria dar a
    un inquilino la credencial de otro.
    """
    if workspace_id is None:
        return None

    from sqlalchemy import text

    from core.database import db_manager

    # La inicializacion entra DENTRO del try: si falla, tampoco hay integracion
    # demostrable, y dejarla fuera hacia que el resolvedor lanzase — el llamante
    # devolvia 500 en vez de cortar con 503.
    try:
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            return None

        async with db_manager.async_session_maker() as db:
            fila = (
                await db.execute(
                text(
                    """
                    SELECT external_account_id, access_token
                      FROM oauth_connections
                     WHERE workspace_id = :ws
                       AND provider = :provider
                       AND is_active = true
                     LIMIT 1
                    """
                ),
                {"ws": int(workspace_id), "provider": provider},
                )
            ).fetchone()
    except Exception as exc:
        # FALLA CERRADO. Si la tabla no existe o la base no responde, no hay
        # integracion demostrable, y sin integracion no se toca al proveedor.
        # Se registra como ERROR porque un fallo permanente aqui deja la
        # funcionalidad caida y no debe pasar por "el workspace no la tiene".
        logger.error(
            "ads_integration_lookup_failed",
            extra={"integration_workspace_id": workspace_id, "integration_error": str(exc)[:200]},
        )
        return None

    if fila is None:
        return None
    cuenta, token = fila[0], fila[1]
    if not cuenta or not token:
        # Sin cuenta externa o sin credencial no hay integracion utilizable.
        return None
    return WorkspaceAdsIntegration(provider, str(cuenta), str(token))


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

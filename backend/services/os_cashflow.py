import logging
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models.os_cashflow import Os_cashflow
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


class Os_cashflowService(WorkspaceAwareMixin):
    """NELVYON OS cashflow ledger — workspace-scoped (Fase 2F)."""

    model = Os_cashflow

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _enforce_workspace_id_policy(
        self, data: Dict[str, Any], workspace_id: Optional[int]
    ) -> None:
        if workspace_id is None:
            return
        raw = data.pop("workspace_id", None)
        if raw is None:
            return
        try:
            body_ws = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("workspace_id in body must be a valid integer or omitted") from exc
        if body_ws != int(workspace_id):
            raise ValueError(
                "workspace_id in request body must match X-Workspace-Id, or omit workspace_id"
            )

    async def create(
        self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Os_cashflow]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to create an os_cashflow row")
        payload = dict(data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        direction = (payload.get("direction") or "").lower()
        if direction not in ("in", "out"):
            raise ValueError("direction must be 'in' or 'out'")
        payload["direction"] = direction
        return await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)

    async def get_by_id(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Os_cashflow]:
        return await self.ws_get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self.ws_get_list(
            skip=skip,
            limit=limit,
            user_id=user_id,
            workspace_id=workspace_id,
            query_dict=query_dict,
            sort=sort,
        )

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Os_cashflow]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to update os_cashflow")
        existing = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
        if existing and existing.source_type == "expense":
            raise ValueError("Cashflow linked to expense cannot be edited; update the expense instead")
        payload = dict(update_data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        if "direction" in payload:
            direction = (payload["direction"] or "").lower()
            if direction not in ("in", "out"):
                raise ValueError("direction must be 'in' or 'out'")
            payload["direction"] = direction
        return await self.ws_update(obj_id, payload, user_id=user_id, workspace_id=workspace_id)

    async def delete(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> bool:
        existing = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
        if existing and existing.source_type == "expense":
            raise ValueError("Cashflow linked to expense cannot be deleted; update the expense instead")
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

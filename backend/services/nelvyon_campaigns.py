import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.nelvyon_campaigns import Nelvyon_campaigns
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Nelvyon_campaignsService(WorkspaceAwareMixin):
    """Legacy/internal nelvyon_campaigns domain (non-official for Fase 1)."""

    model = Nelvyon_campaigns

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
    ) -> Optional[Nelvyon_campaigns]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to create a nelvyon_campaigns row")
        payload = dict(data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        return await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for nelvyon_campaigns {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Nelvyon_campaigns]:
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
            skip=skip, limit=limit, user_id=user_id, workspace_id=workspace_id,
            query_dict=query_dict, sort=sort,
        )

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Nelvyon_campaigns]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to update nelvyon_campaigns")
        payload = dict(update_data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        return await self.ws_update(obj_id, payload, user_id=user_id, workspace_id=workspace_id)

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(self, field_name: str, field_value: Any, workspace_id: Optional[int] = None) -> Optional[Nelvyon_campaigns]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for get_by_field on Nelvyon_campaigns")
            if not hasattr(Nelvyon_campaigns, field_name):
                raise ValueError(f"Field {field_name} does not exist on Nelvyon_campaigns")
            query = select(Nelvyon_campaigns).where(getattr(Nelvyon_campaigns, field_name) == field_value)
            query = query.where(Nelvyon_campaigns.workspace_id == workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching nelvyon_campaigns by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20, workspace_id: Optional[int] = None
    ) -> List[Nelvyon_campaigns]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for list_by_field on Nelvyon_campaigns")
            if not hasattr(Nelvyon_campaigns, field_name):
                raise ValueError(f"Field {field_name} does not exist on Nelvyon_campaigns")
            query = select(Nelvyon_campaigns).where(getattr(Nelvyon_campaigns, field_name) == field_value)
            query = query.where(Nelvyon_campaigns.workspace_id == workspace_id)
            query = query.offset(skip).limit(limit).order_by(Nelvyon_campaigns.id.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching nelvyon_campaignss by {field_name}: {str(e)}")
            raise
import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.campaigns import Campaigns
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class CampaignsService(WorkspaceAwareMixin):
    """Official operational campaigns domain (Fase 1) — workspace-aware."""

    model = Campaigns

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Campaigns]:
        return await self.ws_create(data, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for campaigns {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Campaigns]:
        return await self.ws_get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_list(
        self, skip: int = 0, limit: int = 20, user_id: Optional[str] = None,
        workspace_id: Optional[int] = None, query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self.ws_get_list(
            skip=skip, limit=limit, user_id=user_id, workspace_id=workspace_id,
            query_dict=query_dict, sort=sort,
        )

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Campaigns]:
        return await self.ws_update(obj_id, update_data, user_id=user_id, workspace_id=workspace_id)

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(self, field_name: str, field_value: Any, workspace_id: Optional[int] = None) -> Optional[Campaigns]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for get_by_field on Campaigns")
            if not hasattr(Campaigns, field_name):
                raise ValueError(f"Field {field_name} does not exist on Campaigns")
            query = select(Campaigns).where(getattr(Campaigns, field_name) == field_value)
            query = query.where(Campaigns.workspace_id == workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching campaigns by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20, workspace_id: Optional[int] = None
    ) -> List[Campaigns]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for list_by_field on Campaigns")
            if not hasattr(Campaigns, field_name):
                raise ValueError(f"Field {field_name} does not exist on Campaigns")
            query = select(Campaigns).where(getattr(Campaigns, field_name) == field_value)
            query = query.where(Campaigns.workspace_id == workspace_id)
            query = query.offset(skip).limit(limit).order_by(Campaigns.id.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching campaigns by {field_name}: {str(e)}")
            raise
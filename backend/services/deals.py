import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.deal_stages import coerce_deal_stage_for_write
from models.contacts import Contacts
from models.deals import Deals
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


class DealsService(WorkspaceAwareMixin):
    """Service layer for Deals operations — workspace-aware"""

    model = Deals

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ensure_contact_in_workspace(self, contact_id: int, workspace_id: int) -> None:
        """contact_id must exist and belong to the same workspace as the deal."""
        q = select(Contacts).where(Contacts.id == contact_id)
        result = await self.db.execute(q)
        contact = result.scalar_one_or_none()
        if contact is None:
            raise ValueError("Contact not found")
        if contact.workspace_id != workspace_id:
            raise ValueError("Contact belongs to a different workspace than the deal")

    def _apply_stage_and_contact_validation(
        self,
        data: Dict[str, Any],
        *,
        is_update: bool,
    ) -> None:
        if "stage" in data and data["stage"] is not None:
            data["stage"] = coerce_deal_stage_for_write(str(data["stage"]))
        elif not is_update:
            # create: default from schema is "lead"; if missing, mixin still needs a stage
            if "stage" not in data or data.get("stage") is None:
                data["stage"] = coerce_deal_stage_for_write("lead")
        cid = data.get("contact_id")
        if cid is not None:
            # pydantic may pass int; reject non-positive ids
            if not isinstance(cid, int) or cid < 1:
                raise ValueError("contact_id must be a positive integer when provided")

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Deals]:
        payload = dict(data)
        self._apply_stage_and_contact_validation(payload, is_update=False)
        cid = payload.get("contact_id")
        if cid is not None:
            if workspace_id is None:
                raise ValueError("workspace_id is required when setting contact_id")
            await self._ensure_contact_in_workspace(int(cid), workspace_id)
        return await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for deals {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Deals]:
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

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Deals]:
        payload = dict(update_data)
        self._apply_stage_and_contact_validation(payload, is_update=True)
        cid = payload.get("contact_id")
        if cid is not None:
            if workspace_id is None:
                raise ValueError("workspace_id is required when setting contact_id")
            await self._ensure_contact_in_workspace(int(cid), workspace_id)
        return await self.ws_update(obj_id, payload, user_id=user_id, workspace_id=workspace_id)

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(self, field_name: str, field_value: Any, workspace_id: Optional[int] = None) -> Optional[Deals]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for get_by_field on Deals")
            if not hasattr(Deals, field_name):
                raise ValueError(f"Field {field_name} does not exist on Deals")
            query = select(Deals).where(getattr(Deals, field_name) == field_value)
            query = query.where(Deals.workspace_id == workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching deals by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20, workspace_id: Optional[int] = None
    ) -> List[Deals]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for list_by_field on Deals")
            if not hasattr(Deals, field_name):
                raise ValueError(f"Field {field_name} does not exist on Deals")
            query = select(Deals).where(getattr(Deals, field_name) == field_value)
            query = query.where(Deals.workspace_id == workspace_id)
            query = query.offset(skip).limit(limit).order_by(Deals.id.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching deals by {field_name}: {str(e)}")
            raise
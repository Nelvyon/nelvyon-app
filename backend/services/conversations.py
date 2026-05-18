import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.conversations import Conversations
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class ConversationsService(WorkspaceAwareMixin):
    """Service layer for Conversations operations — workspace-aware (Sprint 2.5)"""

    model = Conversations

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _normalize_payload(data: Dict[str, Any], *, is_update: bool) -> Dict[str, Any]:
        """Map/clean incoming payload to the Conversations ORM contract."""
        payload = dict(data)
        allowed = {c.name for c in Conversations.__table__.columns}
        payload = {k: v for k, v in payload.items() if k in allowed}

        if not is_update:
            # conversations.contact_name and conversations.channel are NOT NULL in model
            if not payload.get("contact_name"):
                payload["contact_name"] = "Sin contacto"
            if not payload.get("channel"):
                payload["channel"] = "chat"
        return payload

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Conversations]:
        payload = self._normalize_payload(data, is_update=False)
        return await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for conversations {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Conversations]:
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

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Conversations]:
        payload = self._normalize_payload(update_data, is_update=True)
        return await self.ws_update(obj_id, payload, user_id=user_id, workspace_id=workspace_id)

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(self, field_name: str, field_value: Any, workspace_id: Optional[int] = None) -> Optional[Conversations]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for get_by_field on Conversations")
            if not hasattr(Conversations, field_name):
                raise ValueError(f"Field {field_name} does not exist on Conversations")
            query = select(Conversations).where(getattr(Conversations, field_name) == field_value)
            query = query.where(Conversations.workspace_id == workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching conversations by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20, workspace_id: Optional[int] = None
    ) -> List[Conversations]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for list_by_field on Conversations")
            if not hasattr(Conversations, field_name):
                raise ValueError(f"Field {field_name} does not exist on Conversations")
            query = select(Conversations).where(getattr(Conversations, field_name) == field_value)
            query = query.where(Conversations.workspace_id == workspace_id)
            query = query.offset(skip).limit(limit).order_by(Conversations.id.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching conversations by {field_name}: {str(e)}")
            raise
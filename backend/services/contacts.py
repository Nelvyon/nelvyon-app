# LEGACY (Fase 1A): tabla `contacts` — no usar para CRM SaaS nuevo.
# Fuente oficial: saas_contacts + SaasCrmService. Ver docs/PHASE_1A_CRM_TRANSITION.md
import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.contacts import Contacts
from services.legacy_crm_guard import warn_legacy_crm_write
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class ContactsService(WorkspaceAwareMixin):
    """Service layer for Contacts operations — workspace-aware (Sprint 2.5)"""

    model = Contacts

    def __init__(self, db: AsyncSession):
        self.db = db

    # ---- Workspace-aware CRUD (new primary methods) ----

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Contacts]:
        """Create a new contact with workspace isolation."""
        warn_legacy_crm_write("ContactsService.create", "contacts")
        return await self.ws_create(data, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        """Check if user owns this record within the workspace."""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for contacts {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Contacts]:
        """Get contact by ID with workspace isolation."""
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
        """Get paginated list with workspace isolation."""
        return await self.ws_get_list(
            skip=skip, limit=limit, user_id=user_id, workspace_id=workspace_id,
            query_dict=query_dict, sort=sort,
        )

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Contacts]:
        """Update contact with workspace isolation."""
        return await self.ws_update(obj_id, update_data, user_id=user_id, workspace_id=workspace_id)

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        """Delete contact with workspace isolation."""
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(self, field_name: str, field_value: Any, workspace_id: Optional[int] = None) -> Optional[Contacts]:
        """Get contact by any field; workspace_id is required to avoid cross-tenant reads."""
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for get_by_field on Contacts")
            if not hasattr(Contacts, field_name):
                raise ValueError(f"Field {field_name} does not exist on Contacts")
            query = select(Contacts).where(getattr(Contacts, field_name) == field_value)
            query = query.where(Contacts.workspace_id == workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching contacts by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20, workspace_id: Optional[int] = None
    ) -> List[Contacts]:
        """Get list filtered by field; workspace_id is required to avoid cross-tenant reads."""
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for list_by_field on Contacts")
            if not hasattr(Contacts, field_name):
                raise ValueError(f"Field {field_name} does not exist on Contacts")
            query = (
                select(Contacts)
                .where(getattr(Contacts, field_name) == field_value)
            )
            query = query.where(Contacts.workspace_id == workspace_id)
            query = query.offset(skip).limit(limit).order_by(Contacts.id.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching contacts by {field_name}: {str(e)}")
            raise
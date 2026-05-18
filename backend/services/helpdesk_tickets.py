import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.helpdesk_contract import normalize_ticket_priority, normalize_ticket_status
from models.contacts import Contacts
from models.helpdesk_tickets import Helpdesk_tickets
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Helpdesk_ticketsService(WorkspaceAwareMixin):
    """Service layer for Helpdesk_tickets operations — workspace-aware (Sprint 2.5)"""

    model = Helpdesk_tickets

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _enforce_workspace_id_policy(
        self, data: Dict[str, Any], workspace_id: Optional[int]
    ) -> None:
        """
        workspace_id lo define solo el contexto (X-Workspace-Id).
        Si el body envía otro valor → 400. Siempre se elimina del payload antes de persistir.
        """
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

    async def _validate_client_id_in_workspace(
        self,
        client_id: Any,
        user_id: str,
        workspace_id: int,
    ) -> None:
        try:
            cid = int(client_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("client_id must be a positive integer") from exc
        if cid <= 0:
            raise ValueError("client_id must be a positive integer")
        q = select(Contacts).where(
            Contacts.id == cid,
            Contacts.user_id == user_id,
            Contacts.workspace_id == workspace_id,
        )
        row = (await self.db.execute(q)).scalar_one_or_none()
        if not row:
            raise ValueError("Contact not found in this workspace")

    async def _prepare_ticket_write(
        self,
        data: Dict[str, Any],
        user_id: str,
        workspace_id: int,
        *,
        partial: bool = False,
    ) -> None:
        await self._enforce_workspace_id_policy(data, workspace_id)

        if "client_id" in data:
            cid = data.get("client_id")
            if cid is not None:
                await self._validate_client_id_in_workspace(cid, user_id, workspace_id)

        if "status" in data:
            if data.get("status") is None:
                if not partial:
                    data["status"] = normalize_ticket_status("open")
            else:
                data["status"] = normalize_ticket_status(data["status"])
        elif not partial:
            data["status"] = normalize_ticket_status("open")

        if "priority" in data:
            if data.get("priority") is None:
                if not partial:
                    data["priority"] = normalize_ticket_priority("medium")
            else:
                data["priority"] = normalize_ticket_priority(data["priority"])
        elif not partial:
            data["priority"] = normalize_ticket_priority("medium")

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Helpdesk_tickets]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to create a ticket")
        payload = dict(data)
        await self._prepare_ticket_write(payload, user_id, workspace_id, partial=False)
        return await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for helpdesk_tickets {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Helpdesk_tickets]:
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

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Helpdesk_tickets]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to update a ticket")
        payload = dict(update_data)
        await self._prepare_ticket_write(payload, user_id, workspace_id, partial=True)
        return await self.ws_update(obj_id, payload, user_id=user_id, workspace_id=workspace_id)

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(self, field_name: str, field_value: Any, workspace_id: Optional[int] = None) -> Optional[Helpdesk_tickets]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for get_by_field on Helpdesk_tickets")
            if not hasattr(Helpdesk_tickets, field_name):
                raise ValueError(f"Field {field_name} does not exist on Helpdesk_tickets")
            query = select(Helpdesk_tickets).where(getattr(Helpdesk_tickets, field_name) == field_value)
            query = query.where(Helpdesk_tickets.workspace_id == workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching helpdesk_tickets by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20, workspace_id: Optional[int] = None
    ) -> List[Helpdesk_tickets]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for list_by_field on Helpdesk_tickets")
            if not hasattr(Helpdesk_tickets, field_name):
                raise ValueError(f"Field {field_name} does not exist on Helpdesk_tickets")
            query = select(Helpdesk_tickets).where(getattr(Helpdesk_tickets, field_name) == field_value)
            query = query.where(Helpdesk_tickets.workspace_id == workspace_id)
            query = query.offset(skip).limit(limit).order_by(Helpdesk_tickets.id.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching helpdesk_tickets by {field_name}: {str(e)}")
            raise
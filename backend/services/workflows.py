import logging
import json
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.workflows import Workflows
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class WorkflowsService(WorkspaceAwareMixin):
    """Service layer for Workflows operations — workspace-aware (Sprint 2.5)"""

    model = Workflows

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _normalize_payload(data: Dict[str, Any], *, is_update: bool) -> Dict[str, Any]:
        """Map router payload keys to Workflows ORM contract."""
        payload = dict(data)

        # Backward-compatible input support from /entities/workflows router
        trigger_cfg = payload.pop("trigger_config", None)
        actions = payload.pop("actions", None)
        executions_count = payload.pop("executions_count", None)
        last_executed = payload.pop("last_executed", None)
        payload.pop("updated_at", None)

        if "nodes_json" not in payload and (trigger_cfg is not None or actions is not None):
            payload["nodes_json"] = json.dumps(
                {"trigger_config": trigger_cfg, "actions": actions},
                default=str,
            )
        if executions_count is not None:
            payload["runs_count"] = executions_count
        if last_executed is not None:
            payload["last_run_at"] = last_executed

        allowed = {c.name for c in Workflows.__table__.columns}
        payload = {k: v for k, v in payload.items() if k in allowed}

        if not is_update and payload.get("trigger_type") is None:
            payload["trigger_type"] = "manual"
        return payload

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Workflows]:
        payload = self._normalize_payload(data, is_update=False)
        return await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for workflows {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Workflows]:
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

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> Optional[Workflows]:
        payload = self._normalize_payload(update_data, is_update=True)
        return await self.ws_update(obj_id, payload, user_id=user_id, workspace_id=workspace_id)

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(self, field_name: str, field_value: Any, workspace_id: Optional[int] = None) -> Optional[Workflows]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for get_by_field on Workflows")
            if not hasattr(Workflows, field_name):
                raise ValueError(f"Field {field_name} does not exist on Workflows")
            query = select(Workflows).where(getattr(Workflows, field_name) == field_value)
            query = query.where(Workflows.workspace_id == workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching workflows by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20, workspace_id: Optional[int] = None
    ) -> List[Workflows]:
        try:
            if workspace_id is None:
                raise ValueError("workspace_id is required for list_by_field on Workflows")
            if not hasattr(Workflows, field_name):
                raise ValueError(f"Field {field_name} does not exist on Workflows")
            query = select(Workflows).where(getattr(Workflows, field_name) == field_value)
            query = query.where(Workflows.workspace_id == workspace_id)
            query = query.offset(skip).limit(limit).order_by(Workflows.id.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching workflows by {field_name}: {str(e)}")
            raise
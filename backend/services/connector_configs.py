import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.connector_configs import Connector_configs

logger = logging.getLogger(__name__)


class Connector_configsService:
    """connector_configs — user_id + workspace_id en todas las lecturas/escrituras."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _enforce_workspace_id_policy(self, data: Dict[str, Any], workspace_id: Optional[int]) -> None:
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
            raise ValueError("workspace_id in request body must match X-Workspace-Id, or omit workspace_id")

    async def create(
        self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Connector_configs]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to create connector_configs")
        try:
            payload = dict(data)
            await self._enforce_workspace_id_policy(payload, workspace_id)
            payload["user_id"] = user_id
            payload["workspace_id"] = int(workspace_id)
            obj = Connector_configs(**payload)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating connector_configs: {str(e)}")
            raise

    async def get_by_id(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Connector_configs]:
        try:
            q = select(Connector_configs).where(Connector_configs.id == obj_id)
            if user_id:
                q = q.where(Connector_configs.user_id == user_id)
            if workspace_id is not None:
                q = q.where(Connector_configs.workspace_id == int(workspace_id))
            r = await self.db.execute(q)
            return r.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching connector_configs {obj_id}: {str(e)}")
            raise

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            q = select(Connector_configs)
            cq = select(func.count(Connector_configs.id))
            if user_id:
                q = q.where(Connector_configs.user_id == user_id)
                cq = cq.where(Connector_configs.user_id == user_id)
            if workspace_id is not None:
                q = q.where(Connector_configs.workspace_id == int(workspace_id))
                cq = cq.where(Connector_configs.workspace_id == int(workspace_id))
            if query_dict:
                for field, value in query_dict.items():
                    if field == "workspace_id":
                        continue
                    if hasattr(Connector_configs, field):
                        q = q.where(getattr(Connector_configs, field) == value)
                        cq = cq.where(getattr(Connector_configs, field) == value)
            total = (await self.db.execute(cq)).scalar()
            if sort:
                if sort.startswith("-"):
                    fn = sort[1:]
                    if hasattr(Connector_configs, fn):
                        q = q.order_by(getattr(Connector_configs, fn).desc())
                elif hasattr(Connector_configs, sort):
                    q = q.order_by(getattr(Connector_configs, sort))
            else:
                q = q.order_by(Connector_configs.id.desc())
            r = await self.db.execute(q.offset(skip).limit(limit))
            items = r.scalars().all()
            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching connector_configs list: {str(e)}")
            raise

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Connector_configs]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to update connector_configs")
        try:
            payload = dict(update_data)
            await self._enforce_workspace_id_policy(payload, workspace_id)
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                return None
            for key, value in payload.items():
                if hasattr(obj, key) and key not in ("user_id", "workspace_id"):
                    setattr(obj, key, value)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating connector_configs {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to delete connector_configs")
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                return False
            await self.db.delete(obj)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting connector_configs {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Connector_configs]:
        try:
            if not hasattr(Connector_configs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Connector_configs")
            r = await self.db.execute(
                select(Connector_configs).where(getattr(Connector_configs, field_name) == field_value)
            )
            return r.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching connector_configs by {field_name}: {str(e)}")
            raise

    async def list_by_field(self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20) -> List[Connector_configs]:
        try:
            if not hasattr(Connector_configs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Connector_configs")
            r = await self.db.execute(
                select(Connector_configs)
                .where(getattr(Connector_configs, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Connector_configs.id.desc())
            )
            return r.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching connector_configss by {field_name}: {str(e)}")
            raise

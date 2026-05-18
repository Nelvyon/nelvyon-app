import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.security_events import Security_events

logger = logging.getLogger(__name__)


def _workspace_json_clause(workspace_id: int, dialect_name: str):
    """Fila visible si details_json contiene workspace_id (auditoría) o user_id coincide."""
    if dialect_name == "sqlite":
        return text(
            "CAST(json_extract(security_events.details_json, '$.workspace_id') AS INTEGER) = :_ws_tenant"
        ).bindparams(_ws_tenant=int(workspace_id))
    if dialect_name in ("postgresql", "postgres"):
        return text(
            "(NULLIF(security_events.details_json, '')::jsonb ->> 'workspace_id')::int = :_ws_tenant"
        ).bindparams(_ws_tenant=int(workspace_id))
    return text("1 = 0")


class Security_eventsService:
    """security_events — lecturas acotadas a actor o eventos del workspace (JSON)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _tenant_scope(self, user_id: str, workspace_id: int):
        bind = getattr(self.db, "bind", None)
        dialect_name = bind.dialect.name if bind is not None else "sqlite"
        ws_json = _workspace_json_clause(workspace_id, dialect_name)
        return or_(Security_events.user_id == user_id, ws_json)

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Security_events]:
        try:
            if user_id:
                data["user_id"] = user_id
            obj = Security_events(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created security_events with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating security_events: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: int) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for security_events {obj_id}: {str(e)}")
            return False

    async def get_by_id(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Security_events]:
        try:
            q = select(Security_events).where(Security_events.id == obj_id)
            if user_id is not None and workspace_id is not None:
                q = q.where(self._tenant_scope(user_id, int(workspace_id)))
            elif user_id:
                q = q.where(Security_events.user_id == user_id)
            result = await self.db.execute(q)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching security_events {obj_id}: {str(e)}")
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
            q = select(Security_events)
            cq = select(func.count(Security_events.id))
            if user_id is not None and workspace_id is not None:
                scope = self._tenant_scope(user_id, int(workspace_id))
                q = q.where(scope)
                cq = cq.where(scope)
            elif user_id:
                q = q.where(Security_events.user_id == user_id)
                cq = cq.where(Security_events.user_id == user_id)

            if query_dict:
                for field, value in query_dict.items():
                    if field == "workspace_id":
                        continue
                    if hasattr(Security_events, field):
                        q = q.where(getattr(Security_events, field) == value)
                        cq = cq.where(getattr(Security_events, field) == value)

            total = (await self.db.execute(cq)).scalar()

            if sort:
                if sort.startswith("-"):
                    field_name = sort[1:]
                    if hasattr(Security_events, field_name):
                        q = q.order_by(getattr(Security_events, field_name).desc())
                else:
                    if hasattr(Security_events, sort):
                        q = q.order_by(getattr(Security_events, sort))
            else:
                q = q.order_by(Security_events.id.desc())

            result = await self.db.execute(q.offset(skip).limit(limit))
            items = result.scalars().all()
            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching security_events list: {str(e)}")
            raise

    async def update(
        self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Security_events]:
        try:
            if user_id is None or workspace_id is None:
                raise ValueError("user_id and workspace_id are required to update security_events")
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=int(workspace_id))
            if not obj:
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != "user_id":
                    setattr(obj, key, value)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating security_events {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        try:
            if user_id is None or workspace_id is None:
                raise ValueError("user_id and workspace_id are required to delete security_events")
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=int(workspace_id))
            if not obj:
                return False
            await self.db.delete(obj)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting security_events {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Security_events]:
        try:
            if not hasattr(Security_events, field_name):
                raise ValueError(f"Field {field_name} does not exist on Security_events")
            result = await self.db.execute(
                select(Security_events).where(getattr(Security_events, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching security_events by {field_name}: {str(e)}")
            raise

    async def list_by_field(self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20) -> List[Security_events]:
        try:
            if not hasattr(Security_events, field_name):
                raise ValueError(f"Field {field_name} does not exist on Security_events")
            result = await self.db.execute(
                select(Security_events)
                .where(getattr(Security_events, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Security_events.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching security_eventss by {field_name}: {str(e)}")
            raise

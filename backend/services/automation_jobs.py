import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.automation_jobs import Automation_jobs

logger = logging.getLogger(__name__)


class Automation_jobsService:
    """automation_jobs — aislado por user_id + workspace_id en servicio."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Automation_jobs]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to create automation_jobs")
        try:
            payload = dict(data)
            payload.pop("workspace_id", None)
            payload["user_id"] = user_id
            payload["workspace_id"] = int(workspace_id)
            obj = Automation_jobs(**payload)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating automation_jobs: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for automation_jobs {obj_id}: {str(e)}")
            return False

    async def get_by_id(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Automation_jobs]:
        try:
            q = select(Automation_jobs).where(Automation_jobs.id == obj_id)
            if user_id:
                q = q.where(Automation_jobs.user_id == user_id)
            if workspace_id is not None:
                q = q.where(Automation_jobs.workspace_id == int(workspace_id))
            result = await self.db.execute(q)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching automation_jobs {obj_id}: {str(e)}")
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
            q = select(Automation_jobs)
            cq = select(func.count(Automation_jobs.id))
            if user_id:
                q = q.where(Automation_jobs.user_id == user_id)
                cq = cq.where(Automation_jobs.user_id == user_id)
            if workspace_id is not None:
                q = q.where(Automation_jobs.workspace_id == int(workspace_id))
                cq = cq.where(Automation_jobs.workspace_id == int(workspace_id))
            if query_dict:
                for field, value in query_dict.items():
                    if field == "workspace_id":
                        continue
                    if hasattr(Automation_jobs, field):
                        q = q.where(getattr(Automation_jobs, field) == value)
                        cq = cq.where(getattr(Automation_jobs, field) == value)
            total = (await self.db.execute(cq)).scalar()
            if sort:
                if sort.startswith("-"):
                    fn = sort[1:]
                    if hasattr(Automation_jobs, fn):
                        q = q.order_by(getattr(Automation_jobs, fn).desc())
                elif hasattr(Automation_jobs, sort):
                    q = q.order_by(getattr(Automation_jobs, sort))
            else:
                q = q.order_by(Automation_jobs.id.desc())
            result = await self.db.execute(q.offset(skip).limit(limit))
            items = result.scalars().all()
            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching automation_jobs list: {str(e)}")
            raise

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Automation_jobs]:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key not in ("user_id", "workspace_id"):
                    setattr(obj, key, value)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating automation_jobs {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                return False
            await self.db.delete(obj)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting automation_jobs {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Automation_jobs]:
        try:
            if not hasattr(Automation_jobs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Automation_jobs")
            result = await self.db.execute(
                select(Automation_jobs).where(getattr(Automation_jobs, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching automation_jobs by {field_name}: {str(e)}")
            raise

    async def list_by_field(self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20) -> List[Automation_jobs]:
        try:
            if not hasattr(Automation_jobs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Automation_jobs")
            result = await self.db.execute(
                select(Automation_jobs)
                .where(getattr(Automation_jobs, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Automation_jobs.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching automation_jobss by {field_name}: {str(e)}")
            raise

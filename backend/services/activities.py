import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.activities import Activities

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class ActivitiesService:
    """Service layer for Activities — workspace-scoped list/get/mutate."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Activities]:
        """Create activity; workspace_id from server context when provided."""
        payload = dict(data)
        if user_id:
            payload["user_id"] = user_id
        if workspace_id is not None:
            payload["workspace_id"] = workspace_id
        elif not payload.get("workspace_id"):
            raise ValueError("workspace_id is required")
        try:
            obj = Activities(**payload)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created activities with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating activities: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for activities {obj_id}: {str(e)}")
            return False

    async def get_by_id(
        self,
        obj_id: int,
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Activities]:
        try:
            query = select(Activities).where(Activities.id == obj_id)
            if workspace_id is not None:
                query = query.where(Activities.workspace_id == workspace_id)
            elif user_id:
                query = query.where(Activities.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching activities {obj_id}: {str(e)}")
            raise

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        try:
            query = select(Activities)
            count_query = select(func.count(Activities.id))

            if workspace_id is not None:
                query = query.where(Activities.workspace_id == workspace_id)
                count_query = count_query.where(Activities.workspace_id == workspace_id)
            elif user_id:
                query = query.where(Activities.user_id == user_id)
                count_query = count_query.where(Activities.user_id == user_id)

            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Activities, field):
                        query = query.where(getattr(Activities, field) == value)
                        count_query = count_query.where(getattr(Activities, field) == value)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith("-"):
                    field_name = sort[1:]
                    if hasattr(Activities, field_name):
                        query = query.order_by(getattr(Activities, field_name).desc())
                else:
                    if hasattr(Activities, sort):
                        query = query.order_by(getattr(Activities, sort))
            else:
                query = query.order_by(Activities.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching activities list: {str(e)}")
            raise

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Activities]:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                logger.warning(f"Activities {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key not in ("user_id", "workspace_id"):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated activities {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating activities {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                logger.warning(f"Activities {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted activities {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting activities {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Activities]:
        try:
            if not hasattr(Activities, field_name):
                raise ValueError(f"Field {field_name} does not exist on Activities")
            result = await self.db.execute(
                select(Activities).where(getattr(Activities, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching activities by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Activities]:
        try:
            if not hasattr(Activities, field_name):
                raise ValueError(f"Field {field_name} does not exist on Activities")
            result = await self.db.execute(
                select(Activities)
                .where(getattr(Activities, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Activities.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching activitiess by {field_name}: {str(e)}")
            raise

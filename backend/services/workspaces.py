import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.workspaces import Workspaces

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class WorkspacesService:
    """Service layer for Workspaces operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Workspaces]:
        """Create a new workspaces"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Workspaces(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created workspaces with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating workspaces: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for workspaces {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Workspaces]:
        """Get workspaces by ID (user can only see their own records)"""
        try:
            query = select(Workspaces).where(Workspaces.id == obj_id)
            if user_id:
                query = query.where(Workspaces.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching workspaces {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of workspacess (user can only see their own records)"""
        try:
            query = select(Workspaces)
            count_query = select(func.count(Workspaces.id))
            
            if user_id:
                query = query.where(Workspaces.user_id == user_id)
                count_query = count_query.where(Workspaces.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Workspaces, field):
                        query = query.where(getattr(Workspaces, field) == value)
                        count_query = count_query.where(getattr(Workspaces, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Workspaces, field_name):
                        query = query.order_by(getattr(Workspaces, field_name).desc())
                else:
                    if hasattr(Workspaces, sort):
                        query = query.order_by(getattr(Workspaces, sort))
            else:
                query = query.order_by(Workspaces.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching workspaces list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Workspaces]:
        """Update workspaces (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Workspaces {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated workspaces {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating workspaces {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete workspaces (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Workspaces {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted workspaces {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting workspaces {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Workspaces]:
        """Get workspaces by any field"""
        try:
            if not hasattr(Workspaces, field_name):
                raise ValueError(f"Field {field_name} does not exist on Workspaces")
            result = await self.db.execute(
                select(Workspaces).where(getattr(Workspaces, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching workspaces by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Workspaces]:
        """Get list of workspacess filtered by field"""
        try:
            if not hasattr(Workspaces, field_name):
                raise ValueError(f"Field {field_name} does not exist on Workspaces")
            result = await self.db.execute(
                select(Workspaces)
                .where(getattr(Workspaces, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Workspaces.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching workspacess by {field_name}: {str(e)}")
            raise
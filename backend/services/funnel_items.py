import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.funnel_items import Funnel_items

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Funnel_itemsService:
    """Service layer for Funnel_items operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Funnel_items]:
        """Create a new funnel_items"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Funnel_items(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created funnel_items with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating funnel_items: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for funnel_items {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Funnel_items]:
        """Get funnel_items by ID (user can only see their own records)"""
        try:
            query = select(Funnel_items).where(Funnel_items.id == obj_id)
            if user_id:
                query = query.where(Funnel_items.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching funnel_items {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of funnel_itemss (user can only see their own records)"""
        try:
            query = select(Funnel_items)
            count_query = select(func.count(Funnel_items.id))
            
            if user_id:
                query = query.where(Funnel_items.user_id == user_id)
                count_query = count_query.where(Funnel_items.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Funnel_items, field):
                        query = query.where(getattr(Funnel_items, field) == value)
                        count_query = count_query.where(getattr(Funnel_items, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Funnel_items, field_name):
                        query = query.order_by(getattr(Funnel_items, field_name).desc())
                else:
                    if hasattr(Funnel_items, sort):
                        query = query.order_by(getattr(Funnel_items, sort))
            else:
                query = query.order_by(Funnel_items.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching funnel_items list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Funnel_items]:
        """Update funnel_items (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Funnel_items {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated funnel_items {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating funnel_items {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete funnel_items (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Funnel_items {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted funnel_items {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting funnel_items {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Funnel_items]:
        """Get funnel_items by any field"""
        try:
            if not hasattr(Funnel_items, field_name):
                raise ValueError(f"Field {field_name} does not exist on Funnel_items")
            result = await self.db.execute(
                select(Funnel_items).where(getattr(Funnel_items, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching funnel_items by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Funnel_items]:
        """Get list of funnel_itemss filtered by field"""
        try:
            if not hasattr(Funnel_items, field_name):
                raise ValueError(f"Field {field_name} does not exist on Funnel_items")
            result = await self.db.execute(
                select(Funnel_items)
                .where(getattr(Funnel_items, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Funnel_items.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching funnel_itemss by {field_name}: {str(e)}")
            raise
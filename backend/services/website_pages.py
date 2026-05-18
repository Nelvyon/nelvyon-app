import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.website_pages import Website_pages

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Website_pagesService:
    """Service layer for Website_pages operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Website_pages]:
        """Create a new website_pages"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Website_pages(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created website_pages with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating website_pages: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for website_pages {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Website_pages]:
        """Get website_pages by ID (user can only see their own records)"""
        try:
            query = select(Website_pages).where(Website_pages.id == obj_id)
            if user_id:
                query = query.where(Website_pages.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching website_pages {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of website_pagess (user can only see their own records)"""
        try:
            query = select(Website_pages)
            count_query = select(func.count(Website_pages.id))
            
            if user_id:
                query = query.where(Website_pages.user_id == user_id)
                count_query = count_query.where(Website_pages.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Website_pages, field):
                        query = query.where(getattr(Website_pages, field) == value)
                        count_query = count_query.where(getattr(Website_pages, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Website_pages, field_name):
                        query = query.order_by(getattr(Website_pages, field_name).desc())
                else:
                    if hasattr(Website_pages, sort):
                        query = query.order_by(getattr(Website_pages, sort))
            else:
                query = query.order_by(Website_pages.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching website_pages list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Website_pages]:
        """Update website_pages (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Website_pages {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated website_pages {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating website_pages {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete website_pages (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Website_pages {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted website_pages {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting website_pages {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Website_pages]:
        """Get website_pages by any field"""
        try:
            if not hasattr(Website_pages, field_name):
                raise ValueError(f"Field {field_name} does not exist on Website_pages")
            result = await self.db.execute(
                select(Website_pages).where(getattr(Website_pages, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching website_pages by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Website_pages]:
        """Get list of website_pagess filtered by field"""
        try:
            if not hasattr(Website_pages, field_name):
                raise ValueError(f"Field {field_name} does not exist on Website_pages")
            result = await self.db.execute(
                select(Website_pages)
                .where(getattr(Website_pages, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Website_pages.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching website_pagess by {field_name}: {str(e)}")
            raise
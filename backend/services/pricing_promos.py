import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.pricing_promos import Pricing_promos

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Pricing_promosService:
    """Service layer for Pricing_promos operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Pricing_promos]:
        """Create a new pricing_promos"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Pricing_promos(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created pricing_promos with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating pricing_promos: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for pricing_promos {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Pricing_promos]:
        """Get pricing_promos by ID (user can only see their own records)"""
        try:
            query = select(Pricing_promos).where(Pricing_promos.id == obj_id)
            if user_id:
                query = query.where(Pricing_promos.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching pricing_promos {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of pricing_promoss (user can only see their own records)"""
        try:
            query = select(Pricing_promos)
            count_query = select(func.count(Pricing_promos.id))
            
            if user_id:
                query = query.where(Pricing_promos.user_id == user_id)
                count_query = count_query.where(Pricing_promos.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Pricing_promos, field):
                        query = query.where(getattr(Pricing_promos, field) == value)
                        count_query = count_query.where(getattr(Pricing_promos, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Pricing_promos, field_name):
                        query = query.order_by(getattr(Pricing_promos, field_name).desc())
                else:
                    if hasattr(Pricing_promos, sort):
                        query = query.order_by(getattr(Pricing_promos, sort))
            else:
                query = query.order_by(Pricing_promos.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching pricing_promos list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Pricing_promos]:
        """Update pricing_promos (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Pricing_promos {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated pricing_promos {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating pricing_promos {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete pricing_promos (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Pricing_promos {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted pricing_promos {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting pricing_promos {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Pricing_promos]:
        """Get pricing_promos by any field"""
        try:
            if not hasattr(Pricing_promos, field_name):
                raise ValueError(f"Field {field_name} does not exist on Pricing_promos")
            result = await self.db.execute(
                select(Pricing_promos).where(getattr(Pricing_promos, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching pricing_promos by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Pricing_promos]:
        """Get list of pricing_promoss filtered by field"""
        try:
            if not hasattr(Pricing_promos, field_name):
                raise ValueError(f"Field {field_name} does not exist on Pricing_promos")
            result = await self.db.execute(
                select(Pricing_promos)
                .where(getattr(Pricing_promos, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Pricing_promos.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching pricing_promoss by {field_name}: {str(e)}")
            raise
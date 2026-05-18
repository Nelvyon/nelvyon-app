import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.platform_metrics import Platform_metrics

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Platform_metricsService:
    """Service layer for Platform_metrics operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Platform_metrics]:
        """Create a new platform_metrics"""
        try:
            obj = Platform_metrics(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created platform_metrics with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating platform_metrics: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Platform_metrics]:
        """Get platform_metrics by ID"""
        try:
            query = select(Platform_metrics).where(Platform_metrics.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching platform_metrics {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of platform_metricss"""
        try:
            query = select(Platform_metrics)
            count_query = select(func.count(Platform_metrics.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Platform_metrics, field):
                        query = query.where(getattr(Platform_metrics, field) == value)
                        count_query = count_query.where(getattr(Platform_metrics, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Platform_metrics, field_name):
                        query = query.order_by(getattr(Platform_metrics, field_name).desc())
                else:
                    if hasattr(Platform_metrics, sort):
                        query = query.order_by(getattr(Platform_metrics, sort))
            else:
                query = query.order_by(Platform_metrics.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching platform_metrics list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Platform_metrics]:
        """Update platform_metrics"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Platform_metrics {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated platform_metrics {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating platform_metrics {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete platform_metrics"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Platform_metrics {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted platform_metrics {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting platform_metrics {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Platform_metrics]:
        """Get platform_metrics by any field"""
        try:
            if not hasattr(Platform_metrics, field_name):
                raise ValueError(f"Field {field_name} does not exist on Platform_metrics")
            result = await self.db.execute(
                select(Platform_metrics).where(getattr(Platform_metrics, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching platform_metrics by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Platform_metrics]:
        """Get list of platform_metricss filtered by field"""
        try:
            if not hasattr(Platform_metrics, field_name):
                raise ValueError(f"Field {field_name} does not exist on Platform_metrics")
            result = await self.db.execute(
                select(Platform_metrics)
                .where(getattr(Platform_metrics, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Platform_metrics.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching platform_metricss by {field_name}: {str(e)}")
            raise
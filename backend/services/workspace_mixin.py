"""
Workspace-aware service mixin for Sprint 2.5 — Multi-Tenant Hardening.

This mixin adds workspace_id filtering to ALL data queries.
Every service that handles workspace-scoped data should inherit from this.

Rules:
- create(): stamps workspace_id on new records
- get_by_id(): filters by workspace_id
- get_list(): filters by workspace_id
- update(): filters by workspace_id (prevents cross-workspace edits)
- delete(): filters by workspace_id (prevents cross-workspace deletes)

Tenant-scoped services that expose get_by_field/list_by_field must require workspace_id there
so callers cannot accidentally query across workspaces.
"""
import logging
from typing import Optional, Dict, Any, List, Type

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)


class WorkspaceAwareMixin:
    """
    Mixin that enforces workspace_id filtering on all CRUD operations.
    
    Usage:
        class ContactsService(WorkspaceAwareMixin):
            model = Contacts
            
            def __init__(self, db: AsyncSession):
                self.db = db
    """

    model: Type = None  # Subclass MUST set this

    def _apply_workspace_filter(self, query, workspace_id: Optional[int]):
        """Apply workspace_id filter if the model supports it and workspace_id is provided."""
        if workspace_id is not None and hasattr(self.model, 'workspace_id'):
            query = query.where(self.model.workspace_id == workspace_id)
        return query

    def _apply_user_filter(self, query, user_id: Optional[str]):
        """Apply user_id filter if provided."""
        if user_id and hasattr(self.model, 'user_id'):
            query = query.where(self.model.user_id == user_id)
        return query

    def _apply_filters(self, query, user_id: Optional[str] = None, workspace_id: Optional[int] = None):
        """Apply both user and workspace filters."""
        query = self._apply_user_filter(query, user_id)
        query = self._apply_workspace_filter(query, workspace_id)
        return query

    async def ws_create(
        self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ):
        """Create a record with workspace_id stamped."""
        try:
            if user_id and hasattr(self.model, "user_id"):
                data["user_id"] = user_id
            if workspace_id is not None and hasattr(self.model, 'workspace_id'):
                data['workspace_id'] = workspace_id
            obj = self.model(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created {self.model.__tablename__} id={obj.id} workspace={workspace_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating {self.model.__tablename__}: {str(e)}")
            raise

    async def ws_get_by_id(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ):
        """Get by ID with workspace isolation."""
        try:
            query = select(self.model).where(self.model.id == obj_id)
            query = self._apply_filters(query, user_id, workspace_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching {self.model.__tablename__} {obj_id}: {str(e)}")
            raise

    async def ws_get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list with workspace isolation."""
        try:
            query = select(self.model)
            count_query = select(func.count(self.model.id))

            # Apply workspace + user filters
            query = self._apply_filters(query, user_id, workspace_id)
            count_query = self._apply_filters(count_query, user_id, workspace_id)

            # Apply additional query filters
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(self.model, field):
                        query = query.where(getattr(self.model, field) == value)
                        count_query = count_query.where(getattr(self.model, field) == value)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            # Sorting
            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(self.model, field_name):
                        query = query.order_by(getattr(self.model, field_name).desc())
                else:
                    if hasattr(self.model, sort):
                        query = query.order_by(getattr(self.model, sort))
            else:
                query = query.order_by(self.model.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching {self.model.__tablename__} list: {str(e)}")
            raise

    async def ws_update(
        self, obj_id: int, update_data: Dict[str, Any],
        user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ):
        """Update with workspace isolation."""
        try:
            obj = await self.ws_get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                logger.warning(f"{self.model.__tablename__} {obj_id} not found for update (ws={workspace_id})")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key not in ('user_id', 'workspace_id'):
                    setattr(obj, key, value)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated {self.model.__tablename__} {obj_id} (ws={workspace_id})")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating {self.model.__tablename__} {obj_id}: {str(e)}")
            raise

    async def ws_delete(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> bool:
        """Delete with workspace isolation."""
        try:
            obj = await self.ws_get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                logger.warning(f"{self.model.__tablename__} {obj_id} not found for deletion (ws={workspace_id})")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted {self.model.__tablename__} {obj_id} (ws={workspace_id})")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting {self.model.__tablename__} {obj_id}: {str(e)}")
            raise
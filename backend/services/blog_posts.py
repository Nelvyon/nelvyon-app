import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.blog_posts import Blog_posts
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


class Blog_postsService(WorkspaceAwareMixin):
    """Blog posts service with workspace isolation."""

    model = Blog_posts

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _enforce_workspace_id_policy(
        self, data: Dict[str, Any], workspace_id: Optional[int]
    ) -> None:
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
            raise ValueError(
                "workspace_id in request body must match X-Workspace-Id, or omit workspace_id"
            )

    async def create(
        self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Blog_posts]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to create blog_posts")
        payload = dict(data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        return await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)

    async def check_ownership(
        self, obj_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for blog_posts {obj_id}: {str(e)}")
            return False

    async def get_by_id(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Blog_posts]:
        return await self.ws_get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self.ws_get_list(
            skip=skip,
            limit=limit,
            user_id=user_id,
            workspace_id=workspace_id,
            query_dict=query_dict,
            sort=sort,
        )

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Blog_posts]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to update blog_posts")
        payload = dict(update_data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        return await self.ws_update(
            obj_id,
            payload,
            user_id=user_id,
            workspace_id=workspace_id,
        )

    async def delete(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> bool:
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_by_field(
        self, field_name: str, field_value: Any, workspace_id: Optional[int] = None
    ) -> Optional[Blog_posts]:
        if workspace_id is None:
            raise ValueError("workspace_id is required for get_by_field on Blog_posts")
        if not hasattr(Blog_posts, field_name):
            raise ValueError(f"Field {field_name} does not exist on Blog_posts")
        result = await self.db.execute(
            select(Blog_posts).where(
                getattr(Blog_posts, field_name) == field_value,
                Blog_posts.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_field(
        self,
        field_name: str,
        field_value: Any,
        skip: int = 0,
        limit: int = 20,
        workspace_id: Optional[int] = None,
    ) -> List[Blog_posts]:
        if workspace_id is None:
            raise ValueError("workspace_id is required for list_by_field on Blog_posts")
        if not hasattr(Blog_posts, field_name):
            raise ValueError(f"Field {field_name} does not exist on Blog_posts")
        result = await self.db.execute(
            select(Blog_posts)
            .where(
                getattr(Blog_posts, field_name) == field_value,
                Blog_posts.workspace_id == workspace_id,
            )
            .offset(skip)
            .limit(limit)
            .order_by(Blog_posts.id.desc())
        )
        return result.scalars().all()

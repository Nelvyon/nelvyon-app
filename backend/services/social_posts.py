import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.nelvyon_clients import Nelvyon_clients
from models.nelvyon_projects import Nelvyon_projects
from models.social_posts import Social_posts

logger = logging.getLogger(__name__)


def _workspace_visibility(workspace_id: int, user_id: str):
    """Posts visibles en workspace: enlazados a cliente/proyecto del WS, o huérfanos propios del usuario."""
    clients_sq = select(Nelvyon_clients.id).where(Nelvyon_clients.workspace_id == workspace_id)
    projects_sq = select(Nelvyon_projects.id).where(Nelvyon_projects.workspace_id == workspace_id)
    return or_(
        Social_posts.client_id.in_(clients_sq),
        Social_posts.project_id.in_(projects_sq),
        and_(
            Social_posts.client_id.is_(None),
            Social_posts.project_id.is_(None),
            Social_posts.user_id == user_id,
        ),
    )


class Social_postsService:
    """Social posts — acotado por workspace vía client_id / project_id (sin columna workspace_id en social_posts)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _validate_client_project_for_workspace(
        self, workspace_id: int, client_id: Optional[int], project_id: Optional[int]
    ) -> None:
        if client_id is not None:
            r = await self.db.execute(
                select(Nelvyon_clients.id).where(
                    Nelvyon_clients.id == client_id,
                    Nelvyon_clients.workspace_id == workspace_id,
                )
            )
            if r.scalar_one_or_none() is None:
                raise ValueError("client_id no pertenece al workspace activo")
        if project_id is not None:
            r2 = await self.db.execute(
                select(Nelvyon_projects.id).where(
                    Nelvyon_projects.id == project_id,
                    Nelvyon_projects.workspace_id == workspace_id,
                )
            )
            if r2.scalar_one_or_none() is None:
                raise ValueError("project_id no pertenece al workspace activo")

    async def create(
        self,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Social_posts]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id son obligatorios para crear social_posts")
        try:
            payload = dict(data)
            cid = payload.get("client_id")
            pid = payload.get("project_id")
            await self._validate_client_project_for_workspace(
                workspace_id,
                int(cid) if cid is not None else None,
                int(pid) if pid is not None else None,
            )
            payload["user_id"] = user_id
            obj = Social_posts(**payload)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created social_posts id={obj.id} workspace={workspace_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating social_posts: {str(e)}")
            raise

    async def get_by_id(
        self,
        obj_id: int,
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Social_posts]:
        try:
            query = select(Social_posts).where(Social_posts.id == obj_id)
            if workspace_id is not None and user_id is not None:
                query = query.where(_workspace_visibility(workspace_id, user_id))
            elif user_id:
                query = query.where(Social_posts.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching social_posts {obj_id}: {str(e)}")
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
            query = select(Social_posts)
            count_query = select(func.count(Social_posts.id))

            if workspace_id is not None and user_id is not None:
                vis = _workspace_visibility(workspace_id, user_id)
                query = query.where(vis)
                count_query = count_query.where(vis)
            elif user_id:
                query = query.where(Social_posts.user_id == user_id)
                count_query = count_query.where(Social_posts.user_id == user_id)

            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Social_posts, field):
                        query = query.where(getattr(Social_posts, field) == value)
                        count_query = count_query.where(getattr(Social_posts, field) == value)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith("-"):
                    field_name = sort[1:]
                    if hasattr(Social_posts, field_name):
                        query = query.order_by(getattr(Social_posts, field_name).desc())
                else:
                    if hasattr(Social_posts, sort):
                        query = query.order_by(getattr(Social_posts, sort))
            else:
                query = query.order_by(Social_posts.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching social_posts list: {str(e)}")
            raise

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Social_posts]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id son obligatorios para actualizar social_posts")
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                return None
            payload = dict(update_data)
            new_c = payload.get("client_id", obj.client_id)
            new_p = payload.get("project_id", obj.project_id)
            if "client_id" in payload or "project_id" in payload:
                await self._validate_client_project_for_workspace(
                    workspace_id,
                    int(new_c) if new_c is not None else None,
                    int(new_p) if new_p is not None else None,
                )
            for key, value in payload.items():
                if hasattr(obj, key) and key != "user_id":
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated social_posts {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating social_posts {obj_id}: {str(e)}")
            raise

    async def delete(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> bool:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id son obligatorios para borrar social_posts")
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            if not obj:
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted social_posts {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting social_posts {obj_id}: {str(e)}")
            raise

    async def check_ownership(
        self, obj_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for social_posts {obj_id}: {str(e)}")
            return False

    async def get_by_field(
        self, field_name: str, field_value: Any, workspace_id: Optional[int] = None
    ) -> Optional[Social_posts]:
        if workspace_id is None:
            raise ValueError("workspace_id es obligatorio para get_by_field en Social_posts")
        if not hasattr(Social_posts, field_name):
            raise ValueError(f"Field {field_name} does not exist on Social_posts")
        in_clients = Social_posts.client_id.in_(
            select(Nelvyon_clients.id).where(Nelvyon_clients.workspace_id == workspace_id)
        )
        in_projects = Social_posts.project_id.in_(
            select(Nelvyon_projects.id).where(Nelvyon_projects.workspace_id == workspace_id)
        )
        result = await self.db.execute(
            select(Social_posts).where(
                getattr(Social_posts, field_name) == field_value,
                or_(in_clients, in_projects),
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
    ) -> List[Social_posts]:
        if workspace_id is None:
            raise ValueError("workspace_id es obligatorio para list_by_field en Social_posts")
        if not hasattr(Social_posts, field_name):
            raise ValueError(f"Field {field_name} does not exist on Social_posts")
        vis = or_(
            Social_posts.client_id.in_(
                select(Nelvyon_clients.id).where(Nelvyon_clients.workspace_id == workspace_id)
            ),
            Social_posts.project_id.in_(
                select(Nelvyon_projects.id).where(Nelvyon_projects.workspace_id == workspace_id)
            ),
        )
        result = await self.db.execute(
            select(Social_posts)
            .where(getattr(Social_posts, field_name) == field_value)
            .where(vis)
            .offset(skip)
            .limit(limit)
            .order_by(Social_posts.id.desc())
        )
        return result.scalars().all()

"""
Workspace dependency — resolves the active workspace from the X-Workspace-Id header.
Validates that the user is a member of the requested workspace.
If no header is provided, returns None (backward-compatible).
"""
import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.i18n import apply_workspace_language, request_language, t
from core.observability import set_workspace_id_for_log
from core.rbac import workspace_can_mutate
from dependencies.auth import get_current_user
from models.workspaces import Workspaces
from models.workspace_members import Workspace_members
from schemas.auth import UserResponse
from services.audit_events import write_audit_event

logger = logging.getLogger(__name__)


class WorkspaceContext:
    """Holds the resolved workspace info for the current request."""

    def __init__(
        self,
        workspace_id: Optional[int],
        user_id: str,
        user_email: Optional[str] = None,
        role_in_workspace: Optional[str] = None,
    ):
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.user_email = user_email
        self.role_in_workspace = role_in_workspace

    @property
    def is_workspace_scoped(self) -> bool:
        return self.workspace_id is not None


async def get_workspace_context(
    request: Request,
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    """
    Resolve workspace context from the X-Workspace-Id header.

    Rules:
    - If no header → returns context with workspace_id=None (backward compat)
    - If header present → validates user is owner or member of that workspace
    - Super admins bypass membership check
    """
    user_id = str(current_user.id)

    if not x_workspace_id:
        set_workspace_id_for_log(None, "")
        request.state.obs_workspace_id = ""
        return WorkspaceContext(
            workspace_id=None,
            user_id=user_id,
            user_email=current_user.email or None,
        )

    try:
        ws_id = int(x_workspace_id)
    except (ValueError, TypeError):
        lang = request_language(request)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=t("workspace_id_invalid", lang),
        )

    # Super admin bypasses membership check
    if current_user.role == "super_admin":
        ws_lang_result = await db.execute(select(Workspaces).where(Workspaces.id == ws_id))
        apply_workspace_language(request, ws_lang_result.scalar_one_or_none())
        set_workspace_id_for_log(ws_id, x_workspace_id)
        request.state.obs_workspace_id = str(ws_id)
        return WorkspaceContext(
            workspace_id=ws_id,
            user_id=user_id,
            user_email=current_user.email or None,
            role_in_workspace="owner",
        )

    # Check if user is the workspace owner
    ws_result = await db.execute(
        select(Workspaces).where(Workspaces.id == ws_id, Workspaces.user_id == user_id)
    )
    workspace = ws_result.scalar_one_or_none()

    if workspace:
        apply_workspace_language(request, workspace)
        set_workspace_id_for_log(ws_id, x_workspace_id)
        request.state.obs_workspace_id = str(ws_id)
        return WorkspaceContext(
            workspace_id=ws_id,
            user_id=user_id,
            user_email=current_user.email or None,
            role_in_workspace="owner",
        )

    # Check if user is a member (limit 1: datos legacy/tests pueden duplicar filas sin UNIQUE)
    member_result = await db.execute(
        select(Workspace_members)
        .where(
            Workspace_members.workspace_id == ws_id,
            Workspace_members.user_id == user_id,
            Workspace_members.status == "active",
        )
        .order_by(Workspace_members.id.asc())
        .limit(1)
    )
    member = member_result.scalars().first()

    if member:
        ws_lang_result = await db.execute(select(Workspaces).where(Workspaces.id == ws_id))
        apply_workspace_language(request, ws_lang_result.scalar_one_or_none())
        set_workspace_id_for_log(ws_id, x_workspace_id)
        request.state.obs_workspace_id = str(ws_id)
        return WorkspaceContext(
            workspace_id=ws_id,
            user_id=user_id,
            user_email=current_user.email or None,
            role_in_workspace=member.role,
        )

    lang = request_language(request)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=t("workspace_access_denied", lang),
    )


async def require_workspace(
    request: Request,
    ctx: WorkspaceContext = Depends(get_workspace_context),
) -> WorkspaceContext:
    """
    Strict dependency — requires a valid workspace_id in the header.
    Use this for endpoints that MUST be workspace-scoped.
    """
    if not ctx.is_workspace_scoped:
        lang = request_language(request)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=t("workspace_id_required", lang),
        )
    return ctx


async def require_workspace_admin(
    request: Request,
    ctx: WorkspaceContext = Depends(require_workspace),
) -> WorkspaceContext:
    """Requires workspace owner or admin role."""
    if ctx.role_in_workspace not in ("owner", "admin"):
        lang = request_language(request)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=t("workspace_admin_required", lang),
        )
    return ctx


async def require_workspace_operator(
    request: Request,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    """
    Mutaciones CRM / workflows / campañas / inbox operativo.
    Requiere owner, admin u operator en el workspace (no member/viewer).
    """
    if workspace_can_mutate(ctx.role_in_workspace):
        return ctx
    await write_audit_event(
        db,
        actor_user_id=ctx.user_id,
        actor_email=ctx.user_email,
        workspace_id=ctx.workspace_id,
        action=request.method.lower(),
        resource_type="workspace_scope",
        resource_id=request.url.path,
        result="denied",
        event_type="saas.rbac.denied",
        commit=True,
    )
    lang = request_language(request)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=t("workspace_operator_required", lang),
    )
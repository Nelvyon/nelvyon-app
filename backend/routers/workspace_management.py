"""
Workspace Management Router — Handles workspace CRUD, member invitations,
role management, and workspace switching.
Separate from the auto-generated entity CRUD router.
"""
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
from models.workspaces import Workspaces
from models.workspace_members import Workspace_members
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workspace", tags=["workspace-management"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class WorkspaceCreateRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None


class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    role: str  # The current user's role in this workspace
    members_count: int = 0
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MemberInviteRequest(BaseModel):
    email: str
    role: str = "member"  # admin, operator, member, viewer


class MemberResponse(BaseModel):
    id: int
    user_id: str
    email: Optional[str] = None
    role: str
    status: str
    joined_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MemberRoleUpdateRequest(BaseModel):
    role: str  # admin, operator, member, viewer


def _format_created_at(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


async def _count_workspace_members(db: AsyncSession, workspace_id: int) -> int:
    try:
        mc = (
            await db.execute(
                select(func.count(Workspace_members.id)).where(
                    Workspace_members.workspace_id == workspace_id
                )
            )
        ).scalar()
        return int(mc or 0)
    except Exception as exc:
        logger.debug("workspace member count skipped for ws=%s: %s", workspace_id, exc)
        return 0


async def _ensure_default_workspace(db: AsyncSession, user_id: str) -> WorkspaceResponse:
    default_ws = Workspaces(
        user_id=user_id,
        name="Mi Workspace",
        slug="default",
        status="active",
        plan="starter",
        created_at=datetime.now(timezone.utc),
    )
    db.add(default_ws)
    await db.commit()
    await db.refresh(default_ws)
    logger.info("Auto-created default workspace %s for user %s", default_ws.id, user_id)
    return WorkspaceResponse(
        id=default_ws.id,
        name=default_ws.name,
        slug=default_ws.slug,
        logo_url=None,
        primary_color=None,
        domain=None,
        plan=default_ws.plan,
        status=default_ws.status,
        role="owner",
        members_count=1,
        created_at=_format_created_at(default_ws.created_at),
    )


# ── List user's workspaces ──────────────────────────────────────────────────

@router.get("/list", response_model=List[WorkspaceResponse])
async def list_my_workspaces(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all workspaces the current user owns or is a member of.
    This is used by the workspace selector in the UI.
    """
    user_id = str(current_user.id)
    workspaces: list[WorkspaceResponse] = []

    try:
        owned_result = await db.execute(
            select(Workspaces).where(
                Workspaces.user_id == user_id,
                or_(Workspaces.status == "active", Workspaces.status.is_(None)),
            ).order_by(Workspaces.id.asc())
        )
        for ws in owned_result.scalars().all():
            mc = await _count_workspace_members(db, ws.id)
            workspaces.append(
                WorkspaceResponse(
                    id=ws.id,
                    name=ws.name,
                    slug=ws.slug,
                    logo_url=ws.logo_url,
                    primary_color=ws.primary_color,
                    domain=ws.domain,
                    plan=ws.plan,
                    status=ws.status,
                    role="owner",
                    members_count=mc + 1,
                    created_at=_format_created_at(ws.created_at),
                )
            )

        try:
            member_result = await db.execute(
                select(Workspace_members).where(
                    Workspace_members.user_id == user_id,
                    Workspace_members.status == "active",
                )
            )
            owned_ids = {ws.id for ws in workspaces}

            for member in member_result.scalars().all():
                if member.workspace_id in owned_ids:
                    continue

                ws_result = await db.execute(
                    select(Workspaces).where(Workspaces.id == member.workspace_id)
                )
                ws = ws_result.scalar_one_or_none()
                if not ws:
                    continue

                mc = await _count_workspace_members(db, ws.id)
                workspaces.append(
                    WorkspaceResponse(
                        id=ws.id,
                        name=ws.name,
                        slug=ws.slug,
                        logo_url=ws.logo_url,
                        primary_color=ws.primary_color,
                        domain=ws.domain,
                        plan=ws.plan,
                        status=ws.status,
                        role=member.role or "member",
                        members_count=mc + 1,
                        created_at=_format_created_at(ws.created_at),
                    )
                )
        except Exception as exc:
            logger.warning("workspace member listing skipped for user %s: %s", user_id, exc)

        if not workspaces:
            workspaces.append(await _ensure_default_workspace(db, user_id))

        return workspaces
    except Exception as exc:
        logger.error("list_my_workspaces failed for user %s: %s", user_id, exc, exc_info=True)
        try:
            await db.rollback()
        except Exception:
            pass
        try:
            return [await _ensure_default_workspace(db, user_id)]
        except Exception as inner:
            logger.error("default workspace bootstrap failed: %s", inner, exc_info=True)
            raise HTTPException(status_code=500, detail="Could not load workspaces") from inner


# ── Create workspace ─────────────────────────────────────────────────────────

@router.post("/create", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    data: WorkspaceCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace. The creator becomes the owner."""
    user_id = str(current_user.id)

    # Límite: producción 10; en `ENVIRONMENT=test` se puede subir (suite acumulativa) sin tocar prod.
    if (settings.environment or "").lower() == "test":
        max_ws = int((os.environ.get("NELVYON_TEST_MAX_WORKSPACES_PER_USER") or "64").strip() or "64")
    else:
        max_ws = 10
    if max_ws < 1:
        max_ws = 10
    count_result = await db.execute(
        select(func.count(Workspaces.id)).where(Workspaces.user_id == user_id)
    )
    count = count_result.scalar() or 0
    if count >= max_ws:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum of {max_ws} workspaces per user",
        )

    slug = data.slug or data.name.lower().replace(" ", "-").replace("_", "-")[:50]

    ws = Workspaces(
        user_id=user_id,
        name=data.name,
        slug=slug,
        logo_url=data.logo_url,
        primary_color=data.primary_color,
        status="active",
        plan="starter",
        created_at=datetime.now(timezone.utc),
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)

    logger.info(f"Workspace created: {ws.id} by user {user_id}")

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        logo_url=ws.logo_url,
        primary_color=ws.primary_color,
        domain=ws.domain,
        plan=ws.plan,
        status=ws.status,
        role="owner",
        members_count=1,
        created_at=ws.created_at.isoformat() if ws.created_at else None,
    )


# ── Update workspace ─────────────────────────────────────────────────────────

@router.put("/update", response_model=WorkspaceResponse)
async def update_workspace(
    data: WorkspaceUpdateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update workspace settings. Requires admin or owner role."""
    ws_result = await db.execute(
        select(Workspaces).where(Workspaces.id == ctx.workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if data.name is not None:
        ws.name = data.name
    if data.slug is not None:
        ws.slug = data.slug
    if data.logo_url is not None:
        ws.logo_url = data.logo_url
    if data.primary_color is not None:
        ws.primary_color = data.primary_color
    if data.domain is not None:
        ws.domain = data.domain

    await db.commit()
    await db.refresh(ws)

    mc = (await db.execute(
        select(func.count(Workspace_members.id)).where(
            Workspace_members.workspace_id == ws.id
        )
    )).scalar() or 0

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        logo_url=ws.logo_url,
        primary_color=ws.primary_color,
        domain=ws.domain,
        plan=ws.plan,
        status=ws.status,
        role=ctx.role_in_workspace or "owner",
        members_count=mc + 1,
        created_at=ws.created_at.isoformat() if ws.created_at else None,
    )


# ── Delete workspace ─────────────────────────────────────────────────────────

@router.delete("/delete")
async def delete_workspace(
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a workspace (set status to 'archived'). Owner only."""
    if ctx.role_in_workspace != "owner":
        raise HTTPException(status_code=403, detail="Only workspace owner can delete")

    ws_result = await db.execute(
        select(Workspaces).where(Workspaces.id == ctx.workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws.status = "archived"
    await db.commit()

    return {"message": "Workspace archived", "id": ctx.workspace_id}


# ── List members ─────────────────────────────────────────────────────────────

@router.get("/members", response_model=List[MemberResponse])
async def list_workspace_members(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List all members of the current workspace."""
    result = await db.execute(
        select(Workspace_members).where(
            Workspace_members.workspace_id == ctx.workspace_id
        ).order_by(Workspace_members.id.asc())
    )
    members = result.scalars().all()

    return [
        MemberResponse(
            id=m.id,
            user_id=m.user_id,
            email=m.email,
            role=m.role,
            status=m.status,
            joined_at=m.joined_at,
        )
        for m in members
    ]


# ── Invite member ────────────────────────────────────────────────────────────

@router.post("/members/invite", response_model=MemberResponse, status_code=201)
async def invite_member(
    data: MemberInviteRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Invite a new member to the workspace. Requires admin or owner."""
    if data.role not in ("admin", "operator", "member", "viewer"):
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Must be: admin, operator, member, viewer",
        )
    # Check if already a member
    existing = await db.execute(
        select(Workspace_members).where(
            Workspace_members.workspace_id == ctx.workspace_id,
            Workspace_members.email == data.email,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    # Check member limit (max 50)
    count = (await db.execute(
        select(func.count(Workspace_members.id)).where(
            Workspace_members.workspace_id == ctx.workspace_id
        )
    )).scalar() or 0
    if count >= 50:
        raise HTTPException(status_code=400, detail="Maximum of 50 members per workspace")

    member = Workspace_members(
        workspace_id=ctx.workspace_id,
        user_id="",  # Will be set when user accepts invite
        email=data.email,
        role=data.role,
        status="invited",
        invited_by=ctx.user_id,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    logger.info(f"Member invited: {data.email} to workspace {ctx.workspace_id}")

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        email=member.email,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
    )


# ── Update member role ───────────────────────────────────────────────────────

@router.put("/members/{member_id}/role", response_model=MemberResponse)
async def update_member_role(
    member_id: int,
    data: MemberRoleUpdateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update a member's role. Requires admin or owner."""
    result = await db.execute(
        select(Workspace_members).where(
            Workspace_members.id == member_id,
            Workspace_members.workspace_id == ctx.workspace_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if data.role not in ("admin", "operator", "member", "viewer"):
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Must be: admin, operator, member, viewer",
        )

    member.role = data.role
    await db.commit()
    await db.refresh(member)

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        email=member.email,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
    )


# ── Remove member ────────────────────────────────────────────────────────────

@router.delete("/members/{member_id}")
async def remove_member(
    member_id: int,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the workspace. Requires admin or owner."""
    result = await db.execute(
        select(Workspace_members).where(
            Workspace_members.id == member_id,
            Workspace_members.workspace_id == ctx.workspace_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(member)
    await db.commit()

    return {"message": "Member removed", "id": member_id}
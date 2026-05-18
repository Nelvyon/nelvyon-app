"""
RBAC Management Router — v1
Unified role-based access control management for NELVYON platform.
All role changes are audit-logged. Only admins can modify roles.

Roles hierarchy: super_admin > admin > manager > user > viewer
"""
import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user, get_admin_user
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rbac", tags=["rbac_management"])

VALID_ROLES = {"super_admin", "admin", "manager", "user", "viewer"}
ROLE_HIERARCHY = {"super_admin": 5, "admin": 4, "manager": 3, "user": 2, "viewer": 1}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class AssignRoleRequest(BaseModel):
    target_user_id: str
    target_email: Optional[str] = None
    role: str
    permissions_json: Optional[str] = None


class RoleAssignment(BaseModel):
    id: int
    user_id: str
    email: Optional[str] = None
    role: str
    permissions_json: Optional[str] = None
    assigned_by: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoleListResponse(BaseModel):
    items: List[RoleAssignment]
    total: int


class MyRoleResponse(BaseModel):
    role: str
    permissions: List[str]
    role_record_id: Optional[int] = None
    assigned_by: Optional[str] = None


class RoleDefinition(BaseModel):
    role: str
    level: int
    label: str
    description: str
    default_permissions: List[str]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Helper: audit log
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def _audit(db: AsyncSession, user_id: str, event_type: str, description: str, details: dict):
    """Write an RBAC audit entry."""
    try:
        await db.execute(
            text("""
                INSERT INTO security_events
                (user_id, event_type, severity, source, description, details_json, status, created_at)
                VALUES (:uid, :etype, 'warning', 'rbac', :desc, :details, 'logged', :now)
            """),
            {
                "uid": user_id, "etype": event_type,
                "desc": description,
                "details": json.dumps(details, default=str),
                "now": datetime.utcnow(),
            },
        )
    except Exception as e:
        logger.warning(f"Audit log write failed: {e}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/roles", response_model=List[RoleDefinition])
async def get_role_definitions(
    current_user: UserResponse = Depends(get_current_user),
):
    """Get all available role definitions with their permissions."""
    from importlib import import_module
    definitions = []
    role_labels = {
        "super_admin": ("Super Admin", "Acceso total a la plataforma"),
        "admin": ("Administrador", "Gestión completa de módulos y usuarios"),
        "manager": ("Manager", "Gestión de equipos y proyectos"),
        "user": ("Usuario", "Operaciones estándar de la plataforma"),
        "viewer": ("Visor", "Solo lectura en todos los módulos"),
    }
    # Default permission sets per role
    default_perms = {
        "super_admin": ["*"],
        "admin": [
            "clients:*", "projects:*", "outputs:*", "campaigns:*", "contacts:*",
            "funnels:*", "workflows:*", "blog:*", "calendar:*", "helpdesk:*",
            "billing:*", "platform:*", "agents:*", "templates:*", "users:*",
            "partners:*", "reports:*", "security:*", "presentations:*",
            "segmentation:*", "sales:*", "integrations:*",
        ],
        "manager": [
            "clients:read", "clients:create", "clients:update",
            "projects:*", "outputs:*", "campaigns:*", "contacts:*",
            "helpdesk:*", "agents:read", "agents:configure",
            "reports:read", "reports:create",
        ],
        "user": [
            "clients:read", "clients:create", "clients:update",
            "projects:read", "projects:create", "projects:update",
            "outputs:read", "outputs:create", "outputs:generate",
            "campaigns:read", "campaigns:create",
            "contacts:read", "contacts:create", "contacts:update",
            "helpdesk:read", "helpdesk:create", "helpdesk:update",
        ],
        "viewer": [
            "clients:read", "projects:read", "outputs:read", "campaigns:read",
            "contacts:read", "helpdesk:read", "reports:read",
        ],
    }
    for role_name in ["super_admin", "admin", "manager", "user", "viewer"]:
        label, desc = role_labels[role_name]
        definitions.append(RoleDefinition(
            role=role_name,
            level=ROLE_HIERARCHY[role_name],
            label=label,
            description=desc,
            default_permissions=default_perms.get(role_name, []),
        ))
    return definitions


@router.get("/my-role", response_model=MyRoleResponse)
async def get_my_role(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's role and permissions."""
    user_id = str(current_user.id)

    result = await db.execute(
        text("""
            SELECT id, role, permissions_json, assigned_by
            FROM user_roles
            WHERE user_id = :uid AND (is_active = true OR is_active IS NULL)
            ORDER BY created_at DESC LIMIT 1
        """),
        {"uid": user_id},
    )
    row = result.mappings().first()

    if row:
        perms = []
        if row.get("permissions_json"):
            try:
                perms = json.loads(row["permissions_json"])
            except (json.JSONDecodeError, TypeError):
                perms = []
        return MyRoleResponse(
            role=row["role"],
            permissions=perms,
            role_record_id=row["id"],
            assigned_by=row.get("assigned_by"),
        )

    # Fallback: use JWT role
    return MyRoleResponse(
        role=current_user.role or "user",
        permissions=[],
        role_record_id=None,
        assigned_by=None,
    )


@router.get("/assignments", response_model=RoleListResponse)
async def list_role_assignments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all role assignments. Admin only."""
    count_result = await db.execute(text("SELECT COUNT(*) as cnt FROM user_roles"))
    total = (count_result.mappings().first() or {}).get("cnt", 0)

    result = await db.execute(
        text("""
            SELECT id, user_id, email, role, permissions_json, assigned_by, is_active, created_at, updated_at
            FROM user_roles
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """),
        {"skip": skip, "limit": limit},
    )
    items = [RoleAssignment(**dict(r)) for r in result.mappings().all()]

    return RoleListResponse(items=items, total=total)


@router.post("/assign", response_model=RoleAssignment, status_code=201)
async def assign_role(
    req: AssignRoleRequest,
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign or update a role for a user. Admin only.
    - Cannot assign a role higher than your own
    - Audit-logged
    """
    admin_id = str(current_user.id)

    if req.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Rol inválido. Válidos: {', '.join(sorted(VALID_ROLES))}")

    # Check hierarchy: admin can't assign super_admin
    admin_level = ROLE_HIERARCHY.get(current_user.role, 2)
    target_level = ROLE_HIERARCHY.get(req.role, 1)
    if target_level > admin_level:
        raise HTTPException(
            status_code=403,
            detail=f"No puedes asignar un rol superior al tuyo ({current_user.role})",
        )

    now = datetime.utcnow()

    # Check if user already has a role
    existing = await db.execute(
        text("SELECT id, role FROM user_roles WHERE user_id = :uid ORDER BY created_at DESC LIMIT 1"),
        {"uid": req.target_user_id},
    )
    existing_row = existing.mappings().first()

    if existing_row:
        old_role = existing_row["role"]
        # Update existing
        await db.execute(
            text("""
                UPDATE user_roles
                SET role = :role, email = COALESCE(:email, email),
                    permissions_json = :perms, assigned_by = :admin,
                    is_active = true, updated_at = :now
                WHERE id = :id
            """),
            {
                "role": req.role, "email": req.target_email,
                "perms": req.permissions_json, "admin": admin_id,
                "now": now, "id": existing_row["id"],
            },
        )
        await _audit(db, admin_id, "rbac.role_changed", f"Rol cambiado: {old_role} → {req.role}", {
            "target_user_id": req.target_user_id,
            "old_role": old_role,
            "new_role": req.role,
            "assigned_by": admin_id,
        })
        await db.commit()

        # Fetch updated
        updated = await db.execute(
            text("SELECT * FROM user_roles WHERE id = :id"),
            {"id": existing_row["id"]},
        )
        return RoleAssignment(**dict(updated.mappings().first()))
    else:
        # Create new
        result = await db.execute(
            text("""
                INSERT INTO user_roles
                (user_id, email, role, permissions_json, assigned_by, is_active, created_at, updated_at)
                VALUES (:uid, :email, :role, :perms, :admin, true, :now, :now)
                RETURNING id, user_id, email, role, permissions_json, assigned_by, is_active, created_at, updated_at
            """),
            {
                "uid": req.target_user_id, "email": req.target_email,
                "role": req.role, "perms": req.permissions_json,
                "admin": admin_id, "now": now,
            },
        )
        await _audit(db, admin_id, "rbac.role_assigned", f"Rol asignado: {req.role}", {
            "target_user_id": req.target_user_id,
            "role": req.role,
            "assigned_by": admin_id,
        })
        await db.commit()
        row = result.mappings().first()
        return RoleAssignment(**dict(row))


@router.delete("/revoke/{target_user_id}")
async def revoke_role(
    target_user_id: str,
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (deactivate) a user's role. Admin only."""
    admin_id = str(current_user.id)

    # Can't revoke own role
    if target_user_id == admin_id:
        raise HTTPException(status_code=400, detail="No puedes revocar tu propio rol")

    result = await db.execute(
        text("SELECT id, role FROM user_roles WHERE user_id = :uid AND is_active = true"),
        {"uid": target_user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Asignación de rol no encontrada")

    await db.execute(
        text("UPDATE user_roles SET is_active = false, updated_at = :now WHERE id = :id"),
        {"id": row["id"], "now": datetime.utcnow()},
    )
    await _audit(db, admin_id, "rbac.role_revoked", f"Rol revocado: {row['role']}", {
        "target_user_id": target_user_id,
        "revoked_role": row["role"],
        "revoked_by": admin_id,
    })
    await db.commit()

    return {"message": f"Rol '{row['role']}' revocado para usuario {target_user_id}"}
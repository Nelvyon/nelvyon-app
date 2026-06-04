"""
Tenant Management Router — Multi-tenancy real for NELVYON.
Handles tenant settings, data isolation, feature flags, and tenant-level configuration.
Each workspace = 1 tenant. Tenant settings extend workspace with business config.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tenant", tags=["tenant-management"])

# ── Available modules for feature toggling ──
ALL_MODULES = [
    "crm", "pipelines", "campaigns", "funnels", "social", "helpdesk",
    "conversations", "calls", "calendar", "websites", "forms", "blog",
    "payments", "reports", "workflows", "partners", "contracts",
    "agents", "analytics", "integrations", "automation", "billing",
]

TIMEZONES = [
    "UTC", "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Sao_Paulo", "America/Mexico_City",
    "America/Bogota", "America/Buenos_Aires", "America/Lima",
    "Europe/London", "Europe/Madrid", "Europe/Paris", "Europe/Berlin",
    "Europe/Rome", "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai",
    "Asia/Kolkata", "Australia/Sydney",
]

LOCALES = [
    "es", "en", "pt", "fr", "de", "it", "ja", "zh", "ar", "ko",
]

INDUSTRIES = [
    "technology", "marketing", "ecommerce", "healthcare", "education",
    "finance", "real_estate", "consulting", "media", "manufacturing",
    "hospitality", "legal", "nonprofit", "other",
]


# ── Schemas ──

class TenantSettingsResponse(BaseModel):
    workspace_id: int
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    # Extended tenant fields
    timezone: str = "UTC"
    locale: str = "es"
    industry: str = "other"
    billing_email: Optional[str] = None
    max_users: int = 10
    enabled_modules: List[str] = []
    features_json: Optional[str] = None
    created_at: Optional[str] = None


class TenantSettingsUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None
    industry: Optional[str] = None
    billing_email: Optional[str] = None
    max_users: Optional[int] = None
    enabled_modules: Optional[List[str]] = None


class TenantModulePermission(BaseModel):
    user_id: str
    email: Optional[str] = None
    module: str
    actions: List[str]  # ["read", "create", "update", "delete"]


class TenantModulePermissionResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: str
    email: Optional[str] = None
    module: str
    actions_json: str
    granted_by: Optional[str] = None
    created_at: Optional[str] = None


class TenantDataIsolationStats(BaseModel):
    workspace_id: int
    tables_with_data: Dict[str, int]
    total_records: int
    storage_estimate_mb: float


class BrandingPolicyFieldState(BaseModel):
    field: str
    state: str  # enabled | blocked | inherited
    reason: str
    source: str  # global | plan | override


class TenantBrandingPolicyResponse(BaseModel):
    workspace_id: int
    workspace_name: str
    plan: str
    status: str
    branding_v2_advanced_enabled: bool
    global_hq_lock: bool
    fields: List[BrandingPolicyFieldState]
    notes: List[str]


class TenantBrandingActivationRequest(BaseModel):
    enabled: bool
    note: Optional[str] = None


class TenantBrandingActivationLogItem(BaseModel):
    id: int
    workspace_id: int
    actor_user_id: str
    actor_email: Optional[str] = None
    from_enabled: bool
    to_enabled: bool
    note: Optional[str] = None
    created_at: Optional[str] = None


class TenantMemberWithPermissions(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str
    status: str
    module_permissions: Dict[str, List[str]]


# ── Ensure tenant columns exist ──

async def _ensure_tenant_columns(db: AsyncSession):
    """Add tenant-specific columns to workspaces table if they don't exist."""
    columns = {
        "timezone": "VARCHAR DEFAULT 'UTC'",
        "locale": "VARCHAR DEFAULT 'es'",
        "industry": "VARCHAR DEFAULT 'other'",
        "billing_email": "VARCHAR",
        "max_users": "INTEGER DEFAULT 10",
        "features_json": "TEXT",
    }
    for col_name, col_type in columns.items():
        try:
            await db.execute(text(
                f"ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
            ))
        except Exception:
            pass
    await db.commit()


async def _ensure_permissions_table(db: AsyncSession):
    """Create tenant_module_permissions table if it doesn't exist."""
    try:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS tenant_module_permissions (
                id SERIAL PRIMARY KEY,
                workspace_id INTEGER NOT NULL,
                user_id VARCHAR NOT NULL,
                email VARCHAR,
                module VARCHAR NOT NULL,
                actions_json TEXT NOT NULL DEFAULT '[]',
                granted_by VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(workspace_id, user_id, module)
            )
        """))
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to create tenant_module_permissions: {e}")
        await db.rollback()


async def _ensure_branding_activation_log_table(db: AsyncSession):
    try:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS tenant_branding_activation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                actor_user_id VARCHAR NOT NULL,
                actor_email VARCHAR,
                from_enabled INTEGER NOT NULL DEFAULT 0,
                to_enabled INTEGER NOT NULL DEFAULT 0,
                note VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to create tenant_branding_activation_logs: {e}")
        await db.rollback()


def _plan_in_advanced_allowlist(plan: Optional[str]) -> bool:
    import os
    raw = (os.environ.get("BRANDING_V2_ADVANCED_PLAN_IDS") or "pro,enterprise").strip()
    allow = {p.strip().lower() for p in raw.split(",") if p.strip()}
    return (plan or "").strip().lower() in allow


def _global_hq_lock_enabled() -> bool:
    import os
    return (os.environ.get("BRANDING_V2_HQ_LOCK") or "0").strip() == "1"


def _extract_branding_v2_enabled(features_json: Optional[str]) -> bool:
    if not features_json:
        return False
    try:
        data = json.loads(features_json)
        return bool(data.get("branding_v2_advanced_enabled"))
    except (json.JSONDecodeError, TypeError):
        return False


def _set_branding_v2_enabled(features_json: Optional[str], enabled: bool) -> str:
    data: Dict[str, Any]
    try:
        data = json.loads(features_json) if features_json else {}
        if not isinstance(data, dict):
            data = {}
    except (json.JSONDecodeError, TypeError):
        data = {}
    data["branding_v2_advanced_enabled"] = bool(enabled)
    return json.dumps(data)


def _build_branding_policy(
    *,
    workspace_id: int,
    workspace_name: str,
    plan: Optional[str],
    status: Optional[str],
    features_json: Optional[str],
) -> TenantBrandingPolicyResponse:
    plan_id = (plan or "starter").strip().lower()
    ws_status = (status or "unknown").strip().lower()
    plan_ok = _plan_in_advanced_allowlist(plan_id)
    hq_lock = _global_hq_lock_enabled()
    v2_enabled = _extract_branding_v2_enabled(features_json)

    notes: List[str] = []
    if not plan_ok:
        notes.append("Plan does not include branding v2 advanced.")
    if hq_lock:
        notes.append("Branding v2 is centrally controlled by HQ lock.")
    if ws_status not in ("active", ""):
        notes.append(f"Workspace status is '{ws_status}' (activation guard expects active).")
    if not notes:
        notes.append("Policy is healthy for branding v2 advanced controls.")

    def field_state(field: str) -> BrandingPolicyFieldState:
        if hq_lock:
            return BrandingPolicyFieldState(
                field=field,
                state="inherited",
                reason="Centralized by HQ policy lock.",
                source="global",
            )
        if not plan_ok:
            return BrandingPolicyFieldState(
                field=field,
                state="blocked",
                reason="Plan does not include branding advanced controls.",
                source="plan",
            )
        if not v2_enabled:
            return BrandingPolicyFieldState(
                field=field,
                state="blocked",
                reason="Branding v2 advanced is OFF for this tenant/workspace.",
                source="override",
            )
        return BrandingPolicyFieldState(
            field=field,
            state="enabled",
            reason="Allowed by effective tenant branding v2 policy.",
            source="override",
        )

    return TenantBrandingPolicyResponse(
        workspace_id=workspace_id,
        workspace_name=workspace_name,
        plan=plan_id,
        status=ws_status or "unknown",
        branding_v2_advanced_enabled=v2_enabled,
        global_hq_lock=hq_lock,
        fields=[field_state("slug"), field_state("logo_url"), field_state("accent_color")],
        notes=notes,
    )


# onboarding_progress: creada solo vía Alembic (pr03_onboarding_progress).

# ── Get Tenant Settings ──

@router.get("/settings", response_model=TenantSettingsResponse)
async def get_tenant_settings(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get the full tenant/workspace settings."""
    await _ensure_tenant_columns(db)

    result = await db.execute(
        text("""
            SELECT id, name, slug, logo_url, primary_color, domain, plan, status,
                   COALESCE(timezone, 'UTC') as timezone,
                   COALESCE(locale, 'es') as locale,
                   COALESCE(industry, 'other') as industry,
                   billing_email,
                   COALESCE(max_users, 10) as max_users,
                   features_json, created_at
            FROM workspaces WHERE id = :ws_id
        """),
        {"ws_id": ctx.workspace_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Parse enabled modules from features_json
    enabled_modules = ALL_MODULES[:]
    if row.get("features_json"):
        try:
            features = json.loads(row["features_json"])
            enabled_modules = features.get("enabled_modules", ALL_MODULES[:])
        except (json.JSONDecodeError, TypeError):
            pass

    return TenantSettingsResponse(
        workspace_id=row["id"],
        name=row["name"],
        slug=row.get("slug"),
        logo_url=row.get("logo_url"),
        primary_color=row.get("primary_color"),
        domain=row.get("domain"),
        plan=row.get("plan"),
        status=row.get("status"),
        timezone=row.get("timezone", "UTC"),
        locale=row.get("locale", "es"),
        industry=row.get("industry", "other"),
        billing_email=row.get("billing_email"),
        max_users=row.get("max_users", 10),
        enabled_modules=enabled_modules,
        features_json=row.get("features_json"),
        created_at=str(row["created_at"]) if row.get("created_at") else None,
    )


# ── Update Tenant Settings ──

@router.put("/settings", response_model=TenantSettingsResponse)
async def update_tenant_settings(
    data: TenantSettingsUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update tenant settings. Admin/owner only."""
    await _ensure_tenant_columns(db)

    # Validate inputs
    if data.timezone and data.timezone not in TIMEZONES:
        raise HTTPException(status_code=400, detail=f"Invalid timezone. Valid: {', '.join(TIMEZONES[:5])}...")
    if data.locale and data.locale not in LOCALES:
        raise HTTPException(status_code=400, detail=f"Invalid locale. Valid: {', '.join(LOCALES)}")
    if data.industry and data.industry not in INDUSTRIES:
        raise HTTPException(status_code=400, detail=f"Invalid industry")

    # Build features_json
    features_json = None
    if data.enabled_modules is not None:
        invalid = [m for m in data.enabled_modules if m not in ALL_MODULES]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid modules: {', '.join(invalid)}")
        features_json = json.dumps({"enabled_modules": data.enabled_modules})

    # Build SET clause dynamically
    updates = []
    params: Dict[str, Any] = {"ws_id": ctx.workspace_id}

    field_map = {
        "name": data.name,
        "slug": data.slug,
        "logo_url": data.logo_url,
        "primary_color": data.primary_color,
        "domain": data.domain,
        "timezone": data.timezone,
        "locale": data.locale,
        "industry": data.industry,
        "billing_email": data.billing_email,
        "max_users": data.max_users,
    }

    for field, value in field_map.items():
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value

    if features_json is not None:
        updates.append("features_json = :features_json")
        params["features_json"] = features_json

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(updates)
    await db.execute(
        text(f"UPDATE workspaces SET {set_clause} WHERE id = :ws_id"),
        params,
    )
    await db.commit()

    return await get_tenant_settings(ctx=ctx, db=db)


# ── Get available options ──

@router.get("/options")
async def get_tenant_options(
    _ctx: WorkspaceContext = Depends(require_workspace),
):
    """Get available options for tenant configuration (workspace-scoped read)."""
    return {
        "timezones": TIMEZONES,
        "locales": LOCALES,
        "industries": INDUSTRIES,
        "modules": ALL_MODULES,
    }


# ── Module Permissions per Member ──

@router.get("/permissions", response_model=List[TenantModulePermissionResponse])
async def list_module_permissions(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List all module-level permissions for the current workspace."""
    await _ensure_permissions_table(db)

    result = await db.execute(
        text("""
            SELECT id, workspace_id, user_id, email, module, actions_json, granted_by, created_at
            FROM tenant_module_permissions
            WHERE workspace_id = :ws_id
            ORDER BY user_id, module
        """),
        {"ws_id": ctx.workspace_id},
    )
    rows = result.mappings().all()
    return [TenantModulePermissionResponse(**dict(r)) for r in rows]


@router.post("/permissions", response_model=TenantModulePermissionResponse, status_code=201)
async def set_module_permission(
    data: TenantModulePermission,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Set module-level permission for a user in the workspace. Admin only."""
    await _ensure_permissions_table(db)

    if data.module not in ALL_MODULES:
        raise HTTPException(status_code=400, detail=f"Invalid module: {data.module}")

    valid_actions = {"read", "create", "update", "delete", "*"}
    invalid = [a for a in data.actions if a not in valid_actions]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid actions: {', '.join(invalid)}")

    actions_json = json.dumps(data.actions)
    now = datetime.now(timezone.utc)

    # Upsert
    result = await db.execute(
        text("""
            INSERT INTO tenant_module_permissions
            (workspace_id, user_id, email, module, actions_json, granted_by, created_at)
            VALUES (:ws_id, :uid, :email, :module, :actions, :granted_by, :now)
            ON CONFLICT (workspace_id, user_id, module)
            DO UPDATE SET actions_json = :actions, email = COALESCE(:email, tenant_module_permissions.email),
                          granted_by = :granted_by
            RETURNING id, workspace_id, user_id, email, module, actions_json, granted_by, created_at
        """),
        {
            "ws_id": ctx.workspace_id,
            "uid": data.user_id,
            "email": data.email,
            "module": data.module,
            "actions": actions_json,
            "granted_by": ctx.user_id,
            "now": now,
        },
    )
    await db.commit()
    row = result.mappings().first()
    return TenantModulePermissionResponse(**dict(row))


@router.delete("/permissions/{user_id}/{module}")
async def revoke_module_permission(
    user_id: str,
    module: str,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a module permission for a user."""
    await _ensure_permissions_table(db)

    result = await db.execute(
        text("""
            DELETE FROM tenant_module_permissions
            WHERE workspace_id = :ws_id AND user_id = :uid AND module = :module
        """),
        {"ws_id": ctx.workspace_id, "uid": user_id, "module": module},
    )
    await db.commit()
    return {"message": f"Permission for {module} revoked for user {user_id}"}


# ── Members with Permissions ──

@router.get("/members-permissions", response_model=List[TenantMemberWithPermissions])
async def list_members_with_permissions(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List all workspace members with their module-level permissions."""
    await _ensure_permissions_table(db)

    # Get members
    members_result = await db.execute(
        text("""
            SELECT user_id, email, role, status
            FROM workspace_members
            WHERE workspace_id = :ws_id
            ORDER BY role, email
        """),
        {"ws_id": ctx.workspace_id},
    )
    members = members_result.mappings().all()

    # Get permissions
    perms_result = await db.execute(
        text("""
            SELECT user_id, module, actions_json
            FROM tenant_module_permissions
            WHERE workspace_id = :ws_id
        """),
        {"ws_id": ctx.workspace_id},
    )
    perms = perms_result.mappings().all()

    # Build permission map
    perm_map: Dict[str, Dict[str, List[str]]] = {}
    for p in perms:
        uid = p["user_id"]
        if uid not in perm_map:
            perm_map[uid] = {}
        try:
            actions = json.loads(p["actions_json"])
        except (json.JSONDecodeError, TypeError):
            actions = []
        perm_map[uid][p["module"]] = actions

    result = []
    for m in members:
        uid = m["user_id"]
        result.append(TenantMemberWithPermissions(
            user_id=uid,
            email=m.get("email"),
            role=m["role"],
            status=m["status"],
            module_permissions=perm_map.get(uid, {}),
        ))

    return result


# ── Tenant Data Isolation Stats ──

@router.get("/data-stats", response_model=TenantDataIsolationStats)
async def get_tenant_data_stats(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get data isolation statistics for the current tenant."""
    # Tables that have user_id column (tenant-scoped data)
    tenant_tables = [
        "contacts", "deals", "campaigns", "social_posts", "tickets",
        "contracts", "activities", "conversations", "calendar_events",
        "workflow_rules", "form_items", "funnel_items", "blog_posts",
        "nelvyon_clients", "nelvyon_projects", "nelvyon_outputs", "nelvyon_assets",
        "os_deals", "os_tasks", "os_expenses", "os_cashflow",
    ]

    ws_id = ctx.workspace_id
    tables_with_data: Dict[str, int] = {}
    total = 0

    for table in tenant_tables:
        try:
            if table == "tickets":
                result = await db.execute(
                    text("SELECT COUNT(*) as cnt FROM tickets WHERE workspace_id = :ws"),
                    {"ws": ws_id},
                )
            elif table in ("contacts", "deals", "activities"):
                result = await db.execute(
                    text(f"SELECT COUNT(*) as cnt FROM crm_{table} WHERE workspace_id = :ws"),
                    {"ws": ws_id},
                )
            else:
                result = await db.execute(
                    text(f"SELECT COUNT(*) as cnt FROM {table} WHERE user_id = :uid"),
                    {"uid": ctx.user_id},
                )
            count = (result.mappings().first() or {}).get("cnt", 0)
            if count > 0:
                tables_with_data[table] = count
                total += count
        except Exception:
            continue

    # Rough storage estimate: ~0.5KB per record
    storage_mb = round(total * 0.5 / 1024, 2)

    return TenantDataIsolationStats(
        workspace_id=ctx.workspace_id,
        tables_with_data=tables_with_data,
        total_records=total,
        storage_estimate_mb=storage_mb,
    )


@router.get("/branding/policy", response_model=TenantBrandingPolicyResponse)
async def get_tenant_branding_policy(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_tenant_columns(db)
    row = (
        await db.execute(
            text(
                """
                SELECT id, name, plan, status, features_json
                FROM workspaces
                WHERE id = :ws_id
                """
            ),
            {"ws_id": ctx.workspace_id},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _build_branding_policy(
        workspace_id=row["id"],
        workspace_name=row["name"],
        plan=row.get("plan"),
        status=row.get("status"),
        features_json=row.get("features_json"),
    )


@router.post("/branding-v2/activation", response_model=TenantBrandingPolicyResponse)
async def set_tenant_branding_v2_activation(
    payload: TenantBrandingActivationRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_tenant_columns(db)
    await _ensure_branding_activation_log_table(db)
    row = (
        await db.execute(
            text(
                """
                SELECT id, name, plan, status, features_json
                FROM workspaces
                WHERE id = :ws_id
                """
            ),
            {"ws_id": ctx.workspace_id},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")

    before_enabled = _extract_branding_v2_enabled(row.get("features_json"))
    plan_ok = _plan_in_advanced_allowlist(row.get("plan"))
    ws_status = (row.get("status") or "").strip().lower()
    if payload.enabled and not plan_ok:
        raise HTTPException(status_code=400, detail="Precondition failed: plan does not include branding v2 advanced.")
    if payload.enabled and ws_status not in ("active", ""):
        raise HTTPException(status_code=400, detail="Precondition failed: workspace status must be active for activation.")
    if payload.enabled and _global_hq_lock_enabled():
        raise HTTPException(status_code=400, detail="Precondition failed: HQ lock is enabled for branding v2.")

    updated_features = _set_branding_v2_enabled(row.get("features_json"), payload.enabled)
    await db.execute(
        text("UPDATE workspaces SET features_json = :f WHERE id = :ws_id"),
        {"f": updated_features, "ws_id": ctx.workspace_id},
    )
    await db.execute(
        text(
            """
            INSERT INTO tenant_branding_activation_logs
            (workspace_id, actor_user_id, actor_email, from_enabled, to_enabled, note, created_at)
            VALUES (:ws_id, :actor_uid, :actor_email, :from_enabled, :to_enabled, :note, :created_at)
            """
        ),
        {
            "ws_id": ctx.workspace_id,
            "actor_uid": str(ctx.user_id),
            "actor_email": ctx.user_email,
            "from_enabled": 1 if before_enabled else 0,
            "to_enabled": 1 if payload.enabled else 0,
            "note": payload.note,
            "created_at": datetime.now(timezone.utc),
        },
    )
    await db.commit()

    return _build_branding_policy(
        workspace_id=row["id"],
        workspace_name=row["name"],
        plan=row.get("plan"),
        status=row.get("status"),
        features_json=updated_features,
    )


@router.get("/branding-v2/activation-logs", response_model=List[TenantBrandingActivationLogItem])
async def list_tenant_branding_v2_activation_logs(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    await _ensure_branding_activation_log_table(db)
    rows = (
        await db.execute(
            text(
                """
                SELECT id, workspace_id, actor_user_id, actor_email, from_enabled, to_enabled, note, created_at
                FROM tenant_branding_activation_logs
                WHERE workspace_id = :ws_id
                ORDER BY id DESC
                LIMIT :limit
                """
            ),
            {"ws_id": ctx.workspace_id, "limit": limit},
        )
    ).mappings().all()
    return [
        TenantBrandingActivationLogItem(
            id=r["id"],
            workspace_id=r["workspace_id"],
            actor_user_id=r["actor_user_id"],
            actor_email=r.get("actor_email"),
            from_enabled=bool(r.get("from_enabled")),
            to_enabled=bool(r.get("to_enabled")),
            note=r.get("note"),
            created_at=str(r.get("created_at")) if r.get("created_at") else None,
        )
        for r in rows
    ]
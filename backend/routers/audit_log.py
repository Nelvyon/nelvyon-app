"""
Unified Audit Log Router — v1
Captures all critical actions across NELVYON OS + SaaS:
  - RBAC changes (role assignments, permission changes)
  - Settings changes (platform, user, security)
  - Entity CRUD on sensitive modules (contracts, deals, payments)
  - Auth events (login, logout, 2FA toggle)
  - E2E state propagation events

All entries go to `security_events` table with structured metadata.
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

router = APIRouter(prefix="/api/v1/audit", tags=["audit_log"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class AuditLogEntry(BaseModel):
    """Schema for creating an audit log entry."""
    event_type: str  # e.g. "rbac.role_changed", "settings.updated", "contract.signed"
    severity: str = "info"  # info, warning, critical
    source: str = "platform"  # module name: settings, rbac, contracts, social, etc.
    description: str = ""
    details_json: Optional[str] = None  # JSON string with structured metadata


class AuditLogResponse(BaseModel):
    id: int
    user_id: str
    event_type: str
    severity: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    details_json: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    skip: int
    limit: int


class AuditStats(BaseModel):
    total_events: int
    by_severity: dict
    by_source: dict
    by_event_type: dict
    recent_critical: List[AuditLogResponse]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Helper: write audit entry
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def write_audit_entry(
    db: AsyncSession,
    user_id: str,
    event_type: str,
    severity: str = "info",
    source: str = "platform",
    description: str = "",
    details: Optional[dict] = None,
) -> int:
    """Write an audit log entry to security_events. Returns the new entry ID."""
    details_json = json.dumps(details, default=str) if details else None
    now = datetime.utcnow()
    result = await db.execute(
        text("""
            INSERT INTO security_events
            (user_id, event_type, severity, source, description, details_json, status, created_at)
            VALUES (:uid, :etype, :sev, :src, :desc, :details, 'logged', :now)
            RETURNING id
        """),
        {
            "uid": user_id, "etype": event_type, "sev": severity,
            "src": source, "desc": description, "details": details_json,
            "now": now,
        },
    )
    await db.commit()
    row = result.mappings().first()
    return row["id"] if row else 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/log", response_model=AuditLogResponse, status_code=201)
async def create_audit_entry(
    entry: AuditLogEntry,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new audit log entry. Any authenticated user can log events."""
    user_id = str(current_user.id)
    now = datetime.utcnow()

    result = await db.execute(
        text("""
            INSERT INTO security_events
            (user_id, event_type, severity, source, description, details_json, status, created_at)
            VALUES (:uid, :etype, :sev, :src, :desc, :details, 'logged', :now)
            RETURNING id, user_id, event_type, severity, source, description, details_json, created_at
        """),
        {
            "uid": user_id, "etype": entry.event_type, "sev": entry.severity,
            "src": entry.source, "desc": entry.description,
            "details": entry.details_json, "now": now,
        },
    )
    await db.commit()
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=500, detail="Error al crear entrada de auditoría")

    return AuditLogResponse(**dict(row))


@router.get("/logs", response_model=AuditLogListResponse)
async def get_audit_logs(
    source: Optional[str] = Query(None, description="Filter by source module"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    event_type: Optional[str] = Query(None, description="Filter by event type prefix"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit logs. Admin sees all; regular users see only their own.
    Supports filtering by source, severity, and event_type prefix.
    """
    user_id = str(current_user.id)
    is_admin = current_user.role in ("admin", "super_admin")

    # Build dynamic WHERE clause
    conditions = []
    params: dict = {"skip": skip, "limit": limit}

    if not is_admin:
        conditions.append("user_id = :uid")
        params["uid"] = user_id

    if source:
        conditions.append("source = :source")
        params["source"] = source

    if severity:
        conditions.append("severity = :severity")
        params["severity"] = severity

    if event_type:
        conditions.append("event_type LIKE :etype")
        params["etype"] = f"{event_type}%"

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Count
    count_result = await db.execute(
        text(f"SELECT COUNT(*) as cnt FROM security_events WHERE {where_clause}"),
        params,
    )
    total = (count_result.mappings().first() or {}).get("cnt", 0)

    # Fetch
    result = await db.execute(
        text(f"""
            SELECT id, user_id, event_type, severity, source, description, details_json, created_at
            FROM security_events
            WHERE {where_clause}
            ORDER BY created_at DESC
            OFFSET :skip LIMIT :limit
        """),
        params,
    )
    items = [AuditLogResponse(**dict(r)) for r in result.mappings().all()]

    return AuditLogListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/stats", response_model=AuditStats)
async def get_audit_stats(
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get audit log statistics. Admin only."""
    # Total
    total_result = await db.execute(text("SELECT COUNT(*) as cnt FROM security_events"))
    total = (total_result.mappings().first() or {}).get("cnt", 0)

    # By severity
    sev_result = await db.execute(
        text("SELECT COALESCE(severity, 'unknown') as sev, COUNT(*) as cnt FROM security_events GROUP BY severity")
    )
    by_severity = {r["sev"]: r["cnt"] for r in sev_result.mappings().all()}

    # By source
    src_result = await db.execute(
        text("SELECT COALESCE(source, 'unknown') as src, COUNT(*) as cnt FROM security_events GROUP BY source ORDER BY cnt DESC LIMIT 20")
    )
    by_source = {r["src"]: r["cnt"] for r in src_result.mappings().all()}

    # By event_type (top 20)
    etype_result = await db.execute(
        text("SELECT event_type, COUNT(*) as cnt FROM security_events GROUP BY event_type ORDER BY cnt DESC LIMIT 20")
    )
    by_event_type = {r["event_type"]: r["cnt"] for r in etype_result.mappings().all()}

    # Recent critical events
    critical_result = await db.execute(
        text("""
            SELECT id, user_id, event_type, severity, source, description, details_json, created_at
            FROM security_events
            WHERE severity = 'critical'
            ORDER BY created_at DESC
            LIMIT 10
        """)
    )
    recent_critical = [AuditLogResponse(**dict(r)) for r in critical_result.mappings().all()]

    return AuditStats(
        total_events=total,
        by_severity=by_severity,
        by_source=by_source,
        by_event_type=by_event_type,
        recent_critical=recent_critical,
    )
"""
Sprint 3 — CRM Advanced Endpoints
- POST /import-csv          → Import contacts from CSV with validation
- GET  /export              → Export contacts as JSON (frontend converts to CSV/Excel)
- POST /merge-duplicates    → Merge duplicate contacts by email
- GET  /search              → Advanced search with text + filters
- GET  /timeline/{id}       → Contact timeline (activities, deals, campaigns, conversations, notes)
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import select, func, or_, and_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.quota_guards import (
    enforce_contact_headroom,
    enforce_contacts_plan_module_for_crm_writes,
)
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from models.contacts import Contacts
from models.deals import Deals
from models.activities import Activities
from models.conversations import Conversations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/crm", tags=["crm-advanced"])


# ─── Schemas ───
class CSVImportRow(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    company_name: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = "active"
    source: Optional[str] = "csv_import"
    score: Optional[int] = None
    notes: Optional[str] = None


class CSVImportRequest(BaseModel):
    rows: List[Dict[str, Any]]
    skip_duplicates: bool = True


class CSVImportResult(BaseModel):
    total_rows: int
    imported: int
    skipped_duplicates: int
    errors: List[Dict[str, Any]]


class MergeRequest(BaseModel):
    primary_id: int
    secondary_ids: List[int]


class MergeResult(BaseModel):
    merged_contact_id: int
    contacts_merged: int
    deals_reassigned: int
    activities_reassigned: int
    conversations_reassigned: int


class SearchFilters(BaseModel):
    status: Optional[str] = None
    source: Optional[str] = None
    company_name: Optional[str] = None
    tags: Optional[str] = None
    score_min: Optional[int] = None
    score_max: Optional[int] = None


class TimelineEvent(BaseModel):
    id: int
    event_type: str  # deal, activity, campaign, conversation, note
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    value: Optional[float] = None
    created_at: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class TimelineResponse(BaseModel):
    contact_id: int
    contact_name: str
    contact_email: str
    events: List[TimelineEvent]
    total_events: int
    deals_count: int
    deals_total_value: float
    activities_count: int
    conversations_count: int


class ContactExportItem(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    company_name: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    score: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ExportResponse(BaseModel):
    items: List[ContactExportItem]
    total: int


class DuplicateGroup(BaseModel):
    email: str
    count: int
    contacts: List[Dict[str, Any]]


def _estimate_csv_importable_new_rows(request: CSVImportRequest, existing_emails: set) -> int:
    """Filas que pasarían validación mínima y no se saltan por duplicado (alineado al bucle de import)."""
    seen_emails: set = set()
    n = 0
    for row in request.rows:
        normalized = _normalize_csv_row(row)
        if not normalized.get("first_name") or not normalized.get("email"):
            continue
        email = str(normalized["email"]).strip().lower()
        if request.skip_duplicates and (email in existing_emails or email in seen_emails):
            continue
        seen_emails.add(email)
        n += 1
    return n


# ─── 1. Import CSV ───
@router.post("/import-csv", response_model=CSVImportResult)
async def import_csv(
    request: CSVImportRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Import contacts from parsed CSV rows.
    Frontend parses the CSV file, sends rows as JSON.
    Validates each row, skips duplicates by email if requested.
    """
    imported = 0
    skipped = 0
    errors = []

    # Duplicados por workspace (multi-tenant), no solo por user_id del request
    existing_emails_query = select(Contacts.email).where(
        Contacts.workspace_id == ws_ctx.workspace_id
    )
    result = await db.execute(existing_emails_query)
    existing_emails = {r[0].lower() for r in result.all() if r[0]}

    n_new = _estimate_csv_importable_new_rows(request, existing_emails)
    await enforce_contact_headroom(db, ws_ctx.workspace_id, n_new)

    seen_emails = set()

    for idx, row in enumerate(request.rows):
        try:
            # Normalize field names (handle common CSV headers)
            normalized = _normalize_csv_row(row)

            # Validate required fields
            if not normalized.get("first_name") or not normalized.get("email"):
                errors.append({
                    "row": idx + 1,
                    "error": "first_name and email are required",
                    "data": row,
                })
                continue

            email = normalized["email"].strip().lower()

            # Check for duplicates
            if request.skip_duplicates and (email in existing_emails or email in seen_emails):
                skipped += 1
                continue

            seen_emails.add(email)

            # Create contact
            contact = Contacts(
                user_id=ws_ctx.user_id,
                workspace_id=ws_ctx.workspace_id,
                first_name=normalized.get("first_name", "").strip(),
                last_name=normalized.get("last_name", "").strip() if normalized.get("last_name") else None,
                email=email,
                phone=normalized.get("phone", "").strip() if normalized.get("phone") else None,
                company_name=normalized.get("company_name", "").strip() if normalized.get("company_name") else None,
                tags=normalized.get("tags", "").strip() if normalized.get("tags") else None,
                status=normalized.get("status", "active").strip(),
                source=normalized.get("source", "csv_import").strip(),
                score=int(normalized["score"]) if normalized.get("score") and str(normalized["score"]).isdigit() else None,
                notes=normalized.get("notes", "").strip() if normalized.get("notes") else None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(contact)
            imported += 1

        except Exception as e:
            errors.append({
                "row": idx + 1,
                "error": str(e),
                "data": row,
            })

    if imported > 0:
        await db.commit()

    logger.info(f"CSV Import: {imported} imported, {skipped} skipped, {len(errors)} errors (ws={ws_ctx.workspace_id})")

    return CSVImportResult(
        total_rows=len(request.rows),
        imported=imported,
        skipped_duplicates=skipped,
        errors=errors[:50],  # Limit error details
    )


def _normalize_csv_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize common CSV header variations to our field names."""
    mapping = {
        "nombre": "first_name", "name": "first_name", "first name": "first_name",
        "apellido": "last_name", "surname": "last_name", "last name": "last_name",
        "correo": "email", "e-mail": "email", "email address": "email",
        "telefono": "phone", "teléfono": "phone", "telephone": "phone", "mobile": "phone",
        "empresa": "company_name", "company": "company_name", "organization": "company_name",
        "etiquetas": "tags", "label": "tags", "labels": "tags",
        "estado": "status", "state": "status",
        "fuente": "source", "origen": "source",
        "puntuacion": "score", "puntuación": "score", "rating": "score",
        "notas": "notes", "note": "notes", "comments": "notes",
    }
    normalized = {}
    for key, value in row.items():
        clean_key = key.strip().lower().replace("_", " ")
        mapped = mapping.get(clean_key, key.strip().lower().replace(" ", "_"))
        normalized[mapped] = value
    return normalized


# ─── 2. Export Contacts ───
@router.get("/export", response_model=ExportResponse)
async def export_contacts(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    company_name: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Export contacts with optional filters. Returns JSON for frontend to convert to CSV/Excel."""
    query = select(Contacts).where(Contacts.user_id == ws_ctx.user_id)

    if ws_ctx.workspace_id is not None:
        query = query.where(Contacts.workspace_id == ws_ctx.workspace_id)

    if status:
        query = query.where(Contacts.status == status)
    if source:
        query = query.where(Contacts.source == source)
    if company_name:
        query = query.where(Contacts.company_name.ilike(f"%{company_name}%"))
    if tags:
        query = query.where(Contacts.tags.ilike(f"%{tags}%"))
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Contacts.first_name.ilike(search_term),
                Contacts.last_name.ilike(search_term),
                Contacts.email.ilike(search_term),
                Contacts.company_name.ilike(search_term),
            )
        )

    query = query.order_by(Contacts.id.desc()).limit(10000)
    result = await db.execute(query)
    contacts = result.scalars().all()

    items = []
    for c in contacts:
        items.append(ContactExportItem(
            id=c.id,
            first_name=c.first_name,
            last_name=c.last_name,
            email=c.email,
            phone=c.phone,
            company_name=c.company_name,
            tags=c.tags,
            status=c.status,
            source=c.source,
            score=c.score,
            notes=c.notes,
            created_at=c.created_at.isoformat() if c.created_at else None,
        ))

    return ExportResponse(items=items, total=len(items))


# ─── 3. Find Duplicates ───
@router.get("/duplicates", response_model=List[DuplicateGroup])
async def find_duplicates(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Find duplicate contacts by email within the workspace."""
    base_filter = [Contacts.user_id == ws_ctx.user_id]
    if ws_ctx.workspace_id is not None:
        base_filter.append(Contacts.workspace_id == ws_ctx.workspace_id)

    # Find emails with more than 1 contact
    dup_query = (
        select(func.lower(Contacts.email), func.count(Contacts.id))
        .where(and_(*base_filter))
        .group_by(func.lower(Contacts.email))
        .having(func.count(Contacts.id) > 1)
        .order_by(func.count(Contacts.id).desc())
        .limit(100)
    )
    dup_result = await db.execute(dup_query)
    dup_emails = dup_result.all()

    groups = []
    for email, count in dup_emails:
        # Get all contacts with this email
        contacts_query = (
            select(Contacts)
            .where(and_(*base_filter, func.lower(Contacts.email) == email))
            .order_by(Contacts.created_at.asc())
        )
        contacts_result = await db.execute(contacts_query)
        contacts = contacts_result.scalars().all()

        groups.append(DuplicateGroup(
            email=email,
            count=count,
            contacts=[{
                "id": c.id,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "company_name": c.company_name,
                "score": c.score,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            } for c in contacts],
        ))

    return groups


# ─── 4. Merge Duplicates ───
@router.post("/merge", response_model=MergeResult)
async def merge_contacts(
    request: MergeRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Merge duplicate contacts. Keep primary, reassign related records, delete secondaries.
    """
    await enforce_contacts_plan_module_for_crm_writes(db, ws_ctx.workspace_id)
    base_filter = [Contacts.workspace_id == ws_ctx.workspace_id]

    # Verify primary contact exists and belongs to user/workspace
    primary_result = await db.execute(
        select(Contacts).where(and_(*base_filter, Contacts.id == request.primary_id))
    )
    primary = primary_result.scalar_one_or_none()
    if not primary:
        raise HTTPException(status_code=404, detail="Primary contact not found")

    deals_reassigned = 0
    activities_reassigned = 0
    conversations_reassigned = 0

    for sec_id in request.secondary_ids:
        if sec_id == request.primary_id:
            continue

        # Verify secondary exists
        sec_result = await db.execute(
            select(Contacts).where(and_(*base_filter, Contacts.id == sec_id))
        )
        secondary = sec_result.scalar_one_or_none()
        if not secondary:
            continue

        # Merge data: fill empty fields on primary from secondary
        for field in ['last_name', 'phone', 'company_name', 'tags', 'notes']:
            primary_val = getattr(primary, field)
            secondary_val = getattr(secondary, field)
            if not primary_val and secondary_val:
                setattr(primary, field, secondary_val)

        # Merge score: keep highest
        if secondary.score and (not primary.score or secondary.score > primary.score):
            primary.score = secondary.score

        # Merge tags: combine unique
        if secondary.tags and primary.tags:
            existing_tags = set(t.strip() for t in primary.tags.split(","))
            new_tags = set(t.strip() for t in secondary.tags.split(","))
            combined = existing_tags | new_tags
            primary.tags = ", ".join(sorted(combined))

        # Reassign deals
        deals_query = select(Deals).where(
            Deals.contact_id == sec_id,
            Deals.workspace_id == ws_ctx.workspace_id,
        )
        deals_result = await db.execute(deals_query)
        for deal in deals_result.scalars().all():
            deal.contact_id = request.primary_id
            deals_reassigned += 1

        # Reassign activities
        activities_query = select(Activities).where(
            Activities.contact_id == sec_id,
            Activities.workspace_id == ws_ctx.workspace_id,
        )
        activities_result = await db.execute(activities_query)
        for activity in activities_result.scalars().all():
            activity.contact_id = request.primary_id
            activities_reassigned += 1

        # Reassign conversations
        conversations_query = select(Conversations).where(
            Conversations.contact_id == sec_id,
            Conversations.workspace_id == ws_ctx.workspace_id,
        )
        conversations_result = await db.execute(conversations_query)
        for conv in conversations_result.scalars().all():
            conv.contact_id = request.primary_id
            conversations_reassigned += 1

        # Delete secondary
        await db.delete(secondary)

    primary.updated_at = datetime.now(timezone.utc)
    await db.commit()

    logger.info(
        f"Merged {len(request.secondary_ids)} contacts into {request.primary_id} "
        f"(deals={deals_reassigned}, activities={activities_reassigned}, convs={conversations_reassigned})"
    )

    return MergeResult(
        merged_contact_id=request.primary_id,
        contacts_merged=len(request.secondary_ids),
        deals_reassigned=deals_reassigned,
        activities_reassigned=activities_reassigned,
        conversations_reassigned=conversations_reassigned,
    )


# ─── 5. Advanced Search ───
@router.get("/search")
async def advanced_search(
    q: Optional[str] = Query(None, description="Text search across name, email, company, notes"),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    company_name: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    score_min: Optional[int] = Query(None),
    score_max: Optional[int] = Query(None),
    sort: Optional[str] = Query("-created_at", description="Sort field, prefix - for desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Advanced search with text + combined filters."""
    base_filters = [Contacts.user_id == ws_ctx.user_id]
    if ws_ctx.workspace_id is not None:
        base_filters.append(Contacts.workspace_id == ws_ctx.workspace_id)

    # Text search
    if q:
        search_term = f"%{q}%"
        base_filters.append(
            or_(
                Contacts.first_name.ilike(search_term),
                Contacts.last_name.ilike(search_term),
                Contacts.email.ilike(search_term),
                Contacts.company_name.ilike(search_term),
                Contacts.notes.ilike(search_term),
                Contacts.phone.ilike(search_term),
            )
        )

    # Filters
    if status:
        base_filters.append(Contacts.status == status)
    if source:
        base_filters.append(Contacts.source == source)
    if company_name:
        base_filters.append(Contacts.company_name.ilike(f"%{company_name}%"))
    if tags:
        base_filters.append(Contacts.tags.ilike(f"%{tags}%"))
    if score_min is not None:
        base_filters.append(Contacts.score >= score_min)
    if score_max is not None:
        base_filters.append(Contacts.score <= score_max)

    # Count
    count_query = select(func.count(Contacts.id)).where(and_(*base_filters))
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    # Sort
    query = select(Contacts).where(and_(*base_filters))
    if sort:
        desc = sort.startswith("-")
        field_name = sort.lstrip("-")
        if hasattr(Contacts, field_name):
            col = getattr(Contacts, field_name)
            query = query.order_by(col.desc() if desc else col.asc())
        else:
            query = query.order_by(Contacts.id.desc())
    else:
        query = query.order_by(Contacts.id.desc())

    result = await db.execute(query.offset(skip).limit(limit))
    contacts = result.scalars().all()

    items = []
    for c in contacts:
        items.append({
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "company_name": c.company_name,
            "tags": c.tags,
            "status": c.status,
            "source": c.source,
            "score": c.score,
            "avatar_url": c.avatar_url,
            "notes": c.notes,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


# ─── 6. Contact Timeline ───
@router.get("/timeline/{contact_id}", response_model=TimelineResponse)
async def get_contact_timeline(
    contact_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get full timeline for a contact: deals, activities, campaigns, conversations."""
    # Verify contact exists and belongs to user/workspace
    base_filter = [Contacts.user_id == ws_ctx.user_id, Contacts.id == contact_id]
    if ws_ctx.workspace_id is not None:
        base_filter.append(Contacts.workspace_id == ws_ctx.workspace_id)

    contact_result = await db.execute(select(Contacts).where(and_(*base_filter)))
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    events: List[TimelineEvent] = []

    # Deals
    deals_result = await db.execute(
        select(Deals).where(Deals.contact_id == contact_id).order_by(Deals.created_at.desc())
    )
    deals = deals_result.scalars().all()
    deals_total_value = 0.0
    for d in deals:
        deals_total_value += d.value or 0
        events.append(TimelineEvent(
            id=d.id,
            event_type="deal",
            title=d.title,
            description=f"Stage: {d.stage}" + (f" | Value: ${d.value:,.2f}" if d.value else ""),
            status=d.stage,
            value=d.value,
            created_at=d.created_at.isoformat() if d.created_at else None,
            extra={"currency": d.currency, "probability": d.probability},
        ))

    # Activities
    activities_result = await db.execute(
        select(Activities).where(Activities.contact_id == contact_id).order_by(Activities.created_at.desc())
    )
    activities = activities_result.scalars().all()
    for a in activities:
        events.append(TimelineEvent(
            id=a.id,
            event_type="activity",
            title=a.title,
            description=a.description,
            status="completed" if a.is_completed else "pending",
            created_at=a.created_at.isoformat() if a.created_at else None,
            extra={"type": a.type, "is_completed": a.is_completed},
        ))

    # Conversations
    conversations_result = await db.execute(
        select(Conversations).where(Conversations.contact_id == contact_id).order_by(Conversations.created_at.desc())
    )
    conversations = conversations_result.scalars().all()
    for conv in conversations:
        events.append(TimelineEvent(
            id=conv.id,
            event_type="conversation",
            title=conv.subject or f"Conversation via {conv.channel or 'unknown'}",
            description=conv.last_message,
            status=conv.status,
            created_at=conv.created_at.isoformat() if conv.created_at else None,
            extra={"channel": conv.channel, "unread_count": conv.unread_count},
        ))

    # Contact notes as event
    if contact.notes:
        events.append(TimelineEvent(
            id=contact.id,
            event_type="note",
            title="Contact Notes",
            description=contact.notes,
            created_at=contact.created_at.isoformat() if contact.created_at else None,
        ))

    # Sort all events by date (newest first)
    events.sort(key=lambda e: e.created_at or "", reverse=True)

    return TimelineResponse(
        contact_id=contact.id,
        contact_name=f"{contact.first_name} {contact.last_name or ''}".strip(),
        contact_email=contact.email,
        events=events,
        total_events=len(events),
        deals_count=len(deals),
        deals_total_value=deals_total_value,
        activities_count=len(activities),
        conversations_count=len(conversations),
    )
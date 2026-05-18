"""
E2E Orchestrator Router — v3
Handles cross-module state propagation, relationship management,
and entity creation across the full NELVYON chain:
  Client → Project → Generator → QA → Assets → Contracts → Social → Helpdesk
  CRM (Contacts/Deals/Campaigns) ↔ OS (Clients/Projects)
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/e2e", tags=["e2e_orchestrator"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class PropagateStatusRequest(BaseModel):
    project_id: int
    new_status: str


class PropagateStatusEffect(BaseModel):
    module: str
    action: str
    affected_count: int
    description: str


class PropagateStatusResponse(BaseModel):
    project_id: int
    new_status: str
    effects: List[PropagateStatusEffect]
    timestamp: str


class E2ERelationshipResponse(BaseModel):
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    outputs_count: int = 0
    assets_count: int = 0
    contracts_count: int = 0
    social_posts_count: int = 0
    tickets_count: int = 0
    deals_count: int = 0
    campaigns_count: int = 0


class FullChainResponse(BaseModel):
    client: Optional[Dict[str, Any]] = None
    projects: List[Dict[str, Any]] = []
    outputs: List[Dict[str, Any]] = []
    assets: List[Dict[str, Any]] = []
    contracts: List[Dict[str, Any]] = []
    social_posts: List[Dict[str, Any]] = []
    tickets: List[Dict[str, Any]] = []
    deals: List[Dict[str, Any]] = []
    campaigns: List[Dict[str, Any]] = []
    total_entities: int = 0


class CreateContractFromProjectRequest(BaseModel):
    project_id: int
    output_id: Optional[int] = None
    title: Optional[str] = None
    contract_type: str = "servicio"
    price: Optional[str] = None
    duration: Optional[str] = None
    language: str = "es"


class CreateSocialFromContractRequest(BaseModel):
    contract_id: int
    platform: str = "instagram"
    content: Optional[str] = None
    campaign_name: Optional[str] = None
    scheduled_at: Optional[str] = None


class CreateTicketFromSocialRequest(BaseModel):
    social_post_id: int
    subject: Optional[str] = None
    priority: str = "medium"
    category: str = "Técnico"


class LinkCrmClientRequest(BaseModel):
    contact_id: int
    client_id: int


class CreateDealFromProjectRequest(BaseModel):
    project_id: int
    title: Optional[str] = None
    value: Optional[float] = None
    stage: str = "proposal"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def _fetch_one(db: AsyncSession, query: str, params: dict) -> Optional[dict]:
    """Fetch a single row as dict, or None."""
    result = await db.execute(text(query), params)
    row = result.mappings().first()
    return dict(row) if row else None


async def _fetch_all(db: AsyncSession, query: str, params: dict) -> List[dict]:
    """Fetch all rows as list of dicts."""
    result = await db.execute(text(query), params)
    return [dict(r) for r in result.mappings().all()]


async def _count_in_workspace(
    db: AsyncSession, table: str, field: str, value: int, user_id: str, workspace_id: int
) -> int:
    """Count rows tied to a project/client, scoped to the active workspace."""
    if table in ("deals", "campaigns", "helpdesk_tickets"):
        result = await db.execute(
            text(
                f"SELECT COUNT(*) as cnt FROM {table} "
                f"WHERE {field} = :val AND workspace_id = :wid"
            ),
            {"val": value, "wid": workspace_id},
        )
    else:
        result = await db.execute(
            text(
                f"""
                SELECT COUNT(*) as cnt FROM {table} t
                INNER JOIN nelvyon_projects p ON p.id = t.project_id
                    AND p.workspace_id = :wid
                WHERE t.{field} = :val
                """
            ),
            {"val": value, "wid": workspace_id},
        )
    row = result.mappings().first()
    return (row or {}).get("cnt", 0)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. State Propagation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/propagate-status", response_model=PropagateStatusResponse)
async def propagate_project_status(
    req: PropagateStatusRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Propagate a project status change to all downstream modules.
    closed/cancelled → expire contracts, pause social, notify tickets, block generation
    approved/delivered → enable signing, enable publishing
    """
    effects: List[PropagateStatusEffect] = []
    user_id = str(current_user.id)
    wid = ctx.workspace_id
    now = datetime.utcnow()

    # Verify project exists in this workspace
    project = await _fetch_one(
        db,
        "SELECT id, name, client_id FROM nelvyon_projects WHERE id = :pid AND workspace_id = :wid",
        {"pid": req.project_id, "wid": wid},
    )
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if req.new_status in ("closed", "cancelled"):
        # 1. Expire draft/pending contracts
        try:
            result = await db.execute(
                text("""
                    UPDATE contracts SET status = 'expired', updated_at = :now
                    WHERE project_id = :pid AND status IN ('draft', 'pending')
                    AND EXISTS (
                        SELECT 1 FROM nelvyon_projects np
                        WHERE np.id = :pid AND np.workspace_id = :wid
                    )
                """),
                {"pid": req.project_id, "now": now, "wid": wid},
            )
            cnt = result.rowcount or 0
            effects.append(PropagateStatusEffect(
                module="Contracts", action="expire_drafts", affected_count=cnt,
                description=f"{cnt} contratos borrador/pendiente → expirados",
            ))
        except Exception as e:
            logger.warning(f"Contract propagation error: {e}")
            effects.append(PropagateStatusEffect(
                module="Contracts", action="expire_drafts", affected_count=0,
                description=f"Error: {str(e)[:100]}",
            ))

        # 2. Pause scheduled social posts
        try:
            result = await db.execute(
                text("""
                    UPDATE social_posts SET status = 'draft', error_message = :msg
                    WHERE project_id = :pid AND status = 'scheduled'
                    AND EXISTS (
                        SELECT 1 FROM nelvyon_projects np
                        WHERE np.id = :pid AND np.workspace_id = :wid
                    )
                """),
                {"pid": req.project_id,
                 "msg": f"Pausado: proyecto {req.new_status}", "wid": wid},
            )
            cnt = result.rowcount or 0
            effects.append(PropagateStatusEffect(
                module="Social", action="pause_scheduled", affected_count=cnt,
                description=f"{cnt} posts programados → pausados",
            ))
        except Exception as e:
            logger.warning(f"Social propagation error: {e}")
            effects.append(PropagateStatusEffect(
                module="Social", action="pause_scheduled", affected_count=0,
                description=f"Error: {str(e)[:100]}",
            ))

        # 3. Add note to open helpdesk tickets
        try:
            result = await db.execute(
                text("""
                    UPDATE helpdesk_tickets
                    SET resolution_notes = COALESCE(resolution_notes, '') || :note
                    WHERE project_id = :pid AND status IN ('open', 'in_progress')
                    AND workspace_id = :wid
                """),
                {"pid": req.project_id, "wid": wid,
                 "note": f"\n[Auto] Proyecto {req.new_status} el {now.isoformat()[:10]}"},
            )
            cnt = result.rowcount or 0
            effects.append(PropagateStatusEffect(
                module="Helpdesk", action="notify_tickets", affected_count=cnt,
                description=f"{cnt} tickets notificados del cambio de estado",
            ))
        except Exception as e:
            logger.warning(f"Helpdesk propagation error: {e}")

        # 4. Update project status
        try:
            await db.execute(
                text("""
                    UPDATE nelvyon_projects SET status = :status, updated_at = :now
                    WHERE id = :pid AND workspace_id = :wid
                """),
                {"pid": req.project_id, "status": req.new_status, "now": now, "wid": wid},
            )
            effects.append(PropagateStatusEffect(
                module="Generator", action="block_generation", affected_count=1,
                description="Generación bloqueada para este proyecto",
            ))
        except Exception as e:
            logger.warning(f"Project update error: {e}")

        # 5. Update linked deals stage
        try:
            new_stage = "lost" if req.new_status == "cancelled" else "closed"
            result = await db.execute(
                text("""
                    UPDATE deals SET stage = :stage, updated_at = :now
                    WHERE project_id = :pid AND workspace_id = :wid
                    AND stage NOT IN ('won', 'lost', 'closed')
                """),
                {"pid": req.project_id, "stage": new_stage, "now": now, "wid": wid},
            )
            cnt = result.rowcount or 0
            if cnt > 0:
                effects.append(PropagateStatusEffect(
                    module="CRM/Deals", action="update_stage", affected_count=cnt,
                    description=f"{cnt} deals → {new_stage}",
                ))
        except Exception as e:
            logger.warning(f"Deals propagation error: {e}")

        await db.commit()

    elif req.new_status in ("approved", "delivered"):
        # Update project status
        try:
            await db.execute(
                text("""
                    UPDATE nelvyon_projects SET status = :status, updated_at = :now
                    WHERE id = :pid AND workspace_id = :wid
                """),
                {"pid": req.project_id, "status": req.new_status, "now": now, "wid": wid},
            )
            await db.commit()
        except Exception as e:
            logger.warning(f"Project update error: {e}")

        effects.append(PropagateStatusEffect(
            module="Contracts", action="enable_signing", affected_count=0,
            description="Firma de contratos habilitada",
        ))
        effects.append(PropagateStatusEffect(
            module="Social", action="enable_publishing", affected_count=0,
            description="Publicación social habilitada",
        ))
        effects.append(PropagateStatusEffect(
            module="Assets", action="mark_final", affected_count=0,
            description="Assets marcados como finales",
        ))

    return PropagateStatusResponse(
        project_id=req.project_id,
        new_status=req.new_status,
        effects=effects,
        timestamp=now.isoformat(),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Create Contract from Project/Output
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/contract-from-project")
async def create_contract_from_project(
    req: CreateContractFromProjectRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a contract pre-filled with project and client context."""
    user_id = str(current_user.id)
    wid = ctx.workspace_id
    now = datetime.utcnow()

    # Fetch project + client
    project = await _fetch_one(
        db,
        "SELECT id, name, client_id, brief FROM nelvyon_projects WHERE id = :pid AND workspace_id = :wid",
        {"pid": req.project_id, "wid": wid},
    )
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    client_id = project.get("client_id")
    client_name = None
    company_name = None
    if client_id:
        client = await _fetch_one(
            db,
            "SELECT business_name, sector FROM nelvyon_clients WHERE id = :cid AND workspace_id = :wid",
            {"cid": client_id, "wid": wid},
        )
        if client:
            client_name = client.get("business_name")
            company_name = client.get("business_name")

    title = req.title or f"Contrato — {project.get('name', 'Proyecto')}"

    # Build contract content from project brief
    brief = project.get("brief") or ""
    content = (
        f"Contrato de {req.contract_type} para el proyecto \"{project.get('name', '')}\".\n\n"
        f"Descripción del proyecto:\n{brief[:500]}\n\n"
        f"Precio: {req.price or 'A definir'}\n"
        f"Duración: {req.duration or 'A definir'}\n"
    )

    result = await db.execute(
        text("""
            INSERT INTO contracts
            (user_id, workspace_id, title, contract_type, client_name, company_name, content,
             language, status, price, duration, client_id, project_id, output_id, created_at, updated_at)
            VALUES
            (:uid, :wid, :title, :ctype, :cname, :company, :content,
             :lang, 'draft', :price, :duration, :client_id, :project_id, :output_id, :now, :now)
            RETURNING id
        """),
        {
            "uid": user_id, "wid": wid, "title": title, "ctype": req.contract_type,
            "cname": client_name, "company": company_name, "content": content,
            "lang": req.language, "price": req.price, "duration": req.duration,
            "client_id": client_id, "project_id": req.project_id,
            "output_id": req.output_id, "now": now,
        },
    )
    await db.commit()
    row = result.mappings().first()
    contract_id = row["id"] if row else None

    return {
        "contract_id": contract_id,
        "title": title,
        "status": "draft",
        "e2e_context": {
            "client_id": client_id,
            "client_name": client_name,
            "project_id": req.project_id,
            "project_name": project.get("name"),
            "output_id": req.output_id,
        },
        "message": f"Contrato #{contract_id} creado desde proyecto '{project.get('name')}'",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Create Social Post from Contract
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/social-from-contract")
async def create_social_from_contract(
    req: CreateSocialFromContractRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a social post pre-filled with contract and project context."""
    user_id = str(current_user.id)
    wid = ctx.workspace_id
    now = datetime.utcnow()

    # Fetch contract + linked project/client (workspace-scoped)
    contract = await _fetch_one(
        db,
        """
        SELECT c.* FROM contracts c
        WHERE c.id = :cid
        AND (
            c.workspace_id = :wid
            OR EXISTS (
                SELECT 1 FROM nelvyon_projects p
                WHERE p.id = c.project_id AND p.workspace_id = :wid
            )
        )
        """,
        {"cid": req.contract_id, "wid": wid},
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    content = req.content or (
        f"📝 Nuevo acuerdo: {contract.get('title', 'Contrato')}\n"
        f"Cliente: {contract.get('client_name', 'N/A')}\n"
        f"Tipo: {contract.get('contract_type', 'N/A')}\n"
        f"#NELVYON #Contrato"
    )

    result = await db.execute(
        text("""
            INSERT INTO social_posts
            (user_id, platform, content, status, campaign_name,
             client_id, project_id, output_id, contract_id, scheduled_at, created_at)
            VALUES
            (:uid, :platform, :content, :status, :campaign,
             :client_id, :project_id, :output_id, :contract_id, :scheduled_at, :now)
            RETURNING id
        """),
        {
            "uid": user_id, "platform": req.platform, "content": content,
            "status": "scheduled" if req.scheduled_at else "draft",
            "campaign": req.campaign_name,
            "client_id": contract.get("client_id"),
            "project_id": contract.get("project_id"),
            "output_id": contract.get("output_id"),
            "contract_id": req.contract_id,
            "scheduled_at": req.scheduled_at,
            "now": now,
        },
    )
    await db.commit()
    row = result.mappings().first()
    post_id = row["id"] if row else None

    return {
        "social_post_id": post_id,
        "contract_id": req.contract_id,
        "platform": req.platform,
        "status": "scheduled" if req.scheduled_at else "draft",
        "e2e_context": {
            "client_id": contract.get("client_id"),
            "project_id": contract.get("project_id"),
            "contract_id": req.contract_id,
            "campaign_name": req.campaign_name,
        },
        "message": f"Post #{post_id} creado desde contrato '{contract.get('title')}'",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Create Helpdesk Ticket from Social Post
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/social-to-ticket")
async def create_ticket_from_social(
    req: CreateTicketFromSocialRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a helpdesk ticket linked to a social post incident."""
    user_id = str(current_user.id)
    wid = ctx.workspace_id
    now = datetime.utcnow()

    post = await _fetch_one(
        db,
        """
        SELECT s.* FROM social_posts s
        INNER JOIN nelvyon_projects p ON p.id = s.project_id
            AND p.workspace_id = :wid
        WHERE s.id = :id
        """,
        {"id": req.social_post_id, "wid": wid},
    )
    if not post:
        raise HTTPException(status_code=404, detail="Social post no encontrado")

    subject = req.subject or f"Incidencia Social: {post.get('platform', 'unknown')} — Post #{req.social_post_id}"
    description = (
        f"Ticket generado automáticamente desde Social.\n\n"
        f"Plataforma: {post.get('platform', 'N/A')}\n"
        f"Estado del post: {post.get('status', 'N/A')}\n"
        f"Campaña: {post.get('campaign_name', 'N/A')}\n"
        f"Error: {post.get('error_message', 'N/A')}\n"
        f"Contenido: {(post.get('content', '') or '')[:200]}...\n\n"
        f"Post ID: {req.social_post_id}"
    )

    # Get client name if available
    client_name = None
    client_id = post.get("client_id")
    if client_id:
        client = await _fetch_one(
            db,
            "SELECT business_name FROM nelvyon_clients WHERE id = :cid AND workspace_id = :wid",
            {"cid": client_id, "wid": wid},
        )
        if client:
            client_name = client.get("business_name")

    result = await db.execute(
        text("""
            INSERT INTO helpdesk_tickets
            (user_id, workspace_id, subject, description, status, priority, category, channel,
             client_id, project_id, output_id, contract_id, social_post_id, campaign_name,
             client_name, created_at)
            VALUES
            (:uid, :wid, :subject, :description, 'open', :priority, :category, 'social',
             :client_id, :project_id, :output_id, :contract_id, :social_post_id, :campaign_name,
             :client_name, :now)
            RETURNING id
        """),
        {
            "uid": user_id, "wid": wid, "subject": subject, "description": description,
            "priority": req.priority, "category": req.category,
            "client_id": client_id,
            "project_id": post.get("project_id"),
            "output_id": post.get("output_id"),
            "contract_id": post.get("contract_id"),
            "social_post_id": req.social_post_id,
            "campaign_name": post.get("campaign_name"),
            "client_name": client_name,
            "now": now,
        },
    )
    await db.commit()
    row = result.mappings().first()
    ticket_id = row["id"] if row else None

    return {
        "ticket_id": ticket_id,
        "social_post_id": req.social_post_id,
        "subject": subject,
        "status": "open",
        "e2e_context": {
            "client_id": client_id,
            "client_name": client_name,
            "project_id": post.get("project_id"),
            "campaign_name": post.get("campaign_name"),
        },
        "message": f"Ticket #{ticket_id} creado desde incidencia social",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. Create Deal from Project
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/deal-from-project")
async def create_deal_from_project(
    req: CreateDealFromProjectRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a CRM deal linked to a NELVYON project."""
    user_id = str(current_user.id)
    wid = ctx.workspace_id
    now = datetime.utcnow()

    project = await _fetch_one(
        db,
        "SELECT id, name, client_id FROM nelvyon_projects WHERE id = :pid AND workspace_id = :wid",
        {"pid": req.project_id, "wid": wid},
    )
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    title = req.title or f"Deal — {project.get('name', 'Proyecto')}"

    result = await db.execute(
        text("""
            INSERT INTO deals
            (user_id, workspace_id, title, value, stage, client_id, project_id, created_at, updated_at)
            VALUES
            (:uid, :wid, :title, :value, :stage, :client_id, :project_id, :now, :now)
            RETURNING id
        """),
        {
            "uid": user_id, "wid": wid, "title": title, "value": req.value,
            "stage": req.stage, "client_id": project.get("client_id"),
            "project_id": req.project_id, "now": now,
        },
    )
    await db.commit()
    row = result.mappings().first()
    deal_id = row["id"] if row else None

    return {
        "deal_id": deal_id,
        "title": title,
        "stage": req.stage,
        "e2e_context": {
            "client_id": project.get("client_id"),
            "project_id": req.project_id,
            "project_name": project.get("name"),
        },
        "message": f"Deal #{deal_id} creado desde proyecto '{project.get('name')}'",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. Link CRM Contact ↔ OS Client
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/link-crm-client")
async def link_crm_client(
    req: LinkCrmClientRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Link a CRM contact to a NELVYON OS client.
    Updates the contact's company_name and tags to reflect the link.
    """
    user_id = str(current_user.id)
    wid = ctx.workspace_id

    # Verify both exist
    contact = await _fetch_one(
        db,
        "SELECT id, first_name, last_name, company_name, tags FROM contacts WHERE id = :cid AND workspace_id = :wid",
        {"cid": req.contact_id, "wid": wid},
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto CRM no encontrado")

    client = await _fetch_one(
        db,
        "SELECT id, business_name FROM nelvyon_clients WHERE id = :cid AND workspace_id = :wid",
        {"cid": req.client_id, "wid": wid},
    )
    if not client:
        raise HTTPException(status_code=404, detail="Cliente OS no encontrado")

    # Update contact with client link
    existing_tags = contact.get("tags") or ""
    link_tag = f"nelvyon_client:{req.client_id}"
    if link_tag not in existing_tags:
        new_tags = f"{existing_tags},{link_tag}" if existing_tags else link_tag
    else:
        new_tags = existing_tags

    await db.execute(
        text("""
            UPDATE contacts SET company_name = :company, tags = :tags, updated_at = :now
            WHERE id = :cid AND workspace_id = :wid
        """),
        {
            "company": client.get("business_name"),
            "tags": new_tags,
            "cid": req.contact_id,
            "wid": wid,
            "now": datetime.utcnow(),
        },
    )
    await db.commit()

    return {
        "contact_id": req.contact_id,
        "client_id": req.client_id,
        "contact_name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
        "client_name": client.get("business_name"),
        "message": f"Contacto vinculado a cliente '{client.get('business_name')}'",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. Get E2E Relationships for a Project (enhanced)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/relationships/{project_id}", response_model=E2ERelationshipResponse)
async def get_project_relationships(
    project_id: int,
    ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all E2E entity counts linked to a project, including CRM entities."""
    user_id = str(current_user.id)
    wid = ctx.workspace_id

    project = await _fetch_one(
        db,
        "SELECT name, client_id, status FROM nelvyon_projects WHERE id = :pid AND workspace_id = :wid",
        {"pid": project_id, "wid": wid},
    )
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    client_id = project.get("client_id")
    client_name = None
    if client_id:
        client = await _fetch_one(
            db,
            "SELECT business_name FROM nelvyon_clients WHERE id = :cid AND workspace_id = :wid",
            {"cid": client_id, "wid": wid},
        )
        client_name = client.get("business_name") if client else None

    return E2ERelationshipResponse(
        client_id=client_id,
        client_name=client_name,
        project_id=project_id,
        project_name=project.get("name"),
        project_status=project.get("status"),
        outputs_count=await _count_in_workspace(db, "nelvyon_outputs", "project_id", project_id, user_id, wid),
        assets_count=await _count_in_workspace(db, "nelvyon_assets", "project_id", project_id, user_id, wid),
        contracts_count=await _count_in_workspace(db, "contracts", "project_id", project_id, user_id, wid),
        social_posts_count=await _count_in_workspace(db, "social_posts", "project_id", project_id, user_id, wid),
        tickets_count=await _count_in_workspace(db, "helpdesk_tickets", "project_id", project_id, user_id, wid),
        deals_count=await _count_in_workspace(db, "deals", "project_id", project_id, user_id, wid),
        campaigns_count=await _count_in_workspace(db, "campaigns", "project_id", project_id, user_id, wid),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. Full Chain for a Client
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/full-chain/{client_id}", response_model=FullChainResponse)
async def get_full_chain(
    client_id: int,
    ctx: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the complete E2E chain for a client across all modules."""
    wid = ctx.workspace_id

    # Client (workspace-scoped; any member may read team data)
    client = await _fetch_one(
        db,
        "SELECT id, business_name, sector, country FROM nelvyon_clients WHERE id = :cid AND workspace_id = :wid",
        {"cid": client_id, "wid": wid},
    )
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Projects
    projects = await _fetch_all(
        db,
        "SELECT id, name, status, project_type, progress FROM nelvyon_projects WHERE client_id = :cid AND workspace_id = :wid ORDER BY id DESC LIMIT 20",
        {"cid": client_id, "wid": wid},
    )

    # Outputs
    outputs = await _fetch_all(
        db,
        """
        SELECT o.id, o.project_id, o.output_type, o.title, o.qa_status, o.qa_score FROM nelvyon_outputs o
        WHERE o.client_id = :cid
        AND EXISTS (SELECT 1 FROM nelvyon_projects p WHERE p.id = o.project_id AND p.workspace_id = :wid)
        ORDER BY o.id DESC LIMIT 30
        """,
        {"cid": client_id, "wid": wid},
    )

    # Assets
    assets = await _fetch_all(
        db,
        """
        SELECT a.id, a.project_id, a.asset_type, a.file_name, a.classification FROM nelvyon_assets a
        WHERE a.client_id = :cid
        AND (
            a.workspace_id = :wid
            OR (
                a.project_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM nelvyon_projects p
                    WHERE p.id = a.project_id AND p.workspace_id = :wid
                )
            )
        )
        ORDER BY a.id DESC LIMIT 30
        """,
        {"cid": client_id, "wid": wid},
    )

    # Contracts
    contracts = await _fetch_all(
        db,
        """
        SELECT c.id, c.project_id, c.title, c.status, c.contract_type, c.price FROM contracts c
        WHERE c.client_id = :cid
        AND (c.workspace_id = :wid OR EXISTS (
            SELECT 1 FROM nelvyon_projects p WHERE p.id = c.project_id AND p.workspace_id = :wid
        ))
        ORDER BY c.id DESC LIMIT 20
        """,
        {"cid": client_id, "wid": wid},
    )

    # Social Posts
    social = await _fetch_all(
        db,
        """
        SELECT s.id, s.project_id, s.contract_id, s.platform, s.status, s.campaign_name FROM social_posts s
        INNER JOIN nelvyon_projects p ON p.id = s.project_id AND p.workspace_id = :wid
        WHERE s.client_id = :cid
        ORDER BY s.id DESC LIMIT 30
        """,
        {"cid": client_id, "wid": wid},
    )

    # Tickets
    tickets = await _fetch_all(
        db,
        "SELECT id, project_id, social_post_id, subject, status, priority FROM helpdesk_tickets WHERE client_id = :cid AND workspace_id = :wid ORDER BY id DESC LIMIT 20",
        {"cid": client_id, "wid": wid},
    )

    # Deals (via client_id)
    deals = await _fetch_all(
        db,
        "SELECT id, project_id, title, value, stage FROM deals WHERE client_id = :cid AND workspace_id = :wid ORDER BY id DESC LIMIT 20",
        {"cid": client_id, "wid": wid},
    )

    # Campaigns (via client_id)
    campaigns = await _fetch_all(
        db,
        "SELECT id, project_id, name, status, type FROM campaigns WHERE client_id = :cid AND workspace_id = :wid ORDER BY id DESC LIMIT 20",
        {"cid": client_id, "wid": wid},
    )

    total = (
        len(projects) + len(outputs) + len(assets) + len(contracts)
        + len(social) + len(tickets) + len(deals) + len(campaigns)
    )

    return FullChainResponse(
        client=client,
        projects=projects,
        outputs=outputs,
        assets=assets,
        contracts=contracts,
        social_posts=social,
        tickets=tickets,
        deals=deals,
        campaigns=campaigns,
        total_entities=total,
    )
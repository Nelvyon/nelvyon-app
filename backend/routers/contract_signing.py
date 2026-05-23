"""
Contract Signing Router — Digital signature workflow endpoints.

Provides:
- POST /prepare     → Prepare contract for signing (compute hash, set status to 'sent')
- POST /sign        → Sign a contract (record signature, verify integrity)
- POST /activate    → Activate a signed contract
- POST /transition  → Generic status transition with validation
- GET  /audit-trail → Get full audit trail for a contract
- GET  /verify      → Verify document integrity
- GET  /status-flow → Get allowed status transitions
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.contract_signing import ContractSigningService, VALID_TRANSITIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/contracts/signing", tags=["contract-signing"])


# ─── Request/Response Schemas ───

class PrepareRequest(BaseModel):
    contract_id: int


class SignRequest(BaseModel):
    contract_id: int
    signer_name: str
    signer_email: str


class ActivateRequest(BaseModel):
    contract_id: int


class TransitionRequest(BaseModel):
    contract_id: int
    new_status: str
    reason: str = ""


class SigningResponse(BaseModel):
    contract_id: int
    status: str
    document_hash: Optional[str] = None
    signed_at: Optional[str] = None
    signature_id: Optional[str] = None
    integrity_verified: Optional[bool] = None
    allowed_next_statuses: Optional[List[str]] = None
    signature_data: Optional[Dict[str, Any]] = None


class TransitionResponse(BaseModel):
    contract_id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_at: Optional[str] = None
    activated_at: Optional[str] = None
    allowed_next_statuses: Optional[List[str]] = None


class AuditEntry(BaseModel):
    action: str
    user_id: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None


class IntegrityResponse(BaseModel):
    contract_id: int
    integrity_valid: bool
    stored_hash: str
    current_hash: str
    has_signature: bool
    status: Optional[str] = None


# ─── Endpoints ───

@router.post("/prepare", response_model=SigningResponse)
async def prepare_for_signing(
    data: PrepareRequest,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Prepare a contract for signing. Computes document hash and transitions to 'sent'."""
    service = ContractSigningService(db)
    try:
        result = await service.prepare_for_signing(
            data.contract_id, str(current_user.id), workspace_id=ctx.workspace_id
        )
        return SigningResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error preparing contract for signing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to prepare contract for signing")


@router.post("/sign", response_model=SigningResponse)
async def sign_contract(
    data: SignRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Sign a contract. Verifies document integrity and records signature."""
    service = ContractSigningService(db)
    try:
        result = await service.sign_contract(
            data.contract_id, str(current_user.id),
            data.signer_name, data.signer_email,
            workspace_id=ctx.workspace_id,
        )
        from services.audit_service import log_critical_audit

        await log_critical_audit(
            db,
            tenant_id=int(ctx.workspace_id),
            user_id=str(current_user.id),
            action="signed",
            resource_type="contract",
            resource_id=str(data.contract_id),
            ip_address=request.client.host if request.client else None,
        )
        return SigningResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error signing contract: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to sign contract")


@router.post("/activate", response_model=TransitionResponse)
async def activate_contract(
    data: ActivateRequest,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Activate a signed contract."""
    service = ContractSigningService(db)
    try:
        result = await service.activate_contract(
            data.contract_id, str(current_user.id), workspace_id=ctx.workspace_id
        )
        return TransitionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error activating contract: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to activate contract")


@router.post("/transition", response_model=TransitionResponse)
async def transition_status(
    data: TransitionRequest,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Transition contract status with validation."""
    service = ContractSigningService(db)
    try:
        result = await service.transition_status(
            data.contract_id, str(current_user.id),
            data.new_status, data.reason,
            workspace_id=ctx.workspace_id,
        )
        return TransitionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error transitioning contract status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to transition contract status")


@router.get("/audit-trail/{contract_id}", response_model=List[AuditEntry])
async def get_audit_trail(
    contract_id: int,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get the full audit trail for a contract."""
    service = ContractSigningService(db)
    try:
        trail = await service.get_audit_trail(
            contract_id, str(current_user.id), workspace_id=ctx.workspace_id
        )
        return [AuditEntry(**entry) for entry in trail if isinstance(entry, dict)]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/verify/{contract_id}", response_model=IntegrityResponse)
async def verify_integrity(
    contract_id: int,
    current_user: UserResponse = Depends(get_current_user),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Verify the integrity of a contract's content against its stored hash."""
    service = ContractSigningService(db)
    try:
        result = await service.verify_integrity(
            contract_id, str(current_user.id), workspace_id=ctx.workspace_id
        )
        return IntegrityResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/status-flow")
async def get_status_flow():
    """Get the complete status flow diagram (no auth required for reference)."""
    return {
        "transitions": VALID_TRANSITIONS,
        "terminal_states": ["expired"],
        "initial_state": "draft",
        "signing_required_for": ["signed", "active"],
        "description": {
            "draft": "Contract is being drafted, not yet sent for signing",
            "sent": "Contract has been sent and is awaiting signature",
            "signed": "Contract has been signed, pending activation",
            "active": "Contract is active and in effect",
            "expired": "Contract has expired (terminal state)",
            "cancelled": "Contract was cancelled (can be reopened as draft)",
        },
    }
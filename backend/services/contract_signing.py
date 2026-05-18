"""
Contract Signing Service — Digital signature preparation and verification.

Provides:
- Hash-based document integrity (SHA-256)
- Signature workflow: draft → sent → signed → active → expired/cancelled
- Audit trail for every status transition
- Preparation for external e-signature providers (DocuSign, HelloSign)

This is NOT a full e-signature implementation (requires third-party provider),
but provides the cryptographic foundation and workflow management.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.contracts import Contracts

logger = logging.getLogger(__name__)

# Valid status transitions
VALID_TRANSITIONS: Dict[str, List[str]] = {
    "draft": ["sent", "cancelled"],
    "sent": ["signed", "draft", "cancelled"],
    "signed": ["active", "cancelled"],
    "active": ["expired", "cancelled"],
    "expired": [],  # Terminal state
    "cancelled": ["draft"],  # Can reopen as draft
}

# Statuses that require signature data
SIGNATURE_REQUIRED_STATUSES = {"signed", "active"}


class ContractSigningService:
    """Manages contract signing workflow, document hashing, and audit trail."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Document Integrity ───

    @staticmethod
    def compute_document_hash(content: str) -> str:
        """Compute SHA-256 hash of contract content for integrity verification."""
        if not content:
            return ""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    def verify_document_hash(content: str, expected_hash: str) -> bool:
        """Verify that contract content matches its stored hash."""
        if not content or not expected_hash:
            return False
        return hashlib.sha256(content.encode("utf-8")).hexdigest() == expected_hash

    # ─── Status Workflow ───

    def validate_transition(self, current_status: str, new_status: str) -> bool:
        """Check if a status transition is valid."""
        current = (current_status or "draft").lower()
        new = new_status.lower()
        allowed = VALID_TRANSITIONS.get(current, [])
        return new in allowed

    def get_allowed_transitions(self, current_status: str) -> List[str]:
        """Get list of valid next statuses from current status."""
        current = (current_status or "draft").lower()
        return VALID_TRANSITIONS.get(current, [])

    # ─── Signing Operations ───

    async def prepare_for_signing(
        self, contract_id: int, user_id: str, workspace_id: int | None = None
    ) -> Dict[str, Any]:
        """
        Prepare a contract for signing:
        1. Validate it's in 'draft' or 'sent' status
        2. Compute document hash
        3. Transition to 'sent' status
        4. Record in audit trail
        """
        contract = await self._get_contract(contract_id, user_id, workspace_id=workspace_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")

        current_status = (contract.status or "draft").lower()
        if current_status not in ("draft", "sent"):
            raise ValueError(
                f"Cannot prepare contract for signing: current status is '{current_status}'. "
                f"Must be 'draft' or 'sent'."
            )

        # Compute document hash for integrity
        doc_hash = self.compute_document_hash(contract.content or "")

        # Build signature metadata
        signature_meta = {
            "document_hash": doc_hash,
            "prepared_at": datetime.now(timezone.utc).isoformat(),
            "prepared_by": user_id,
            "status": "awaiting_signature",
            "signing_method": "hash_verification",  # Placeholder for e-sign provider
        }

        # Update contract
        contract.status = "sent"
        contract.signature_data = json.dumps(signature_meta)
        contract.updated_at = datetime.now(timezone.utc)

        # Append to audit trail
        self._append_audit_trail(contract, user_id, "prepared_for_signing", {
            "document_hash": doc_hash,
            "previous_status": current_status,
        })

        await self.db.commit()
        await self.db.refresh(contract)

        return {
            "contract_id": contract.id,
            "status": contract.status,
            "document_hash": doc_hash,
            "signature_data": signature_meta,
            "allowed_next_statuses": self.get_allowed_transitions(contract.status),
        }

    async def sign_contract(
        self,
        contract_id: int,
        user_id: str,
        signer_name: str,
        signer_email: str,
        workspace_id: int | None = None,
    ) -> Dict[str, Any]:
        """
        Sign a contract:
        1. Validate it's in 'sent' status
        2. Verify document integrity (hash hasn't changed)
        3. Record signature with timestamp
        4. Transition to 'signed' status
        """
        contract = await self._get_contract(contract_id, user_id, workspace_id=workspace_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")

        current_status = (contract.status or "draft").lower()
        if current_status != "sent":
            raise ValueError(
                f"Cannot sign contract: current status is '{current_status}'. Must be 'sent'."
            )

        # Verify document integrity
        existing_sig = {}
        if contract.signature_data:
            try:
                existing_sig = json.loads(contract.signature_data)
            except json.JSONDecodeError:
                pass

        stored_hash = existing_sig.get("document_hash", "")
        current_hash = self.compute_document_hash(contract.content or "")

        if stored_hash and stored_hash != current_hash:
            raise ValueError(
                "Document integrity check failed: contract content was modified after preparation. "
                "Please re-prepare the contract for signing."
            )

        # Record signature
        now = datetime.now(timezone.utc)
        signature_record = {
            **existing_sig,
            "status": "signed",
            "signed_at": now.isoformat(),
            "signer_name": signer_name,
            "signer_email": signer_email,
            "signer_user_id": user_id,
            "document_hash_at_signing": current_hash,
            "signature_id": hashlib.sha256(
                f"{contract_id}:{user_id}:{now.isoformat()}".encode()
            ).hexdigest()[:16],
        }

        contract.status = "signed"
        contract.signature_data = json.dumps(signature_record)
        contract.updated_at = now

        self._append_audit_trail(contract, user_id, "contract_signed", {
            "signer_name": signer_name,
            "signer_email": signer_email,
            "document_hash": current_hash,
        })

        await self.db.commit()
        await self.db.refresh(contract)

        return {
            "contract_id": contract.id,
            "status": "signed",
            "signed_at": now.isoformat(),
            "signature_id": signature_record["signature_id"],
            "document_hash": current_hash,
            "integrity_verified": True,
        }

    async def activate_contract(
        self, contract_id: int, user_id: str, workspace_id: int | None = None
    ) -> Dict[str, Any]:
        """Activate a signed contract."""
        contract = await self._get_contract(contract_id, user_id, workspace_id=workspace_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")

        current_status = (contract.status or "draft").lower()
        if current_status != "signed":
            raise ValueError(f"Cannot activate: current status is '{current_status}'. Must be 'signed'.")

        now = datetime.now(timezone.utc)
        contract.status = "active"
        contract.updated_at = now

        self._append_audit_trail(contract, user_id, "contract_activated", {})

        await self.db.commit()
        await self.db.refresh(contract)

        return {
            "contract_id": contract.id,
            "status": "active",
            "activated_at": now.isoformat(),
        }

    async def transition_status(
        self,
        contract_id: int,
        user_id: str,
        new_status: str,
        reason: str = "",
        workspace_id: int | None = None,
    ) -> Dict[str, Any]:
        """Generic status transition with validation."""
        contract = await self._get_contract(contract_id, user_id, workspace_id=workspace_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")

        current_status = (contract.status or "draft").lower()
        new_status_lower = new_status.lower()

        if not self.validate_transition(current_status, new_status_lower):
            allowed = self.get_allowed_transitions(current_status)
            raise ValueError(
                f"Invalid transition: '{current_status}' → '{new_status_lower}'. "
                f"Allowed transitions: {allowed}"
            )

        # Require signature for certain statuses
        if new_status_lower in SIGNATURE_REQUIRED_STATUSES and not contract.signature_data:
            raise ValueError(f"Cannot transition to '{new_status_lower}' without signature data.")

        now = datetime.now(timezone.utc)
        old_status = contract.status
        contract.status = new_status_lower
        contract.updated_at = now

        self._append_audit_trail(contract, user_id, "status_changed", {
            "from": old_status,
            "to": new_status_lower,
            "reason": reason,
        })

        await self.db.commit()
        await self.db.refresh(contract)

        return {
            "contract_id": contract.id,
            "previous_status": old_status,
            "new_status": new_status_lower,
            "changed_at": now.isoformat(),
            "allowed_next_statuses": self.get_allowed_transitions(new_status_lower),
        }

    async def get_audit_trail(
        self, contract_id: int, user_id: str, workspace_id: int | None = None
    ) -> List[Dict[str, Any]]:
        """Get the full audit trail for a contract."""
        contract = await self._get_contract(contract_id, user_id, workspace_id=workspace_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")

        trail = []
        if contract.audit_trail:
            try:
                trail = json.loads(contract.audit_trail)
            except json.JSONDecodeError:
                trail = [{"raw": contract.audit_trail}]

        return trail

    async def verify_integrity(
        self, contract_id: int, user_id: str, workspace_id: int | None = None
    ) -> Dict[str, Any]:
        """Verify the integrity of a contract's content against its stored hash."""
        contract = await self._get_contract(contract_id, user_id, workspace_id=workspace_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")

        sig_data = {}
        if contract.signature_data:
            try:
                sig_data = json.loads(contract.signature_data)
            except json.JSONDecodeError:
                pass

        stored_hash = sig_data.get("document_hash", "") or sig_data.get("document_hash_at_signing", "")
        current_hash = self.compute_document_hash(contract.content or "")

        is_valid = bool(stored_hash and stored_hash == current_hash)

        return {
            "contract_id": contract.id,
            "integrity_valid": is_valid,
            "stored_hash": stored_hash[:16] + "..." if stored_hash else "none",
            "current_hash": current_hash[:16] + "..." if current_hash else "none",
            "has_signature": bool(sig_data.get("signed_at")),
            "status": contract.status,
        }

    # ─── Internal Helpers ───

    async def _get_contract(
        self, contract_id: int, user_id: str, workspace_id: int | None = None
    ) -> Optional[Contracts]:
        """Get a contract by ID with ownership check."""
        conds = [Contracts.id == contract_id, Contracts.user_id == user_id]
        if workspace_id is not None:
            conds.append(Contracts.workspace_id == workspace_id)
        result = await self.db.execute(select(Contracts).where(*conds))
        return result.scalar_one_or_none()

    def _append_audit_trail(
        self, contract: Contracts, user_id: str, action: str, details: Dict[str, Any],
    ) -> None:
        """Append an entry to the contract's audit trail."""
        trail = []
        if contract.audit_trail:
            try:
                trail = json.loads(contract.audit_trail)
            except json.JSONDecodeError:
                trail = []

        trail.append({
            "action": action,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details,
        })

        contract.audit_trail = json.dumps(trail)
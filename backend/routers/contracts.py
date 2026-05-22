import json
import logging
import tempfile
from pathlib import Path
from typing import Any, List, Optional

from datetime import datetime

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.contracts import ContractsService
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator

# Set up logging
logger = logging.getLogger(__name__)

entities_router = APIRouter(prefix="/api/v1/entities/contracts", tags=["contracts"])


# ---------- Pydantic Schemas ----------
class ContractsData(BaseModel):
    """Entity data schema (for create/update)"""
    workspace_id: int = None
    title: str
    contract_type: str = None
    client_name: str = None
    company_name: str = None
    content: str = None
    jurisdiction: str = None
    language: str = None
    status: str = None
    signature_data: str = None
    price: str = None
    duration: str = None
    template_id: str = None
    audit_trail: str = None
    client_id: int = None
    project_id: int = None
    output_id: int = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ContractsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    workspace_id: Optional[int] = None
    title: Optional[str] = None
    contract_type: Optional[str] = None
    client_name: Optional[str] = None
    company_name: Optional[str] = None
    content: Optional[str] = None
    jurisdiction: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    signature_data: Optional[str] = None
    price: Optional[str] = None
    duration: Optional[str] = None
    template_id: Optional[str] = None
    audit_trail: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ContractsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: Optional[int] = None
    title: str
    contract_type: Optional[str] = None
    client_name: Optional[str] = None
    company_name: Optional[str] = None
    content: Optional[str] = None
    jurisdiction: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    signature_data: Optional[str] = None
    price: Optional[str] = None
    duration: Optional[str] = None
    template_id: Optional[str] = None
    audit_trail: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    output_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ContractsListResponse(BaseModel):
    """List response schema"""
    items: List[ContractsResponse]
    total: int
    skip: int
    limit: int


class ContractsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[ContractsData]


class ContractsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: ContractsUpdateData


class ContractsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[ContractsBatchUpdateItem]


class ContractsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@entities_router.get("", response_model=ContractsListResponse)
async def query_contractss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Query contracts with filtering, sorting, and pagination (workspace-scoped)."""
    logger.debug(f"Querying contractss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = ContractsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        logger.debug(f"Found {result['total']} contractss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error querying contractss: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@entities_router.get("/{id}", response_model=ContractsResponse)
async def get_contracts(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get a single contract by ID (workspace-scoped)."""
    logger.debug(f"Fetching contracts with id: {id}, fields={fields}")

    service = ContractsService(db)
    try:
        result = await service.get_by_id(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Contracts with id {id} not found")
            raise HTTPException(status_code=404, detail="Contracts not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching contracts %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@entities_router.post("", response_model=ContractsResponse, status_code=201)
async def create_contracts(
    data: ContractsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create a new contract (workspace operator)."""
    logger.debug(f"Creating new contracts with data: {data}")

    service = ContractsService(db)
    try:
        result = await service.create(
            data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create contracts")

        logger.info(f"Contracts created successfully with id: {result.id}")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error creating contracts: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating contracts: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@entities_router.post("/batch", response_model=List[ContractsResponse], status_code=201)
async def create_contractss_batch(
    request: ContractsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple contracts in a single request."""
    logger.debug(f"Batch creating {len(request.items)} contractss")

    service = ContractsService(db)
    results = []

    try:
        for item_data in request.items:
            result = await service.create(
                item_data.model_dump(), user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)

        logger.info(f"Batch created {len(results)} contractss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error("Error in batch create: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@entities_router.put("/batch", response_model=List[ContractsResponse])
async def update_contractss_batch(
    request: ContractsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple contracts in a single request (workspace operator)."""
    logger.debug(f"Batch updating {len(request.items)} contractss")

    service = ContractsService(db)
    results = []

    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(
                item.id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if result:
                results.append(result)

        logger.info(f"Batch updated {len(results)} contractss successfully")
        return results
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error("Error in batch update: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@entities_router.put("/{id}", response_model=ContractsResponse)
async def update_contracts(
    id: int,
    data: ContractsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing contract (workspace operator)."""
    logger.debug(f"Updating contracts {id} with data: {data}")

    service = ContractsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(
            id, update_dict, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not result:
            logger.warning(f"Contracts with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Contracts not found")

        logger.info(f"Contracts {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating contracts {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error updating contracts %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@entities_router.delete("/batch")
async def delete_contractss_batch(
    request: ContractsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple contracts by their IDs (workspace operator)."""
    logger.debug(f"Batch deleting {len(request.ids)} contractss")

    service = ContractsService(db)
    deleted_count = 0

    try:
        for item_id in request.ids:
            success = await service.delete(
                item_id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
            )
            if success:
                deleted_count += 1

        logger.info(f"Batch deleted {deleted_count} contractss successfully")
        return {
            "message": f"Successfully deleted {deleted_count} contractss",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        await db.rollback()
        logger.error("Error in batch delete: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@entities_router.delete("/{id}")
async def delete_contracts(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single contract by ID (workspace operator)."""
    logger.debug(f"Deleting contracts with id: {id}")

    service = ContractsService(db)
    try:
        success = await service.delete(
            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id
        )
        if not success:
            logger.warning(f"Contracts with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Contracts not found")

        logger.info(f"Contracts {id} deleted successfully")
        return {"message": "Contracts deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting contracts %s: %s", id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ─── Signaturit eIDAS signing API (/api/contracts) ───────────────────────────

from services.signaturit_service import get_signaturit_service


class SignerInput(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: Optional[str] = None


class SendContractJsonBody(BaseModel):
    document_path: str = Field(..., min_length=1)
    signers: List[SignerInput] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


signaturit_router = APIRouter(prefix="/api/contracts", tags=["contracts-signaturit"])


@signaturit_router.post("/webhook")
async def signaturit_webhook(request: Request):
    """Receive Signaturit webhook events (no auth — configure URL in Signaturit dashboard)."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="JSON body required")
    service = get_signaturit_service()
    return service.handle_webhook_event(payload)


@signaturit_router.get("")
async def list_contract_signatures(
    status: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
):
    service = get_signaturit_service()
    try:
        return await service.list_signatures(status=status, limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@signaturit_router.post("/send")
async def send_contract_for_signature(
    request: Request,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
):
    """Send a PDF to Signaturit (JSON body or multipart with file)."""
    service = get_signaturit_service()
    content_type = (request.headers.get("content-type") or "").lower()

    resolved_path: str | None = None
    resolved_subject = ""
    resolved_message = ""
    resolved_signers: list[dict[str, Any]] = []

    if "application/json" in content_type:
        try:
            raw = await request.json()
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid JSON body") from exc
        body = SendContractJsonBody.model_validate(raw)
        resolved_path = body.document_path.strip()
        resolved_subject = body.subject.strip()
        resolved_message = body.message.strip()
        resolved_signers = [s.model_dump() for s in body.signers]
    elif "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        if upload is not None and hasattr(upload, "read"):
            suffix = Path(getattr(upload, "filename", None) or "contract.pdf").suffix or ".pdf"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(await upload.read())
                resolved_path = tmp.name
        doc_path = form.get("document_path")
        if not resolved_path and doc_path:
            resolved_path = str(doc_path).strip()
        resolved_subject = str(form.get("subject") or "").strip()
        resolved_message = str(form.get("message") or "").strip()
        signers_raw = form.get("signers_json") or form.get("signers")
        if signers_raw:
            try:
                parsed = json.loads(str(signers_raw))
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=400, detail="Invalid signers JSON") from exc
            if not isinstance(parsed, list):
                raise HTTPException(status_code=400, detail="signers must be a JSON array")
            resolved_signers = parsed
    else:
        raise HTTPException(
            status_code=415,
            detail="Use application/json or multipart/form-data",
        )

    if not resolved_path:
        raise HTTPException(status_code=400, detail="file or document_path is required")
    if not resolved_subject or not resolved_message or not resolved_signers:
        raise HTTPException(status_code=400, detail="subject, message, and signers are required")

    try:
        result = await service.create_signature_request(
            document_path=resolved_path,
            signers=resolved_signers,
            subject=resolved_subject,
            message=resolved_message,
        )
        return {
            "workspace_id": ws_ctx.workspace_id,
            "signature_id": result.get("id"),
            "status": result.get("status"),
            "mock": result.get("mock", service.is_mock),
            "signaturit": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("send_contract_for_signature: %s", sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@signaturit_router.get("/{signature_id}/status")
async def get_contract_signature_status(
    signature_id: str,
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
):
    service = get_signaturit_service()
    try:
        return await service.get_signature_status(signature_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@signaturit_router.get("/{signature_id}/download")
async def download_signed_contract(
    signature_id: str,
    _ws_ctx: WorkspaceContext = Depends(require_workspace),
):
    service = get_signaturit_service()
    try:
        content, filename = await service.download_signed_document(signature_id)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@signaturit_router.delete("/{signature_id}")
async def cancel_contract_signature(
    signature_id: str,
    _ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
):
    service = get_signaturit_service()
    try:
        return await service.cancel_signature(signature_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


router = (entities_router, signaturit_router)

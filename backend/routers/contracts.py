import json
import logging
from typing import List, Optional

from datetime import datetime

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.contracts import ContractsService
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/contracts", tags=["contracts"])


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
@router.get("", response_model=ContractsListResponse)
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


@router.get("/{id}", response_model=ContractsResponse)
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


@router.post("", response_model=ContractsResponse, status_code=201)
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


@router.post("/batch", response_model=List[ContractsResponse], status_code=201)
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


@router.put("/batch", response_model=List[ContractsResponse])
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


@router.put("/{id}", response_model=ContractsResponse)
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


@router.delete("/batch")
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


@router.delete("/{id}")
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

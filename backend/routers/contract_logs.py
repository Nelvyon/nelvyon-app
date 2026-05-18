import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.contract_logs import Contract_logsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/contract_logs", tags=["contract_logs"])


# ---------- Pydantic Schemas ----------
class Contract_logsData(BaseModel):
    """Entity data schema (for create/update)"""
    contract_id: int
    action: str
    field_changed: str = None
    old_value: str = None
    new_value: str = None
    actor_name: str = None
    actor_role: str = None
    ip_address: str = None
    notes: str = None
    created_at: Optional[datetime] = None


class Contract_logsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    contract_id: Optional[int] = None
    action: Optional[str] = None
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    ip_address: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class Contract_logsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    contract_id: int
    action: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    ip_address: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Contract_logsListResponse(BaseModel):
    """List response schema"""
    items: List[Contract_logsResponse]
    total: int
    skip: int
    limit: int


class Contract_logsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Contract_logsData]


class Contract_logsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Contract_logsUpdateData


class Contract_logsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Contract_logsBatchUpdateItem]


class Contract_logsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Contract_logsListResponse)
async def query_contract_logss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query contract_logss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying contract_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Contract_logsService(db)
    try:
        # Parse query JSON if provided
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
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} contract_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying contract_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Contract_logsListResponse)
async def query_contract_logss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query contract_logss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying contract_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Contract_logsService(db)
    try:
        # Parse query JSON if provided
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
            sort=sort
        )
        logger.debug(f"Found {result['total']} contract_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying contract_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Contract_logsResponse)
async def get_contract_logs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single contract_logs by ID (user can only see their own records)"""
    logger.debug(f"Fetching contract_logs with id: {id}, fields={fields}")
    
    service = Contract_logsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Contract_logs with id {id} not found")
            raise HTTPException(status_code=404, detail="Contract_logs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contract_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Contract_logsResponse, status_code=201)
async def create_contract_logs(
    data: Contract_logsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new contract_logs"""
    logger.debug(f"Creating new contract_logs with data: {data}")
    
    service = Contract_logsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create contract_logs")
        
        logger.info(f"Contract_logs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating contract_logs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating contract_logs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Contract_logsResponse], status_code=201)
async def create_contract_logss_batch(
    request: Contract_logsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple contract_logss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} contract_logss")
    
    service = Contract_logsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} contract_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Contract_logsResponse])
async def update_contract_logss_batch(
    request: Contract_logsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple contract_logss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} contract_logss")
    
    service = Contract_logsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} contract_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Contract_logsResponse)
async def update_contract_logs(
    id: int,
    data: Contract_logsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing contract_logs (requires ownership)"""
    logger.debug(f"Updating contract_logs {id} with data: {data}")

    service = Contract_logsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Contract_logs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Contract_logs not found")
        
        logger.info(f"Contract_logs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating contract_logs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating contract_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_contract_logss_batch(
    request: Contract_logsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple contract_logss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} contract_logss")
    
    service = Contract_logsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} contract_logss successfully")
        return {"message": f"Successfully deleted {deleted_count} contract_logss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_contract_logs(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single contract_logs by ID (requires ownership)"""
    logger.debug(f"Deleting contract_logs with id: {id}")
    
    service = Contract_logsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Contract_logs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Contract_logs not found")
        
        logger.info(f"Contract_logs {id} deleted successfully")
        return {"message": "Contract_logs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contract_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
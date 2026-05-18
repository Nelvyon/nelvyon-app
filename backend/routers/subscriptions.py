import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.subscriptions import SubscriptionsService
from services.billing_plan_validation import assert_known_plan_or_raise
from dependencies.auth import get_current_user, get_super_admin_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/subscriptions", tags=["subscriptions"])


# ---------- Pydantic Schemas ----------
class SubscriptionsData(BaseModel):
    """Entity data schema (for create/update)"""
    workspace_id: int
    plan_id: str
    billing_cycle: str
    status: str
    stripe_session_id: str = None
    stripe_subscription_id: str = None
    stripe_customer_id: str = None
    amount_paid: float = None
    currency: str = None
    promo_code: str = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SubscriptionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    plan_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    status: Optional[str] = None
    stripe_session_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    amount_paid: Optional[float] = None
    currency: Optional[str] = None
    promo_code: Optional[str] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SubscriptionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    workspace_id: int
    plan_id: str
    billing_cycle: str
    status: str
    stripe_session_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    amount_paid: Optional[float] = None
    currency: Optional[str] = None
    promo_code: Optional[str] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SubscriptionsListResponse(BaseModel):
    """List response schema"""
    items: List[SubscriptionsResponse]
    total: int
    skip: int
    limit: int


class SubscriptionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[SubscriptionsData]


class SubscriptionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: SubscriptionsUpdateData


class SubscriptionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[SubscriptionsBatchUpdateItem]


class SubscriptionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=SubscriptionsListResponse)
async def query_subscriptionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Suscripciones del workspace activo (aislamiento tenant)."""
    logger.debug(f"Querying subscriptionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = SubscriptionsService(db)
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
            workspace_id=ws_ctx.workspace_id,
        )
        logger.debug(f"Found {result['total']} subscriptionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying subscriptionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=SubscriptionsListResponse)
async def query_subscriptionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _admin: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Query subscriptionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying subscriptionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = SubscriptionsService(db)
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
        logger.debug(f"Found {result['total']} subscriptionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying subscriptionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=SubscriptionsResponse)
async def get_subscriptions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Detalle de suscripción por ID dentro del workspace activo."""
    logger.debug(f"Fetching subscriptions with id: {id}, fields={fields}")

    service = SubscriptionsService(db)
    try:
        result = await service.get_by_id(id, workspace_id=ws_ctx.workspace_id)
        if not result:
            logger.warning(f"Subscriptions with id {id} not found")
            raise HTTPException(status_code=404, detail="Subscriptions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=SubscriptionsResponse, status_code=201)
async def create_subscriptions(
    data: SubscriptionsData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Crear suscripción (admin de workspace); `plan_id` debe existir en `pricing_plans`."""
    logger.debug(f"Creating new subscriptions with data: {data}")

    if int(data.workspace_id) != int(ws_ctx.workspace_id):
        raise HTTPException(
            status_code=400,
            detail="workspace_id in body must match X-Workspace-Id",
        )
    try:
        assert_known_plan_or_raise(data.plan_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    service = SubscriptionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create subscriptions")
        
        logger.info(f"Subscriptions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating subscriptions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating subscriptions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[SubscriptionsResponse], status_code=201)
async def create_subscriptionss_batch(
    request: SubscriptionsBatchCreateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Batch create (admin workspace); valida workspace y plan por ítem."""
    logger.debug(f"Batch creating {len(request.items)} subscriptionss")

    service = SubscriptionsService(db)
    results = []

    try:
        for item_data in request.items:
            row = item_data.model_dump()
            if int(row.get("workspace_id") or 0) != int(ws_ctx.workspace_id):
                raise HTTPException(
                    status_code=400,
                    detail="Each item.workspace_id must match X-Workspace-Id",
                )
            assert_known_plan_or_raise(row.get("plan_id"))
            result = await service.create(row, user_id=str(current_user.id))
            if result:
                results.append(result)

        logger.info(f"Batch created {len(results)} subscriptionss successfully")
        return results
    except HTTPException:
        await db.rollback()
        raise
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[SubscriptionsResponse])
async def update_subscriptionss_batch(
    request: SubscriptionsBatchUpdateRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Batch update (admin workspace); filas deben pertenecer al workspace."""
    logger.debug(f"Batch updating {len(request.items)} subscriptionss")

    service = SubscriptionsService(db)
    results = []

    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            if "plan_id" in update_dict:
                assert_known_plan_or_raise(update_dict.get("plan_id"))
            result = await service.update(
                item.id,
                update_dict,
                user_id=str(current_user.id),
                workspace_id=ws_ctx.workspace_id,
            )
            if result:
                results.append(result)

        logger.info(f"Batch updated {len(results)} subscriptionss successfully")
        return results
    except HTTPException:
        await db.rollback()
        raise
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=SubscriptionsResponse)
async def update_subscriptions(
    id: int,
    data: SubscriptionsUpdateData,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update suscripción (admin workspace)."""
    logger.debug(f"Updating subscriptions {id} with data: {data}")

    service = SubscriptionsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if "workspace_id" in update_dict and int(update_dict["workspace_id"]) != int(ws_ctx.workspace_id):
            raise HTTPException(status_code=400, detail="Cannot move subscription to another workspace")
        if "plan_id" in update_dict:
            assert_known_plan_or_raise(update_dict.get("plan_id"))
        result = await service.update(
            id,
            update_dict,
            user_id=str(current_user.id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not result:
            logger.warning(f"Subscriptions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Subscriptions not found")
        
        logger.info(f"Subscriptions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating subscriptions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_subscriptionss_batch(
    request: SubscriptionsBatchDeleteRequest,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Batch delete (admin workspace)."""
    logger.debug(f"Batch deleting {len(request.ids)} subscriptionss")

    service = SubscriptionsService(db)
    deleted_count = 0

    try:
        for item_id in request.ids:
            success = await service.delete(
                item_id,
                user_id=str(current_user.id),
                workspace_id=ws_ctx.workspace_id,
            )
            if success:
                deleted_count += 1

        logger.info(f"Batch deleted {deleted_count} subscriptionss successfully")
        return {"message": f"Successfully deleted {deleted_count} subscriptionss", "deleted_count": deleted_count}
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_subscriptions(
    id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete suscripción (admin workspace)."""
    logger.debug(f"Deleting subscriptions with id: {id}")

    service = SubscriptionsService(db)
    try:
        success = await service.delete(
            id,
            user_id=str(current_user.id),
            workspace_id=ws_ctx.workspace_id,
        )
        if not success:
            logger.warning(f"Subscriptions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Subscriptions not found")
        
        logger.info(f"Subscriptions {id} deleted successfully")
        return {"message": "Subscriptions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
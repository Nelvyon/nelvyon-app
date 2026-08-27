import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_admin_user, get_super_admin_user
from schemas.auth import UserResponse
from services.user_roles import User_rolesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/user_roles", tags=["user_roles"])


# ═══════════════════════════════════════════════════════════════════════════
# La jerarquia, tambien aqui
# ═══════════════════════════════════════════════════════════════════════════
#
# EL DEFECTO QUE CIERRA ESTO
# --------------------------
# Este router es CRUD generico sobre `user_roles`, y `user_roles` no es una
# entidad de negocio cualquiera: es la fuente canonica de quien administra la
# plataforma. El lado web la consulta para decidir el acceso a `admin/*`
# (`NelvyonAdminService.isUserAdmin`).
#
# Las escrituras exigian `get_admin_user`, asi que un anonimo no llegaba. Pero
# NO comprobaban la jerarquia, y `/rbac/assign` —el endpoint escrito a mano para
# esto mismo— si la comprueba con una razon explicita: «un admin no puede
# asignar un rol superior al suyo».
#
# Es decir: la regla existia y este camino se la saltaba. Un `admin` (nivel 4)
# podia hacer POST aqui con role='super_admin' y ascender, o hacer PUT sobre su
# propia fila. El control deliberado de `/rbac/assign` quedaba en un rodeo de
# una peticion.
#
# LO QUE NO SE TOCA, AUNQUE APETEZCA
# ----------------------------------
# Aqui se puede guardar cualquier cadena como `role`, y se sigue pudiendo. El
# primer intento anadio una lista blanca de cinco nombres y rompio un test que
# crea un rol `analyst` — un test que tenia razon: guardar etiquetas propias con
# su `permissions_json` es una capacidad que este CRUD generico ya daba.
#
# No hacia falta para cerrar el agujero, y quitarla habria sido cambiar el
# producto por una preferencia de legibilidad. `isUserAdmin` compara contra un
# conjunto CERRADO de dos nombres, asi que una etiqueta desconocida no concede
# nada.
#
# La jerarquia es la misma que la de `rbac_management`, y a proposito: si aqui
# fuera otra, «superior a ti» significaria dos cosas distintas segun por que
# puerta se entre, que es la forma normal de que una de las dos acabe siendo mas
# permisiva sin que nadie lo decida.
#
# La lista cerrada de nombres NO se replica: ver `_exigir_rol_asignable`.
ROLE_HIERARCHY = {"super_admin": 5, "admin": 4, "manager": 3, "user": 2, "viewer": 1}


def _exigir_rol_asignable(actor: UserResponse, role: Optional[str]) -> None:
    """Prohibe ascender por encima del propio nivel. Nada mas.

    `role=None` en un update parcial significa «no lo toques», y entonces no hay
    nada que comprobar.

    POR QUE NO SE VALIDA EL NOMBRE DEL ROL AQUI, Y SI EN /rbac/assign
    -----------------------------------------------------------------
    La primera version rechazaba todo rol fuera de VALID_ROLES, copiando la
    regla de `/rbac/assign`. Rompio `test_user_roles_create_admin_ok`, que crea
    un rol `analyst` y espera 201 — y el test tenia razon.

    Los dos endpoints no son lo mismo. `/rbac/assign` presenta al usuario los
    cinco roles con sus permisos por defecto: alli el conjunto cerrado ES el
    contrato, y aceptar uno fuera de la lista seria ofrecer algo que la interfaz
    no sabe explicar. Este router es CRUD generico sobre la entidad, y guardar
    una etiqueta propia con su `permissions_json` es una capacidad que YA
    EXISTIA. Quitarla para ganar legibilidad habria sido cambiar el producto por
    una preferencia mia.

    Y no abre ningun agujero: quien decide el acceso al plano de administracion
    es `NelvyonAdminService.isUserAdmin`, que compara contra un conjunto CERRADO
    de dos nombres. Una etiqueta desconocida no concede nada.

    LO QUE SI HABIA QUE CERRAR, Y SE CIERRA
    ---------------------------------------
    Que un `admin` de nivel 4 pudiera crearse un `super_admin` de nivel 5 por
    aqui, saltandose la comprobacion que `/rbac/assign` si hace con un mensaje
    explicito. Un rol desconocido vale 0 con `ROLE_HIERARCHY.get(role, 0)`, asi
    que nunca supera al actor: la guarda deja pasar `analyst` y sigue parando
    `super_admin`.
    """
    if role is None:
        return
    nivel_actor = ROLE_HIERARCHY.get(getattr(actor, "role", None) or "", 0)
    nivel_pedido = ROLE_HIERARCHY.get(role, 0)
    if nivel_pedido > nivel_actor:
        raise HTTPException(
            status_code=403,
            detail=f"No puedes asignar un rol superior al tuyo ({getattr(actor, 'role', None)})",
        )


# ---------- Pydantic Schemas ----------
class User_rolesData(BaseModel):
    """Entity data schema (for create/update)"""
    user_id: str
    email: str = None
    role: str
    permissions_json: str = None
    assigned_by: str = None
    is_active: bool = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class User_rolesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    permissions_json: Optional[str] = None
    assigned_by: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class User_rolesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    email: Optional[str] = None
    role: str
    permissions_json: Optional[str] = None
    assigned_by: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class User_rolesListResponse(BaseModel):
    """List response schema"""
    items: List[User_rolesResponse]
    total: int
    skip: int
    limit: int


class User_rolesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[User_rolesData]


class User_rolesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: User_rolesUpdateData


class User_rolesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[User_rolesBatchUpdateItem]


class User_rolesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=User_rolesListResponse)
async def query_user_roless(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Query user_roless with filtering, sorting, and pagination"""
    logger.debug(f"Querying user_roless: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = User_rolesService(db)
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
        )
        logger.debug(f"Found {result['total']} user_roless")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying user_roless: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=User_rolesListResponse)
async def query_user_roless_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _sa: UserResponse = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Query user_roless with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying user_roless: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = User_rolesService(db)
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
        logger.debug(f"Found {result['total']} user_roless")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying user_roless: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=User_rolesResponse)
async def get_user_roles(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single user_roles by ID"""
    logger.debug(f"Fetching user_roles with id: {id}, fields={fields}")
    
    service = User_rolesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"User_roles with id {id} not found")
            raise HTTPException(status_code=404, detail="User_roles not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user_roles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=User_rolesResponse, status_code=201)
async def create_user_roles(
    data: User_rolesData,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user_roles"""
    logger.debug(f"Creating new user_roles with data: {data}")

    _exigir_rol_asignable(_admin, data.role)
    
    service = User_rolesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create user_roles")
        
        logger.info(f"User_roles created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating user_roles: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user_roles: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[User_rolesResponse], status_code=201)
async def create_user_roless_batch(
    request: User_rolesBatchCreateRequest,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple user_roless in a single request"""
    logger.debug(f"Batch creating {len(request.items)} user_roless")

    # Se validan TODOS antes de escribir ninguno: un lote que asciende en el
    # tercer elemento no debe dejar los dos primeros creados.
    for item_data in request.items:
        _exigir_rol_asignable(_admin, item_data.role)
    
    service = User_rolesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} user_roless successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[User_rolesResponse])
async def update_user_roless_batch(
    request: User_rolesBatchUpdateRequest,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple user_roless in a single request"""
    logger.debug(f"Batch updating {len(request.items)} user_roless")

    for item in request.items:
        _exigir_rol_asignable(_admin, item.updates.role)
    
    service = User_rolesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} user_roless successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=User_rolesResponse)
async def update_user_roles(
    id: int,
    data: User_rolesUpdateData,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing user_roles"""
    logger.debug(f"Updating user_roles {id} with data: {data}")

    _exigir_rol_asignable(_admin, data.role)

    service = User_rolesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"User_roles with id {id} not found for update")
            raise HTTPException(status_code=404, detail="User_roles not found")
        
        logger.info(f"User_roles {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating user_roles {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating user_roles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_user_roless_batch(
    request: User_rolesBatchDeleteRequest,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple user_roless by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} user_roless")
    
    service = User_rolesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} user_roless successfully")
        return {"message": f"Successfully deleted {deleted_count} user_roless", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_user_roles(
    id: int,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single user_roles by ID"""
    logger.debug(f"Deleting user_roles with id: {id}")
    
    service = User_rolesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"User_roles with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="User_roles not found")
        
        logger.info(f"User_roles {id} deleted successfully")
        return {"message": "User_roles deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user_roles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
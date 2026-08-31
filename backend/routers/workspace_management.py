"""
Workspace Management Router — Handles workspace CRUD, member invitations,
role management, and workspace switching.
Separate from the auto-generated entity CRUD router.
"""
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
from models.workspaces import Workspaces
from models.workspace_members import Workspace_members
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

#: Tope de miembros por workspace. Se comprueba en la misma sentencia que
#: inserta, para que dos invitaciones simultaneas no lo rebasen.
# La constante vive en `core/tope_de_miembros` porque hay TRES puertas que
# crean pertenencias y hasta ahora solo esta la miraba. Se reexporta para no
# romper a quien la importa de aqui.
from core.tope_de_miembros import MAX_MIEMBROS_POR_WORKSPACE  # noqa: F401

router = APIRouter(prefix="/api/v1/workspace", tags=["workspace-management"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class WorkspaceCreateRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None


class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    domain: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    role: str  # The current user's role in this workspace
    members_count: int = 0
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MemberInviteRequest(BaseModel):
    email: str
    role: str = "member"  # admin, operator, member, viewer


class MemberResponse(BaseModel):
    id: int
    user_id: str
    email: Optional[str] = None
    role: str
    status: str
    joined_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MemberRoleUpdateRequest(BaseModel):
    role: str  # admin, operator, member, viewer


def _format_created_at(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


async def _count_workspace_members(db: AsyncSession, workspace_id: int) -> int:
    """Miembros del workspace: SOLO las pertenencias activas.

    POLITICA DE PRODUCTO: una invitacion pendiente NO cuenta como miembro.

    Contaba todas las filas, y el flujo de invitacion de este mismo fichero
    inserta con `status = 'invited'`. Asi que este numero —el que viaja en la
    respuesta de la API— incluia invitaciones sin aceptar, mientras que el
    fallback de TypeScript solo contaba las activas. Dos numeros distintos para
    lo mismo, segun por donde entrara la peticion.

    EL `except` SE MANTIENE, Y AQUI ESO ES LO CORRECTO. Esta funcion alimenta
    el LISTADO de workspaces, no la facturacion —esa tiene la suya en
    `billing_usage.py`, que si propaga—. Romper el listado entero porque un
    recuento falla seria peor que ensenar un numero incompleto.

    LO QUE SI CAMBIA: se registra como ERROR y no como `debug`. Un cero que en
    realidad es «no se pudo contar» es un cero que miente, y a nivel `debug` no
    lo ve nadie. Sigue devolviendo 0 para no tumbar la respuesta, pero deja de
    hacerlo en silencio.
    """
    try:
        mc = (
            await db.execute(
                select(func.count(Workspace_members.id)).where(
                    Workspace_members.workspace_id == workspace_id,
                    Workspace_members.status == "active",
                )
            )
        ).scalar()
        return int(mc or 0)
    except Exception as exc:
        logger.error(
            "no se pudo contar los miembros de ws=%s; el 0 que se devuelve NO es un cero medido: %s",
            workspace_id,
            exc,
        )
        return 0


async def _ensure_default_workspace(db: AsyncSession, user_id: str) -> WorkspaceResponse:
    default_ws = Workspaces(
        user_id=user_id,
        name="Mi Workspace",
        slug="default",
        status="active",
        plan="starter",
        created_at=datetime.now(timezone.utc),
    )
    db.add(default_ws)
    await db.flush()
    # Sin `current_user` en este camino: `_ensure_default_workspace` solo recibe
    # el identificador. El correo es opcional en la pertenencia y se rellena
    # cuando el usuario pase por una ruta que si lo conoce.
    await _asegurar_pertenencia_owner(db, default_ws.id, user_id, None)
    await db.commit()
    await db.refresh(default_ws)
    logger.info("Auto-created default workspace %s for user %s", default_ws.id, user_id)
    return WorkspaceResponse(
        id=default_ws.id,
        name=default_ws.name,
        slug=default_ws.slug,
        logo_url=None,
        primary_color=None,
        domain=None,
        plan=default_ws.plan,
        status=default_ws.status,
        role="owner",
        members_count=1,
        created_at=_format_created_at(default_ws.created_at),
    )


# ── List user's workspaces ──────────────────────────────────────────────────

@router.get("/list", response_model=List[WorkspaceResponse])
async def list_my_workspaces(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all workspaces the current user owns or is a member of.
    This is used by the workspace selector in the UI.
    """
    user_id = str(current_user.id)
    workspaces: list[WorkspaceResponse] = []

    try:
        owned_result = await db.execute(
            select(Workspaces).where(
                Workspaces.user_id == user_id,
                or_(Workspaces.status == "active", Workspaces.status.is_(None)),
            ).order_by(Workspaces.id.asc())
        )
        for ws in owned_result.scalars().all():
            mc = await _count_workspace_members(db, ws.id)
            workspaces.append(
                WorkspaceResponse(
                    id=ws.id,
                    name=ws.name,
                    slug=ws.slug,
                    logo_url=ws.logo_url,
                    primary_color=ws.primary_color,
                    domain=ws.domain,
                    plan=ws.plan,
                    status=ws.status,
                    role="owner",
                    members_count=mc + 1,
                    created_at=_format_created_at(ws.created_at),
                )
            )

        try:
            member_result = await db.execute(
                select(Workspace_members).where(
                    Workspace_members.user_id == user_id,
                    Workspace_members.status == "active",
                )
            )
            owned_ids = {ws.id for ws in workspaces}

            for member in member_result.scalars().all():
                if member.workspace_id in owned_ids:
                    continue

                ws_result = await db.execute(
                    select(Workspaces).where(Workspaces.id == member.workspace_id)
                )
                ws = ws_result.scalar_one_or_none()
                if not ws:
                    continue

                mc = await _count_workspace_members(db, ws.id)
                workspaces.append(
                    WorkspaceResponse(
                        id=ws.id,
                        name=ws.name,
                        slug=ws.slug,
                        logo_url=ws.logo_url,
                        primary_color=ws.primary_color,
                        domain=ws.domain,
                        plan=ws.plan,
                        status=ws.status,
                        role=member.role or "member",
                        members_count=mc + 1,
                        created_at=_format_created_at(ws.created_at),
                    )
                )
        except Exception as exc:
            logger.warning("workspace member listing skipped for user %s: %s", user_id, exc)

        if not workspaces:
            workspaces.append(await _ensure_default_workspace(db, user_id))

        return workspaces
    except Exception as exc:
        logger.error("list_my_workspaces failed for user %s: %s", user_id, exc, exc_info=True)
        try:
            await db.rollback()
        except Exception:
            pass
        try:
            return [await _ensure_default_workspace(db, user_id)]
        except Exception as inner:
            logger.error("default workspace bootstrap failed: %s", inner, exc_info=True)
            raise HTTPException(status_code=500, detail="Could not load workspaces") from inner


# ── Create workspace ─────────────────────────────────────────────────────────

@router.post("/create", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    data: WorkspaceCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace. The creator becomes the owner."""
    user_id = str(current_user.id)

    # Límite: producción 10; en `ENVIRONMENT=test` se puede subir (suite acumulativa) sin tocar prod.
    if (settings.environment or "").lower() == "test":
        max_ws = int((os.environ.get("NELVYON_TEST_MAX_WORKSPACES_PER_USER") or "64").strip() or "64")
    else:
        max_ws = 10
    if max_ws < 1:
        max_ws = 10
    count_result = await db.execute(
        select(func.count(Workspaces.id)).where(Workspaces.user_id == user_id)
    )
    count = count_result.scalar() or 0
    if count >= max_ws:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum of {max_ws} workspaces per user",
        )

    slug = data.slug or data.name.lower().replace(" ", "-").replace("_", "-")[:50]

    ws = Workspaces(
        user_id=user_id,
        name=data.name,
        slug=slug,
        logo_url=data.logo_url,
        primary_color=data.primary_color,
        status="active",
        plan="starter",
        created_at=datetime.now(timezone.utc),
    )
    db.add(ws)
    # `flush` y no `commit`: la pertenencia entra en la MISMA transaccion. Si
    # fallara, no queda un workspace huerfano al que su dueño no puede acceder.
    await db.flush()
    await _asegurar_pertenencia_owner(db, ws.id, user_id,
                                      getattr(current_user, "email", None))
    await db.commit()
    await db.refresh(ws)

    logger.info(f"Workspace created: {ws.id} by user {user_id} (owner registrado)")

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        logo_url=ws.logo_url,
        primary_color=ws.primary_color,
        domain=ws.domain,
        plan=ws.plan,
        status=ws.status,
        role="owner",
        members_count=1,
        created_at=ws.created_at.isoformat() if ws.created_at else None,
    )


async def _asegurar_pertenencia_owner(db, workspace_id: int, user_id: str,
                                      email: str | None) -> None:
    """Deja al creador como `owner` en `workspace_members`. Idempotente.

    EL FALLO QUE ESTO CORRIGE
    ------------------------
    Crear un workspace insertaba la fila en `workspaces` y devolvia
    `role: "owner", members_count: 1` — pero NUNCA escribia la pertenencia. La
    respuesta mentia.

    Con RLS activo eso deja al creador fuera de su propio workspace:
    `nelvyon_user_in_workspace()` consulta esta tabla, asi que todas las politicas
    `os_*` le deniegan y el producto aparece vacio para quien acaba de crearlo.

    Se veia en produccion sin necesidad de leer codigo: 3 workspaces y 1 sola
    pertenencia. Dos duenos sin acceso a lo suyo.

    `ON CONFLICT DO NOTHING` sobre la restriccion de la 550 hace que un doble clic
    o un reintento no dupliquen la fila.

    EL CERROJO
    ----------
    Se toma el cerrojo de la fila del workspace antes de insertar. Aqui el
    workspace acaba de crearse en esta misma transaccion, asi que no hay carrera
    posible contra el tope de asientos — pero la regla es de la casa y no admite
    excepciones por conveniencia: toda escritura en `workspace_members` serializa
    contra su workspace. Si mañana esta funcion se reutiliza en un camino donde el
    workspace ya existia, el cerrojo ya esta puesto.
    """
    await db.execute(
        select(Workspaces.id).where(Workspaces.id == int(workspace_id)).with_for_update()
    )
    await db.execute(
        text(
            "INSERT INTO workspace_members "
            "  (workspace_id, user_id, email, role, status, joined_at, created_at) "
            "VALUES (:ws, :uid, :email, 'owner', 'active', :ahora, :ahora) "
            # El indice de la 550 es PARCIAL —excluye invitaciones sin
            # aceptar— y tanto PostgreSQL como SQLite exigen repetir su
            # predicado aqui para poder acogerse a el.
            "ON CONFLICT (workspace_id, user_id) "
            "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING"
        ),
        {"ws": int(workspace_id), "uid": str(user_id), "email": email,
         "ahora": datetime.now(timezone.utc).isoformat()},
    )


# ── Update workspace ─────────────────────────────────────────────────────────

@router.put("/update", response_model=WorkspaceResponse)
async def update_workspace(
    data: WorkspaceUpdateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update workspace settings. Requires admin or owner role."""
    ws_result = await db.execute(
        select(Workspaces).where(Workspaces.id == ctx.workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if data.name is not None:
        ws.name = data.name
    if data.slug is not None:
        ws.slug = data.slug
    if data.logo_url is not None:
        ws.logo_url = data.logo_url
    if data.primary_color is not None:
        ws.primary_color = data.primary_color
    if data.domain is not None:
        ws.domain = data.domain

    await db.commit()
    await db.refresh(ws)

    mc = (await db.execute(
        select(func.count(Workspace_members.id)).where(
            Workspace_members.workspace_id == ws.id
        )
    )).scalar() or 0

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        logo_url=ws.logo_url,
        primary_color=ws.primary_color,
        domain=ws.domain,
        plan=ws.plan,
        status=ws.status,
        role=ctx.role_in_workspace or "owner",
        members_count=mc + 1,
        created_at=ws.created_at.isoformat() if ws.created_at else None,
    )


# ── Delete workspace ─────────────────────────────────────────────────────────

@router.delete("/delete")
async def delete_workspace(
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a workspace (set status to 'archived'). Owner only."""
    if ctx.role_in_workspace != "owner":
        raise HTTPException(status_code=403, detail="Only workspace owner can delete")

    ws_result = await db.execute(
        select(Workspaces).where(Workspaces.id == ctx.workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws.status = "archived"
    await db.commit()

    return {"message": "Workspace archived", "id": ctx.workspace_id}


# ── List members ─────────────────────────────────────────────────────────────

@router.get("/members", response_model=List[MemberResponse])
async def list_workspace_members(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List all members of the current workspace."""
    result = await db.execute(
        select(Workspace_members).where(
            Workspace_members.workspace_id == ctx.workspace_id
        ).order_by(Workspace_members.id.asc())
    )
    members = result.scalars().all()

    return [
        MemberResponse(
            id=m.id,
            user_id=m.user_id,
            email=m.email,
            role=m.role,
            status=m.status,
            joined_at=m.joined_at,
        )
        for m in members
    ]


# ── Invite member ────────────────────────────────────────────────────────────

#: Jerarquia de roles DENTRO de un workspace. No la habia, y por eso un operator
#: podia invitar a alguien como `admin`.
#:
#: Es un esquema distinto del `ROLE_HIERARCHY` de `rbac_management`
#: (`super_admin/admin/manager/user/viewer`), que es de plataforma. Aquel si
#: comprobaba que un admin no pudiera asignar `super_admin`; este no comprobaba
#: nada.
JERARQUIA_WORKSPACE = {"owner": 4, "admin": 3, "operator": 2, "member": 1, "viewer": 0}


def _rechaza_tocar_a_un_superior(rol_del_miembro: str | None,
                                 rol_de_quien_actua: str | None) -> None:
    """Nadie modifica a alguien de rango superior al suyo.

    `_rechaza_escalada` mira el rol que se CONCEDE. Falta el simetrico: un
    operator no puede ascender a nadie por encima de si, pero si podia DEGRADAR
    a un admin o a un owner hasta `viewer`. No es escalada, es lo contrario, y
    hace igual de dano: un operator descontento podia dejar sin acceso a quien
    manda en el workspace.
    """
    nivel_miembro = JERARQUIA_WORKSPACE.get((rol_del_miembro or "").strip().lower())
    nivel_propio = JERARQUIA_WORKSPACE.get((rol_de_quien_actua or "").strip().lower())
    if nivel_propio is None:
        raise HTTPException(
            status_code=403,
            detail="No se puede determinar tu rol en el workspace")
    if nivel_miembro is not None and nivel_miembro > nivel_propio:
        raise HTTPException(
            status_code=403,
            detail=(
                f"No puedes modificar a un miembro con rol '{rol_del_miembro}', "
                f"que esta por encima del tuyo ('{rol_de_quien_actua}')"))


def _rechaza_escalada(rol_invitado: str, rol_de_quien_invita: str | None) -> None:
    """Nadie concede un rol por encima del suyo.

    LA ESCALADA QUE ESTO CIERRA
    ---------------------------
    `require_workspace_operator` admite owner, admin Y operator. La ruta de
    invitacion aceptaba `admin` sin mirar quien invitaba, asi que un operator
    —que esta explicitamente por debajo— podia invitar a una direccion que
    controlara con rol `admin`, aceptar la invitacion y quedarse de admin.

    No hacia falta ningun fallo: era el camino normal de la funcion.

    Se permite conceder el MISMO nivel —invitar a un companero de tu rango es lo
    normal— pero nunca uno superior.
    """
    nivel_invitado = JERARQUIA_WORKSPACE.get((rol_invitado or "").strip().lower())
    nivel_propio = JERARQUIA_WORKSPACE.get((rol_de_quien_invita or "").strip().lower())

    if nivel_invitado is None:
        raise HTTPException(status_code=400, detail=f"Rol desconocido: {rol_invitado}")
    if nivel_propio is None:
        # Fail-closed: si no se sabe que rol tiene quien invita, no se concede
        # nada. Un rol desconocido no puede tratarse como el mas alto.
        raise HTTPException(
            status_code=403,
            detail="No se puede determinar tu rol en el workspace")
    if nivel_invitado > nivel_propio:
        raise HTTPException(
            status_code=403,
            detail=(
                f"No puedes conceder el rol '{rol_invitado}', que esta por encima "
                f"del tuyo ('{rol_de_quien_invita}')"))


@router.post("/members/invite", response_model=MemberResponse, status_code=201)
async def invite_member(
    data: MemberInviteRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Invite a new member to the workspace. Requires admin or owner."""
    if data.role not in ("admin", "operator", "member", "viewer"):
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Must be: admin, operator, member, viewer",
        )
    _rechaza_escalada(data.role, ctx.role_in_workspace)
    # Check if already a member
    existing = await db.execute(
        select(Workspace_members).where(
            Workspace_members.workspace_id == ctx.workspace_id,
            Workspace_members.email == data.email,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    # Tope de miembros, comprobado en la MISMA sentencia que inserta.
    #
    # Antes se contaba y despues se insertaba, en dos pasos: dos invitaciones
    # simultaneas leian ambas 49, ambas pasaban y el workspace acababa con 51.
    # Un `INSERT ... SELECT ... WHERE (SELECT count(*)) < :tope` deja la
    # comprobacion y la escritura en una sola sentencia, que el motor resuelve
    # de forma atomica.
    #
    # LA SENTENCIA UNICA NO BASTA — medido contra PostgreSQL real.
    #
    # Con 24 invitaciones simultaneas y tope 5, este INSERT dejaba entrar 8.
    # Bajo READ COMMITTED cada sentencia toma su instantanea al empezar y no ve
    # las filas que las demas transacciones aun no han confirmado: todas cuentan
    # lo mismo y todas creen tener sitio. Ser una sola sentencia la hace
    # indivisible, no la hace ver el presente.
    #
    # SQLite nunca lo delato porque serializa las escrituras a nivel de fichero:
    # alli hasta el patron ingenuo respeta el tope. Por eso el verde anterior no
    # significaba nada sobre el motor de produccion.
    #
    # Se cierra tomando el cerrojo de la fila del workspace ANTES de contar, lo
    # que serializa las altas de ese workspace y solo de ese. `with_for_update()`
    # no se emite en SQLite —donde sobra— y si en PostgreSQL.
    await db.execute(
        select(Workspaces.id)
        .where(Workspaces.id == ctx.workspace_id)
        .with_for_update()
    )

    insercion = await db.execute(
        text(
            """
            INSERT INTO workspace_members
                (workspace_id, user_id, email, role, status, invited_by, created_at)
            SELECT :ws, '', :email, :role, 'invited', :invited_by, :creado
            WHERE (
                -- CUENTA TODAS LAS FILAS A PROPOSITO, invitaciones incluidas.
                --
                -- NO es el recuento de asientos. Un asiento se paga y solo lo
                -- consume una pertenencia ACTIVA —ver `_count_workspace_members`
                -- aqui mismo y en `billing_usage.py`—. Esto es otra cosa: un
                -- tope anti-abuso que impide invitar sin fin.
                --
                -- Si esto filtrara por `status = 'active'` se podrian mandar
                -- invitaciones ilimitadas, porque ninguna contaria hasta ser
                -- aceptada. Son dos conceptos distintos y se dejan separados.
                SELECT COUNT(*) FROM workspace_members WHERE workspace_id = :ws
            ) < :tope
            """
        ),
        {
            "ws": ctx.workspace_id,
            "email": data.email,
            "role": data.role,
            "invited_by": ctx.user_id,
            "creado": datetime.now(timezone.utc).isoformat(),
            "tope": MAX_MIEMBROS_POR_WORKSPACE,
        },
    )
    if int(insercion.rowcount or 0) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_MIEMBROS_POR_WORKSPACE} members per workspace",
        )
    await db.commit()

    # La fila ya esta escrita por la sentencia de arriba; aqui solo se relee
    # para construir la respuesta. Volver a insertarla con el ORM crearia un
    # duplicado.
    member = (
        await db.execute(
            select(Workspace_members)
            .where(
                Workspace_members.workspace_id == ctx.workspace_id,
                Workspace_members.email == data.email,
            )
            .order_by(Workspace_members.id.desc())
            .limit(1)
        )
    ).scalar_one()

    logger.info(f"Member invited: {data.email} to workspace {ctx.workspace_id}")

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        email=member.email,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
    )


# ── Update member role ───────────────────────────────────────────────────────

@router.put("/members/{member_id}/role", response_model=MemberResponse)
async def update_member_role(
    member_id: int,
    data: MemberRoleUpdateRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Update a member's role. Requires admin or owner."""
    result = await db.execute(
        select(Workspace_members).where(
            Workspace_members.id == member_id,
            Workspace_members.workspace_id == ctx.workspace_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if data.role not in ("admin", "operator", "member", "viewer"):
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Must be: admin, operator, member, viewer",
        )
    _rechaza_tocar_a_un_superior(member.role, ctx.role_in_workspace)
    _rechaza_escalada(data.role, ctx.role_in_workspace)

    member.role = data.role
    await db.commit()
    await db.refresh(member)

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        email=member.email,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
    )


# ── Remove member ────────────────────────────────────────────────────────────

@router.delete("/members/{member_id}")
async def remove_member(
    member_id: int,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the workspace. Requires admin or owner."""
    result = await db.execute(
        select(Workspace_members).where(
            Workspace_members.id == member_id,
            Workspace_members.workspace_id == ctx.workspace_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Sin esto, un operator podia EXPULSAR al propietario del workspace. Ni
    # siquiera hacia falta degradarlo antes: esta ruta no miraba ningun rol.
    _rechaza_tocar_a_un_superior(member.role, ctx.role_in_workspace)

    await db.delete(member)
    await db.commit()

    return {"message": "Member removed", "id": member_id}
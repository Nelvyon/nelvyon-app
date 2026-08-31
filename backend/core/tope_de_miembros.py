"""El tope de filas de pertenencia por workspace, en un solo sitio.

CUATRO CONCEPTOS QUE PARECEN UNO
--------------------------------
Se separan aqui porque confundirlos es exactamente como se rompen las dos cosas
a la vez: el limite deja de proteger y la factura deja de cuadrar.

    BILLABLE_SEATS          pertenencias con `status = 'active'`, por workspace.
                            Es lo que consume plan y lo que se cobra.
                            Vive en `billing_usage._count_workspace_members`.

    ACTIVE_MEMBERS          lo mismo, pero para mostrarlo al cliente.
                            `workspace_management._count_workspace_members` y
                            `platformDbFallback.countMembers`. Mismo numero que
                            BILLABLE_SEATS a proposito: el cliente tiene que ver
                            lo que se le cobra.

    INVITE_CAP              TODAS las filas del workspace, invitaciones
                            incluidas. NO es un asiento: es un tope anti-abuso.
                            Si filtrara por activos se podrian mandar
                            invitaciones sin fin, porque ninguna contaria hasta
                            ser aceptada. Es lo que gobierna este modulo.

    TOTAL_MEMBERSHIP_ROWS   el recuento global, sin workspace. Solo lo usan la
                            metrica de salud del negocio y el preparador de
                            staging. No decide nada de producto.

POR QUE ESTE MODULO EXISTE
--------------------------
`MAX_MIEMBROS_POR_WORKSPACE` estaba definido y aplicado UNICAMENTE en la ruta de
invitacion (`workspace_management.invite`), y alli muy bien: con un `FOR UPDATE`
sobre el workspace y un `INSERT ... SELECT ... WHERE count < tope`, atomico.

Pero `backend/routers/workspace_members.py` —el CRUD generico, que main.py monta
por descubrimiento automatico igual que todos— expone
`POST /api/v1/entities/workspace_members` y `POST .../batch`, y las dos crean
pertenencias sin mirar ningun tope.

O sea que el tope existia y se podia rodear por otra puerta. Un operador del
workspace podia crear filas sin limite; el batch, ademas, tantas como cupieran
en una peticion.

NO CAMBIA NADA DE FACTURACION. El tope es anti-abuso, no un asiento: se cuenta
por filas y no por activos, precisamente para que no dependa de lo que se cobra.
Lo unico que cambia es que ahora se aplica por las tres puertas en vez de por
una.
"""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

#: Filas de pertenencia como maximo por workspace, invitaciones incluidas.
MAX_MIEMBROS_POR_WORKSPACE = 50


async def asegurar_hueco_para_miembros(
    db: AsyncSession, workspace_id: int, cuantos: int = 1
) -> None:
    """Reserva sitio para `cuantos` pertenencias nuevas, o lanza 400.

    TOMA EL BLOQUEO ANTES DE CONTAR, y no es un detalle. Contar y luego insertar
    es una carrera: dos peticiones concurrentes leen 49, las dos deciden que
    caben, y el workspace acaba con 51. La ruta de invitacion lo evita metiendo
    la condicion dentro del propio INSERT; aqui, donde la escritura la hace el
    servicio despues, se consigue lo mismo bloqueando la fila del workspace: la
    segunda peticion espera y vuelve a contar con el resultado de la primera ya
    escrito.

    `FOR UPDATE` sobre `workspaces` es el mismo cerrojo que usa la invitacion,
    asi que las tres puertas se serializan entre si y no solo cada una consigo
    misma.

    `cuantos` existe por el batch: comprobar de una en una dejaria pasar una
    peticion de treinta cuando solo quedan diez huecos, y fallaria a mitad
    dejando veinte filas escritas.
    """
    if cuantos <= 0:
        return

    await db.execute(
        text("SELECT id FROM workspaces WHERE id = :ws FOR UPDATE"),
        {"ws": workspace_id},
    )
    actuales = int(
        (
            await db.execute(
                text("SELECT COUNT(*) FROM workspace_members WHERE workspace_id = :ws"),
                {"ws": workspace_id},
            )
        ).scalar()
        or 0
    )

    if actuales + cuantos > MAX_MIEMBROS_POR_WORKSPACE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_MIEMBROS_POR_WORKSPACE} members per workspace",
        )

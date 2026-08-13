"""
El tope de miembros se comprueba en la misma sentencia que inserta.

Antes se contaba y despues se insertaba, en dos pasos. Dos invitaciones
simultaneas leian ambas 49, ambas pasaban la comprobacion y el workspace
acababa con 51 miembros — el mismo patron read-then-write ya cerrado en el
envio de campanas y en el consumo de cuota del advisor.

LIMITE DE ESTA CERTIFICACION: la atomicidad bajo concurrencia real depende del
motor. Estos tests corren sobre SQLite y comprueban la LOGICA del tope y su
forma; la carrera solo se certifica contra PostgreSQL, que sigue bloqueado.
Se deja escrito para no confundir "verde" con "certificado".
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text

from routers.workspace_management import MAX_MIEMBROS_POR_WORKSPACE

RUTA = "/api/v1/workspace/members/invite"


@pytest.fixture(autouse=True)
async def _limpia(db_session):
    yield
    await db_session.execute(
        text("DELETE FROM workspace_members WHERE email LIKE 'cap-test-%'")
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_invitar_por_debajo_del_tope_funciona(client: AsyncClient, auth_headers: dict):
    """Contraprueba: el reclamo atomico no rompe el flujo normal."""
    email = f"cap-test-{uuid.uuid4().hex[:8]}@test.com"
    r = await client.post(RUTA, headers=auth_headers, json={"email": email, "role": "member"})
    assert r.status_code == 201, r.text[:200]
    assert r.json()["email"] == email


@pytest.mark.asyncio
async def test_no_se_crea_una_fila_duplicada(client: AsyncClient, auth_headers: dict, db_session):
    """
    La primera version insertaba con SQL y ADEMAS con el ORM, dejando dos filas
    por invitacion. Se comprueba que solo hay una.
    """
    email = f"cap-test-{uuid.uuid4().hex[:8]}@test.com"
    r = await client.post(RUTA, headers=auth_headers, json={"email": email, "role": "member"})
    assert r.status_code == 201, r.text[:200]

    n = (
        await db_session.execute(
            text("SELECT COUNT(*) FROM workspace_members WHERE email = :e"), {"e": email}
        )
    ).scalar()
    assert n == 1, f"la invitacion creo {n} filas"


@pytest.mark.asyncio
async def test_al_alcanzar_el_tope_se_rechaza(client: AsyncClient, auth_headers: dict, db_session):
    """
    Se rellena el workspace hasta el tope y se comprueba que la siguiente cae.
    Esto valida la LOGICA; la carrera necesita PostgreSQL.
    """
    ws = int(auth_headers["X-Workspace-Id"])
    actuales = (
        await db_session.execute(
            text("SELECT COUNT(*) FROM workspace_members WHERE workspace_id = :w"), {"w": ws}
        )
    ).scalar() or 0
    faltan = MAX_MIEMBROS_POR_WORKSPACE - actuales
    for i in range(faltan):
        await db_session.execute(
            text(
                "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
                "VALUES (:w, '', :e, 'member', 'invited')"
            ),
            {"w": ws, "e": f"cap-test-relleno-{i}@test.com"},
        )
    await db_session.commit()

    r = await client.post(
        RUTA,
        headers=auth_headers,
        json={"email": f"cap-test-{uuid.uuid4().hex[:8]}@test.com", "role": "member"},
    )
    assert r.status_code == 400, f"se paso del tope: {r.status_code} {r.text[:150]}"
    assert str(MAX_MIEMBROS_POR_WORKSPACE) in r.text


def test_la_comprobacion_va_dentro_de_la_sentencia_que_inserta():
    """
    Regresion de forma. Si vuelve el `count()` seguido de `db.add()`, vuelve la
    carrera, y ningun test sobre SQLite lo detectaria.
    """
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "routers" / "workspace_management.py"
    ).read_text(encoding="utf-8")
    i = src.index("async def invite_member")
    cuerpo = src[i : i + 2500]
    assert "INSERT INTO workspace_members" in cuerpo
    assert "SELECT COUNT(*) FROM workspace_members" in cuerpo
    assert "rowcount" in cuerpo, "la decision debe salir de rowcount"
    assert "db.add(member)" not in cuerpo, "volvio la insercion en dos pasos"

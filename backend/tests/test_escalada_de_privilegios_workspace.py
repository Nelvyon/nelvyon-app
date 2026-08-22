"""Nadie sube por encima de su rol, ni tumba a quien esta por encima.

COMO SE ENCONTRO
----------------
Inventariando la cobertura del bloque F: de las clases de seguridad que hay que
cubrir, `escalation` aparecia en CERO ficheros de prueba.

TRES VECTORES, TODOS POR EL CAMINO NORMAL DE LA FUNCION
--------------------------------------------------------
`require_workspace_operator` admite owner, admin **y operator**. Las tres rutas
de gestion de miembros lo usaban y ninguna miraba la jerarquia:

    POST   /members/invite          un operator podia invitar con rol `admin`
    PUT    /members/{id}/role       un operator podia DEGRADAR a un admin
    DELETE /members/{id}            un operator podia EXPULSAR al propietario

El primero es escalada: invitar a una direccion que controlas con rol `admin`,
aceptar y quedarte de admin. Los otros dos son lo contrario y hacen igual de
dano: un operator descontento dejaba sin acceso a quien manda.

Ninguno necesitaba un fallo. Eran el comportamiento normal de la funcion.

POR QUE NO LO CUBRIA NADA
--------------------------
`rbac_management` SI comprueba jerarquia —un admin no puede asignar
`super_admin`— pero ese es el esquema de PLATAFORMA
(`super_admin/admin/manager/user/viewer`). El de workspace
(`owner/admin/operator/member/viewer`) es otro, y no tenia ninguna.
"""
from __future__ import annotations

import pytest

from routers.workspace_management import (
    JERARQUIA_WORKSPACE,
    _rechaza_escalada,
    _rechaza_tocar_a_un_superior,
)
from fastapi import HTTPException


# ═══════════════════════════════════════════════════════════════════════════
# La jerarquia dice lo que tiene que decir
# ═══════════════════════════════════════════════════════════════════════════


def test_operator_esta_por_debajo_de_admin():
    """Si esto dejara de ser cierto, los guards de abajo no protegerian nada."""
    assert JERARQUIA_WORKSPACE["operator"] < JERARQUIA_WORKSPACE["admin"]
    assert JERARQUIA_WORKSPACE["admin"] < JERARQUIA_WORKSPACE["owner"]
    assert JERARQUIA_WORKSPACE["viewer"] < JERARQUIA_WORKSPACE["member"]


# ═══════════════════════════════════════════════════════════════════════════
# Vector 1: conceder un rol superior al propio
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("quien,concede", [
    ("operator", "admin"),
    ("member", "admin"),
    ("member", "operator"),
    ("viewer", "member"),
    ("admin", "owner"),
])
def test_no_se_concede_un_rol_por_encima_del_propio(quien, concede):
    with pytest.raises(HTTPException) as exc:
        _rechaza_escalada(concede, quien)
    assert exc.value.status_code == 403


@pytest.mark.parametrize("quien,concede", [
    ("owner", "admin"),
    ("admin", "admin"),      # invitar a un companero de tu rango es normal
    ("admin", "operator"),
    ("operator", "operator"),
    ("operator", "member"),
])
def test_conceder_el_mismo_nivel_o_menos_si_se_permite(quien, concede):
    """EL CONTROL. Sin esto, la forma facil de pasar las pruebas de arriba seria
    prohibirlo todo, y entonces nadie podria invitar a nadie."""
    _rechaza_escalada(concede, quien)


def test_un_rol_desconocido_no_se_trata_como_el_mas_alto():
    """Fail-closed. Si no se sabe que rol tiene quien invita, no concede nada."""
    with pytest.raises(HTTPException) as exc:
        _rechaza_escalada("admin", "rol-que-no-existe")
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException):
        _rechaza_escalada("admin", None)


# ═══════════════════════════════════════════════════════════════════════════
# Vectores 2 y 3: tumbar a quien esta por encima
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("quien,miembro", [
    ("operator", "admin"),
    ("operator", "owner"),
    ("admin", "owner"),
    ("member", "operator"),
])
def test_no_se_puede_tocar_a_un_superior(quien, miembro):
    """Cubre degradar Y expulsar: las dos rutas usan el mismo guard."""
    with pytest.raises(HTTPException) as exc:
        _rechaza_tocar_a_un_superior(miembro, quien)
    assert exc.value.status_code == 403


@pytest.mark.parametrize("quien,miembro", [
    ("owner", "admin"),
    ("admin", "operator"),
    ("operator", "member"),
    ("admin", "admin"),
])
def test_si_se_puede_gestionar_a_un_igual_o_inferior(quien, miembro):
    """Control: un admin tiene que poder gestionar su equipo."""
    _rechaza_tocar_a_un_superior(miembro, quien)


# ═══════════════════════════════════════════════════════════════════════════
# Los guards estan CABLEADOS en las tres rutas
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("funcion,guards", [
    ("invite_member", ["_rechaza_escalada"]),
    ("update_member_role", ["_rechaza_escalada", "_rechaza_tocar_a_un_superior"]),
    ("remove_member", ["_rechaza_tocar_a_un_superior"]),
])
def test_la_ruta_llama_al_guard(funcion, guards):
    """Un guard escrito y no invocado no protege nada.

    Ya paso en esta sesion con el guard de roles de base de datos: existia,
    estaba en verde, y ninguna bateria lo llamaba.
    """
    import ast
    import inspect

    from routers import workspace_management

    arbol = ast.parse(inspect.getsource(workspace_management))
    fuente = next(
        (ast.unparse(n) for n in ast.walk(arbol)
         if isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef)) and n.name == funcion),
        None)
    assert fuente, f"{funcion} ya no existe"
    for g in guards:
        assert g in fuente, (
            f"{funcion} no llama a `{g}`: la ruta esta desprotegida aunque el "
            f"guard exista")


def test_remove_member_no_puede_borrar_antes_de_comprobar():
    """El orden importa: comprobar despues de borrar no sirve de nada."""
    import ast
    import inspect

    from routers import workspace_management

    arbol = ast.parse(inspect.getsource(workspace_management))
    fuente = next(ast.unparse(n) for n in ast.walk(arbol)
                  if isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef))
                  and n.name == "remove_member")
    assert fuente.index("_rechaza_tocar_a_un_superior") < fuente.index("db.delete"), (
        "la comprobacion de rol ocurre DESPUES del borrado")

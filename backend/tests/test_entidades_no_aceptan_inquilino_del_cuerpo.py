"""El plano de entidades no deja que el cuerpo elija el inquilino.

QUE ES ESTE PLANO
-----------------
`/api/v1/entities/*` son 171 rutas repartidas en 50 routers generados por
plantilla —actividades, contactos, tratos, facturas, suscripciones…—. Es la
superficie mas grande de la aplicacion y la que mas se parece a un CRUD
generico, que es donde suele vivir el IDOR.

EL DEFECTO QUE BUSCA
--------------------
36 de esos routers aceptan `workspace_id` DENTRO del cuerpo de la peticion. Si
alguno lo usara para escribir, seria el mismo defecto que tenian los webhooks:
el inquilino lo elige quien llama.

Hoy solo uno lo usa —`subscriptions.create_subscriptions`— y lo hace bien:
compara el del cuerpo con el del contexto y rechaza si no coinciden. Esta prueba
fija ese estado. El dia que alguien anada un router nuevo copiando la plantilla y
pase `data.workspace_id` al servicio sin comparar, lo dira.

POR QUE NO BASTA CON QUITAR EL CAMPO DEL ESQUEMA
------------------------------------------------
Porque el esquema lo genera una plantilla y quitarlo de 36 sitios se deshace en
cuanto alguien regenere uno. Lo que se protege es el USO, no la presencia: que el
campo exista es ruido; que se use sin validar es una fuga.
"""
from __future__ import annotations

import ast
import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[1] / "routers"

#: Rutas que SI pueden leer el `workspace_id` del cuerpo, porque lo VALIDAN
#: contra el contexto antes de usarlo. Cada una se declara con su motivo.
VALIDAN_CONTRA_EL_CONTEXTO = {
    "subscriptions.py::create_subscriptions":
        "compara `data.workspace_id` con `ws_ctx.workspace_id` y devuelve 400 si "
        "no coinciden, ademas de rechazar la autoconcesion de plan",
}


def _routers_de_entidades() -> list[pathlib.Path]:
    return [f for f in sorted(RAIZ.glob("*.py"))
            if "/api/v1/entities" in f.read_text(encoding="utf-8", errors="replace")]


def test_hay_routers_de_entidades_que_revisar():
    """Sin esto, el resto podria pasar recorriendo una lista vacia."""
    assert len(_routers_de_entidades()) >= 40, (
        f"solo se encontraron {len(_routers_de_entidades())} routers de entidades. "
        f"Si el prefijo cambio, esta bateria estaria pasando sin mirar nada.")


def test_ninguna_escritura_usa_el_workspace_del_cuerpo_sin_validarlo():
    """LA PRUEBA.

    Recorre cada endpoint que muta y busca `data.workspace_id` /
    `body.workspace_id` / `payload.workspace_id`. Lo que aparezca y no este
    declarado como validado, se reporta.
    """
    culpables, revisados = [], 0
    del_cuerpo = re.compile(r"\b(?:data|body|payload|req)\.workspace_id\b")

    for f in _routers_de_entidades():
        try:
            arbol = ast.parse(f.read_text(encoding="utf-8", errors="replace"))
        except SyntaxError:
            continue
        for n in ast.walk(arbol):
            if not isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            muta = any(
                isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute)
                and d.func.attr in ("post", "put", "patch", "delete")
                for d in n.decorator_list)
            if not muta:
                continue
            revisados += 1
            cuerpo = ast.unparse(n)
            if not del_cuerpo.search(cuerpo):
                continue
            clave = f"{f.name}::{n.name}"
            if clave in VALIDAN_CONTRA_EL_CONTEXTO:
                continue
            culpables.append(clave)

    assert revisados >= 100, (
        f"solo se revisaron {revisados} endpoints de escritura: el recorrido no "
        f"esta encontrando el plano que dice cubrir")
    assert not culpables, (
        f"estas escrituras leen el `workspace_id` del CUERPO sin validarlo contra "
        f"el contexto: {culpables}. Quien llama elegiria el inquilino, que es el "
        f"mismo defecto que tenian los webhooks. Si de verdad lo validan, "
        f"declaralas en VALIDAN_CONTRA_EL_CONTEXTO con el motivo.")


@pytest.mark.parametrize("clave,motivo", sorted(VALIDAN_CONTRA_EL_CONTEXTO.items()))
def test_las_declaradas_siguen_validando(clave, motivo):
    """Una excepcion declarada que deja de cumplirse es peor que no declararla.

    Se comprueba que la funcion sigue comparando contra el contexto: si alguien
    quita esa comparacion, la excepcion de arriba la seguiria tapando.
    """
    fichero, funcion = clave.split("::")
    texto = (RAIZ / fichero).read_text(encoding="utf-8", errors="replace")
    arbol = ast.parse(texto)
    fuente = next(
        (ast.unparse(n) for n in ast.walk(arbol)
         if isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef)) and n.name == funcion),
        None)
    assert fuente, f"{clave} ya no existe: quitala de VALIDAN_CONTRA_EL_CONTEXTO"

    compara = re.search(
        r"data\.workspace_id\s*\)?\s*!=\s*int\(\s*ws_ctx\.workspace_id"
        r"|int\(data\.workspace_id\)\s*!=\s*int\(ws_ctx\.workspace_id\)",
        fuente)
    assert compara, (
        f"{clave} esta declarada como «valida contra el contexto» ({motivo}) y ya "
        f"no hace esa comparacion. La excepcion la estaria tapando.")


def test_el_campo_en_el_esquema_es_ruido_conocido_y_no_crece():
    """Trinquete sobre cuantos routers exponen `workspace_id` en su esquema.

    Que el campo exista no es una fuga por si mismo, pero cada uno es una
    invitacion a usarlo. Se fija el numero para que la plantilla no lo extienda
    sin que nadie lo note.
    """
    con_campo = [
        f.name for f in _routers_de_entidades()
        if re.search(r"^\s+workspace_id:\s*(int|Optional\[int\])",
                     f.read_text(encoding="utf-8", errors="replace"), re.M)
    ]
    assert len(con_campo) <= 36, (
        f"{len(con_campo)} routers de entidades exponen `workspace_id` en su "
        f"esquema de entrada, sobre un maximo de 36. Cada uno nuevo es una "
        f"invitacion a que alguien lo use para elegir inquilino.")

"""Ninguna ruta deriva el workspace por su cuenta.

QUE SE VIGILA
-------------
`stableWorkspaceIdFromTenant` es un hash `% 900_000` y colisiona: medido con
UUID reales, 1.000 inquilinos dan 0,5 colisiones de media y 2.000 dan 1,8. Cada
colision son dos inquilinos mandando el mismo `X-Workspace-Id` aguas arriba.

Existe un identificador de verdad —`saas_tenants.workspace_id`, puente oficial de
la migracion 310, poblado desde `workspaces.id` y con indice UNICO parcial— y
`workspaceParaAguasArriba` lo prefiere.

Lo que este guardian impide es que vuelva a haber una ruta que se salte el
resolvedor. No es teorico: cuando se miro, TRES sitios mandaban el encabezado y
solo UNO consultaba el puente. Los otros dos derivaban siempre — y dos de los
tres eran las dos mitades del mismo flujo OAuth, asi que con la columna poblada
la autorizacion salia hacia un workspace y la conexion se guardaba en otro.

POR QUE UN INVENTARIO Y NO UNA PRUEBA POR RUTA
-----------------------------------------------
Porque el problema no es una ruta concreta: es que aparezca una NUEVA. Una ruta
que nazca derivando no rompe ninguna prueba existente; nace mal y nadie se
entera. Lo que se cuenta aqui es cuantas lo hacen, y ese numero solo puede ser
cero.
"""
from __future__ import annotations

import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
WEB = RAIZ / "apps" / "web" / "src"
PROXY = WEB / "lib" / "platformFastApiProxy.ts"

#: El unico fichero al que se le permite llamar a la derivacion: el que la
#: define y la envuelve.
DUENO_DE_LA_DERIVACION = "lib/platformFastApiProxy.ts"


def _sin_comentarios(texto: str) -> str:
    """El codigo, sin comentarios.

    Sin esto, este guardian se encuentra a si mismo: el comentario de
    `workspaceParaAguasArriba` CITA las tres llamadas antiguas para explicar el
    defecto que cierra. Una regla que casa dentro de un comentario mide el
    comentario, no el codigo.
    """
    texto = re.sub(r"/\*[\s\S]*?\*/", "", texto)
    return "\n".join(l.split("//")[0] for l in texto.splitlines())


def _ficheros_web() -> list[pathlib.Path]:
    return [
        f
        for f in WEB.rglob("*.ts*")
        if "__tests__" not in f.parts and not f.name.endswith((".test.ts", ".test.tsx"))
    ]


# ═══════════════════════════════════════════════════════════════════════════
# Los controles, primero
# ═══════════════════════════════════════════════════════════════════════════


def test_el_inventario_encuentra_ficheros():
    """Un glob roto daria cero ficheros y todo lo de abajo pasaria vacio."""
    assert len(_ficheros_web()) >= 500, (
        f"solo {len(_ficheros_web())} ficheros del lado web: el inventario no vale")


def test_el_resolvedor_existe_y_consulta_el_puente():
    """Si `workspaceParaAguasArriba` dejara de mirar el puente, prohibir la
    derivacion no serviria de nada: se estaria prohibiendo llamar directamente a
    algo que el envoltorio hace igual."""
    fuente = PROXY.read_text(encoding="utf-8")
    assert "export function workspaceParaAguasArriba(" in fuente, (
        "no existe el resolvedor: las rutas no tienen a que llamar")
    cuerpo = _sin_comentarios(fuente)
    cuerpo = cuerpo[cuerpo.index("export function workspaceParaAguasArriba("):]
    assert "workspaceId" in cuerpo, (
        "`workspaceParaAguasArriba` no mira `workspaceId`: no prefiere el puente")


def test_la_derivacion_sigue_existiendo_sin_cambiar_de_forma():
    """El bloqueo sigue en pie: la derivacion NO se ha tocado.

    Cambiarla movería el identificador de todos los inquilinos que ya la usan.
    Este guardian y `test_los_bloqueos_no_se_disuelven_solos` lo comprueban por
    caminos distintos a proposito.
    """
    fuente = PROXY.read_text(encoding="utf-8")
    assert "export function stableWorkspaceIdFromTenant(" in fuente
    codigo = _sin_comentarios(fuente)
    assert re.search(r"%\s*900_000", codigo), (
        "la derivacion ya no reduce a `% 900_000`: si se ha migrado, actualiza "
        "este guardian y el registro de bloqueos; si no, revierte")


# ═══════════════════════════════════════════════════════════════════════════
# La prueba
# ═══════════════════════════════════════════════════════════════════════════


def _llamadas_directas() -> list[str]:
    """Ficheros que invocan la derivacion sin pasar por el resolvedor."""
    fuera = []
    for f in _ficheros_web():
        rel = f.relative_to(WEB).as_posix()
        if rel == DUENO_DE_LA_DERIVACION:
            continue
        codigo = _sin_comentarios(f.read_text(encoding="utf-8", errors="replace"))
        if re.search(r"\bstableWorkspaceIdFromTenant\s*\(", codigo):
            fuera.append(rel)
    return sorted(fuera)


def test_ninguna_ruta_llama_a_la_derivacion_directamente():
    huecos = _llamadas_directas()
    assert huecos == [], (
        "estos ficheros derivan el workspace en vez de usar "
        "`workspaceParaAguasArriba`, que consulta antes el puente unico de "
        f"`saas_tenants.workspace_id`: {huecos}")


def test_las_rutas_que_mandan_el_encabezado_usan_el_resolvedor():
    """EL CONTROL de la prueba anterior.

    Si nadie mandara ya `X-Workspace-Id`, la prueba de arriba pasaria vacia y
    pareceria que el problema se resolvio cuando en realidad habria desaparecido
    la superficie. Aqui se comprueba que las rutas siguen existiendo Y que
    resuelven por el camino bueno.
    """
    mandan = []
    for f in _ficheros_web():
        codigo = _sin_comentarios(f.read_text(encoding="utf-8", errors="replace"))
        if "X-Workspace-Id" in codigo and "workspaceParaAguasArriba" in codigo:
            mandan.append(f.relative_to(WEB).as_posix())
    assert len(mandan) >= 3, (
        f"solo {len(mandan)} rutas resuelven con el puente y mandan el "
        f"encabezado: {sorted(mandan)}. Se esperaban al menos las tres que lo "
        "hacian (dialer-advanced y las dos mitades de OAuth)")

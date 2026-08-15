"""
Los limites de lo que un agente puede hacer.

Un agente actua a partir de texto que puede venir del exterior —un correo, un
mensaje de un lead, una web—, asi que hay que asumir que su entrada esta bajo
control de un tercero. Lo que importa no es que el modelo se comporte, sino que
NO PUEDA hacer nada fuera de estos limites aunque se comporte mal:

  * solo ejecuta acciones de una lista CERRADA;
  * el workspace sale del contexto autorizado, nunca de los parametros;
  * la autoridad es la del llamante, no una del agente;
  * su memoria esta separada por workspace.

Auditado y correcto en el bloque 21; este fichero lo fija para que siga siendolo.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

RUTA_ROUTER = Path(__file__).resolve().parent.parent / "routers" / "agent_actions.py"

#: Acciones que el agente puede ejecutar hoy. Anadir una obliga a pasar por aqui,
#: que es el punto donde se piensa si esa accion deberia ser alcanzable por texto.
ACCIONES_PERMITIDAS = {
    "create_contact",
    "move_deal",
    "create_report",
    "create_blog_post",
    "schedule_event",
}


def _acciones_del_router() -> set[str]:
    """Extrae por AST las cadenas comparadas con `action`."""
    arbol = ast.parse(RUTA_ROUTER.read_text(encoding="utf-8"))
    encontradas: set[str] = set()
    for n in ast.walk(arbol):
        if isinstance(n, ast.Compare) and isinstance(n.left, ast.Name) and n.left.id == "action":
            for c in n.comparators:
                if isinstance(c, ast.Constant) and isinstance(c.value, str):
                    encontradas.add(c.value)
    return encontradas


def test_la_lista_de_acciones_es_exactamente_la_declarada():
    """
    Si aparece una accion nueva sin pasar por este test, nadie habra decidido si
    debe poder dispararse desde texto de terceros.
    """
    reales = _acciones_del_router()
    assert reales == ACCIONES_PERMITIDAS, (
        f"acciones nuevas: {reales - ACCIONES_PERMITIDAS} · "
        f"desaparecidas: {ACCIONES_PERMITIDAS - reales}"
    )


def test_una_accion_desconocida_se_rechaza():
    """La lista tiene que ser CERRADA, no una serie de casos con salida abierta."""
    src = RUTA_ROUTER.read_text(encoding="utf-8")
    i = src.index("if action ==")
    tramo = src[i : i + 2000]
    assert "Unknown action" in tramo, "no hay rama de rechazo para acciones no previstas"


def test_el_workspace_no_puede_venir_en_los_parametros():
    """
    Lo que convertiria una inyeccion de prompt en acceso cruzado: si el
    workspace saliese de `params`, bastaria con que el texto lo pidiera.
    """
    src = RUTA_ROUTER.read_text(encoding="utf-8")
    for patron in ('params.get("workspace', "params['workspace", 'params.get("user_id'):
        assert patron not in src, f"el workspace/actor sale de los parametros: {patron}"
    assert "workspace_id = ws_ctx.workspace_id" in src


def test_la_accion_exige_autoridad_de_mutacion():
    """Un agente no tiene autoridad propia: usa la de quien le pide actuar."""
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from tests.test_workspace_mutation_authz_guard import _dependencias

    arbol = ast.parse(RUTA_ROUTER.read_text(encoding="utf-8"))
    fn = next(
        n for n in ast.walk(arbol)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        and n.name == "execute_agent_action"
    )
    deps = _dependencias(fn)
    assert "require_workspace_operator" in deps, f"autoridad insuficiente: {sorted(deps)}"


def test_el_orquestador_no_arranca_sin_workspace():
    """Un orquestador sin workspace consultaria datos de todos."""
    from services.agent_orchestrator import AgentOrchestrator

    with pytest.raises(ValueError, match="workspace_id"):
        AgentOrchestrator(None)


def test_la_memoria_separa_por_workspace():
    """Dos workspaces no pueden compartir espacio de memoria."""
    from services.memory_service import _normalize_workspace_id

    a = _normalize_workspace_id(1)
    b = _normalize_workspace_id(2)
    assert a != b
    assert _normalize_workspace_id(1) == a, "la separacion debe ser estable"


def test_la_accion_queda_registrada_como_actividad():
    """
    Sin rastro, una accion ejecutada por un agente es indistinguible de una
    humana al revisar que paso.
    """
    src = RUTA_ROUTER.read_text(encoding="utf-8")
    assert 'type="agent_action"' in src


# ═══════════════════════════════ sistema multiagente (bloque 22)

def test_una_cadena_de_agentes_tiene_tope():
    """
    `agents_list` no tenia limite: una peticion con 1000 nombres producia 1000
    completions. El coste es de computo propio —no de una API de pago—, pero
    una sola peticion consumia el modelo entero.
    """
    from services.agent_orchestrator import MAX_AGENTES_EN_CADENA

    assert 0 < MAX_AGENTES_EN_CADENA <= 20


def test_el_tope_se_aplica_en_los_dos_caminos_de_cadena():
    """Hay dos: el que devuelve resultados y el que emite por streaming."""
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "agent_orchestrator.py"
    ).read_text(encoding="utf-8")
    assert src.count("len(agents_list) > MAX_AGENTES_EN_CADENA") == 2


def test_el_tipo_de_agente_se_valida_contra_un_catalogo_cerrado():
    """Un tipo arbitrario elegiria un prompt arbitrario."""
    from services.agent_orchestrator import normalize_agent_type

    with pytest.raises(ValueError, match="Unknown agent_type"):
        normalize_agent_type("agente-inventado")


def test_un_tipo_de_agente_real_si_se_acepta():
    """Contraprueba: la validacion no rechaza todo."""
    from services.agent_orchestrator import AGENT_CATALOG, normalize_agent_type

    primero = AGENT_CATALOG[0]["id"]
    assert normalize_agent_type(primero) == primero


def test_el_fallo_de_un_agente_no_se_cuenta_al_cliente():
    """
    `str(exc)` de un fallo del modelo o de la base puede llevar rutas,
    consultas o configuracion hasta quien esta escuchando el stream.
    """
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "agent_orchestrator.py"
    ).read_text(encoding="utf-8")
    assert "'error': str(exc)" not in src, "el detalle interno vuelve al stream"
    assert "'error': 'agent step failed'" in src

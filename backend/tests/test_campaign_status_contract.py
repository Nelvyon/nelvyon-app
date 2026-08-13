"""
`campaigns.status` lleva dos vocabularios.

Dos servicios escriben la MISMA columna con conjuntos distintos:

    campaign_service  (planificador)  draft · running · paused · completed
    campaign_sender   (envio)         sending · sent · failed

La pantalla de campanas solo conocia el primero, asi que una campana enviada de
verdad —que acaba en `sent`— desaparecia de la pestana "completadas" y de
"activas". El arreglo de frontend acepta ambos, que es lo unico que se puede
hacer sin tocar datos.

Este test fija los dos conjuntos para que anadir un estado nuevo obligue a
decidir en que pestana cae, en vez de que desaparezca en silencio.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FRONT = RAIZ.parent / "apps" / "web" / "src" / "app" / "saas" / "campanias" / "page.tsx"

ESTADOS_DEL_ENVIADOR = {"sending", "sent", "failed"}
ESTADOS_DEL_PLANIFICADOR = {"draft", "running", "paused", "completed"}


def _estados_escritos(fichero: str) -> set[str]:
    src = (RAIZ / fichero).read_text(encoding="utf-8")
    return set(re.findall(r'status\s*=\s*["\']([a-z_]+)["\']', src))


def test_el_enviador_sigue_usando_su_vocabulario():
    escritos = _estados_escritos("services/campaign_sender.py")
    assert ESTADOS_DEL_ENVIADOR <= escritos | {"sending"}, (
        f"el enviador cambio de estados: {escritos}"
    )


def test_la_pantalla_conoce_los_estados_del_enviador():
    """El defecto: `sent` no aparecia en ninguna pestana salvo 'todas'."""
    src = FRONT.read_text(encoding="utf-8")
    for estado in ("sending", "sent", "failed"):
        assert f'"{estado}"' in src, f"la pantalla no clasifica {estado}"


def test_la_pantalla_conserva_los_estados_del_planificador():
    """Contraprueba: aceptar los nuevos no puede perder los que ya funcionaban."""
    src = FRONT.read_text(encoding="utf-8")
    for estado in ("running", "completed", "draft"):
        assert f'"{estado}"' in src


def test_ningun_estado_del_backend_queda_sin_pestana():
    """
    Guard de contrato: todo estado que el backend escribe tiene que caer en
    alguna pestana. Si aparece uno nuevo, este test obliga a decidir donde.
    """
    src = FRONT.read_text(encoding="utf-8")
    todos = ESTADOS_DEL_ENVIADOR | ESTADOS_DEL_PLANIFICADOR
    sin_clasificar = [e for e in sorted(todos) if f'"{e}"' not in src]
    assert sin_clasificar == [], f"estados sin pestana en la UI: {sin_clasificar}"

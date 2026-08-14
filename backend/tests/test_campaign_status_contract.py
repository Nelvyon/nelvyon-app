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
#: `scheduled` faltaba: se escribe en `campaign_service` y se le escapo a esta
#: lista, que es justo lo que el fichero existe para impedir. Por eso ahora los
#: estados se DERIVAN del codigo ademas de fijarse.
ESTADOS_DEL_PLANIFICADOR = {"draft", "running", "paused", "scheduled", "completed"}

#: Terminales para la cuota del plan. Un estado terminal que el frontend no
#: conozca hace desaparecer la campana de las dos pestanas.
ESTADOS_TERMINALES_DE_CUOTA = {"sent", "completed", "cancelled", "archived", "failed"}


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



def _estados_escritos_en_campaigns() -> set[str]:
    """Estados que el codigo escribe REALMENTE en `campaigns.status`.

    Se derivan del SQL, no de una lista: una lista escrita a mano ya dejo
    escapar `scheduled`, que es el fallo que este fichero deberia haber
    detectado.

    La captura se acota a la clausula `SET ... WHERE` de la propia sentencia.
    Un `[^;]*` se sale de ella y arrastra los estados de `campaign_recipients`
    —`opened`, `clicked`, `bounced`—, que son otro vocabulario y no el de la
    campana.
    """
    encontrados: set[str] = set()
    for carpeta in ("services", "routers"):
        for fichero in (RAIZ / carpeta).rglob("*.py"):
            texto = fichero.read_text(encoding="utf-8", errors="replace")
            for sentencia in re.finditer(
                r"UPDATE\s+campaigns\s+SET\s+(?P<sets>.*?)\s+WHERE",
                texto,
                re.IGNORECASE | re.DOTALL,
            ):
                for m in re.finditer(
                    r"""status\s*=\s*['"]([a-z_]+)['"]""", sentencia.group("sets")
                ):
                    encontrados.add(m.group(1))
    return encontrados


def test_ningun_estado_escapa_al_contrato():
    """Todo estado que se escriba tiene que estar declarado arriba.

    Es la comprobacion que fallo: `scheduled` llevaba tiempo escribiendose y no
    figuraba en ningun conjunto, asi que nadie decidio en que pestana cae.
    """
    declarados = ESTADOS_DEL_ENVIADOR | ESTADOS_DEL_PLANIFICADOR
    huerfanos = sorted(_estados_escritos_en_campaigns() - declarados)
    assert not huerfanos, (
        f"estados escritos en campaigns.status y no declarados: {huerfanos}. "
        "Decide en que pestana caen antes de que desaparezcan en silencio."
    )


def test_el_detector_encuentra_estados():
    """Control positivo: si el barrido dejara de ver el SQL, daria verde vacio."""
    assert len(_estados_escritos_en_campaigns()) >= 4


def test_todo_estado_terminal_lo_conoce_el_frontend():
    """Un terminal que el frontend ignore hace desaparecer la campana.

    Es el mismo defecto que ya paso con `sent`: la campana no salia ni en
    activas ni en completadas.
    """
    front = FRONT.read_text(encoding="utf-8", errors="replace")
    desconocidos = sorted(e for e in ESTADOS_TERMINALES_DE_CUOTA if f'"{e}"' not in front)
    assert not desconocidos, (
        f"el frontend no clasifica estos estados terminales: {desconocidos}"
    )

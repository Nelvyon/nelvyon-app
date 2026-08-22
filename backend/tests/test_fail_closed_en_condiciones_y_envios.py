"""Lo que no se puede leer no se da por bueno, y lo que no se envia no es «ok».

DOS FAIL-OPEN, ENCONTRADOS BUSCANDO `except` QUE DEVUELVEN EXITO
-----------------------------------------------------------------
Se recorrieron los bloques `except` de los modulos de seguridad, permisos y
validacion buscando los que devuelven `True` o `{"ok": True}`. Salieron tres; uno
era correcto —`_is_private_ip` trata lo ilegible como privado, que es
fail-closed— y dos no.

1. `workflow_engine._matches_conditions`
   Si el JSON de condiciones de una regla estaba corrupto: `return True`.
   Es decir, la regla COINCIDIA CON TODO y disparaba su accion en cada evento.
   Correos, mensajes o tareas a quien no tocaba, sin un solo error en el log.

   «No se pueden leer las condiciones» NO es «no hay condiciones». Lo primero es
   un fallo; lo segundo, una regla que se aplica siempre a proposito.

2. `push_service._send`
   Sin la dependencia `pywebpush`: `return {"ok": True, "mock": True}`.
   Quien llamaba veia exito, el usuario no recibia nada y no quedaba rastro de
   que faltara una dependencia. Es una pantalla que dice «enviado» sin haber
   enviado.

POR QUE ESTA CLASE ES LA PEOR
------------------------------
Un fallo que devuelve error se arregla. Un fallo que devuelve exito se convierte
en una creencia: los informes cuentan envios que no ocurrieron y las
automatizaciones parecen funcionar mientras hacen lo contrario de lo pedido.
"""
from __future__ import annotations

import json

import pytest


# ═══════════════════════════════════════════════════════════════════════════
# Condiciones ilegibles no significan «sin condiciones»
# ═══════════════════════════════════════════════════════════════════════════


class _Regla:
    """Lo minimo que mira `_matches_conditions`."""

    def __init__(self, config):
        self.id = 1
        self.trigger_config = config


@pytest.mark.parametrize("config", [
    "{esto no es json}",
    "{'comillas': 'simples'}",
    "[1,2,",
    b"\x00\x01binario",
])
def test_una_configuracion_corrupta_no_dispara_la_regla(config):
    """LA PRUEBA. Antes devolvia True y la regla se aplicaba a TODO."""
    from services.workflow_engine import WorkflowEngine

    motor = WorkflowEngine.__new__(WorkflowEngine)
    assert motor._matches_conditions(_Regla(config), {"lo": "que sea"}) is False, (
        "una regla con condiciones ilegibles coincidio: se aplicaria a todos los "
        "eventos y dispararia su accion sobre quien no toca")


def test_sin_condiciones_si_coincide_siempre():
    """EL CONTROL, y la distincion que importa.

    Una regla SIN condiciones se aplica siempre a proposito. Si la correccion
    hubiera confundido los dos casos, se romperian las reglas legitimas.
    """
    from services.workflow_engine import WorkflowEngine

    motor = WorkflowEngine.__new__(WorkflowEngine)
    assert motor._matches_conditions(_Regla(None), {"x": 1}) is True
    assert motor._matches_conditions(_Regla(""), {"x": 1}) is True


def test_unas_condiciones_validas_siguen_evaluandose():
    """Control del control: la correccion no puede denegarlo todo."""
    from services.workflow_engine import WorkflowEngine

    motor = WorkflowEngine.__new__(WorkflowEngine)
    regla = _Regla(json.dumps({"estado": "activo"}))
    assert motor._matches_conditions(regla, {"estado": "activo"}) is True
    assert motor._matches_conditions(regla, {"estado": "pausado"}) is False


# ═══════════════════════════════════════════════════════════════════════════
# Lo que no se envia no puede decir «ok»
# ═══════════════════════════════════════════════════════════════════════════


def test_sin_la_dependencia_de_envio_no_se_reporta_exito():
    """Se lee el codigo del camino de fallo: no se puede provocar un ImportError
    real sin desinstalar la libreria, y desinstalarla romperia el entorno.

    Lo que se comprueba es que ese camino ya no devuelve `ok: True` — que era
    exactamente la mentira.
    """
    import inspect

    from services import push_service

    fuente = inspect.getsource(push_service)
    tramo = fuente[fuente.index("pywebpush_missing") - 700:
                   fuente.index("pywebpush_missing") + 300]
    assert '"ok": True' not in tramo and "'ok': True" not in tramo, (
        "el camino de dependencia ausente sigue devolviendo `ok: True`: se "
        "reporta como enviada una notificacion que nunca salio")
    assert "ok" in tramo and "False" in tramo, (
        "el camino de dependencia ausente deberia declarar explicitamente que "
        "no se envio")


def test_el_modo_mock_declarado_si_puede_decir_ok():
    """La distincion: un mock que alguien PIDIO es legitimo.

    Confundir «no puedo enviar» con «me pediste que no enviara» habria sido
    corregir una mentira creando otra.
    """
    import inspect

    from services import push_service

    fuente = inspect.getsource(push_service)
    assert 'if self._mock:' in fuente, (
        "desaparecio el modo mock declarado, que es el unico `ok` legitimo sin "
        "envio real")

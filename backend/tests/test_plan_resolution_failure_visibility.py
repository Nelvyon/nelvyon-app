"""Un fallo de esquema no puede degradar el plan en silencio.

EL DEFECTO
----------
`get_active_plan_id_for_workspace` capturaba cualquier excepcion, la registraba
a nivel `debug` —que en produccion no se emite— y devolvia `"starter"`. Con eso,
"este workspace no tiene suscripcion" y "la consulta ha fallado" producian el
mismo resultado y el mismo silencio.

Se descubrio al certificar contra PostgreSQL real: la cadena de migraciones
construye `subscriptions` sin columna `plan_id`, asi que la consulta falla con
`column "plan_id" does not exist` y TODO cliente de pago pasa al plan mas barato
sin que nada lo senale.

POR QUE NO SE QUITA EL FALLBACK
-------------------------------
Porque propagar la excepcion convertiria una caida de base en un 500 general en
cada comprobacion de cuota. Degradar es la respuesta correcta; hacerlo callando
no lo es. Lo que se exige aqui es que el fallo SE VEA, no que deje de degradar.
"""
from __future__ import annotations

import logging

import pytest

from services.plan_quota import get_active_plan_id_for_workspace


class _SesionQueRevienta:
    """Una base que responde con el error real medido contra PostgreSQL."""

    def __init__(self, excepcion: Exception):
        self._excepcion = excepcion

    async def execute(self, *_a, **_k):
        raise self._excepcion


class _SesionVacia:
    """Una base sana en la que este workspace no tiene suscripcion."""

    class _R:
        @staticmethod
        def fetchone():
            return None

    async def execute(self, *_a, **_k):
        return self._R()


@pytest.mark.asyncio
async def test_un_fallo_de_consulta_se_registra_como_error(caplog):
    fallo = Exception('column "plan_id" does not exist')
    with caplog.at_level(logging.ERROR, logger="services.plan_quota"):
        plan = await get_active_plan_id_for_workspace(_SesionQueRevienta(fallo), 1)

    assert plan == "starter", "el fallback debe conservarse"
    errores = [r for r in caplog.records if r.levelno >= logging.ERROR]
    assert errores, (
        "un fallo de esquema degrado el plan sin dejar rastro visible: "
        "en produccion nadie se enteraria"
    )
    assert "plan_quota.consulta_fallida" in errores[0].getMessage()


@pytest.mark.asyncio
async def test_el_error_dice_que_workspace_y_que_fallo(caplog):
    """Un ERROR sin el workspace ni la causa obliga a reproducir a ciegas."""
    fallo = Exception('column "plan_id" does not exist')
    with caplog.at_level(logging.ERROR, logger="services.plan_quota"):
        await get_active_plan_id_for_workspace(_SesionQueRevienta(fallo), 4242)

    mensaje = " ".join(r.getMessage() for r in caplog.records if r.levelno >= logging.ERROR)
    assert "4242" in mensaje, "no identifica el workspace afectado"
    assert "plan_id" in mensaje, "no conserva la causa original"


@pytest.mark.asyncio
async def test_no_tener_suscripcion_no_es_un_error(caplog):
    """Control negativo: el caso legitimo no debe ensuciar los logs.

    Sin esto, la forma mas facil de pasar el test de arriba seria registrar un
    ERROR siempre — y un ERROR que salta en el caso normal deja de leerse a la
    semana, con lo que el defecto volveria disfrazado de ruido.
    """
    with caplog.at_level(logging.DEBUG, logger="services.plan_quota"):
        plan = await get_active_plan_id_for_workspace(_SesionVacia(), 1)

    assert plan == "starter"
    assert not [r for r in caplog.records if r.levelno >= logging.ERROR], (
        "un workspace sin suscripcion es normal y no debe registrarse como error"
    )

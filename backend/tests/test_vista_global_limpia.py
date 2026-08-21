"""Prueba discriminante del prechequeo de residuo.

No basta con que el prechequeo exista: hay que demostrar que distingue una base
limpia de una con residuo, y que lo que dice al fallar sirve para arreglarlo.
"""
from __future__ import annotations

import pytest

from tests._vista_global_limpia import exigir_vista_global_limpia

#: `pytest.fail` no lanza un `Exception`: lanza `Failed`, que cuelga de
#: `BaseException`. Un `pytest.raises(Exception)` no lo atrapa y la prueba se
#: cae en vez de comprobar lo que queria — paso justo aqui.
SE_NEGO_A_MEDIR = pytest.fail.Exception

pytestmark = pytest.mark.asyncio


class _ConexionFalsa:
    """Devuelve los recuentos que se le digan, en el orden en que se piden."""

    def __init__(self, confirmados: int, workspaces: int):
        self._valores = [confirmados, workspaces]

    async def fetchval(self, *_args, **_kwargs):
        return self._valores.pop(0)


async def test_una_base_limpia_deja_medir():
    await exigir_vista_global_limpia(_ConexionFalsa(0, 0))


@pytest.mark.parametrize("confirmados,workspaces", [
    (112, 140),   # el residuo real que se encontro
    (112, 0),     # trabajo ajeno sin workspaces: envenena igual los recuentos
    (0, 140),     # workspaces sin trabajo: el panel los cuenta como clientes
])
async def test_con_residuo_se_niega_a_medir(confirmados, workspaces):
    with pytest.raises(SE_NEGO_A_MEDIR) as exc:
        await exigir_vista_global_limpia(_ConexionFalsa(confirmados, workspaces))
    mensaje = str(exc.value)
    assert str(confirmados) in mensaje and str(workspaces) in mensaje, (
        "el mensaje no dice cuanto residuo hay, asi que no ayuda a decidir si "
        "es un teardown perdido o algo peor")
    assert "CERTIFICATION" in mensaje, (
        "el mensaje no dice como limpiarlo: quien lo lea a las 3 de la manana "
        "tiene que poder arreglarlo sin leer el codigo")


async def test_el_umbral_configurable_no_abre_la_puerta_del_todo():
    """`ajenos_permitidos` existe para bases compartidas con una linea base
    conocida. No puede servir para tapar workspaces residuales."""
    await exigir_vista_global_limpia(_ConexionFalsa(5, 0), ajenos_permitidos=5)
    with pytest.raises(SE_NEGO_A_MEDIR):
        await exigir_vista_global_limpia(_ConexionFalsa(6, 0), ajenos_permitidos=5)
    with pytest.raises(SE_NEGO_A_MEDIR):
        # aunque el trabajo entre en el umbral, los workspaces nunca se toleran
        await exigir_vista_global_limpia(_ConexionFalsa(5, 1), ajenos_permitidos=5)

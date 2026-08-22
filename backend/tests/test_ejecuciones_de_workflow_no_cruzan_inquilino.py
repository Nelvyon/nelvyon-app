"""Cerrar una ejecucion de workflow toca la del inquilino y solo la suya.

LOS DOS FALLOS QUE ESTA BATERIA SEPARA
---------------------------------------
Los dos `UPDATE visual_workflow_executions ... WHERE id = :eid` cerraban la
ejecucion buscando SOLO por id. Eran las dos ultimas mutaciones sin acotar del
backend, y la segunda corre en un ejecutor diferido con sesion propia de
`db_manager` — es decir, sin la RLS de la peticion detras.

Al acotarlas aparecio un segundo riesgo, opuesto y mas silencioso: el servicio
admite construirse SIN workspace (`get_workflow_service(session)`), y
`execute_workflow` resuelve el inquilino despues, desde la fila del workflow.
Acotar con `self.workspace_id` habria comparado contra NULL, que no casa con
nada. El UPDATE no fallaria: no haria NADA. La ejecucion se quedaria en
`running` para siempre, sin un error en el log, y el panel mostraria
automatizaciones eternamente «en curso».

Por eso hay dos pruebas y no una: la primera vigila que se cierre, la segunda
que no cierre la ajena. Una correccion que satisfaga solo una de las dos esta
mal en la direccion contraria.
"""
from __future__ import annotations

import inspect

from services import workflow_service


def _tramos_de_update() -> list[str]:
    """Los dos UPDATE de cierre, cada uno CON su diccionario de parametros.

    La primera version cortaba una ventana fija de 900 caracteres. El parametro
    del segundo cierre estaba en el 933, asi que quedaba fuera y la prueba del
    control pasaba en verde sin mirar nada: una guardia inerte, que es peor que
    no tenerla porque ademas tranquiliza.

    Ahora el tramo llega hasta el cierre del `execute(...)` que lo contiene, y
    `_parametros_de` exige encontrar el `"ws"`. Si algun dia no esta, la prueba
    falla en vez de aprobar por no haber llegado a mirar.
    """
    fuente = inspect.getsource(workflow_service)
    tramos = []
    desde = 0
    while (i := fuente.find("UPDATE visual_workflow_executions", desde)) != -1:
        # Hasta el siguiente `await` (o el final): cubre el SQL y su dict de
        # parametros completo, sea cual sea su longitud.
        fin = fuente.find("await ", i)
        tramos.append(fuente[i:fin if fin != -1 else len(fuente)])
        desde = i + 1
    return tramos


def _parametros_de(tramo: str, n: int) -> str:
    """El tramo del diccionario de parametros, o un fallo si no aparece."""
    j = tramo.find('"ws"')
    assert j != -1, (
        f"el cierre numero {n} no tiene un parametro `ws` en su llamada: o no "
        f"esta acotado, o este extractor dejo de encontrarlo y las pruebas de "
        f"abajo estarian aprobando sin mirar")
    return tramo[j:j + 80]


def test_hay_exactamente_dos_cierres_de_ejecucion():
    """Si aparece un tercero, las dos pruebas de abajo tienen que cubrirlo.

    Sin este recuento, alguien anade un UPDATE nuevo sin acotar y esta bateria
    seguiria en verde mirando solo los dos viejos.
    """
    assert len(_tramos_de_update()) == 2, (
        f"hay {len(_tramos_de_update())} UPDATE sobre visual_workflow_executions; "
        f"esta bateria solo razona sobre dos")


def test_los_dos_cierres_acotan_por_inquilino():
    """LA PRUEBA. Sin `workspace_id` en el WHERE, un id adivinado cierra la
    ejecucion de otro cliente — y la segunda corre sin RLS de peticion detras."""
    for n, tramo in enumerate(_tramos_de_update(), 1):
        where = tramo[tramo.index("WHERE"):tramo.index("WHERE") + 120]
        assert "workspace_id" in where, (
            f"el cierre numero {n} localiza la ejecucion solo por id: "
            f"{where.splitlines()[0].strip()!r}")


def test_ninguno_acota_con_el_workspace_del_servicio():
    """EL CONTROL, y el que impide la correccion que rompe en silencio.

    `self.workspace_id` puede ser None —el servicio se construye asi— mientras
    la local ya esta resuelta. Comparar contra NULL no casa con ninguna fila:
    la ejecucion nunca se cerraria y nadie veria un error.
    """
    for n, tramo in enumerate(_tramos_de_update(), 1):
        assert "self.workspace_id" not in _parametros_de(tramo, n), (
            f"el cierre numero {n} se acota con `self.workspace_id`, que puede "
            f"ser None: el UPDATE no fallaria, simplemente no cerraria la "
            f"ejecucion y quedaria en `running` para siempre")


def test_el_servicio_admite_construirse_sin_inquilino():
    """La premisa de la prueba anterior, comprobada en vez de supuesta.

    Si algun dia el constructor exigiera workspace, `self.workspace_id` dejaria
    de ser peligroso y este razonamiento habria que revisarlo — mejor que lo
    diga una prueba a que se herede como dogma.
    """
    svc = workflow_service.get_workflow_service(None)
    assert svc.workspace_id is None, (
        "el servicio ya no admite construirse sin inquilino: revisa si "
        "`test_ninguno_acota_con_el_workspace_del_servicio` sigue teniendo sentido")

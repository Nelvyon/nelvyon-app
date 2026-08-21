"""Las baterias que miran la vista GLOBAL no pueden medir sobre residuo.

QUE PASO
--------
`centro_de_control.componer(ambito="todo")` y `salud_negocio.revisar()` miran
TODA la base: es su trabajo, porque son la vista del fundador sobre su empresa
entera. Las baterias que las certifican crean su propio workspace, pero lo que
miden incluye lo que haya dejado cualquier otra ejecucion.

Una certificacion progresiva se interrumpio a medias —se paro el Docker que
sostenia la base— y su teardown no llego a correr. Quedaron 140 workspaces de
certificacion y 112 trabajos confirmados. Con ese residuo delante:

    test_si_el_motor_no_corre_el_panel_no_dice_que_todo_va_bien
        el panel dijo «112 trabajos confirmados en 24 h, nada roto» con el motor
        parado. La prueba fallo, pero lo que fallo es la frase: el panel estaba
        contando trabajo de otro sitio.

    test_la_produccion_caida_a_cero_se_ve
        se borraron los 4 confirmados de la prueba y el acumulado bajo de 116 a
        112. Como no llego a cero, el vigilante no vio nada que avisar.

POR QUE UN PRECHEQUEO Y NO «acordarse de limpiar»
-------------------------------------------------
Porque el residuo empuja SIEMPRE hacia el mismo lado: hace que las metricas
parezcan sanas. En este caso las pruebas fallaron y se noto. En el caso simetrico
—una comprobacion que exige que algo sea mayor que cero— el residuo la habria
puesto en verde sin que nadie ejecutara nada, que es justo la clase de silencio
que estas baterias existen para romper.

Asi que se comprueba ANTES de medir. Si hay residuo, la bateria dice que no puede
medir. Un «no puedo medir» es informacion; un verde sobre datos ajenos, no.
"""
from __future__ import annotations


async def exigir_vista_global_limpia(conexion, ajenos_permitidos: int = 0) -> None:
    """Falla si la base arrastra trabajo o workspaces de otra ejecucion.

    `conexion` es una conexion asyncpg de administracion. `ajenos_permitidos`
    existe para bases de certificacion compartidas donde se acepte una linea base
    conocida; por defecto no se acepta ninguna.
    """
    import pytest

    confirmados = await conexion.fetchval(
        "SELECT count(*) FROM autopilot_jobs WHERE estado IN ('confirmed','delivered')")
    workspaces = await conexion.fetchval(
        "SELECT count(*) FROM workspaces WHERE name LIKE 'CERTIFICATION%'")

    if confirmados <= ajenos_permitidos and workspaces == 0:
        return

    pytest.fail(
        f"la base arrastra residuo de otra ejecucion: {confirmados} trabajos "
        f"entregados o confirmados y {workspaces} workspaces de certificacion. "
        f"Esta bateria mide la vista GLOBAL, asi que sobre ese residuo mediria "
        f"la empresa de otro y daria un veredicto que no significa nada. "
        f"Casi siempre es un teardown que no llego a correr porque la ejecucion "
        f"anterior se interrumpio. Limpiar: borrar las filas de los workspaces "
        f"cuyo nombre empieza por CERTIFICATION y despues esos workspaces.")

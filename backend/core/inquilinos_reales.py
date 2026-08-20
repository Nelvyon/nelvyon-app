"""Que cuenta como un cliente REAL. Una sola definicion, no cinco.

POR QUE EXISTE ESTE FICHERO
---------------------------
Produccion tiene 22 inquilinos y los 22 son `@nelvyon.test`. Ademas quedan 2954
entregables marcados `synthetic` y cada bateria de certificacion crea workspaces
temporales. Ninguno de los tres es un cliente.

Si cada sitio que necesita distinguirlos escribiera su propio filtro, un dia el
panel diria «18 clientes activos» y el motor trabajaria para 22, y nadie sabria
cual de los dos miente. Aqui esta la definicion, una vez.

LAS TRES COSAS QUE NO SON UN CLIENTE
------------------------------------
    @nelvyon.test        inquilinos de prueba historicos
    CERTIFICATION-*      workspaces que crean y borran las baterias E2E
    synthetic / demo     datos de relleno de las primeras versiones

QUE SE HACE CON ELLOS
---------------------
NADA. No se borran —la instruccion es explicita— y no se les genera trabajo.
Simplemente no cuentan: ni para encender Autopilot ni para los KPIs. Generar
trabajo real para clientes falsos ya costo 153 filas inutiles con el CEO brief.

COMO SE USA
-----------
Es un fragmento de SQL, no una funcion de Python, porque los dos sitios que lo
necesitan —el planner y el panel— filtran dentro de una consulta. Traerse las
filas a Python para descartarlas despues seria mas lento y, sobre todo, permitiria
que las dos implementaciones divergieran.
"""
from __future__ import annotations

#: Predicado sobre un alias de `workspaces`. Comprueba las DOS cosas: el nombre
#: del workspace y el correo de su propietario.
#:
#: EL CORREO NO ES OPCIONAL
#: ------------------------
#: La primera version solo miraba el nombre, y los 22 inquilinos de prueba de
#: produccion se llaman como cualquier otro: «Mi Agencia», «Estudio X». Lo unico
#: que los delata es que su dueño es `@nelvyon.test`. Con el filtro a medias, el
#: panel los habria contado como clientes reales — que es justo lo que este
#: fichero existe para impedir.
#:
#: Va como `EXISTS` y no como JOIN porque un JOIN multiplicaria filas cuando un
#: workspace tiene varios propietarios, y un recuento inflado en un panel es una
#: mentira igual que un recuento a cero.
#:
#: `{w}` es el alias de la tabla `workspaces`.
WORKSPACE_REAL = """(
    {w}.name NOT LIKE 'CERTIFICATION-%'
AND {w}.name NOT ILIKE '%synthetic%'
AND {w}.name NOT ILIKE '%demo-test%'
AND NOT EXISTS (
        SELECT 1 FROM workspace_members mm
         WHERE mm.workspace_id = {w}.id
           AND mm.role = 'owner'
           AND COALESCE(mm.email, '') LIKE '%@nelvyon.test')
)"""

#: Predicado sobre un correo. Se aplica al del propietario del workspace.
CORREO_REAL = "(COALESCE({e}, '') NOT LIKE '%@nelvyon.test')"


def workspace_real(alias: str = "w") -> str:
    """Fragmento SQL: este workspace no es de prueba ni de certificacion."""
    return WORKSPACE_REAL.format(w=alias)


def correo_real(columna: str) -> str:
    """Fragmento SQL: este correo no es de un inquilino de prueba."""
    return CORREO_REAL.format(e=columna)


def es_real(nombre: str | None, correo: str | None = None) -> bool:
    """La misma decision en Python, para pruebas y para decidir sin consultar.

    Existe para poder comprobar que las dos versiones dicen lo mismo: una prueba
    compara esta funcion contra el SQL con los mismos datos, que es la unica
    forma de que no se separen con el tiempo.
    """
    n = (nombre or "").lower()
    if n.startswith("certification-") or "synthetic" in n or "demo-test" in n:
        return False
    return not (correo or "").lower().endswith("@nelvyon.test")

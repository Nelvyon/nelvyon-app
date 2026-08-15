"""
Neutralizar formulas al exportar CSV.

Excel, LibreOffice y Google Sheets interpretan como FORMULA cualquier celda que
empiece por `=`, `+`, `-`, `@`, tabulador o retorno de carro. Si ese texto vino
de fuera, abrir el CSV ejecuta lo que el atacante escribio: `=cmd|'/c calc'!A1`
lanza un proceso, `=HYPERLINK(...)` exfiltra el contenido de otras celdas.

NO es teorico en NELVYON. `services/audit_events.py` guarda
`resource_id=request.url.path` al registrar una denegacion de autorizacion, asi
que basta con pedir una ruta llamada `/=cmd|...` para dejar esa cadena en
`security_events`. Cuando alguien exporta la auditoria y la abre en Excel, la
formula es suya.

El resto de campos exportados —nombres de contacto, empresas, etiquetas— llegan
de formularios publicos, que es el mismo problema con menos pasos.

COMO SE NEUTRALIZA
------------------
Prefijando un apostrofo, que es lo que la propia hoja de calculo usa para decir
"esto es texto". No se borra ni se altera el contenido: `=A1` se exporta como
`'=A1` y se lee como `=A1`, pero no se evalua.

Tambien se recortan los saltos de linea y tabuladores iniciales, porque una
celda que empieza por ellos puede desplazar el contenido a otra columna al
reimportar.
"""
from __future__ import annotations

from typing import Any

#: Caracteres que convierten una celda en formula al abrirla.
INICIOS_PELIGROSOS = ("=", "+", "-", "@", "\t", "\r", "\n")


def celda_segura(valor: Any) -> Any:
    """
    Devuelve el valor listo para escribir en un CSV.

    Los no-textos (numeros, fechas, None) pasan intactos: no pueden iniciar una
    formula y convertirlos a texto cambiaria el tipo de la columna.
    """
    if not isinstance(valor, str):
        return valor
    if valor.startswith(INICIOS_PELIGROSOS):
        return "'" + valor
    return valor


def fila_segura(fila) -> list:
    """Aplica `celda_segura` a cada celda de una fila."""
    return [celda_segura(c) for c in fila]

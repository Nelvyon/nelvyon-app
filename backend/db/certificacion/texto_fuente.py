"""Utilidad de lectura de fuente TSX para las auditorias medibles.

Una sola responsabilidad: dejar el codigo sin comentarios **sin mover nada de
sitio**, para que cualquier regla que se aplique despues mida codigo y no
prosa.
"""

from __future__ import annotations


def sin_comentarios(texto: str) -> str:
    """Blanquea los comentarios CONSERVANDO las posiciones.

    Se blanquea en vez de borrar para que numeros de linea y desplazamientos
    sigan valiendo: sustituir por espacios de la misma longitud deja el resto
    del fichero exactamente donde estaba.

    Hace falta un escaner de estados y no una expresion regular: `//` dentro de
    `"https://ejemplo.test"` no abre un comentario, y borrarlo destrozaria la
    mitad de los `href` del arbol. Por eso se sigue el estado de comillas
    simples, dobles y plantillas, y se respeta la barra de escape.
    """
    salida = list(texto)
    i, n = 0, len(texto)
    estado: str | None = None      # None | "'" | '"' | '`' | 'linea' | 'bloque'
    ini = 0

    def blanquear(desde: int, hasta: int) -> None:
        # Los saltos de linea se respetan: son los que sostienen la numeracion.
        for j in range(desde, min(hasta, n)):
            if salida[j] != "\n":
                salida[j] = " "

    while i < n:
        c = texto[i]
        dos = texto[i : i + 2]
        if estado is None:
            if dos == "//":
                estado, ini = "linea", i
                i += 2
                continue
            if dos == "/*":
                estado, ini = "bloque", i
                i += 2
                continue
            if c in ("'", '"', "`"):
                estado = c
            i += 1
        elif estado in ("'", '"', "`"):
            if c == "\\":
                i += 2
                continue
            if c == estado:
                estado = None
            i += 1
        elif estado == "linea":
            if c == "\n":
                blanquear(ini, i)
                estado = None
            i += 1
        else:  # bloque
            if dos == "*/":
                blanquear(ini, i + 2)
                estado = None
                i += 2
                continue
            i += 1

    if estado in ("linea", "bloque"):
        blanquear(ini, n)
    return "".join(salida)

"""Corta SQL en sentencias como lo hace `splitSqlStatements.ts`. Sin efectos al importar.

La primera version no saltaba comentarios de linea, asi que cortaba dentro de
`-- Immutable audit trail (append-only; no updated_at)` y producia un fragmento
`no updated_at) CREATE TABLE ...` que PostgreSQL rechaza con 42601.

Es decir: mi herramienta inventaba un error de sintaxis que el fichero no tiene.
Se corrige aqui porque una medida hecha con un cortador distinto al del runner no
mide lo que se pretende medir.
"""
import re


def sentencias(sql: str) -> list[str]:
    fuera: list[str] = []
    actual: list[str] = []
    i, n = 0, len(sql)
    while i < n:
        c = sql[i]
        # comentario de linea
        if c == "-" and i + 1 < n and sql[i + 1] == "-":
            nl = sql.find("\n", i)
            if nl == -1:
                break
            actual.append(sql[i:nl + 1])
            i = nl + 1
            continue
        # comentario de bloque
        if c == "/" and i + 1 < n and sql[i + 1] == "*":
            fin = sql.find("*/", i + 2)
            fin = n if fin == -1 else fin + 2
            actual.append(sql[i:fin])
            i = fin
            continue
        # cadena entrecomillada con $$
        m = re.match(r"\$[a-zA-Z_]*\$", sql[i:])
        if m:
            etiqueta = m.group(0)
            fin = sql.find(etiqueta, i + len(etiqueta))
            fin = n if fin == -1 else fin + len(etiqueta)
            actual.append(sql[i:fin])
            i = fin
            continue
        # cadena simple
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            j = n if j >= n else j
            actual.append(sql[i:j + 1])
            i = j + 1
            continue
        # identificador entrecomillado
        if c == '"':
            j = sql.find('"', i + 1)
            j = n if j == -1 else j
            actual.append(sql[i:j + 1])
            i = j + 1
            continue
        if c == ";":
            fuera.append("".join(actual))
            actual = []
            i += 1
            continue
        actual.append(c)
        i += 1
    if "".join(actual).strip():
        fuera.append("".join(actual))

    limpias = []
    for s in fuera:
        # una sentencia que solo son comentarios no es una sentencia
        cuerpo = re.sub(r"--[^\n]*\n?|/\*.*?\*/", " ", s, flags=re.S).strip()
        if cuerpo:
            limpias.append(s.strip())
    return limpias

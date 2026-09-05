"""Un limite de reintentos que admita NULL es un trabajo que no reintenta nunca.

LA CLASE DE FALLO, Y YA MORDIO UNA VEZ
--------------------------------------
En Fase 1 aparecio esto en TypeScript:

    project.retry_count < project.max_retries

con `max_retries` ausente. Contra `undefined` esa comparacion es SIEMPRE falsa,
asi que aquel piloto no reintentaba nunca. No fallaba ninguna prueba: el sistema
«funcionaba», simplemente no reintentaba.

En SQL la misma forma es PEOR, porque no hay ni siquiera un `false` visible:

    WHERE attempts < max_attempts

Si `max_attempts` es NULL, la comparacion no es falsa: es NULL. La fila no entra
en el resultado y el trabajo se queda en la cola para siempre, sin error, sin
registro y sin nadie mirando. Un trabajo que no reintenta se parece mucho a un
trabajo que no existe.

QUE EXIGE ESTA PRUEBA
---------------------
Que toda columna que sirva de LIMITE de reintentos se declare `NOT NULL` y con
`DEFAULT`. Las dos cosas:

  · `NOT NULL`  impide el NULL que rompe la comparacion;
  · `DEFAULT`   impide que una insercion antigua —o un backfill— deje la
                columna sin valor y la migracion falle o el trabajo nazca muerto.

POR QUE MIRA EL ESQUEMA Y NO EL CODIGO
---------------------------------------
El codigo que compara puede estar en cualquier sitio y cambiar de forma. La
columna es UNA, y protegerla ahi cubre a todos los que la lean, incluidos los que
todavia no existen. Es la misma razon por la que una restriccion vale mas que una
comprobacion repetida.

COSTE EXTERNO: 0 EUR. Se leen los ficheros de migracion.
"""
from __future__ import annotations

import io
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
MIGRACIONES = RAIZ / "backend" / "db" / "migrations"

#: Nombres que significan «hasta cuantas veces se reintenta».
#: No entran los CONTADORES (`attempts`, `retry_count`): esos empiezan en cero y
#: un NULL ahi es otro problema distinto.
_LIMITE = re.compile(
    r"\b(max_attempts|max_retries|max_tries|retry_limit|attempt_limit|max_reintentos)\b",
    re.I,
)

_COMENTARIO_SQL = re.compile(r"--[^\n]*")


def _declaraciones_de_limite() -> list[tuple[str, str]]:
    """(fichero, linea) de cada sitio donde se DECLARA una columna limite."""
    fuera: list[tuple[str, str]] = []
    for p in sorted(MIGRACIONES.glob("*.sql")):
        texto = _COMENTARIO_SQL.sub(" ", io.open(p, encoding="utf-8", errors="replace").read())
        for linea in texto.split("\n"):
            if not _LIMITE.search(linea):
                continue
            # Solo las DECLARACIONES: `ADD COLUMN`, o una linea de `CREATE TABLE`
            # con un tipo. Las lecturas y los `WHERE` no declaran nada.
            if not re.search(r"\b(ADD COLUMN|INTEGER|INT\b|SMALLINT|BIGINT|NUMERIC)\b", linea, re.I):
                continue
            fuera.append((p.name, " ".join(linea.split())))
    return fuera


def test_el_barrido_encuentra_alguna_declaracion():
    """CONTROL POSITIVO. Cero declaraciones seria un verde vacio: pasaria igual
    con la regla rota o con el directorio equivocado."""
    decls = _declaraciones_de_limite()
    assert decls, "no se encontro ninguna columna de limite de reintentos; el barrido no mira nada"


def test_todo_limite_de_reintento_es_not_null_con_defecto():
    """LA REGLA.

    En Postgres `attempts < NULL` no es falso: es NULL. La fila no entra en el
    resultado y el trabajo no se reintenta jamas, en silencio.
    """
    culpables: list[str] = []
    for fichero, linea in _declaraciones_de_limite():
        tiene_not_null = re.search(r"\bNOT\s+NULL\b", linea, re.I)
        tiene_default = re.search(r"\bDEFAULT\b", linea, re.I)
        if not (tiene_not_null and tiene_default):
            falta = []
            if not tiene_not_null:
                falta.append("NOT NULL")
            if not tiene_default:
                falta.append("DEFAULT")
            culpables.append(f"{fichero}: falta {' y '.join(falta)} -> {linea}")

    assert not culpables, (
        "estas columnas limitan reintentos y admiten NULL. Con un NULL ahi, "
        "`attempts < max_attempts` no selecciona la fila y el trabajo se queda "
        "en la cola para siempre, sin error y sin registro:\n  "
        + "\n  ".join(culpables)
    )


def test_el_detector_distingue_limite_de_contador():
    """Si confundiera `attempts` con `max_attempts`, exigiria `DEFAULT` a un
    contador que empieza en cero y llenaria la prueba de ruido. Un guardian que
    grita lobo ensena a ignorarlo."""
    assert _LIMITE.search("max_attempts INTEGER NOT NULL DEFAULT 3")
    assert not _LIMITE.search("attempts INTEGER NOT NULL DEFAULT 0")
    assert not _LIMITE.search("retry_count INTEGER DEFAULT 0")

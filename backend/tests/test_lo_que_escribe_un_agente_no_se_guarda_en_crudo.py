"""Lo que una persona le escribe a un agente no se guarda tal cual.

LA CLASE DE FALLO
-----------------
`saas_agent_runs.input` es texto libre. Ahi acaba lo que el usuario pegue:

    «usa esta clave para conectarte: rk_live_51Abc...»
    «Authorization: Bearer eyJhbGciOi...»
    «conecta a postgresql://usuario:CLAVE@host/db»

Se guardaba en claro, sin caducidad. Y no se quedaba en la tabla:
`SaasUnifiedAuditExportService` volcaba `input` y `output` tal cual en el export
de auditoria, asi que un secreto pegado por descuido salia otra vez por una
funcion pensada precisamente para cumplir.

QUE SE MIDIO ANTES DE RECORTAR
-------------------------------
No se vacio la columna a ciegas. Se miro quien lee:

  · la lista de ejecuciones de la interfaz pide `id, agent_id, status,
    created_at`. NO usa `input` ni `output`;
  · el export de auditoria SI los usa, para contar que hizo el agente.

Por eso no se puede vaciar —romperia la auditoria— pero tampoco hace falta el
texto entero. `textoPersistible` guarda un extracto redactado, su huella y la
longitud original.

QUE VIGILA ESTA PRUEBA
----------------------
Que ninguna escritura a `saas_agent_runs` meta el texto crudo. No cuenta cuantas
escrituras hay hoy: exige que TODAS pasen por el minimizador, incluidas las que
todavia no existen.

POR QUE NO BASTA CON LA PRUEBA DE `textoPersistible`
-----------------------------------------------------
Esa comprueba que el minimizador funciona. Esta comprueba que se USA. Son dos
fallos distintos, y el segundo es el que de verdad ocurre: se escribe un
minimizador bueno y la siguiente ruta no lo llama.

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import io
import os
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]

# El `(?<!:)` importa: sin el, el `//` de una URL se toma por comentario.
_COMENTARIO = re.compile(r"(?<!:)//[^\n]*|/\*.*?\*/", re.S)

_TABLA = re.compile(r"\bsaas_agent_runs\b")
_ESCRIBE = re.compile(r"\b(INSERT\s+INTO\s+saas_agent_runs|UPDATE\s+saas_agent_runs)\b", re.I)
_MINIMIZA = re.compile(r"\btextoPersistible\b|\bresumenPersistible\b")

#: Columnas de texto libre. Lo que entre ahi sin minimizar es el fallo.
_COLUMNAS_LIBRES = ("input", "output")

#: Poner una columna de texto a NULL es lo CONTRARIO de guardar texto.
#:
#: La regla es «no guardes crudo lo que escribio una persona». Un modulo que
#: solo VACIA esas columnas —la retencion, que las anula a los 90 dias— cumple
#: la regla llevandola al extremo, y exigirle que pase por el minimizador seria
#: pedirle que minimice un valor que no escribe.
#:
#: La distincion se hace mirando el SQL, no el nombre del fichero: si ese mismo
#: modulo escribiera ademas un valor, dejaria de estar exento el mismo dia.
ANTES_NO_ES_PALABRA = "(?<![A-Za-z_])"
_SOLO_ANULA = re.compile(
    ANTES_NO_ES_PALABRA + r"(input|output)\s*=\s*NULL", re.I
)
_ESCRIBE_VALOR = re.compile(
    ANTES_NO_ES_PALABRA + r"(input|output)\s*=\s*(?!NULL)[^,\s]", re.I
)


def _modulos() -> list[pathlib.Path]:
    fuera: list[pathlib.Path] = []
    for raiz in (RAIZ / "backend", RAIZ / "apps" / "web" / "src"):
        for base, dirs, ficheros in os.walk(raiz):
            dirs[:] = [d for d in dirs if d not in ("node_modules", "__tests__", ".pytest_cache")]
            for f in ficheros:
                if f.endswith((".ts", ".tsx")) and ".test." not in f:
                    fuera.append(pathlib.Path(base) / f)
    return fuera


def _escritores() -> dict[str, bool]:
    """rel -> si el modulo minimiza antes de guardar."""
    fuera: dict[str, bool] = {}
    for p in _modulos():
        texto = _COMENTARIO.sub(" ", io.open(p, encoding="utf-8", errors="replace").read())
        if not _ESCRIBE.search(texto):
            continue
        rel = os.path.relpath(p, RAIZ).replace("\\", "/")
        # Un modulo que SOLO anula las columnas no guarda texto: no hay nada que
        # minimizar. Si ademas escribiera un valor, vuelve a exigirsele.
        if _SOLO_ANULA.search(texto) and not _ESCRIBE_VALOR.search(texto):
            fuera[rel] = True
            continue
        fuera[rel] = bool(_MINIMIZA.search(texto))
    return fuera


def test_el_barrido_encuentra_la_escritura():
    """CONTROL POSITIVO.

    Si el barrido dejara de encontrar escritores —tabla renombrada, ruta
    movida— la regla de abajo pasaria en verde sin mirar nada.
    """
    escritores = _escritores()
    assert escritores, (
        "no se encuentra ninguna escritura a saas_agent_runs; el barrido dejo de "
        "reconocerla y la regla de abajo seria un verde vacio"
    )


def test_ninguna_escritura_guarda_el_texto_crudo():
    """LA REGLA.

    Un secreto pegado en un prompt no puede quedarse en la base para siempre.
    """
    sin_minimizar = sorted(rel for rel, ok in _escritores().items() if not ok)
    assert not sin_minimizar, (
        "estos modulos escriben en saas_agent_runs sin pasar por "
        "`textoPersistible`, asi que guardan el texto tal cual lo escribio una "
        "persona —incluida cualquier credencial que pegara—:\n  "
        + "\n  ".join(sin_minimizar)
    )


def test_el_minimizador_sigue_existiendo_y_sigue_redactando():
    """Si desapareciera, la regla de arriba se quedaria sin alternativa que
    ofrecer y volveriamos a guardar el texto entero."""
    p = RAIZ / "backend" / "saas" / "loQuePersisteDeUnaEjecucion.ts"
    assert p.exists(), "desaparecio el minimizador de lo que se persiste"
    texto = p.read_text(encoding="utf-8")
    assert "redactar" in texto, "el minimizador dejo de redactar secretos"
    assert "TOPE_DE_VISTA_PREVIA" in texto, "el minimizador dejo de acotar"


def test_la_huella_no_es_del_texto_original():
    """La decision que mas protege, y la mas facil de deshacer sin querer.

    Una huella del ORIGINAL dejaria confirmar un secreto que ya se sospeche:
    se prueban candidatos hasta que cuadre, y los cortos caen. Tiene que
    hashearse lo YA redactado.
    """
    texto = (RAIZ / "backend" / "saas" / "loQuePersisteDeUnaEjecucion.ts").read_text(
        encoding="utf-8"
    )
    cuerpo = texto.split("export function resumenPersistible")[1]
    assert "update(redactado" in cuerpo, (
        "la huella dejo de calcularse sobre el texto redactado; asi vuelve a ser "
        "un oraculo para confirmar secretos"
    )


def test_anular_no_es_lo_mismo_que_escribir():
    """LA EXENCION, Y SU LIMITE.

    La retencion pone `input`/`output` a NULL a los 90 dias: eso no guarda texto,
    lo borra. Exigirle el minimizador seria pedirle que minimice un valor que no
    escribe.

    Pero la exencion se gana por lo que hace el SQL, no por el nombre del
    fichero: se comprueba que un modulo que anule Y ADEMAS escriba un valor
    vuelve a estar sujeto a la regla. Sin esto, cualquiera podria colar una
    escritura cruda anadiendo un `input = NULL` en otra consulta del mismo
    fichero.
    """
    assert _SOLO_ANULA.search("SET input = NULL, output = NULL")
    assert not _ESCRIBE_VALOR.search("SET input = NULL, output = NULL")
    # Un modulo que anula en una consulta y escribe crudo en otra NO esta exento.
    mixto = "UPDATE saas_agent_runs SET input = NULL ... INSERT ... input = $2"
    assert _ESCRIBE_VALOR.search(mixto), (
        "un modulo que anula en un sitio y escribe un valor en otro quedaria "
        "exento: la exencion se estaria dando por el fichero y no por el SQL"
    )

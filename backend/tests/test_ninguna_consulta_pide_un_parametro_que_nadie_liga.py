"""Toda consulta liga los parametros que pide.

EL DEFECTO QUE ENCONTRO ESTA COMPROBACION
------------------------------------------
`qr_service.py` tenia CINCO consultas rotas. Alguien reescribio el SQL para acotar
por `tenant_id = CAST(:inquilino AS uuid)` —los comentarios del fichero explican
incluso el esquema real de la migracion 416— y dejo los diccionarios de parametros
con la clave anterior, `ws`.

Resultado: crear un QR, actualizarlo, borrarlo, listar y ver sus estadisticas
LANZABAN una excepcion siempre. La funcion de codigos QR estaba entera caida.

POR QUE NADIE LO VIO
--------------------
SQLAlchemy no se queja al escribir la consulta: se queja al EJECUTARLA. Y ninguna
prueba ejecutaba esos caminos. Un fallo que solo aparece cuando lo provoca un
cliente no aparece en ningun informe: aparece en un ticket de soporte semanas
despues, descrito como «los QR no funcionan».

Es la misma clase que los seis webhooks que devolvian 401: codigo que se creia
funcionando porque nada lo ejecutaba.

POR QUE UNA COMPROBACION ESTATICA Y NO PRUEBAS DE CADA CAMINO
--------------------------------------------------------------
Escribir una prueba de integracion por cada una de las 687 llamadas no se
mantendria. Esta comprobacion las mira todas en dos segundos y encuentra
exactamente el fallo que se le escapa a una revision humana: una discrepancia
entre dos sitios que hay que leer a la vez.

No sustituye a las pruebas de comportamiento. Cubre lo que ellas no llegan a
cubrir por volumen.

EL FALSO POSITIVO QUE HUBO QUE QUITAR
--------------------------------------
La primera version marcaba `calendar_service` y `autonomous_portal_learning`,
que usan `{**otro_dict, "clave": valor}`: las claves las aporta el spread y desde
aqui no se pueden leer. Se omiten esos casos.

Un extractor que da falsos positivos se deja de mirar, y entonces tampoco se mira
cuando acierta — que es peor que no tenerlo.
"""
from __future__ import annotations

import pathlib
import re

BACKEND = pathlib.Path(__file__).resolve().parents[1]

#: `execute(text("…"), {…})` con el diccionario escrito en el sitio.
_LLAMADA = re.compile(
    r"""execute\s*\(\s*text\s*\(\s*(?P<q>(?:"""
    r'"""(?:[^"]|"(?!""))*"""'
    r"""|'''(?:[^']|'(?!''))*'''"""
    r'''|"(?:[^"\\]|\\.)*"'''
    r"""|'(?:[^'\\]|\\.)*'))\s*\)\s*,\s*(?P<p>\{[^{}]*\})""",
    re.S,
)
_PARAM = re.compile(r"(?<![:\w]):([a-zA-Z_][a-zA-Z0-9_]*)")
_CLAVE = re.compile(r"""["']([a-zA-Z_][a-zA-Z0-9_]*)["']\s*:""")


def _parametros(sql: str) -> set[str]:
    """Los `:nombre` del SQL. `::tipo` de PostgreSQL no es un parametro."""
    return set(_PARAM.findall(sql.replace("::", "\x00\x00")))


def _revisar() -> tuple[int, list[tuple[str, int, list[str], list[str]]]]:
    revisadas, fallos = 0, []
    for f in sorted(BACKEND.rglob("*.py")):
        if "tests" in f.parts or "migrations" in str(f):
            continue
        texto = f.read_text(encoding="utf-8", errors="replace")
        for m in _LLAMADA.finditer(texto):
            revisadas += 1
            crudo = m.group("p")
            if "**" in crudo:
                # Las claves llegan de un spread: no se pueden leer desde aqui.
                continue
            faltan = _parametros(m.group("q")) - set(_CLAVE.findall(crudo))
            if faltan:
                fallos.append((f.relative_to(BACKEND).as_posix(),
                               texto[:m.start()].count("\n") + 1,
                               sorted(faltan), sorted(_CLAVE.findall(crudo))))
    return revisadas, fallos


def test_el_inventario_encuentra_consultas():
    """Un patron roto daria cero consultas y un verde vacio.

    Es la trampa que ya se ha repetido varias veces en este trabajo: la ausencia
    de hallazgos y la ausencia de busqueda se ven exactamente igual desde fuera.
    """
    revisadas, _ = _revisar()
    assert revisadas >= 400, (
        f"solo se revisaron {revisadas} llamadas a `execute(text(...), {{...}})`: "
        f"el patron dejo de casar y esta comprobacion no vale")


def test_ninguna_consulta_pide_un_parametro_que_nadie_liga():
    """LA PRUEBA. Una consulta asi no falla al escribirla: falla al ejecutarla."""
    _, fallos = _revisar()
    detalle = "\n".join(
        f"  {ruta}:{linea}  falta ligar {faltan}, se pasan {dados}"
        for ruta, linea, faltan, dados in fallos)
    assert not fallos, (
        f"{len(fallos)} consultas piden un parametro que nadie liga. Lanzan una "
        f"excepcion SIEMPRE que se ejecutan, y si ninguna prueba pasa por ahi, el "
        f"fallo lo descubre un cliente:\n{detalle}")


def test_la_comprobacion_detecta_una_consulta_rota():
    """EL CONTROL. Sin esto, un extractor inerte daria cero fallos y verde.

    Se construye el caso a mano en vez de romper el codigo: una prueba que
    modifica el arbol para comprobarse a si misma deja residuos cuando falla a
    medias.
    """
    sql = '"SELECT * FROM t WHERE id = :id AND tenant_id = CAST(:inquilino AS uuid)"'
    pedidos = _parametros(sql)
    assert pedidos == {"id", "inquilino"}, pedidos
    assert pedidos - {"id", "ws"} == {"inquilino"}, (
        "el extractor no detecta el parametro que falta: seria inerte")


def test_los_dos_puntos_dobles_no_se_confunden_con_parametros():
    """El otro lado del control: `::uuid` no puede contarse como parametro.

    Si se contara, esta comprobacion marcaria como rotas casi todas las consultas
    del proyecto —PostgreSQL usa `::tipo` en todas partes— y el ruido la volveria
    inservible. Un guard que grita siempre no se lee.
    """
    assert _parametros('"SELECT x::uuid, y::int FROM t WHERE a = :a"') == {"a"}

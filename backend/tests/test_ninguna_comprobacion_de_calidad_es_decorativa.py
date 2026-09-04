"""Una comprobacion que no puede dispararse nunca no protege: adorna.

LA CLASE DE FALLO
-----------------
`MotorDeCalidad` declara 82 comprobaciones. Cada una lee unas claves concretas de
la pieza o de su contexto, y si no las encuentra devuelve «no se pudo comprobar»
— que esta bien: es honesto.

Lo que no esta bien es que NADIE produzca nunca esas claves. Entonces la
comprobacion aparece en el inventario, cuenta para el total, y no se ejecuta ni
una sola vez en toda la vida del sistema. El veredicto sale verde sin haberla
mirado, y da la sensacion contraria a la que corresponde.

SE MIDIO. De las 55 comprobaciones que leen alguna clave, ONCE no podian
dispararse jamas. Dos de ellas eran BLOQUEANTES y pedian datos que el Business
Brain ya tenia, solo que con otro nombre:

  · `respeta-lo-que-la-marca-no-hace` esperaba `loQueLaMarcaNoHace`, y el cerebro
    guarda `lo_que_la_marca_no_hace` desde siempre;
  · `no-repite-lo-que-ya-fallo` esperaba `loQueYaFallo`, y el cerebro guarda
    `historial` — «¿que habeis probado antes, y que tal fue?».

Las dos se conectaron. Quedan nueve.

QUE PASA CON LAS OCHO QUE QUEDAN
---------------------------------
Todas esperan que el AGENTE emita una FICHA: paginas, llamadas a la accion,
campos del formulario, pasos del proceso, contraste de color. El agente devuelve
prosa.

PERO NO ESTAN SIN PROBAR. `contratoDeSalidaEstructurada` define que campos son y
que comprobacion lee cada uno, y `lasOchoQueEsperabanUnaFicha` demuestra con
fixtures sinteticas que las ocho DETECTAN su fallo, que NO acusan cuando la
pieza esta bien, y que aguantan lo que un modelo devuelve de verdad: campos a
medias, tipos equivocados, listas vacias y JSON que no es un objeto.

Lo que falta no es la comprobacion: es el PRODUCTOR. Y comprobar que un modelo
real emite esa forma cuesta dinero, asi que lo bloqueado se llama
`PROVIDER_REAL_OUTPUT_VERIFICATION` y no «el subsistema».

Siguen aqui porque en produccion no se disparan, que es lo que esta bateria
mide. No porque no funcionen.

POR QUE UN TRINQUETE Y NO UNA REGLA
------------------------------------
Exigir cero seria mentir: hoy son nueve y cerrarlas cuesta dinero. Lo que si se
puede exigir es que no CREZCAN — que nadie anada una comprobacion decorativa mas
sin darse cuenta— y que las que se cierren salgan de la lista, para que el dia
que alguien desconecte el dato vuelva a saltar.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import os
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
MOTOR = RAIZ / "backend" / "calidad" / "MotorDeCalidad.ts"

_CONTENIDO = re.compile(r"p\.contenido\.([a-zA-Z_][a-zA-Z0-9_]*)")
_CONTEXTO = re.compile(r"p\.contexto\?\.([a-zA-Z_][a-zA-Z0-9_]*)")

#: Comprobaciones que HOY no pueden dispararse. Medido el 2026-09-04.
#:
#: Todas esperan una FICHA del agente, y todas estan PROBADAS con fixtures
#: sinteticas en `lasOchoQueEsperabanUnaFicha`: detectan, no acusan de mas, y
#: aguantan salidas a medias o mal tipadas.
#:
#: Lo que falta es el productor. Estan aqui porque en produccion no se disparan
#: —que es lo que esta bateria mide— y no porque no funcionen.
DECORATIVAS_DECLARADAS: dict[str, str] = {
    "canibalizacion": "espera un listado de paginas; el agente devuelve prosa",
    "cualificacion-explicada": "espera los criterios de cualificacion estructurados",
    "el-precio-no-aparece-tarde": "espera los pasos del proceso como lista ordenada",
    "empieza-por-lo-que-el-cliente-queria": "espera la primera seccion identificada",
    "formulario-pide-lo-justo": "espera los campos del formulario con su obligatoriedad",
    "gastos-de-envio-sin-sorpresas": "espera en que paso se muestran los gastos de envio",
    "se-puede-leer-lo-que-pone": "espera el contraste de color medido, que hoy nadie calcula",
    "una-idea-por-pantalla": "espera las llamadas a la accion principales, enumeradas",
}


def _comprobaciones() -> dict[str, list[str]]:
    """id de comprobacion -> claves que lee."""
    fuente = MOTOR.read_text(encoding="utf-8")
    bloques = re.split(r'\n    \{\n      id: "', fuente)
    fuera: dict[str, list[str]] = {}
    for b in bloques[1:]:
        cid = b.split('"')[0]
        claves = sorted(set(_CONTENIDO.findall(b)) | set(_CONTEXTO.findall(b)))
        if claves:
            fuera[cid] = claves
    return fuera


_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)


def _corpus() -> str:
    """Todo el backend menos el propio motor: quien PRODUCE las claves.

    SIN COMENTARIOS, y esta linea existe por un fallo propio. La primera version
    leia el fichero entero y dio por VIVA la comprobacion `canibalizacion` porque
    la palabra «paginas» aparecia en un comentario que explicaba otra cosa.

    Es el mismo error que este repositorio ya habia cazado cinco veces en otros
    detectores: un comentario no produce ninguna clave, y contarlo convierte
    cualquier explicacion en una coartada.
    """
    trozos: list[str] = []
    for base, dirs, ficheros in os.walk(RAIZ / "backend"):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "__tests__", ".pytest_cache")]
        for f in ficheros:
            # NI EL MOTOR NI EL CONTRATO cuentan como productores.
            #
            # El motor es quien LEE las claves; contarlo seria decir que se
            # produce a si mismo. Y `contratoDeSalidaEstructurada` DECLARA la
            # forma —«esto es lo que un agente tendria que emitir»— sin emitir
            # nada: es un tipo, no una salida.
            #
            # Sin esta exclusion, escribir el contrato puso las ocho en verde de
            # golpe. Declarar una forma no es producirla, igual que un comentario
            # no es codigo.
            if f in ("MotorDeCalidad.ts", "contratoDeSalidaEstructurada.ts"):
                continue
            if f.endswith((".ts", ".json")):
                try:
                    trozos.append(
                        _COMENTARIO.sub(
                            " ",
                            (pathlib.Path(base) / f).read_text(encoding="utf-8", errors="replace"),
                        )
                    )
                except OSError:
                    pass
    return "\n".join(trozos)


def _decorativas() -> list[str]:
    corpus = _corpus()
    fuera: list[str] = []
    for cid, claves in _comprobaciones().items():
        if all(not re.search(rf"\b{re.escape(k)}\b", corpus) for k in claves):
            fuera.append(cid)
    return sorted(fuera)


def test_el_barrido_encuentra_comprobaciones():
    """CONTROL POSITIVO. Cero comprobaciones seria un verde vacio."""
    c = _comprobaciones()
    assert len(c) >= 50, f"solo {len(c)} comprobaciones leen claves; el barrido no mira nada"


def test_ninguna_comprobacion_decorativa_nueva():
    """LA REGLA.

    Una comprobacion que no puede dispararse no falla: aparece en el inventario,
    cuenta para el total, y no se ejecuta nunca. El veredicto sale verde sin
    haberla mirado.
    """
    nuevas = sorted(set(_decorativas()) - set(DECORATIVAS_DECLARADAS))
    assert not nuevas, (
        "estas comprobaciones leen claves que NADIE produce, asi que no pueden "
        "dispararse jamas. O se conecta el dato, o se declara por que no:\n  "
        + "\n  ".join(nuevas)
    )


def test_lo_declarado_sigue_sin_poder_dispararse():
    """EL TRINQUETE HACIA ABAJO.

    Si una de las declaradas se conecta, hay que sacarla de la lista — porque si
    no, el dia que alguien desconecte el dato nadie se enterara.
    """
    ya_vivas = sorted(c for c in DECORATIVAS_DECLARADAS if c not in _decorativas())
    assert not ya_vivas, (
        "estas ya PUEDEN dispararse y siguen declaradas como decorativas. Sacalas "
        "de la lista para que el guardian vuelva a vigilarlas: " + str(ya_vivas)
    )


def test_las_dos_que_se_conectaron_siguen_conectadas():
    """Las dos bloqueantes que pedian datos que el cerebro ya tenia.

    Se conectaron por nombre declarado en `bloqueDeCerebro`. Si alguien quitara
    ese mapa, las dos volverian a ser decorativas y el veredicto seguiria
    saliendo verde — que es exactamente el estado del que se viene.
    """
    puente = (RAIZ / "backend" / "os-agents" / "bloqueDeCerebro.ts").read_text(encoding="utf-8")
    for clave, dimension in (
        ("loQueLaMarcaNoHace", "lo_que_la_marca_no_hace"),
        ("loQueYaFallo", "historial"),
    ):
        assert clave in puente, f"se perdio el puente hacia {clave}"
        assert dimension in puente, f"se perdio la dimension {dimension} del cerebro"


def test_las_declaraciones_explican_por_que():
    """Una lista de excepciones sin motivos deja de leerse."""
    sin_motivo = sorted(c for c, p in DECORATIVAS_DECLARADAS.items() if len(p) < 25)
    assert not sin_motivo, f"estas no explican por que no pueden dispararse: {sin_motivo}"


def test_las_ocho_siguen_teniendo_su_bateria():
    """Estan declaradas como no disparables en produccion, no como no probadas.

    Si alguien borrara la bateria de fixtures, estas ocho volverian a ser lo que
    parecian al principio —comprobaciones de las que nadie sabe si funcionan— y
    la declaracion de arriba pasaria a ser una excusa.
    """
    bateria = RAIZ / "backend" / "calidad" / "__tests__" / "lasOchoQueEsperabanUnaFicha.test.ts"
    assert bateria.exists(), "desaparecio la bateria que demuestra que las ocho funcionan"

    texto = bateria.read_text(encoding="utf-8", errors="replace")
    for cid in DECORATIVAS_DECLARADAS:
        assert cid in texto, f"{cid} ya no tiene prueba que demuestre que detecta su fallo"

    contrato = RAIZ / "backend" / "calidad" / "contratoDeSalidaEstructurada.ts"
    assert contrato.exists(), "desaparecio el contrato de la ficha"

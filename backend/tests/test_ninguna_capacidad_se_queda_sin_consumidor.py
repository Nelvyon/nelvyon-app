"""Una capacidad construida y no conectada no es una capacidad: es codigo.

CLASE DE FALLO QUE NO HABIAMOS BUSCADO
---------------------------------------
Todas las auditorias anteriores preguntaban «¿existe X?». Ninguna preguntaba
«¿lo usa alguien?». Y al preguntarlo, aparecio un patron que se repite:

  · el Business Brain (`backend/cerebro`) existe y lo consumen 12 ficheros,
    pero NINGUN agente Premium lo consulta;
  · `contextEnricher` —datos conectados del cliente y benchmarks— existe, y de
    los 29 servicios vendibles lo usan DOS;
  · `attribution/`, `ab-testing/` y `learning/` existen, y los 62 agentes de
    redes sociales no los usan;
  · `upsell/` y `advanced/` no tienen NINGUN consumidor fuera de si mismos.

Ninguno de esos es un bug: cada modulo funciona. El fallo esta en la FRONTERA,
que es donde esta bateria mira. Y es un fallo caro de un modo particular:
produce la ilusion de capacidad. El inventario dice que NELVYON mide atribucion;
el codigo dice que nadie la llama.

QUE MIDE
--------
Para cada carpeta de capacidad de `os-agents`, cuantos ficheros de FUERA la
importan. Cero consumidores externos = huerfana.

Con un trinquete en las dos direcciones: si una capacidad conectada se queda sin
consumidores, se avisa; si una huerfana gana uno, hay que quitarla de la lista y
mirar si de verdad se usa.

QUE NO MIDE
-----------
La CALIDAD de la conexion. Que `attribution/` tenga un consumidor no significa
que la atribucion funcione: significa que alguien la llama. Medir lo segundo es
otra bateria.

Tampoco acusa a un modulo por tener pocos consumidores. Un modulo con uno bien
puesto puede estar perfecto. Lo que se vigila es el CERO, y el cambio.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import collections
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
OS_AGENTS = RAIZ / "backend" / "os-agents"

_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)
_IMPORTA = re.compile(r'from\s+"([^"]+)"|import\(\s*"([^"]+)"')

#: Carpetas tematicas que representan una CAPACIDAD del producto, no utilidades.
CAPACIDADES = [
    "attribution", "ab-testing", "learning", "upsell", "benchmarks",
    "client-profile", "creative", "generative", "crm", "advanced",
    "assets", "packs", "artifacts", "healthcheck", "quality",
]

#: Capacidades SIN ningun consumidor fuera de si mismas. Medido el 2026-09-03.
#:
#: Estar aqui no es un delito: puede ser una capacidad recien construida, o una
#: que espera a que su departamento la reclame. Lo que no vale es que crezca en
#: silencio, ni que alguien la de por operativa en un inventario.
HUERFANAS_DECLARADAS: dict[str, str] = {
    "upsell": "construida, ningun servicio la invoca todavia",
    "advanced": "construida, ningun servicio la invoca todavia",
}


def _consumidores() -> collections.Counter:
    """capacidad -> cuantos ficheros de FUERA la importan."""
    cuenta: collections.Counter = collections.Counter()
    for f in (RAIZ / "backend").rglob("*.ts"):
        ruta = f.as_posix()
        if "__tests__" in ruta or "node_modules" in ruta:
            continue
        texto = _COMENTARIO.sub(" ", f.read_text(encoding="utf-8", errors="replace"))
        for a, b in _IMPORTA.findall(texto):
            spec = a or b
            for cap in CAPACIDADES:
                dentro_de_la_capacidad = f"/os-agents/{cap}/" in ruta
                apunta = (
                    f"/{cap}/" in spec
                    or spec.endswith(f"/{cap}")
                    or spec.startswith(f"./{cap}/")
                    or spec.startswith(f"../{cap}/")
                )
                if apunta and not dentro_de_la_capacidad:
                    cuenta[cap] += 1
    return cuenta


def _existentes() -> list[str]:
    return [c for c in CAPACIDADES if (OS_AGENTS / c).is_dir()]


def test_el_barrido_ve_las_capacidades():
    """Cero capacidades seria un verde vacio."""
    e = _existentes()
    assert len(e) >= 10, f"solo se encontraron {len(e)} capacidades; el barrido no mira nada"


def test_el_barrido_encuentra_consumidores_de_verdad():
    """CONTROL POSITIVO.

    Si el resolvedor de importaciones dejara de casar, TODAS saldrian huerfanas
    y la lista de abajo explotaria con falsos positivos — o, peor, alguien la
    ampliaria para callarlo y el guardian quedaria inservible.
    """
    c = _consumidores()
    conectadas = [k for k in _existentes() if c[k] > 0]
    assert len(conectadas) >= 8, (
        f"solo {len(conectadas)} capacidades tienen consumidor: el resolvedor de "
        f"importaciones dejo de casar y esto no esta midiendo nada"
    )


def test_ninguna_capacidad_nueva_se_queda_sin_consumidor():
    """LA REGLA.

    Una capacidad sin consumidores no aparece rota en ninguna prueba: sus
    propias baterias pasan. Solo se nota mirando la frontera.
    """
    c = _consumidores()
    huerfanas = sorted(k for k in _existentes() if c[k] == 0 and k not in HUERFANAS_DECLARADAS)
    assert not huerfanas, (
        f"estas capacidades no las consume nadie fuera de si mismas: {huerfanas}. "
        f"O se conectan, o se declaran con su motivo, o se retiran — pero no "
        f"pueden figurar como capacidad del producto sin que nada las llame."
    )


def test_las_huerfanas_declaradas_siguen_huerfanas():
    """Trinquete al reves: una que gana consumidor sale de la lista.

    Una lista de excepciones que conserva entradas ya resueltas deja de leerse,
    y entonces deja de proteger.
    """
    c = _consumidores()
    ya_conectadas = sorted(k for k in HUERFANAS_DECLARADAS if c[k] > 0)
    assert not ya_conectadas, (
        f"estas ya tienen consumidor y siguen declaradas huerfanas: {ya_conectadas}. "
        f"Quitalas de HUERFANAS_DECLARADAS — y comprueba antes que se USAN, no "
        f"que solo se importan."
    )

    desaparecidas = sorted(k for k in HUERFANAS_DECLARADAS if not (OS_AGENTS / k).is_dir())
    assert not desaparecidas, (
        f"estas capacidades declaradas ya no existen: {desaparecidas}. Quitalas."
    )


def test_las_capacidades_de_medicion_siguen_conectadas():
    """Las tres que cierran el bucle, por nombre.

    `attribution`, `ab-testing` y `learning` son lo que separa «hacemos trabajo»
    de «sabemos si sirvio». Si alguna se queda sin consumidor, NELVYON deja de
    poder demostrar resultados y nadie se entera hasta que un cliente pregunta.
    """
    c = _consumidores()
    for cap in ("attribution", "ab-testing", "learning"):
        if not (OS_AGENTS / cap).is_dir():
            continue
        assert c[cap] > 0, (
            f"`{cap}` se quedo sin consumidores. Es una de las tres que cierran "
            f"el bucle de resultados: sin ella, NELVYON entrega pero no mide."
        )


def test_el_detector_no_cuenta_las_importaciones_internas():
    """CONTROL. Un modulo que se importa a si mismo no esta conectado a nada.

    Sin esta distincion, toda capacidad con dos ficheros dentro pareceria tener
    consumidores y el guardian no encontraria nunca una huerfana.
    """
    c = _consumidores()
    # `upsell` tiene un solo fichero y ningun consumidor externo: si el detector
    # contara importaciones internas, o el propio fichero, no daria cero.
    if (OS_AGENTS / "upsell").is_dir():
        assert c["upsell"] == 0, (
            "el detector cuenta importaciones internas como consumidores"
        )

"""Cuanto de lo que NELVYON vende lo decide NELVYON, y cuanto lo decide el modelo.

POR QUE ESTA BATERIA EXISTE
----------------------------
Un servicio no es elite porque llame a un modelo. Si lo unico que NELVYON aporta
es sustituir el nombre del cliente y su sector en una plantilla de prompt fija,
entonces la estrategia la pone el modelo — y cualquiera con la misma API tiene el
mismo producto.

SE MIDIO, y el numero es incomodo: de los 29 agentes Premium, DOS reciben
enriquecimiento real —`Ads` y `Seo`, via `contextEnricher`: datos de Search
Console, Analytics, Meta Ads y benchmarks por industria—. Los otros 27
interpolan las palabras del cliente en una plantilla y confian el resto al
modelo.

Eso no los hace inutiles: un buen prompt con los datos del cliente produce
trabajo aprovechable. Pero es exactamente la diferencia entre «tenemos un
producto» y «tenemos un prompt», y merece estar medida en vez de suponerse.

QUE CUENTA COMO APORTACION PROPIA
----------------------------------
Que el servicio traiga a la decision algo que el modelo NO puede saber solo:

  · datos conectados del cliente (Search Console, Analytics, Ads);
  · benchmarks de industria medidos;
  · el perfil/cerebro del cliente;
  · historico medido de ese cliente;
  · reglas de sector que condicionan la salida.

NO cuenta interpolar `{industry}` o `{targetAudience}` en el prompt. Eso es
pasarle el enunciado al modelo, no razonar sobre el.

QUE NO DICE ESTA BATERIA
-------------------------
No dice que los 27 esten rotos. Dice que su diferenciacion depende enteramente
del modelo, y por tanto que su calidad es la del modelo — no la de NELVYON. Es
un dato de producto, no un fallo tecnico.

Tampoco mide la CALIDAD de la salida. Para eso esta el Quality Engine.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
AGENTES = RAIZ / "backend" / "os-agents" / "agents"

#: Lo que un servicio puede traer a la mesa y el modelo no puede inventarse.
#: Cada patron es una FUENTE de conocimiento, no una palabra bonita.
_APORTACION_PROPIA = re.compile(
    r"contextEnricher"          # datos conectados del cliente
    r"|getBenchmark|INDUSTRY_BENCHMARKS"   # benchmarks de industria medidos
    r"|buildAgentContext|AgentContext"     # el contexto compuesto
    r"|ClientProfileService|clientBrain|os_client_brain"   # el cerebro del cliente
    r"|regulacionDeSector|SECTOR_REGISTRY"                 # reglas de sector
    r"|historicoDelCliente|medicionesPrevias",             # su propio historico
)

#: Servicios que HOY traen algo propio. Solo puede CRECER.
#:
#: Medido el 2026-09-03. Subir este numero es trabajo de producto: conectar una
#: fuente real a un servicio que hoy solo interpola. Bajarlo significa que
#: alguien desconecto una fuente.
CON_APORTACION_PROPIA = {"Ads", "Seo"}


def _servicios() -> dict[str, str]:
    """nombre del servicio -> texto del agente MAS su fichero de prompts."""
    fuera: dict[str, str] = {}
    for f in sorted(AGENTES.glob("*PremiumAgent.ts")):
        if f.name == "StubPremiumAgent.ts":
            continue
        raiz = f.stem[: -len("PremiumAgent")]
        texto = f.read_text(encoding="utf-8", errors="replace")
        prompts = AGENTES / (raiz[0].lower() + raiz[1:] + "PremiumPrompts.ts")
        if prompts.exists():
            texto += prompts.read_text(encoding="utf-8", errors="replace")
        fuera[raiz] = texto
    return fuera


def test_el_barrido_encuentra_los_servicios():
    """Cero servicios seria un verde vacio."""
    s = _servicios()
    assert len(s) >= 25, f"solo {len(s)} agentes Premium; el barrido no mira nada"


def test_los_que_aportan_algo_propio_son_los_declarados():
    """El trinquete, en las DOS direcciones.

    Hacia abajo: si un servicio deja de traer su fuente, se entera alguien.
    Hacia arriba: si uno nueva la trae, hay que declararlo — y eso obliga a
    mirar si de verdad la usa o solo la importa.
    """
    medidos = {n for n, t in _servicios().items() if _APORTACION_PROPIA.search(t)}

    perdidos = sorted(CON_APORTACION_PROPIA - medidos)
    assert not perdidos, (
        f"estos servicios DEJARON de traer una fuente propia: {perdidos}. "
        f"Su diferenciacion vuelve a depender entera del modelo."
    )

    nuevos = sorted(medidos - CON_APORTACION_PROPIA)
    assert not nuevos, (
        f"estos servicios ahora traen una fuente propia y no estan declarados: "
        f"{nuevos}. Añadelos a CON_APORTACION_PROPIA — y comprueba antes que la "
        f"USAN, no que solo la importan."
    )


def test_la_proporcion_esta_medida_y_no_se_disimula():
    """El numero, escrito.

    No es una asercion de calidad: es un recordatorio de que 27 de 29 servicios
    valen lo que valga el modelo que tengan detras. El dia que esa proporcion
    mejore, esta prueba lo dira; el dia que empeore, tambien.
    """
    servicios = _servicios()
    con = {n for n, t in servicios.items() if _APORTACION_PROPIA.search(t)}
    assert len(con) == len(CON_APORTACION_PROPIA), (
        f"{len(con)} de {len(servicios)} servicios traen algo propio; "
        f"declarados {len(CON_APORTACION_PROPIA)}"
    )
    # Y que el denominador no se encoja para mejorar la foto.
    assert len(servicios) >= 29, (
        f"el catalogo bajo a {len(servicios)} servicios: si se retiraron, "
        f"la proporcion mejora sin que nada mejore"
    )


def test_el_detector_no_confunde_interpolar_con_aportar():
    """CONTROL. Es la distincion entera de esta bateria.

    Un prompt que dice `Sector: {industry}` le esta pasando el enunciado al
    modelo. Uno que consulta `getBenchmark(industria)` trae un dato que el
    modelo no tiene. Si el detector no distinguiera las dos cosas, marcaria los
    29 como «aportan algo propio» y no mediria nada.
    """
    interpola = 'const p = buildPrompt(TPL, { industry, targetAudience, tone });'
    aporta = 'const bench = getBenchmark(resolveIndustryKey(industry));'

    assert not _APORTACION_PROPIA.search(interpola), (
        "el detector cuenta interpolar una variable como aportacion propia")
    assert _APORTACION_PROPIA.search(aporta), (
        "el detector no reconoce una fuente de conocimiento real")


def test_la_fuente_que_hoy_usan_los_dos_sigue_existiendo():
    """Si `contextEnricher` desapareciera, los dos declarados dejarian de
    aportar y esta bateria tiene que enterarse por el fichero, no por el numero.
    """
    f = RAIZ / "backend" / "os-agents" / "contextEnricher.ts"
    assert f.exists(), "desaparecio `contextEnricher`, la unica fuente conectada en uso"
    fuente = f.read_text(encoding="utf-8", errors="replace")
    for pieza in ("SearchConsoleData", "AnalyticsData", "getBenchmark"):
        assert pieza in fuente, f"`contextEnricher` dejo de traer {pieza}"

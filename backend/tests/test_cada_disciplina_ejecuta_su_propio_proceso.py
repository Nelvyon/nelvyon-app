"""Cada disciplina ejecuta su proceso, y la profundidad solo puede crecer.

LO QUE SE MIDIO
---------------
Los 27 modulos de prompts tienen SEIS pasos cada uno. Esa uniformidad exacta ya
dice algo: veintisiete disciplinas con la misma profundidad de proceso no se han
disenado por separado.

Al mirar QUE hace cada paso salen dos grupos:

  · SIETE con proceso propio: web (analisis > propuesta > generacion > setup >
    checklist > informe), seo (auditoria > research > estrategia > tecnico >
    enlaces > informe), ads, social, branding, ecommerce y —desde hoy— funnel.
  · VEINTE con el mismo esqueleto: analysis > strategy > execution >
    optimization > qa > report. Cambia el prefijo de la disciplina; el proceso,
    no.

Un esqueleto comun no es un delito: hay disciplinas donde ese ciclo es el
correcto. Lo que no vale es que se de por hecho sin haberlo decidido, ni que el
numero de disciplinas con proceso propio BAJE.

EL CASO QUE LO DESTAPO
-----------------------
`FunnelPremiumAgent` importaba los seis prompts de ecommerce ENTEROS. Sus pasos
se llamaban «arquitectura de paginas del funnel» y la instruccion que llegaba al
modelo decia «arquitectura de la tienda».

Invisible desde fuera: seis pasos con nombres correctos, pipeline funcionando,
pruebas en verde. Lo unico que estaba mal era que se le pedia al modelo.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
AGENTES = RAIZ / "backend" / "os-agents" / "agents"

#: Los seis nombres del esqueleto generico.
_GENERICO = {"analysis", "strategy", "execution", "optimization", "qa", "report"}

#: Disciplinas con un proceso propio HOY. Medido el 2026-09-04.
#:
#: Solo puede CRECER. Si una sale de aqui es que alguien le ha quitado su proceso
#: y le ha puesto el esqueleto comun, y eso hay que verlo.
CON_PROCESO_PROPIO = {
    "ads",
    "branding",
    "ecommerce",
    "funnel",
    "seo",
    "socialMedia",
    "web",
}

#: Agentes que usan legitimamente los prompts de otra disciplina, con su motivo.
REUSO_LEGITIMO: dict[str, str] = {
    "Landing": "una landing ES una pagina web: comparte disciplina de QA (`web`) y "
               "el mismo proceso de analisis, propuesta, generacion y checklist",
}


def _pasos_de(fichero: pathlib.Path) -> list[str]:
    """El ultimo sustantivo del nombre de cada paso, en minuscula."""
    s = fichero.read_text(encoding="utf-8", errors="replace")
    fuera: list[str] = []
    for nombre in re.findall(r"^export function prompt([A-Za-z0-9]+)", s, re.M):
        palabras = re.findall(r"[A-Z][a-z]+", nombre)
        fuera.append(palabras[-1].lower() if palabras else nombre.lower())
    return fuera


def _disciplinas() -> dict[str, list[str]]:
    fuera: dict[str, list[str]] = {}
    for f in sorted(AGENTES.glob("*PremiumPrompts.ts")):
        fuera[f.name.replace("PremiumPrompts.ts", "")] = _pasos_de(f)
    return fuera


def _propias() -> set[str]:
    return {d for d, pasos in _disciplinas().items() if len(set(pasos) & _GENERICO) < 5}


def test_el_barrido_encuentra_disciplinas():
    """CONTROL POSITIVO. Cero disciplinas seria un verde vacio."""
    d = _disciplinas()
    assert len(d) >= 25, f"solo {len(d)} modulos de prompts; el barrido no mira nada"
    for nombre, pasos in d.items():
        assert len(pasos) >= 4, f"{nombre} solo tiene {len(pasos)} pasos"


def test_la_profundidad_de_proceso_no_retrocede():
    """EL TRINQUETE.

    Quitarle su proceso a una disciplina y dejarle el esqueleto comun no rompe
    nada: el pipeline sigue funcionando y las pruebas siguen en verde. Solo se
    nota en lo que recibe el cliente, meses despues.
    """
    perdidas = sorted(CON_PROCESO_PROPIO - _propias())
    assert not perdidas, (
        "estas disciplinas tenian un proceso propio y ahora usan el esqueleto "
        f"generico: {perdidas}"
    )


def test_lo_que_gana_proceso_propio_se_declara():
    """Hacia arriba tambien.

    Si una disciplina se disena de verdad, hay que anotarlo — si no, el dia que
    alguien se lo deshaga nadie se enterara.
    """
    nuevas = sorted(_propias() - CON_PROCESO_PROPIO)
    assert not nuevas, (
        f"estas disciplinas ya tienen proceso propio y no estan declaradas: {nuevas}. "
        f"Anadelas a CON_PROCESO_PROPIO."
    )


def test_el_detector_distingue_un_proceso_de_un_esqueleto():
    """CONTROL. Es la distincion entera de esta bateria.

    Si contara cualquier nombre como proceso propio, las veintisiete saldrian
    disenadas y no se estaria midiendo nada.
    """
    d = _disciplinas()
    assert "seo" in _propias(), "no reconoce un proceso disenado"
    genericas = set(d) - _propias()
    assert len(genericas) >= 10, (
        "casi ninguna sale como generica: el detector cuenta cualquier cosa como "
        "proceso propio"
    )


def test_ningun_agente_ejecuta_el_proceso_de_otra_disciplina():
    """LA REGLA, y viene de un caso real.

    `FunnelPremiumAgent` importaba los seis prompts de ecommerce. Un servicio de
    conversion ejecutando el proceso de montar una tienda, y desde fuera no se
    veia nada raro.
    """
    culpables: list[str] = []
    for f in sorted(AGENTES.glob("*PremiumAgent.ts")):
        if f.name == "StubPremiumAgent.ts":
            continue
        raiz = f.name.replace("PremiumAgent.ts", "")
        propio = raiz[0].lower() + raiz[1:] + "PremiumPrompts"
        texto = f.read_text(encoding="utf-8", errors="replace")
        ajenos = [
            m
            for m in re.findall(r'from "\./([a-zA-Z0-9]+PremiumPrompts)"', texto)
            if m != propio
        ]
        if ajenos and raiz not in REUSO_LEGITIMO:
            culpables.append(f"{raiz} usa {ajenos}")
    assert not culpables, (
        "estos agentes le piden al modelo el proceso de otra disciplina. O se les "
        "escribe el suyo, o se declara por que el prestado es correcto:\n  "
        + "\n  ".join(culpables)
    )


def test_los_reusos_declarados_siguen_existiendo_y_explican_por_que():
    """Una lista de excepciones con entradas muertas o sin motivo deja de leerse."""
    for raiz, motivo in REUSO_LEGITIMO.items():
        assert (AGENTES / f"{raiz}PremiumAgent.ts").exists(), f"{raiz} ya no existe"
        assert len(motivo) > 40, f"{raiz} no explica por que le vale el proceso prestado"


def test_el_ciclo_de_cro_conserva_sus_seis_llamadas():
    """La disciplina cambio; el coste, no.

    Anadir un septimo paso al embudo subiria el coste de cada trabajo un 17 %.
    Una mejora que se paga con la factura del cliente no es una mejora gratis, y
    esta bateria existe para que eso se note si alguien lo intenta.
    """
    pasos = _pasos_de(AGENTES / "funnelPremiumPrompts.ts")
    assert len(pasos) == 6, f"el embudo paso a {len(pasos)} llamadas al modelo"

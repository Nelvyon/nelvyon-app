"""El denominador del BLOQUE 3 no se puede inflar ni desinflar.

Mismo trinquete que cerro las 39 capacidades del Bloque 2, por la misma razon:
un inventario que se puede tocar convierte cualquier porcentaje en una opinion.

Vigila las DOS direcciones, que es lo que lo hace util:

  - ningun modulo huerfano: si alguien anade un agente Premium o una pieza de
    orquestacion y no la clasifica, el denominador no la incluye y su falta de
    certificacion no se echa de menos. Entraria en produccion sin que nadie lo
    notara.
  - ninguna capacidad vacia: una capacidad sin modulos detras es una linea que
    engorda el total y no corresponde a nada del producto.

Y un suelo de modulos, que no es paranoia: la primera version de la derivacion
apuntaba mal la raiz, encontro CERO modulos y reporto CERO huerfanos. Verde
perfecto sobre la nada.
"""

from __future__ import annotations

import json
from pathlib import Path

from backend.db.certificacion import capacidades_ia as inv

ESTADO = Path(inv.__file__).with_name("capacidades_ia_estado.json")

ESTADOS_VALIDOS = {
    "PASS_CERTIFIED",       # funciona y se demostro
    "FIXED_CERTIFIED",      # estaba roto, se arreglo y se demostro
    "BLOCKED_EXTERNALLY",   # necesita un tercero de pago
    "BLOCKED_ON_FOUNDER",   # necesita una decision que no es mia
    "PENDING",
}


def _capacidades() -> dict[str, dict]:
    d = json.loads(ESTADO.read_text(encoding="utf-8"))
    return d["capacidades"] if "capacidades" in d else d


def test_el_barrido_encuentra_el_arbol():
    # Cero huerfanos sobre cero modulos seria el verde mas vacio posible.
    assert len(inv.modulos()) >= 500, (
        f"solo {len(inv.modulos())} modulos: la raiz apunta mal y todo lo de "
        "abajo mediria el vacio")


def test_ningun_modulo_se_queda_sin_capacidad():
    h = inv.huerfanos()
    assert not h, (
        f"{len(h)} modulos de IA sin capacidad asignada: {h[:10]}. Lo que no "
        "esta en el inventario no se certifica y nadie lo echa de menos.")


def test_ninguna_capacidad_esta_vacia():
    vacias = [c for c, mods in inv.reparto().items() if not mods]
    assert not vacias, (
        f"capacidades sin un solo modulo detras: {vacias}. Engordan el total sin "
        "corresponder a nada del producto.")


def test_el_estado_cubre_exactamente_el_inventario():
    delderivado = set(inv.reparto())
    delfichero = set(_capacidades())
    assert delfichero == delderivado, (
        f"sobran: {sorted(delfichero - delderivado)} · "
        f"faltan: {sorted(delderivado - delfichero)}")


def test_los_estados_salen_de_un_conjunto_fijo():
    for nombre, v in _capacidades().items():
        assert v["estado"] in ESTADOS_VALIDOS, f"{nombre}: {v['estado']}"


def test_lo_certificado_cita_evidencia():
    # "Certificado" sin decir donde mirarlo no es certificado, es una afirmacion.
    sin = [n for n, v in _capacidades().items()
           if "CERTIFIED" in v["estado"] and not v.get("evidencia")]
    assert not sin, f"certificadas sin evidencia: {sin}"


def test_lo_bloqueado_dice_por_que():
    sin = [n for n, v in _capacidades().items()
           if "BLOCKED" in v["estado"] and not v.get("motivo")]
    assert not sin, f"bloqueadas sin motivo: {sin}"


def test_el_contador_cuadra():
    caps = _capacidades()
    cert = sum(1 for v in caps.values() if "CERTIFIED" in v["estado"])
    blo = sum(1 for v in caps.values() if "BLOCKED" in v["estado"])
    pen = sum(1 for v in caps.values() if v["estado"] == "PENDING")
    assert cert + blo + pen == len(caps) == len(inv.reparto())


def test_los_servicios_que_se_venden_estan_todos():
    # Los agentes Premium son lo que NELVYON cobra. Si el mapa dejara de
    # derivarlos, desaparecerian del denominador sin que nadie lo notara.
    servicios = [c for c, f in inv.familias().items() if f == "SERVICIO"]
    assert len(servicios) >= 25, f"solo {len(servicios)} servicios derivados"
    for imprescindible in ("servicio_seo", "servicio_social_media",
                           "servicio_contenido_copywriting", "servicio_ads",
                           "servicio_reputacion_orm", "servicio_web"):
        assert imprescindible in servicios, imprescindible

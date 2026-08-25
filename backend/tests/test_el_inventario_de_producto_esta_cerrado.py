"""El denominador del BLOQUE 5 no se puede inflar ni desinflar.

Cuarto trinquete del mismo tipo. Los tres anteriores midieron lo que el sistema
hace por dentro; este cubre lo que el cliente VE, que es lo unico comparable con
un referente del mercado.

Vigila las dos direcciones y lleva suelo minimo, porque cero huerfanas sobre cero
areas es el verde mas vacio posible - ya paso una vez en el Bloque 3, cuando la
raiz apuntaba mal y el guardian dijo que todo estaba bien.
"""

from __future__ import annotations

import json
from pathlib import Path

from backend.db.certificacion import capacidades_producto as inv

ESTADO = Path(inv.__file__).with_name("capacidades_producto_estado.json")

ESTADOS_VALIDOS = {
    "SUPERIOR_CERTIFIED",   # mejor que el referente en un criterio VERIFICABLE
    "EQUAL_CERTIFIED",      # paridad demostrada
    "PASS_CERTIFIED",       # cumple el estandar objetivo medido
    "FIXED_CERTIFIED",      # habia defecto, se corrigio y se volvio a medir
    "BLOCKED_EXTERNAL",     # depende de dinero, produccion o del fundador
    "PENDING",
}


def _capacidades() -> dict[str, dict]:
    return json.loads(ESTADO.read_text(encoding="utf-8"))["capacidades"]


def test_el_barrido_encuentra_el_arbol():
    assert len(inv.areas()) >= 40, (
        f"solo {len(inv.areas())} areas de producto: la raiz apunta mal y todo "
        "lo de abajo mediria el vacio"
    )


def test_ninguna_area_se_queda_sin_categoria():
    h = inv.huerfanas()
    assert not h, (
        f"{len(h)} areas de producto sin categoria: {h[:10]}. Lo que no esta en "
        "el inventario no se audita y nadie lo echa de menos."
    )


def test_ninguna_categoria_esta_vacia():
    vacias = [c for c, a in inv.reparto().items() if not a]
    assert not vacias, f"categorias sin un area detras: {vacias}"


def test_el_estado_cubre_exactamente_el_inventario():
    delderivado = set(inv.reparto())
    delfichero = set(_capacidades())
    assert delfichero == delderivado, (
        f"sobran: {sorted(delfichero - delderivado)} · "
        f"faltan: {sorted(delderivado - delfichero)}"
    )


def test_los_estados_salen_de_un_conjunto_fijo():
    for nombre, v in _capacidades().items():
        assert v["estado"] in ESTADOS_VALIDOS, f"{nombre}: {v['estado']}"


def test_una_afirmacion_de_superioridad_cita_evidencia_y_referente():
    # `SUPERIOR` es la palabra mas facil de escribir y la mas cara de sostener.
    # No se admite sin decir CONTRA QUE y CON QUE MEDIDA.
    flojas = [
        n for n, v in _capacidades().items()
        if v["estado"] in {"SUPERIOR_CERTIFIED", "EQUAL_CERTIFIED"}
        and not (v.get("evidencia") and v.get("referentes"))
    ]
    assert not flojas, f"afirman paridad o superioridad sin evidencia o referente: {flojas}"


def test_lo_certificado_cita_evidencia():
    sin = [n for n, v in _capacidades().items()
           if "CERTIFIED" in v["estado"] and not v.get("evidencia")]
    assert not sin, f"certificadas sin evidencia: {sin}"


def test_lo_bloqueado_dice_por_que():
    sin = [n for n, v in _capacidades().items()
           if "BLOCKED" in v["estado"] and not v.get("veredicto")]
    assert not sin, f"bloqueadas sin motivo: {sin}"


def test_el_contador_cuadra():
    caps = _capacidades()
    cert = sum(1 for v in caps.values() if "CERTIFIED" in v["estado"])
    blo = sum(1 for v in caps.values() if "BLOCKED" in v["estado"])
    pen = sum(1 for v in caps.values() if v["estado"] == "PENDING")
    assert cert + blo + pen == len(caps) == len(inv.reparto())

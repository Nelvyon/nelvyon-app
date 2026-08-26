"""El denominador del BLOQUE 6 no se puede inflar ni desinflar.

Quinto trinquete del mismo tipo. Este cubre la **maquinaria de ejecución
autónoma**: lo que hace que NELVYON pueda funcionar solo durante mucho rato sin
que nadie mire.

Vigila las dos direcciones y lleva suelo mínimo, porque cero huérfanos sobre
cero módulos es el verde más vacío posible — ya pasó una vez en el Bloque 3,
cuando la raíz apuntaba mal y el guardián dijo que todo estaba bien.

Y vigila algo que los anteriores no necesitaban: que una capacidad certificada
**declare su inyección de fallo**. En un bloque sobre resiliencia, decir «pasa»
sin haber roto nada no significa nada.
"""

from __future__ import annotations

import json
from pathlib import Path

from backend.db.certificacion import capacidades_operacionales as inv

ESTADO = Path(inv.__file__).with_name("capacidades_operacionales_estado.json")

ESTADOS_VALIDOS = {
    "PASS_CERTIFIED",          # la propiedad se sostuvo bajo el fallo inducido
    "FIXED_CERTIFIED",         # había defecto, se corrigió y se volvió a romper
    "BLOCKED_HUMAN_DECISION",  # depende de una decisión del propietario
    "PENDING",
}


def _capacidades() -> dict[str, dict]:
    return json.loads(ESTADO.read_text(encoding="utf-8"))["capacidades"]


def test_el_barrido_encuentra_la_maquinaria():
    assert len(inv.modulos()) >= 40, (
        f"solo {len(inv.modulos())} modulos operacionales: la raiz apunta mal y "
        "todo lo de abajo mediria el vacio"
    )


def test_ningun_modulo_operacional_se_queda_sin_categoria():
    h = inv.huerfanos()
    assert not h, (
        f"{len(h)} modulos de maquinaria sin categoria: {h[:10]}. Lo que no esta "
        "en el inventario no se audita y nadie lo echa de menos."
    )


def test_ninguna_categoria_esta_vacia():
    vacias = [c for c, m in inv.reparto().items() if not m]
    assert not vacias, f"categorias sin un modulo detras: {vacias}"


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


def test_lo_certificado_cita_evidencia():
    sin = [n for n, v in _capacidades().items()
           if "CERTIFIED" in v["estado"] and not v.get("evidencia")]
    assert not sin, f"certificadas sin evidencia: {sin}"


def test_lo_certificado_declara_que_rompio_para_comprobarlo():
    """El trinquete propio de este bloque.

    En un bloque sobre resiliencia, «pasa» sin haber roto nada es una opinión.
    Una capacidad certificada tiene que decir QUÉ fallo se indujo y qué prueba
    cayó al inducirlo: sin eso, la defensa podría no estar siquiera alcanzándose.
    """
    sin = [n for n, v in _capacidades().items()
           if "CERTIFIED" in v["estado"] and not v.get("fault_injection")]
    assert not sin, (
        f"certificadas sin declarar el fallo inducido: {sin}. Un verde que nunca "
        "se ha puesto rojo a proposito no certifica ninguna defensa."
    )


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

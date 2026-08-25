"""El denominador del BLOQUE 4 no se puede inflar ni desinflar.

Tercer trinquete del mismo tipo, y a estas alturas ya no es precaucion: es lo
unico que hace que un porcentaje signifique algo. En el Bloque 2 el inventario
se derivo de 922 rutas, en el 3 de 2224 modulos de IA, y aqui de los 104 modulos
de operacion real.

Vigila las DOS direcciones:

  - ningun modulo huerfano: si alguien anade un webhook, una cola o una
    integracion y no la clasifica, el denominador no la incluye y su falta de
    certificacion no se echa de menos. Entraria en produccion sin que nadie lo
    notara — y en este bloque «produccion» significa que alguien de fuera le
    habla.
  - ninguna capacidad vacia: una linea que engorda el total sin corresponder a
    nada del producto.

Y un suelo de modulos, porque cero huerfanos sobre cero modulos es el verde mas
vacio posible. Ya paso una vez en el Bloque 3: la raiz apuntaba mal, el barrido
encontro cero y el guardian dijo que todo estaba bien.
"""

from __future__ import annotations

import json
from pathlib import Path

from backend.db.certificacion import capacidades_operacion as inv

ESTADO = Path(inv.__file__).with_name("capacidades_operacion_estado.json")

ESTADOS_VALIDOS = {
    "PASS_CERTIFIED",
    "FIXED_CERTIFIED",
    "BLOCKED_EXTERNALLY",
    "BLOCKED_ON_FOUNDER",
    "PENDING",
}


def _capacidades() -> dict[str, dict]:
    return json.loads(ESTADO.read_text(encoding="utf-8"))["capacidades"]


def test_el_barrido_encuentra_el_arbol():
    assert len(inv.modulos()) >= 50, (
        f"solo {len(inv.modulos())} modulos: la raiz apunta mal y todo lo de "
        "abajo mediria el vacio"
    )


def test_ningun_modulo_se_queda_sin_capacidad():
    h = inv.huerfanos()
    assert not h, (
        f"{len(h)} modulos de operacion sin capacidad asignada: {h[:10]}. Lo que "
        "no esta en el inventario no se certifica y nadie lo echa de menos."
    )


def test_ninguna_capacidad_esta_vacia():
    vacias = [c for c, mods in inv.reparto().items() if not mods]
    assert not vacias, (
        f"capacidades sin un solo modulo detras: {vacias}. Engordan el total sin "
        "corresponder a nada del producto."
    )


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


def test_las_superficies_de_entrada_estan_todas():
    # Los webhooks son por donde entra lo que NELVYON no controla. Si el mapa
    # dejara de derivarlos, desaparecerian del denominador sin que nadie lo note.
    entrada = [c for c, f in inv.familias().items() if f == "ENTRADA"]
    assert len(entrada) >= 4, f"solo {len(entrada)} superficies de entrada"
    for imprescindible in ("webhooks_de_pago", "idempotencia_y_fallidos"):
        assert imprescindible in entrada, imprescindible

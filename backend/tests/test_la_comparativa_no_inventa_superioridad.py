"""BLOQUE 5 · FASE B — la comparativa no puede inventarse una superioridad.

La instruccion del fundador fue literal: **prohibido inventar superioridad**, y
en concreto «no declares SUPERIOR_CERTIFIED ni EQUAL_CERTIFIED cuando solo
exista documentacion del competidor».

Una nota en un documento no impide nada: dentro de seis meses alguien escribe
«SUPERIOR» en un JSON porque le parece evidente, y nadie lo nota. Este fichero
convierte esa instruccion en algo que **falla**.

La regla es la que hace falta y ninguna mas: para afirmar SUPERIOR o EQUAL en un
criterio hay que tener **la misma medida tomada en los dos lados**. Y medir el
producto de un tercero exige una cuenta suya —casi siempre de pago—, datos
reales y tocar sistemas ajenos. Las tres cosas estan prohibidas en este bloque,
asi que la consecuencia honesta es incomoda y hay que decirla: **ninguna
categoria puede declarar superioridad hoy**.

Lo que si se afirma es la calidad PROPIA medida. Eso tiene numeros detras.
"""

from __future__ import annotations

import json

import pytest

from backend.db.certificacion import benchmark_mercado as bm
from backend.db.certificacion import capacidades_producto as inv


@pytest.fixture(scope="module")
def cats() -> dict:
    return bm.categorias()


def test_la_comparativa_cubre_exactamente_el_inventario(cats):
    # Una categoria del producto sin fila en la comparativa es una que nadie
    # comparo y de la que nadie echa nada de menos.
    assert set(cats) == set(inv.reparto())


def test_las_clases_de_evidencia_salen_de_un_conjunto_fijo(cats):
    for nombre, v in cats.items():
        assert v["clase_nelvyon"] in bm.CLASES, f"{nombre}: {v['clase_nelvyon']}"
        assert v["clase_referente"] in bm.CLASES, f"{nombre}: {v['clase_referente']}"


def test_los_veredictos_salen_de_un_conjunto_fijo(cats):
    for nombre, v in cats.items():
        assert v["veredicto"] in bm.VEREDICTOS, f"{nombre}: {v['veredicto']}"


def test_nadie_afirma_superioridad_sin_medir_al_referente(cats):
    """El guardian principal.

    `SUPERIOR` y `EQUAL` exigen `MEASURED` en los DOS lados. Con documentacion
    del competidor no se sostiene ninguna de las dos, por convincente que suene.
    """
    flojas = [
        n for n, v in cats.items()
        if v["veredicto"] in ("SUPERIOR", "EQUAL")
        and v["clase_referente"] not in bm.CLASES_COMPARABLES
    ]
    assert not flojas, (
        f"afirman superioridad o paridad sin medir al referente: {flojas}. "
        "Documentacion del fabricante no es una medida."
    )


def test_toda_afirmacion_de_superioridad_nombra_criterio_y_referente(cats):
    incompletas = [
        n for n, v in cats.items()
        if v["veredicto"] in ("SUPERIOR", "EQUAL")
        and not (v.get("criterio") and v.get("referentes"))
    ]
    assert not incompletas, f"superioridad sin criterio o sin referente: {incompletas}"


def test_lo_no_comparable_dice_por_que(cats):
    sin = [
        n for n, v in cats.items()
        if v["clase_referente"] == "NOT_COMPARABLE" and not v.get("limite")
    ]
    assert not sin, (
        f"declaradas no comparables sin explicar por que: {sin}. «No comparable» "
        "sin motivo es una excusa, no un resultado."
    )


def test_toda_categoria_registra_su_limite(cats):
    sin = [n for n, v in cats.items() if not v.get("limite")]
    assert not sin, f"sin limitacion declarada: {sin}"


def test_lo_medido_en_nelvyon_lleva_su_numero(cats):
    """`MEASURED` sin el numero detras es una palabra, no una medida."""
    for nombre, v in cats.items():
        if v["clase_nelvyon"] != "MEASURED":
            continue
        m = v.get("medida_nelvyon")
        assert m, f"{nombre}: dice MEASURED y no adjunta medida"
        assert m["pantallas"] > 0, f"{nombre}: dice MEASURED sobre 0 pantallas"
        assert m.get("herramientas"), f"{nombre}: no dice con que se midio"


def test_el_estado_del_fichero_coincide_con_su_derivacion():
    # El fichero es GENERADO. Si alguien lo edita a mano para poner un veredicto
    # mas favorable, deja de coincidir con `construir()` y esto se pone rojo.
    guardado = bm.estado()
    actual = bm.construir()
    assert json.dumps(guardado, sort_keys=True) == json.dumps(actual, sort_keys=True), (
        "benchmark_mercado_estado.json no coincide con su derivacion. "
        "Regenera con: python -m backend.db.certificacion.benchmark_mercado --escribir"
    )


def test_el_veredicto_es_una_funcion_de_las_clases():
    """La derivacion misma: no hay rama que devuelva SUPERIOR sin las dos medidas."""
    assert bm._veredicto("MEASURED", "DOCUMENTED") == "PROPIA_MEDIDA"
    assert bm._veredicto("MEASURED", "OBSERVED") == "PROPIA_MEDIDA"
    assert bm._veredicto("MEASURED", "SIMULATED") == "PROPIA_MEDIDA"
    assert bm._veredicto("MEASURED", "NOT_COMPARABLE") == "SIN_COMPARAR"
    assert bm._veredicto("DOCUMENTED", "MEASURED") == "SIN_COMPARAR"
    assert bm._veredicto("SIMULATED", "SIMULATED") == "SIN_COMPARAR"
    # La UNICA combinacion que abre la puerta a SUPERIOR.
    assert bm._veredicto("MEASURED", "MEASURED") == "SUPERIOR"


def test_hoy_no_hay_ni_una_superioridad_declarada(cats):
    """El resultado honesto de este bloque, escrito para que se note si cambia.

    No es una limitacion tecnica que se pueda sortear con mas trabajo: medir a
    un tercero exige su cuenta, coste externo y datos reales. Si algun dia se
    autoriza esa medida, este test se pondra rojo y habra que venir a cambiarlo
    A PROPOSITO, con la evidencia delante.
    """
    afirmadas = [n for n, v in cats.items() if v["veredicto"] in ("SUPERIOR", "EQUAL")]
    assert not afirmadas, (
        f"alguien declaro superioridad en {afirmadas}. Si es real, hara falta la "
        "medida del referente tomada igual, y este test tendra que actualizarse "
        "con ella delante."
    )

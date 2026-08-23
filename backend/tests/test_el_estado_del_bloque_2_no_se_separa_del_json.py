"""`docs/BLOQUE_2_ESTADO.md` tiene que decir lo mismo que el JSON de capacidades.

El documento ya declaraba que su fuente era `capacidades_estado.json`, pero eso
era una promesa sin nadie detras: se editaba a mano y se quedo atras. Llego a
anunciar "14/39 certificadas · 24 pendientes" mientras el JSON decia 38 y 0.

Un resumen desactualizado es peor que ninguno: se lee con la misma confianza y
manda al lector en la direccion contraria. Este guardian lo convierte en un
fallo de suite en vez de en una sorpresa.
"""

from __future__ import annotations

from backend.db.certificacion import estado_bloque2


def test_el_documento_coincide_con_el_json():
    esperado = estado_bloque2.texto()
    real = estado_bloque2.DOCUMENTO.read_text(encoding="utf-8")
    assert real == esperado, (
        "docs/BLOQUE_2_ESTADO.md no coincide con capacidades_estado.json. "
        "Regeneralo: python -m backend.db.certificacion.estado_bloque2"
    )


def test_el_generador_produce_algo_y_no_una_pagina_vacia():
    # Sin esto, un generador roto que devolviera "" haria pasar la comparacion
    # de arriba en cuanto alguien guardara el fichero vacio.
    t = estado_bloque2.texto()
    assert "BLOQUE 2" in t
    cert, blo, pen = estado_bloque2.reparto()
    assert len(cert) + len(blo) + len(pen) == 39


def test_el_contador_del_documento_es_el_del_json():
    # El numero que se lee de un vistazo es el que mas facil se queda atras.
    cert, blo, pen = estado_bloque2.reparto()
    t = estado_bloque2.texto()
    assert f"**{len(cert)}/39 certificadas" in t
    assert f"{len(cert)} + {len(blo)} + {len(pen)} = 39" in t

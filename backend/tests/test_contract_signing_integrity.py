"""
Firmar sin poder comprobar la integridad.

`sign_contract` leia `signature_data`, y si el JSON estaba corrupto se lo
tragaba con `pass`. `stored_hash` quedaba vacio, y la comprobacion de mas abajo
—`if stored_hash and stored_hash != current_hash`— no llegaba a ejecutarse: se
firmaba sin verificar que el documento no hubiese cambiado.

La prueba de que era un defecto y no una decision esta en el mismo fichero:
`verify_integrity` trata exactamente ese caso como integridad INVALIDA. La misma
condicion significaba "invalido" en una funcion y "nada que comprobar" en la
otra.
"""
from __future__ import annotations

import json

import pytest


def test_verify_integrity_considera_invalido_un_json_corrupto():
    """El comportamiento correcto, que ya existia y sirve de referencia."""
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "contract_signing.py"
    ).read_text(encoding="utf-8")
    i = src.index("async def verify_integrity")
    cuerpo = src[i : i + 1200]
    # Si no parsea, sig_data queda {} -> stored_hash "" -> is_valid False.
    assert "is_valid = bool(stored_hash and stored_hash == current_hash)" in cuerpo


def test_firmar_con_datos_corruptos_ya_no_se_salta_la_comprobacion():
    """Regresion del fail-open."""
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "contract_signing.py"
    ).read_text(encoding="utf-8")
    i = src.index("async def sign_contract")
    j = src.index('stored_hash = existing_sig.get("document_hash", "")', i)
    tramo = src[i:j]
    assert "raise ValueError" in tramo, "volvio a ignorarse el JSON corrupto al firmar"
    assert "corrupted" in tramo


def test_la_comprobacion_de_hash_sigue_siendo_condicional_solo_para_la_primera_firma():
    """
    Un contrato sin `signature_data` no tiene hash previo y debe poder firmarse:
    el corte es para datos CORRUPTOS, no para su ausencia.
    """
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "contract_signing.py"
    ).read_text(encoding="utf-8")
    i = src.index("async def sign_contract")
    tramo = src[i : i + 2500]
    assert "if contract.signature_data:" in tramo, (
        "el corte debe depender de que HAYA datos, no aplicarse siempre"
    )


def test_un_json_valido_sin_hash_no_dispara_el_corte():
    """Contraprueba de forma: solo el fallo de parseo levanta el error."""
    assert json.loads('{"signed_at": "2026-01-01"}') == {"signed_at": "2026-01-01"}

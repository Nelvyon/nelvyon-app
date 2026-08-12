"""
Sin clave configurada no se cifra: no hay una por defecto en el codigo.

HALLAZGO: `core/mask_crypto.py` traia un literal usado como clave cuando
`MASK_KEY` no estaba puesta. Ese modulo cifra los tokens OAuth de las cuentas
sociales de los clientes (`services/social_token_crypto.py`), asi que un
despliegue sin la variable los cifraba con una clave PUBLICADA en el
repositorio — equivalente a guardarlos en claro para cualquiera con acceso al
codigo, y sin ningun sintoma que lo delatase.

Segundo defecto en el mismo camino: `decrypt_token` capturaba el fallo y
devolvia el texto CIFRADO como si fuera el valor cuando no habia clave. Quien
llamase usaria eso como token.
"""
from __future__ import annotations

import pytest

from core import mask_crypto


@pytest.fixture
def sin_clave(monkeypatch):
    for nombre in ("MASK_KEY", "SOCIAL_TOKEN_ENCRYPTION_KEY"):
        monkeypatch.delenv(nombre, raising=False)


@pytest.fixture
def con_clave(monkeypatch):
    monkeypatch.setenv("MASK_KEY", "clave-de-prueba-no-secreta")


def test_sin_clave_no_se_cifra(sin_clave):
    """La propiedad central: cortar, no usar una clave del codigo."""
    with pytest.raises(RuntimeError, match="not configured"):
        mask_crypto.encrypt_text("token-del-cliente")


def test_sin_clave_no_se_descifra(sin_clave):
    with pytest.raises(RuntimeError, match="not configured"):
        mask_crypto.decrypt_text("gAAAAA-lo-que-sea")


def test_con_clave_el_ciclo_completo_funciona(con_clave):
    """Contraprueba: el modulo no esta simplemente roto."""
    cifrado = mask_crypto.encrypt_text("token-del-cliente")
    assert cifrado != "token-del-cliente"
    assert mask_crypto.decrypt_text(cifrado) == "token-del-cliente"


def test_dos_claves_distintas_no_se_descifran_entre_si(monkeypatch):
    """Si la clave no influyese, cifrar no serviria de nada."""
    monkeypatch.setenv("MASK_KEY", "clave-uno")
    cifrado = mask_crypto.encrypt_text("secreto")
    monkeypatch.setenv("MASK_KEY", "clave-dos")
    with pytest.raises(Exception):
        mask_crypto.decrypt_text(cifrado)


def test_no_queda_ninguna_clave_literal_en_el_modulo():
    """Regresion: reintroducir un literal devolveria el agujero entero."""
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "core" / "mask_crypto.py").read_text(
        encoding="utf-8"
    )
    import ast as _ast

    arbol = _ast.parse(src)
    for n in _ast.walk(arbol):
        if isinstance(n, _ast.Assign):
            for t in n.targets:
                if isinstance(t, _ast.Name) and "secret" in t.id.lower():
                    assert not isinstance(n.value, _ast.Constant), (
                        f"volvio una clave literal en {t.id}")
    # Y ninguna llamada a getenv con segundo argumento (valor por defecto).
    for n in _ast.walk(arbol):
        if isinstance(n, _ast.Call) and isinstance(n.func, _ast.Attribute):
            if n.func.attr == "get" and len(n.args) > 1:
                literal = n.args[0]
                if isinstance(literal, _ast.Constant) and "KEY" in str(literal.value):
                    pytest.fail("volvio un valor por defecto para la clave")


def test_el_descifrado_no_devuelve_el_texto_cifrado_como_valor(con_clave):
    """
    El fail-open de `decrypt_token`: devolver el cifrado como si fuera el token
    hacia que el proveedor recibiese basura, o que se reguardase corrupto.
    """
    from services.social_token_crypto import decrypt_token

    with pytest.raises(Exception):
        decrypt_token("esto-no-es-un-cifrado-valido")


def test_valores_vacios_siguen_pasando_sin_clave(sin_clave):
    """No romper el caso trivial: no hay nada que cifrar."""
    from services.social_token_crypto import decrypt_token, encrypt_token

    assert encrypt_token(None) is None
    assert encrypt_token("") is None
    assert decrypt_token(None) is None

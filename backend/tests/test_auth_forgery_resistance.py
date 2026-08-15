"""
Intentos clasicos de falsificacion de JWT.

`test_auth.py` ya cubre caducado, invalido, manipulado y presencia de `exp`.
Falta lo que un atacante intenta de verdad, y que no produce ningun error
visible si funciona: firmar con `alg: none`, firmar con OTRO secreto, y usar un
token todavia no valido.

Se comprueba tambien que el puente exija un secreto suficientemente largo: con
uno corto, la firma deja de ser una barrera real.
"""
from __future__ import annotations

import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from core.auth import AccessTokenError, create_access_token, decode_access_token


def _sin_firma(claims: dict) -> str:
    """Token con `alg: none` y firma vacia: la falsificacion mas simple."""
    def b64(d):
        return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()

    return f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64(claims)}."


def test_un_token_sin_firma_no_se_acepta(monkeypatch):
    """Si esto pasase, cualquiera se emitiria un super_admin."""
    monkeypatch.setenv("JWT_SECRET_KEY", "secreto-de-prueba-suficientemente-largo-1234")
    falso = _sin_firma({"sub": "atacante", "role": "super_admin"})
    with pytest.raises(AccessTokenError):
        decode_access_token(falso)


def test_un_token_firmado_con_otro_secreto_no_se_acepta(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "secreto-de-prueba-suficientemente-largo-1234")
    ajeno = jwt.encode(
        {
            "sub": "atacante",
            "role": "super_admin",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        "otro-secreto-completamente-distinto",
        algorithm="HS256",
    )
    with pytest.raises(AccessTokenError):
        decode_access_token(ajeno)


def test_un_token_aun_no_valido_no_se_acepta(monkeypatch):
    """`nbf` en el futuro: un token emitido por adelantado no vale todavia."""
    monkeypatch.setenv("JWT_SECRET_KEY", "secreto-de-prueba-suficientemente-largo-1234")
    futuro = datetime.now(timezone.utc) + timedelta(hours=2)
    token = jwt.encode(
        {"sub": "u", "nbf": futuro, "exp": futuro + timedelta(hours=1)},
        "secreto-de-prueba-suficientemente-largo-1234",
        algorithm="HS256",
    )
    with pytest.raises(AccessTokenError):
        decode_access_token(token)


def test_un_token_legitimo_si_se_acepta(monkeypatch):
    """Contraprueba: los rechazos no vienen de un decodificador roto."""
    monkeypatch.setenv("JWT_SECRET_KEY", "secreto-de-prueba-suficientemente-largo-1234")
    token = create_access_token({"sub": "u", "role": "user"})
    assert decode_access_token(token)["sub"] == "u"


def test_el_token_lleva_las_tres_marcas_de_tiempo(monkeypatch):
    """Sin `nbf` e `iat` no se puede razonar sobre la ventana del token."""
    monkeypatch.setenv("JWT_SECRET_KEY", "secreto-de-prueba-suficientemente-largo-1234")
    payload = decode_access_token(create_access_token({"sub": "u"}))
    for marca in ("exp", "iat", "nbf"):
        assert marca in payload, f"falta {marca}"


@pytest.mark.parametrize("secreto", ["", "corto", "x" * 31])
def test_el_puente_rechaza_un_secreto_demasiado_corto(monkeypatch, secreto):
    """Con un secreto corto la firma deja de ser una barrera."""
    from core.nelvyon_jwt import _nelvyon_jwt_secret

    monkeypatch.setenv("JWT_SECRET", secreto)
    monkeypatch.setenv("JWT_SECRET_KEY", secreto)
    assert _nelvyon_jwt_secret() is None


def test_el_puente_acepta_un_secreto_de_longitud_suficiente(monkeypatch):
    from core.nelvyon_jwt import _nelvyon_jwt_secret

    monkeypatch.setenv("JWT_SECRET", "y" * 32)
    assert _nelvyon_jwt_secret() == "y" * 32

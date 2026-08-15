"""Un token valido del BFF no genera avisos, y uno invalido si.

EL FALLO QUE ESTO IMPIDE
------------------------
Produccion registraba `Token validation failed: JWTError` a mansalva: 176 en una
ventana de logs y 92 en la siguiente, todos de peticiones perfectamente
autenticadas que el producto servia sin problema.

NELVYON valida dos clases de JWT:

    nativo de FastAPI   JWT_SECRET_KEY   core.auth.decode_access_token
    emitido por el BFF  JWT_SECRET       core.nelvyon_jwt

`get_current_user` prueba la primera y, si no encaja, la segunda. Como casi todo
el trafico real llega con la del BFF, ese primer fallo es el paso NORMAL de casi
cualquier peticion legitima. Registrarlo como aviso describia mal lo que pasaba
—parecia haber credenciales invalidas donde habia usuarios validos— y enterraba
los avisos de verdad bajo el ruido.

NO ES BAJAR EL VOLUMEN
----------------------
El rechazo real —cuando fallan los DOS esquemas— sigue dejando aviso, y lo emite
quien sabe que ya no queda nada por probar. Este fichero comprueba las dos caras:
que el caso normal calla y que el rechazo habla. Sin la segunda mitad, esto seria
exactamente lo que no se debe hacer: silenciar un fallo.
"""
from __future__ import annotations

import logging

import pytest
from jose import jwt

from core.auth import AccessTokenError, decode_access_token

SECRETO_FASTAPI = "clave-nativa-de-prueba-con-longitud-mas-que-suficiente"
SECRETO_BFF = "clave-del-bff-de-prueba-con-longitud-mas-que-suficiente-32"


@pytest.fixture(autouse=True)
def _entorno(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRETO_FASTAPI)
    monkeypatch.setenv("JWT_SECRET", SECRETO_BFF)
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")


def test_el_token_del_bff_no_deja_aviso_al_fallar_el_primer_esquema(caplog):
    """EL ruido. Antes cada peticion legitima del BFF dejaba un WARNING."""
    token_bff = jwt.encode(
        {"userId": "u-1", "email": "u@nelvyon.test"}, SECRETO_BFF, algorithm="HS256"
    )
    with caplog.at_level(logging.DEBUG, logger="core.auth"):
        with pytest.raises(AccessTokenError):
            decode_access_token(token_bff)

    avisos = [r for r in caplog.records if r.levelno >= logging.WARNING]
    assert not avisos, (
        "el paso normal de un token del BFF sigue generando aviso: "
        f"{[r.getMessage() for r in avisos]}"
    )
    # y sigue quedando rastro para depurar, en el nivel que le corresponde
    assert any("Token validation failed" in r.getMessage() for r in caplog.records)


def test_el_token_del_bff_si_valida_por_su_via(caplog):
    """Control positivo: el token que no encaja aqui SI es valido en la otra via.

    Sin esto, el test anterior pasaria igual con un token basura y no probaria
    que estamos callando el caso legitimo.
    """
    from core.nelvyon_jwt import try_decode_nelvyon_app_token

    token_bff = jwt.encode(
        {"userId": "u-1", "email": "u@nelvyon.test"}, SECRETO_BFF, algorithm="HS256"
    )
    assert try_decode_nelvyon_app_token(token_bff) is not None


def test_un_token_caducado_sigue_dejando_rastro(caplog):
    """Un caducado no es ruido: es informacion util y se conserva."""
    import time

    caducado = jwt.encode(
        {"sub": "u-1", "exp": int(time.time()) - 3600}, SECRETO_FASTAPI, algorithm="HS256"
    )
    with caplog.at_level(logging.INFO, logger="core.auth"):
        with pytest.raises(AccessTokenError):
            decode_access_token(caducado)
    assert any("expired" in r.getMessage().lower() for r in caplog.records)


def test_el_rechazo_real_sigue_avisando():
    """La otra mitad, y la que impide que esto sea un silenciador.

    Cuando fallan los DOS esquemas, quien lo detecta —`get_current_user`— deja
    aviso. Se comprueba sobre el codigo porque el aviso vive ahi, no en
    `core.auth`.
    """
    from pathlib import Path

    fuente = (Path(__file__).resolve().parent.parent / "dependencies" / "auth.py").read_text(
        encoding="utf-8"
    )
    assert 'logger.warning("Token validation failed: invalid app or nelvyon token")' in fuente, (
        "se perdio el aviso del rechazo real: sin el, un token invalido pasaria "
        "sin dejar rastro y esto habria sido silenciar un fallo"
    )


def test_el_aviso_nunca_lleva_el_token(caplog):
    """Ni antes ni ahora: se registra el tipo de error, jamas la credencial."""
    token = jwt.encode({"sub": "x"}, "un-secreto-ajeno-pero-suficientemente-largo", algorithm="HS256")
    with caplog.at_level(logging.DEBUG, logger="core.auth"):
        with pytest.raises(AccessTokenError):
            decode_access_token(token)
    for registro in caplog.records:
        assert token not in registro.getMessage()
        assert token[:24] not in registro.getMessage()

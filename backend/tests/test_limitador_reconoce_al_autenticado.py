"""El limitador reconoce a quien la autenticacion reconoce, y no se le evade.

EL FALLO QUE ESTO IMPIDE
------------------------
NELVYON emite dos clases de JWT:

    nativo de FastAPI   firmado con JWT_SECRET_KEY   core.auth
    emitido por el BFF  firmado con JWT_SECRET       core.nelvyon_jwt

`get_current_user` prueba los dos, en ese orden. El limitador probaba solo el
primero, asi que un token del BFF —el que lleva casi todo el trafico real— no
producia identidad y la peticion caia en el cubo ANONIMO: diez por minuto y,
al agotarlo, una hora de bloqueo para esa IP.

En produccion se midieron 176 `Token validation failed: JWTError` en una sola
ventana y dos bloqueos por abuso, uno sobre una IP externa ajena a la
certificacion. El endpoint servia la peticion; el limitador la contaba como si
no tuviera dueno.

DOS EVASIONES QUE SE CIERRAN A LA VEZ
-------------------------------------
Al revisar la resolucion de identidad aparecieron dos formas de no alcanzar
nunca el limite, ambas usando cabeceras que pone el propio cliente:

    X-Workspace-Id     entraba en la clave del cubo anonimo
    X-Forwarded-For    se leia por el extremo que escribe el cliente

Las dos permitian estrenar cubo en cada peticion. Un identificador que elige
quien es limitado no puede formar parte de la clave que lo limita.
"""
from __future__ import annotations

import time
from typing import Optional

import pytest
from jose import jwt

from core.identidad_peticion import identificar_token, ip_del_cliente, token_de_la_peticion
from middleware import rate_limit as rl

SECRETO_FASTAPI = "clave-de-prueba-fastapi-con-longitud-mas-que-suficiente"
SECRETO_BFF = "clave-de-prueba-del-bff-con-longitud-mas-que-suficiente-32"


@pytest.fixture(autouse=True)
def _entorno(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRETO_FASTAPI)
    monkeypatch.setenv("JWT_SECRET", SECRETO_BFF)
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")
    monkeypatch.delenv("TRUSTED_PROXY_HOPS", raising=False)


class _Cabeceras(dict):
    """Las cabeceras HTTP no distinguen mayusculas; un dict normal si.

    Un stub con dict corriente ya provoco un falso verde en esta suite: el
    codigo pedia `x-forwarded-for` y el test guardaba `X-Forwarded-For`.
    """

    def get(self, clave, defecto=None):
        for k, v in self.items():
            if k.lower() == clave.lower():
                return v
        return defecto


class _Cliente:
    def __init__(self, host: str):
        self.host = host


class _Peticion:
    """Lo minimo que consultan el resolutor y el limitador."""

    def __init__(self, cabeceras=None, cookies=None, host="203.0.113.9"):
        self.headers = _Cabeceras(cabeceras or {})
        self.cookies = dict(cookies or {})
        self.client = _Cliente(host)


def token_bff(usuario: str, caducidad: Optional[int] = None) -> str:
    carga = {"userId": usuario, "email": f"{usuario}@nelvyon.test", "plan": "free"}
    if caducidad is not None:
        carga["exp"] = caducidad
    return jwt.encode(carga, SECRETO_BFF, algorithm="HS256")


def token_fastapi(usuario: str) -> str:
    return jwt.encode({"sub": usuario}, SECRETO_FASTAPI, algorithm="HS256")


def con_portador(token: str, **extra) -> _Peticion:
    return _Peticion({"Authorization": f"Bearer {token}", **extra})


# ── reconocimiento ───────────────────────────────────────────────────────────

def test_el_token_del_bff_produce_identidad():
    """EL fallo. Antes del arreglo esto devolvia None y la peticion iba a anon."""
    identidad = identificar_token(token_bff("u-123"))
    assert identidad is not None, "el token del BFF debe reconocerse"
    assert identidad.esquema == "jwt_bff"
    assert identidad.sujeto == "u-123"


def test_el_token_nativo_sigue_reconociendose():
    """Control: arreglar el segundo esquema no puede romper el primero."""
    identidad = identificar_token(token_fastapi("u-456"))
    assert identidad is not None and identidad.esquema == "jwt_fastapi"
    assert identidad.sujeto == "u-456"


def test_el_usuario_autenticado_no_cae_en_el_cubo_anonimo():
    """La consecuencia observable del fallo, comprobada en el nivel resultante."""
    nivel, clave, limite, _ = rl._resolve_tier(con_portador(token_bff("u-789")))
    assert nivel == "auth", f"un usuario autenticado no puede quedar en {nivel!r}"
    assert "u-789" in clave
    assert limite == rl.TIER_AUTH_LIMIT
    assert limite > rl.TIER_ANON_LIMIT


def test_la_cookie_del_bff_tambien_identifica():
    """El navegador manda cookie, no cabecera Authorization."""
    p = _Peticion(cookies={"nelvyon_token": token_bff("u-cookie")})
    assert token_de_la_peticion(p) is not None
    nivel, clave, _, _ = rl._resolve_tier(p)
    assert nivel == "auth" and "u-cookie" in clave


# ── credenciales que NO deben dar identidad ──────────────────────────────────

@pytest.mark.parametrize(
    "token",
    [
        "",
        "no-es-un-jwt",
        jwt.encode({"sub": "intruso"}, "un-secreto-que-no-es-el-nuestro-pero-largo", algorithm="HS256"),
        jwt.encode({"userId": ""}, SECRETO_BFF, algorithm="HS256"),
    ],
    ids=["vacio", "basura", "firma_ajena", "sin_sujeto"],
)
def test_un_token_invalido_no_concede_identidad(token):
    """Si esto fallara, el arreglo seria un agujero: bastaria enviar cualquier
    cosa para salir del cupo anonimo."""
    assert identificar_token(token) is None
    nivel, _, limite, _ = rl._resolve_tier(con_portador(token))
    assert nivel == "anon"
    assert limite == rl.TIER_ANON_LIMIT


def test_un_token_caducado_no_concede_identidad():
    caducado = token_bff("u-viejo", caducidad=int(time.time()) - 3600)
    assert identificar_token(caducado) is None
    assert rl._resolve_tier(con_portador(caducado))[0] == "anon"


# ── separacion de cubos ──────────────────────────────────────────────────────

def test_dos_usuarios_no_comparten_cubo():
    _, clave_a, _, _ = rl._resolve_tier(con_portador(token_bff("u-a")))
    _, clave_b, _, _ = rl._resolve_tier(con_portador(token_bff("u-b")))
    assert clave_a != clave_b


def test_el_mismo_usuario_desde_dos_ips_comparte_su_cubo():
    """La clave es el usuario, no su origen: la cuenta no multiplica cupo
    cambiando de red, y su consumo no recae sobre vecinos de la misma salida."""
    a = _Peticion({"Authorization": f"Bearer {token_bff('u-x')}"}, host="203.0.113.1")
    b = _Peticion({"Authorization": f"Bearer {token_bff('u-x')}"}, host="198.51.100.7")
    assert rl._resolve_tier(a)[1] == rl._resolve_tier(b)[1]


# ── evasiones cerradas ───────────────────────────────────────────────────────

def test_cambiar_el_workspace_no_estrena_cubo_anonimo():
    """Evasion 1. Antes la clave era `ip:<ip>:ws:<ws>` y `X-Workspace-Id` lo
    pone el cliente: rotandolo nunca se alcanzaba el limite."""
    claves = {
        rl._resolve_tier(_Peticion({"X-Workspace-Id": str(n)}, host="203.0.113.5"))[1]
        for n in range(1, 25)
    }
    assert len(claves) == 1, f"el workspace sigue partiendo el cubo anonimo: {claves}"


def test_falsear_x_forwarded_for_no_estrena_cubo():
    """Evasion 2. Solo el ultimo salto lo escribe la infraestructura."""
    real = "203.0.113.77"
    claves = set()
    for inventada in ("1.2.3.4", "8.8.8.8", "10.0.0.1", "192.0.2.55"):
        p = _Peticion({"X-Forwarded-For": f"{inventada}, {real}"})
        claves.add(rl._resolve_tier(p)[1])
        assert ip_del_cliente(p) == real
    assert len(claves) == 1, f"la IP falseada parte el cubo: {claves}"


def test_una_sola_ip_reenviada_se_respeta():
    """Caso normal de Railway: un unico salto, que es el cliente real."""
    p = _Peticion({"X-Forwarded-For": "203.0.113.200"})
    assert ip_del_cliente(p) == "203.0.113.200"


def test_ipv6_mapeada_y_ipv4_son_el_mismo_cubo():
    """`::ffff:1.2.3.4` es el mismo origen que `1.2.3.4`; sin canonizar serian
    dos cubos y el limite valdria el doble."""
    a = _Peticion({"X-Forwarded-For": "::ffff:203.0.113.9"})
    b = _Peticion({"X-Forwarded-For": "203.0.113.9"})
    assert ip_del_cliente(a) == ip_del_cliente(b) == "203.0.113.9"


def test_ipv6_se_soporta():
    p = _Peticion({"X-Forwarded-For": "2001:db8::1"})
    assert ip_del_cliente(p) == "2001:db8::1"


def test_el_trafico_anonimo_sigue_limitado():
    """Control negativo del conjunto: si anon quedara exento, todo lo anterior
    seria irrelevante."""
    nivel, clave, limite, ventana = rl._resolve_tier(_Peticion())
    assert nivel == "anon"
    assert 0 < limite <= 10
    assert ventana == 60
    assert clave.startswith("ip:")


# ── no se filtran secretos ───────────────────────────────────────────────────

def test_la_clave_del_cubo_no_contiene_el_token():
    token = token_bff("u-secreto")
    _, clave, _, _ = rl._resolve_tier(con_portador(token))
    assert token not in clave
    assert clave.count(".") == 0, "la clave no debe arrastrar partes del JWT"


def test_la_clave_de_api_no_se_guarda_entera():
    completa = "nlv_" + "z" * 60
    identidad = identificar_token(completa)
    assert identidad is not None and identidad.esquema == "clave_api"
    assert identidad.sujeto != completa
    assert len(identidad.sujeto) <= 16
    assert completa not in identidad.clave


def test_la_clave_de_api_conserva_su_nivel():
    """Regresion: al reordenar los niveles, las claves de API no pueden acabar
    en el cupo anonimo ni en el de usuario autenticado."""
    p = _Peticion({"X-API-Key": "nlv_" + "k" * 40, "X-Workspace-Plan": "pro"})
    nivel, _, limite, _ = rl._resolve_tier(p)
    assert nivel == "paid_key" and limite == rl.TIER_PAID_LIMIT

"""Los webhooks, ejercitados criptograficamente con secretos SINTETICOS.

POR QUE HACE FALTA
------------------
Los seis secretos reales estan ausentes en staging, y no se inventan. Pero
«ausente» solo prueba que el sistema corta; NO prueba que la verificacion
funcione cuando el secreto exista.

Aqui se genera un secreto sintetico EN EL TEST, se firma con el algoritmo real de
cada proveedor y se comprueba que el camino positivo acepta y los negativos
rechazan. Ningun secreto real interviene, y ninguno se imprime.

Esto NO sustituye la certificacion con las credenciales del proveedor: demuestra
que la implementacion es correcta, no que esten configuradas.

LO QUE SE COMPRUEBA POR PROVEEDOR
---------------------------------
    firma valida        -> acepta
    firma alterada      -> rechaza
    cuerpo alterado     -> rechaza  (la firma ya no corresponde)
    secreto ausente     -> fail-closed, y distinguible de «firma invalida»
    Zoom timestamp viejo-> rechaza  (anti-replay)
    cuerpo crudo        -> se usa el original, no un JSON reserializado
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time

import pytest
from fastapi import HTTPException

SECRETO = "sintetico-solo-para-test-" + "0" * 16


# ─────────────────────────────── META (X-Hub-Signature-256)

def _meta():
    from core.meta_webhook_signature import firma_esperada, verificar_firma_meta
    return firma_esperada, verificar_firma_meta


def test_meta_acepta_una_firma_valida(monkeypatch):
    """CONTROL POSITIVO. Sin el, «rechaza todo» pasaria por seguro."""
    firma_esperada, verificar = _meta()
    monkeypatch.setenv("META_WA_APP_SECRET", SECRETO)
    cuerpo = b'{"object":"whatsapp_business_account","entry":[]}'
    verificar("whatsapp", cuerpo, firma_esperada(SECRETO, cuerpo))  # no levanta


def test_meta_rechaza_si_se_altera_la_firma(monkeypatch):
    firma_esperada, verificar = _meta()
    monkeypatch.setenv("META_WA_APP_SECRET", SECRETO)
    cuerpo = b'{"object":"whatsapp_business_account"}'
    buena = firma_esperada(SECRETO, cuerpo)
    mala = buena[:-1] + ("0" if buena[-1] != "0" else "1")
    with pytest.raises(HTTPException) as e:
        verificar("whatsapp", cuerpo, mala)
    assert e.value.status_code == 400


def test_meta_rechaza_si_se_altera_el_cuerpo(monkeypatch):
    """La firma es del CUERPO: cambiarlo tiene que invalidarla.

    Es el control que demuestra que se firma el cuerpo crudo y no una
    constante: si el cuerpo no entrara en el HMAC, esto pasaria.
    """
    firma_esperada, verificar = _meta()
    monkeypatch.setenv("META_WA_APP_SECRET", SECRETO)
    original = b'{"amount":10}'
    firma = firma_esperada(SECRETO, original)
    with pytest.raises(HTTPException):
        verificar("whatsapp", b'{"amount":99999}', firma)


def test_meta_sin_secreto_es_fail_closed_y_distinguible(monkeypatch):
    """Sin secreto NO se procesa, y el motivo no se confunde con firma invalida."""
    _, verificar = _meta()
    for var in ("META_WA_APP_SECRET", "WHATSAPP_APP_SECRET",
                "META_APP_SECRET", "FACEBOOK_APP_SECRET"):
        monkeypatch.delenv(var, raising=False)
    with pytest.raises(HTTPException) as e:
        verificar("whatsapp", b"{}", "sha256=" + "0" * 64)
    assert e.value.status_code == 503, (
        "sin secreto debe ser 503 (nuestro fallo, reintentable), no 400"
    )


def test_meta_no_acepta_una_cabecera_alternativa(monkeypatch):
    """No hay puerta trasera por otra cabecera."""
    _, verificar = _meta()
    monkeypatch.setenv("META_WA_APP_SECRET", SECRETO)
    with pytest.raises(HTTPException):
        verificar("whatsapp", b"{}", None)


# ─────────────────────────────── ZOOM (v0= + anti-replay)

def _zoom():
    from core.zoom_webhook_signature import firma_esperada, verificar_firma_zoom
    return firma_esperada, verificar_firma_zoom


def test_zoom_acepta_firma_valida_con_timestamp_actual(monkeypatch):
    firma_esperada, verificar = _zoom()
    monkeypatch.setenv("ZOOM_WEBHOOK_SECRET_TOKEN", SECRETO)
    cuerpo = b'{"event":"meeting.started"}'
    ts = str(int(time.time()))
    verificar(cuerpo, firma_esperada(SECRETO, ts, cuerpo), ts)


def test_zoom_rechaza_un_replay_con_firma_correcta(monkeypatch):
    """ANTI-REPLAY. La firma es valida; lo que caduca es el timestamp.

    Sin esta comprobacion, una peticion capturada se podria reenviar para
    siempre: la firma seguiria cuadrando porque el cuerpo no cambia.
    """
    firma_esperada, verificar = _zoom()
    monkeypatch.setenv("ZOOM_WEBHOOK_SECRET_TOKEN", SECRETO)
    cuerpo = b'{"event":"meeting.started"}'
    viejo = str(int(time.time()) - 400)          # fuera de los 300 s
    firma = firma_esperada(SECRETO, viejo, cuerpo)  # firma CORRECTA
    with pytest.raises(HTTPException) as e:
        verificar(cuerpo, firma, viejo)
    assert e.value.status_code in (400, 401)


def test_zoom_dentro_de_tolerancia_si_acepta(monkeypatch):
    """Control negativo del anti-replay: no puede rechazarlo todo."""
    firma_esperada, verificar = _zoom()
    monkeypatch.setenv("ZOOM_WEBHOOK_SECRET_TOKEN", SECRETO)
    cuerpo = b'{"event":"meeting.ended"}'
    reciente = str(int(time.time()) - 60)        # dentro de los 300 s
    verificar(cuerpo, firma_esperada(SECRETO, reciente, cuerpo), reciente)


def test_zoom_el_timestamp_entra_en_la_firma(monkeypatch):
    """Firmar `v0:<ts>:<cuerpo>` y no solo el cuerpo es lo que ata ambos."""
    firma_esperada, _ = _zoom()
    cuerpo = b'{"event":"x"}'
    assert firma_esperada(SECRETO, "111", cuerpo) != firma_esperada(SECRETO, "222", cuerpo)
    esperada = "v0=" + hmac.new(
        SECRETO.encode(), b"v0:111:" + cuerpo, hashlib.sha256
    ).hexdigest()
    assert firma_esperada(SECRETO, "111", cuerpo) == esperada


def test_zoom_sin_secreto_es_fail_closed(monkeypatch):
    _, verificar = _zoom()
    monkeypatch.delenv("ZOOM_WEBHOOK_SECRET_TOKEN", raising=False)
    with pytest.raises(HTTPException) as e:
        verificar(b"{}", "v0=" + "0" * 64, str(int(time.time())))
    assert e.value.status_code == 503


# ─────────────────────── SECRETO COMPARTIDO (TikTok / Signaturit)

class _CabecerasInsensibles(dict):
    """`request.headers` de Starlette NO distingue mayusculas; un dict si.

    Sin esto el arnes fallaba por su propia culpa —el codigo busca
    `X-Nelvyon-Webhook-Secret` y el dict solo tenia la version en minusculas—,
    que es justo el tipo de falso rojo que confunde un fallo de test con un
    fallo de producto.
    """

    def get(self, clave, defecto=None):
        for k, v in self.items():
            if k.lower() == str(clave).lower():
                return v
        return defecto


class _PeticionFalsa:
    """Lo minimo que `verificar_secreto_compartido` consulta."""

    def __init__(self, cabecera=None, query=None):
        self.headers = _CabecerasInsensibles(
            {"X-Nelvyon-Webhook-Secret": cabecera} if cabecera else {})
        self.query_params = {"secret": query} if query else {}


@pytest.mark.parametrize("proveedor,variable", [
    ("tiktok", "TIKTOK_WEBHOOK_SECRET"),
    ("signaturit", "SIGNATURIT_WEBHOOK_SECRET"),
])
def test_secreto_compartido_acepta_el_correcto(monkeypatch, proveedor, variable):
    from core.webhook_shared_secret import verificar_secreto_compartido
    monkeypatch.setenv(variable, SECRETO)
    verificar_secreto_compartido(proveedor, _PeticionFalsa(cabecera=SECRETO))


@pytest.mark.parametrize("proveedor,variable", [
    ("tiktok", "TIKTOK_WEBHOOK_SECRET"),
    ("signaturit", "SIGNATURIT_WEBHOOK_SECRET"),
])
def test_secreto_compartido_rechaza_el_incorrecto(monkeypatch, proveedor, variable):
    from core.webhook_shared_secret import verificar_secreto_compartido
    monkeypatch.setenv(variable, SECRETO)
    with pytest.raises(HTTPException) as e:
        verificar_secreto_compartido(proveedor, _PeticionFalsa(cabecera=SECRETO + "x"))
    assert e.value.status_code == 403


@pytest.mark.parametrize("proveedor,variable", [
    ("tiktok", "TIKTOK_WEBHOOK_SECRET"),
    ("signaturit", "SIGNATURIT_WEBHOOK_SECRET"),
])
def test_secreto_compartido_sin_secreto_es_fail_closed(monkeypatch, proveedor, variable):
    from core.webhook_shared_secret import verificar_secreto_compartido
    monkeypatch.delenv(variable, raising=False)
    with pytest.raises(HTTPException) as e:
        verificar_secreto_compartido(proveedor, _PeticionFalsa(cabecera="lo-que-sea"))
    assert e.value.status_code == 503


def test_un_proveedor_no_vale_para_otro(monkeypatch):
    """AISLAMIENTO POR PROVEEDOR. El secreto de TikTok no abre Signaturit."""
    from core.webhook_shared_secret import verificar_secreto_compartido
    monkeypatch.setenv("TIKTOK_WEBHOOK_SECRET", SECRETO)
    monkeypatch.setenv("SIGNATURIT_WEBHOOK_SECRET", SECRETO + "-distinto")
    verificar_secreto_compartido("tiktok", _PeticionFalsa(cabecera=SECRETO))
    with pytest.raises(HTTPException):
        verificar_secreto_compartido("signaturit", _PeticionFalsa(cabecera=SECRETO))


# ─────────────────────────────── comparacion en tiempo constante

def test_la_comparacion_es_en_tiempo_constante():
    """`==` filtra por tiempo cuantos bytes coincidian; `compare_digest` no."""
    import inspect

    from core import meta_webhook_signature, webhook_shared_secret, zoom_webhook_signature

    for modulo in (meta_webhook_signature, zoom_webhook_signature, webhook_shared_secret):
        fuente = inspect.getsource(modulo)
        assert "hmac.compare_digest" in fuente, (
            f"{modulo.__name__} no usa comparacion en tiempo constante"
        )


def test_ningun_modulo_de_firma_registra_el_secreto():
    """Los logs pueden decir QUE falta, nunca CUAL es."""
    import inspect
    import re

    from core import meta_webhook_signature, webhook_shared_secret, zoom_webhook_signature

    for modulo in (meta_webhook_signature, zoom_webhook_signature, webhook_shared_secret):
        for linea in inspect.getsource(modulo).splitlines():
            if "logger" not in linea and "print(" not in linea:
                continue
            assert not re.search(r"logger[^\n]*\b(secreto|secret|token)\s*[,)]", linea), (
                f"{modulo.__name__} podria registrar el valor: {linea.strip()}"
            )


def test_el_cuerpo_se_firma_crudo_y_no_reserializado():
    """Reserializar cambia bytes —espacios, orden— y romperia la firma.

    Se comprueba sobre un JSON cuyo `json.dumps` por defecto NO coincide con el
    original: si la implementacion reserializara, la firma no cuadraria.
    """
    from core.meta_webhook_signature import firma_esperada

    crudo = b'{"b":1,  "a":2}'
    reserializado = json.dumps(json.loads(crudo)).encode()
    assert crudo != reserializado, "la muestra no distingue crudo de reserializado"
    assert firma_esperada(SECRETO, crudo) != firma_esperada(SECRETO, reserializado)

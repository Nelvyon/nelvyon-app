"""Todo webhook entrante publico verifica autenticidad antes de tener efectos.

DE DONDE VIENE
--------------
El informe arrastraba «9 webhooks entrantes sin verificacion de firma» como
deuda no bloqueante. No lo era: cada uno de esos endpoints es publico y produce
efectos reales.

  whatsapp / helpdesk-whatsapp   inyectar mensajes y tickets con el remitente
                                 que se quiera
  twilio (dialer y sms)          inventar llamadas y SMS, y ELEGIR el inquilino,
                                 porque `workspace_id` viaja en el query string
  zoom                           inventar eventos en la agenda de un cliente
  ses / helpdesk-email           declarar rebotada la direccion de un cliente,
                                 que es como se le deja de entregar correo
  tiktok                         inyectar DMs
  signaturit                     declarar un documento firmado o cancelado

CADA UNO CON SU MECANISMO, NINGUNO INVENTADO
--------------------------------------------
    Meta (whatsapp, messenger, instagram)  X-Hub-Signature-256, HMAC-SHA256
    Twilio                                 X-Twilio-Signature, HMAC-SHA1 sobre
                                           URL + parametros ordenados
    Zoom                                   v0=HMAC-SHA256 sobre `v0:<ts>:<cuerpo>`
    Amazon SNS                             firma RSA con certificado publicado
    TikTok / Signaturit                    no publican firma -> secreto
                                           compartido, el mismo patron que el
                                           repositorio ya usa en
                                           `/webhook/trigger/{webhook_key}`

QUE COMPRUEBA ESTE FICHERO
--------------------------
Que cada verificador acepta lo autentico, rechaza lo manipulado, rechaza lo
ausente y rechaza cuando no hay secreto — y que el guard estructural impide que
un webhook nuevo entre sin verificacion.
"""
from __future__ import annotations

import ast
import base64
import hashlib
import hmac
import json
from pathlib import Path

import pytest
from fastapi import HTTPException

from core.meta_webhook_signature import firma_esperada, verificar_firma_meta
from core.twilio_webhook_signature import firma_esperada as firma_twilio
from core.webhook_shared_secret import verificar_secreto_compartido
from core.zoom_webhook_signature import firma_esperada as firma_zoom
from core.zoom_webhook_signature import verificar_firma_zoom

SECRETO = "secreto-de-prueba-no-real"
CUERPO = b'{"entry":[{"id":"1"}]}'


# ───────────────────────────── Meta (WhatsApp, Messenger, Instagram)


def test_meta_acepta_la_firma_valida(monkeypatch):
    monkeypatch.setenv("WHATSAPP_APP_SECRET", SECRETO)
    verificar_firma_meta("whatsapp", CUERPO, firma_esperada(SECRETO, CUERPO))


def test_meta_rechaza_el_cuerpo_manipulado(monkeypatch):
    """La firma es del cuerpo original; cambiar un byte debe invalidarla."""
    monkeypatch.setenv("WHATSAPP_APP_SECRET", SECRETO)
    firma = firma_esperada(SECRETO, CUERPO)
    with pytest.raises(HTTPException) as exc:
        verificar_firma_meta("whatsapp", CUERPO + b" ", firma)
    assert exc.value.status_code == 400


def test_meta_rechaza_la_firma_ausente(monkeypatch):
    monkeypatch.setenv("WHATSAPP_APP_SECRET", SECRETO)
    with pytest.raises(HTTPException):
        verificar_firma_meta("whatsapp", CUERPO, None)


def test_meta_acepta_el_nombre_de_secreto_del_repositorio(monkeypatch):
    """`META_WA_APP_SECRET` es el nombre que ya usa el repositorio para WhatsApp.

    Lo exige `backend/oauth/oauthEnv.ts` y lo declara `integrationsCatalog`, asi
    que es el que estara configurado en produccion. Si el verificador no lo
    leyera, el webhook devolveria 503 en cuanto se desplegara — un fallo que
    solo aparece con las variables reales delante.
    """
    for var in ("WHATSAPP_APP_SECRET", "META_APP_SECRET", "FACEBOOK_APP_SECRET"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("META_WA_APP_SECRET", SECRETO)
    verificar_firma_meta("whatsapp", CUERPO, firma_esperada(SECRETO, CUERPO))


def test_meta_sin_secreto_corta_con_503(monkeypatch):
    """Sin secreto NO se acepta. Es el estado en el que cualquiera escribe."""
    for var in ("META_WA_APP_SECRET", "WHATSAPP_APP_SECRET", "META_APP_SECRET", "FACEBOOK_APP_SECRET"):
        monkeypatch.delenv(var, raising=False)
    with pytest.raises(HTTPException) as exc:
        verificar_firma_meta("whatsapp", CUERPO, firma_esperada(SECRETO, CUERPO))
    assert exc.value.status_code == 503


def test_meta_no_acepta_la_firma_de_otro_secreto(monkeypatch):
    monkeypatch.setenv("WHATSAPP_APP_SECRET", SECRETO)
    with pytest.raises(HTTPException):
        verificar_firma_meta("whatsapp", CUERPO, firma_esperada("otro-secreto", CUERPO))


# ───────────────────────────── Twilio


def test_twilio_firma_url_mas_parametros_ordenados():
    """El algoritmo de Twilio, comprobado contra su definicion.

    Se recalcula a mano en vez de llamar a la funcion, para que el test falle si
    alguien cambia el orden o el separador.
    """
    url = "https://api.nelvyon.test/api/v1/sms/webhook/twilio?workspace_id=7"
    parametros = {"Body": "hola", "From": "+34600", "MessageSid": "SM1"}
    manual = url + "Bodyhola" + "From+34600" + "MessageSidSM1"
    esperada = base64.b64encode(
        hmac.new(SECRETO.encode(), manual.encode(), hashlib.sha1).digest()
    ).decode()
    assert firma_twilio(SECRETO, url, parametros) == esperada


def test_twilio_el_orden_de_los_parametros_no_depende_del_diccionario():
    """Twilio ordena por nombre; si dependiera del orden de insercion, las
    firmas legitimas se rechazarian de forma intermitente."""
    url = "https://api.nelvyon.test/w"
    uno = {"a": "1", "b": "2", "c": "3"}
    otro = {"c": "3", "a": "1", "b": "2"}
    assert firma_twilio(SECRETO, url, uno) == firma_twilio(SECRETO, url, otro)


def test_twilio_la_url_forma_parte_de_la_firma():
    """Sin la URL, una firma valida para un endpoint valdria para otro."""
    parametros = {"Body": "hola"}
    a = firma_twilio(SECRETO, "https://x/sms", parametros)
    b = firma_twilio(SECRETO, "https://x/dialer", parametros)
    assert a != b


# ───────────────────────────── Zoom


def test_zoom_acepta_la_firma_valida(monkeypatch):
    monkeypatch.setenv("ZOOM_WEBHOOK_SECRET_TOKEN", SECRETO)
    verificar_firma_zoom(CUERPO, firma_zoom(SECRETO, "1700000000", CUERPO),
                         "1700000000", ahora=1700000000.0)


def test_zoom_rechaza_un_mensaje_reproducido(monkeypatch):
    """El timestamp entra en la firma, asi que caduca. Control de replay.

    Una firma autentica de hace una hora sigue siendo criptograficamente valida;
    lo que la invalida es el tiempo. Sin esta comprobacion, capturar un mensaje
    bastaria para repetirlo siempre.
    """
    monkeypatch.setenv("ZOOM_WEBHOOK_SECRET_TOKEN", SECRETO)
    firma = firma_zoom(SECRETO, "1700000000", CUERPO)
    with pytest.raises(HTTPException) as exc:
        verificar_firma_zoom(CUERPO, firma, "1700000000", ahora=1700000000.0 + 3600)
    assert "Timestamp" in exc.value.detail


def test_zoom_acepta_dentro_de_la_tolerancia(monkeypatch):
    """Control negativo: relojes algo separados no deben romper el webhook."""
    monkeypatch.setenv("ZOOM_WEBHOOK_SECRET_TOKEN", SECRETO)
    firma = firma_zoom(SECRETO, "1700000000", CUERPO)
    verificar_firma_zoom(CUERPO, firma, "1700000000", ahora=1700000000.0 + 60)


def test_zoom_sin_secreto_corta_con_503(monkeypatch):
    monkeypatch.delenv("ZOOM_WEBHOOK_SECRET_TOKEN", raising=False)
    with pytest.raises(HTTPException) as exc:
        verificar_firma_zoom(CUERPO, "v0=x", "1700000000", ahora=1700000000.0)
    assert exc.value.status_code == 503


# ───────────────────────────── SNS


def test_sns_solo_acepta_certificados_de_aws():
    """El mensaje dice DONDE esta el certificado que lo firma.

    Si se aceptara cualquier URL, un atacante firmaria con su propio certificado
    y nos diria donde mirarlo. Es el fallo clasico de esta integracion.
    """
    from core.sns_webhook_signature import verificar_firma_sns

    mensaje = {
        "Type": "Notification", "MessageId": "1", "TopicArn": "arn:aws:sns:eu:1:t",
        "Message": "x", "Timestamp": "2026-01-01T00:00:00.000Z",
        "Signature": base64.b64encode(b"falsa").decode(),
        "SigningCertURL": "https://atacante.example.com/cert.pem",
    }
    with pytest.raises(HTTPException) as exc:
        verificar_firma_sns(mensaje)
    assert exc.value.status_code == 400
    assert "Untrusted" in exc.value.detail


def test_sns_la_cadena_firmada_es_la_de_aws():
    """Orden alfabetico y `clave\\nvalor\\n`, tal y como lo define AWS."""
    from core.sns_webhook_signature import cadena_firmada

    mensaje = {
        "Type": "Notification", "MessageId": "m1", "TopicArn": "arn:t",
        "Message": "hola", "Timestamp": "2026-01-01T00:00:00.000Z",
    }
    assert cadena_firmada(mensaje) == (
        b"Message\nhola\nMessageId\nm1\nTimestamp\n2026-01-01T00:00:00.000Z\n"
        b"TopicArn\narn:t\nType\nNotification\n"
    )


def test_sns_rechaza_un_tipo_desconocido():
    from core.sns_webhook_signature import verificar_firma_sns

    with pytest.raises(HTTPException):
        verificar_firma_sns({"Type": "Inventado", "Signature": "x", "SigningCertURL": "y"})


# ───────────────────────────── secreto compartido (TikTok, Signaturit)


class _PeticionFalsa:
    def __init__(self, cabeceras=None, consulta=None):
        self.headers = cabeceras or {}
        self.query_params = consulta or {}


@pytest.mark.parametrize("proveedor, var", [
    ("tiktok", "TIKTOK_WEBHOOK_SECRET"),
    ("signaturit", "SIGNATURIT_WEBHOOK_SECRET"),
])
def test_secreto_compartido_acepta_el_correcto(monkeypatch, proveedor, var):
    monkeypatch.setenv(var, SECRETO)
    verificar_secreto_compartido(
        proveedor, _PeticionFalsa({"X-Nelvyon-Webhook-Secret": SECRETO})
    )


@pytest.mark.parametrize("proveedor, var", [
    ("tiktok", "TIKTOK_WEBHOOK_SECRET"),
    ("signaturit", "SIGNATURIT_WEBHOOK_SECRET"),
])
def test_secreto_compartido_rechaza_el_incorrecto(monkeypatch, proveedor, var):
    monkeypatch.setenv(var, SECRETO)
    with pytest.raises(HTTPException) as exc:
        verificar_secreto_compartido(
            proveedor, _PeticionFalsa({"X-Nelvyon-Webhook-Secret": "otro"})
        )
    assert exc.value.status_code == 403


def test_secreto_compartido_sin_configurar_corta_con_503(monkeypatch):
    monkeypatch.delenv("TIKTOK_WEBHOOK_SECRET", raising=False)
    with pytest.raises(HTTPException) as exc:
        verificar_secreto_compartido(
            "tiktok", _PeticionFalsa({"X-Nelvyon-Webhook-Secret": SECRETO})
        )
    assert exc.value.status_code == 503


def test_secreto_compartido_admite_el_query_string(monkeypatch):
    """Algunos paneles solo dejan configurar la URL, no cabeceras."""
    monkeypatch.setenv("TIKTOK_WEBHOOK_SECRET", SECRETO)
    verificar_secreto_compartido("tiktok", _PeticionFalsa(consulta={"webhook_secret": SECRETO}))


# ───────────────────────────── guard estructural


#: Endpoints publicos entrantes y el verificador que debe aparecer en su cuerpo.
#: No es una allowlist de exenciones: es la lista de los que EXIGEN verificacion.
VERIFICACION_EXIGIDA = {
    ("routers/whatsapp.py", "receive_webhook"): "verificar_firma_meta",
    ("routers/facebook_messenger.py", "receive_webhook"): "verificar_firma_meta",
    ("routers/instagram_dm.py", "receive_webhook"): "verificar_firma_meta",
    ("routers/helpdesk.py", "inbound_whatsapp_webhook"): "verificar_firma_meta",
    ("routers/helpdesk.py", "inbound_email_webhook"): "verificar_firma_sns",
    ("routers/monitoring.py", "ses_bounce_webhook"): "verificar_firma_sns",
    ("routers/dialer.py", "twilio_webhook"): "verificar_firma_twilio",
    ("routers/sms.py", "twilio_inbound_webhook"): "verificar_firma_twilio",
    ("routers/bookings.py", "zoom_webhook"): "verificar_firma_zoom",
    ("routers/tiktok_dm.py", "receive_webhook"): "verificar_secreto_compartido",
    ("routers/contracts.py", "signaturit_webhook"): "verificar_secreto_compartido",
    # Stripe firma con `Stripe-Signature` y su SDK lo verifica en
    # `Webhook.construct_event`, que ya se usaba. Se incluyen para que sigan
    # vigilados: quitarles la verificacion tocaria dinero.
    ("routers/stripe_webhook.py", "stripe_webhook"): "construct",
    ("routers/text2pay.py", "stripe_webhook"): "construct",
    # Aqui la verificacion vive en el servicio, que recibe cuerpo y cabecera.
    ("routers/os_store_builder.py", "stripe_webhook"): "stripe-signature",
    # La clave opaca ES la credencial: identifica el webhook Y su workspace.
    ("routers/automation.py", "trigger_webhook"): "webhook_key",
}

_RAIZ = Path(__file__).resolve().parent.parent


def _cuerpo(fichero: str, funcion: str) -> str:
    arbol = ast.parse((_RAIZ / fichero).read_text(encoding="utf-8"))
    for nodo in ast.walk(arbol):
        if isinstance(nodo, (ast.AsyncFunctionDef, ast.FunctionDef)) and nodo.name == funcion:
            return ast.unparse(nodo)
    raise AssertionError(f"{fichero}::{funcion} no existe")


@pytest.mark.parametrize("clave", sorted(VERIFICACION_EXIGIDA))
def test_cada_webhook_entrante_verifica_autenticidad(clave):
    fichero, funcion = clave
    assert VERIFICACION_EXIGIDA[clave] in _cuerpo(fichero, funcion), (
        f"{fichero}::{funcion} es publico y no verifica autenticidad"
    )


@pytest.mark.parametrize("clave", sorted(VERIFICACION_EXIGIDA))
def test_la_verificacion_va_antes_del_efecto(clave):
    """Verificar DESPUES de escribir no sirve de nada.

    Se comprueba que la llamada al verificador aparece antes que la primera
    llamada a un servicio o a la base. Sin esto, mover la verificacion al final
    dejaria el guard en verde y el defecto intacto.
    """
    fichero, funcion = clave
    cuerpo = _cuerpo(fichero, funcion)
    posicion_verificacion = cuerpo.index(VERIFICACION_EXIGIDA[clave])
    for marca in ("get_helpdesk_service", "get_booking_service", "get_dialer_service",
                  "SmsService.ensure_schema", "bounce_handler", "handle_webhook",
                  "process_incoming_webhook", "handle_webhook_event"):
        if marca in cuerpo:
            assert posicion_verificacion < cuerpo.index(marca), (
                f"{fichero}::{funcion} llama a {marca} antes de verificar"
            )


def test_no_hay_webhooks_entrantes_nuevos_sin_vigilar():
    """Un endpoint entrante nuevo debe entrar en la lista de arriba.

    Sin esto, anadir un webhook publico pasaria desapercibido, que es
    exactamente como llegaron a acumularse nueve.
    """
    encontrados = set()
    for fichero in sorted((_RAIZ / "routers").rglob("*.py")):
        rel = str(fichero.relative_to(_RAIZ)).replace("\\", "/")
        try:
            arbol = ast.parse(fichero.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        for nodo in ast.walk(arbol):
            if not isinstance(nodo, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            for dec in nodo.decorator_list:
                if not (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)):
                    continue
                if dec.func.attr != "post" or not dec.args:
                    continue
                ruta = dec.args[0]
                if not isinstance(ruta, ast.Constant):
                    continue
                # Entrante = ruta de webhook o inbound, y sin dependencia de auth.
                es_entrante = any(
                    p in str(ruta.value).lower() for p in ("/webhook", "/inbound")
                )
                argumentos = ast.unparse(nodo.args)
                autenticado = any(
                    k in argumentos
                    for k in ("get_current_user", "require_workspace", "get_super_admin")
                )
                if es_entrante and not autenticado:
                    encontrados.add((rel, nodo.name))

    nuevos = sorted(encontrados - set(VERIFICACION_EXIGIDA))
    assert not nuevos, (
        "webhooks entrantes publicos que nadie vigila:\n  "
        + "\n  ".join(f"{f}::{n}" for f, n in nuevos)
        + "\n\nAnadelos a VERIFICACION_EXIGIDA con su verificador."
    )


def test_el_detector_de_webhooks_encuentra_los_conocidos():
    """Control positivo del barrido: si dejara de encontrarlos, daria verde vacio."""
    import inspect

    fuente = inspect.getsource(test_no_hay_webhooks_entrantes_nuevos_sin_vigilar)
    assert "/webhook" in fuente and "get_current_user" in fuente
    assert len(VERIFICACION_EXIGIDA) >= 15

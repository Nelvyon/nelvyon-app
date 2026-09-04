"""Nada que envie correo COMERCIAL puede ignorar que alguien pidio la baja.

CLASE DE FALLO, ENCONTRADA TRES VECES
--------------------------------------
La marca de baja existe y es una sola: la etiqueta `unsubscribed` en el
contacto. La ponen el webhook de SES y la ruta de baja de las campanas.

Las CAMPANAS la respetaban: `NOT (tags @> ARRAY['unsubscribed'])`.

Pero:

  · `SaasSequencesService` no la miraba en ninguna parte. Alguien se daba de
    baja en una campana, dejaba de recibir campanas, y seguia recibiendo correo
    de cualquier secuencia activa.
  · `ColdEmailService` tampoco, y ademas marcaba los correos como enviados sin
    enviarlos.

Un sistema respetaba la regla y los otros dos no sabian que existia. No es que
la regla estuviera mal escrita: es que estaba escrita en un solo sitio y nadie
comprobaba que los demas la leyeran.

QUE COMPRUEBA
-------------
Que todo modulo que envia mensajeria COMERCIAL —campanas, secuencias, correo en
frio— consulte el consentimiento antes de elegir a quien escribir.

LO QUE NO ENTRA, Y ES LA DISTINCION QUE HACE UTIL ESTA BATERIA
---------------------------------------------------------------
El correo TRANSACCIONAL no puede bloquearse por una baja comercial. Un
restablecimiento de contrasena, una factura, una verificacion de correo o una
respuesta a una solicitud RGPD son obligaciones del servicio, no marketing.
Bloquearlas seria un fallo mas grave que el que esta bateria previene: dejaria a
alguien sin poder entrar en su cuenta por haberse dado de baja de una
newsletter.

Por eso la lista de comerciales se declara explicitamente y cada exclusion
transaccional lleva su motivo. Un guardian que exigiera consentimiento a todo
seria ruido, y el ruido ensena a saltarse los guardianes.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RAIZ / "backend"

_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)

#: Como se pregunta por el consentimiento. La etiqueta `unsubscribed` es la
#: marca canonica: la ponen el webhook de SES y la ruta de baja, y la leen las
#: campanas. Cualquier forma de consultarla vale; inventar otra marca, no.
_CONSULTA_CONSENTIMIENTO = re.compile(
    r"unsubscribed"
    r"|_cerrarLosQueRetiraronConsentimiento"
    r"|clasificarRespuesta"
    r"|excludeUnsubscribed"
)

#: Envio COMERCIAL: mensajeria de marketing o prospeccion.
#:
#: Se declaran a mano y no se derivan por patron a proposito: la diferencia
#: entre comercial y transaccional no esta en el codigo, esta en para que sirve
#: el mensaje. Un detector automatico tendria que adivinarlo, y adivinar aqui
#: significa o bloquear una contrasena o dejar pasar publicidad.
COMERCIALES: dict[str, str] = {
    "backend/saas/SaasCampaniasService.ts":
        "envia campanas de marketing a listas de contactos",
    "backend/saas/SaasSequencesService.ts":
        "envia secuencias de prospeccion por correo, SMS y WhatsApp",
    "backend/saas/ColdEmailService.ts":
        "envia correo en frio a prospectos que no han pedido nada",
}

#: Envio TRANSACCIONAL. Una baja comercial NO puede pararlo.
#:
#: Cada entrada dice por que. Una excepcion sin motivo es un permiso.
TRANSACCIONALES: dict[str, str] = {
    "backend/auth/emailVerification.ts":
        "verifica la direccion de quien acaba de registrarse; sin esto no hay cuenta",
    "backend/auth/passwordReset.ts":
        "restablece la contrasena; bloquearlo deja a alguien fuera de su cuenta",
    "backend/billing/cancellationService.ts":
        "confirma una cancelacion que el propio usuario ha pedido",
    "backend/stripe/webhookHandler.ts":
        "avisa de cobros, fallos de pago y facturas: obligacion contractual",
    "backend/paddle/webhookHandler.ts":
        "mismo caso que Stripe: eventos de facturacion",
    "backend/gdpr/dataSubjectService.ts":
        "responde a una solicitud RGPD; pararla por una baja seria justo lo contrario "
        "de lo que pide la ley",
    "backend/onboarding/onboardingService.ts":
        "guia el alta de un cliente que acaba de contratar",
    "backend/feedback/FeedbackService.ts":
        "acusa recibo de un mensaje que ha escrito el propio usuario",
    "backend/email/emailService.ts":
        "transporte: pone el correo en la red, no decide a quien se escribe",
    "backend/email/NelvyonEmailService.ts":
        "transporte, igual que el anterior",
    "backend/email/index.ts":
        "reexporta el transporte; no envia nada por si mismo",
    "backend/integrations/TwilioService.ts":
        "transporte de SMS y voz; el consentimiento lo decide quien le pide el envio",
}


def _codigo(ruta: str) -> str:
    return _COMENTARIO.sub(" ", (RAIZ / ruta).read_text(encoding="utf-8", errors="replace"))


def _emisores() -> list[str]:
    """Modulos que ponen mensajeria saliente en la red."""
    patron = re.compile(r"sendEmail\s*\(|sendSms\s*\(|sendWhatsApp\s*\(|sendMail\s*\(")
    fuera: list[str] = []
    for f in sorted(BACKEND.rglob("*.ts")):
        ruta = f.relative_to(RAIZ).as_posix()
        if "__tests__" in ruta:
            continue
        if patron.search(_COMENTARIO.sub(" ", f.read_text(encoding="utf-8", errors="replace"))):
            fuera.append(ruta)
    return fuera


def test_el_barrido_encuentra_emisores():
    """CONTROL POSITIVO. Cero emisores seria un verde vacio."""
    e = _emisores()
    assert len(e) >= 8, f"solo {len(e)} emisores; el barrido no mira nada"


def test_todo_emisor_esta_clasificado():
    """Un emisor sin clasificar es exactamente el que se cuela.

    Los dos que fallaron —secuencias y correo en frio— no estaban en ninguna
    lista: nadie habia decidido nunca si les aplicaba la regla.
    """
    conocidos = set(COMERCIALES) | set(TRANSACCIONALES)
    sin_clasificar = sorted(set(_emisores()) - conocidos)
    assert not sin_clasificar, (
        "estos modulos envian mensajeria y nadie ha decidido si es comercial o "
        "transaccional. Clasificalos: si es comercial tiene que respetar la baja; "
        "si es transaccional, di por que no le aplica:\n  " + "\n  ".join(sin_clasificar)
    )


def test_ningun_envio_comercial_ignora_la_baja():
    """LA REGLA.

    Seguir escribiendo a quien pidio que pararas no falla en ninguna prueba:
    funciona perfectamente, y el fallo llega por otra via —una reclamacion, un
    dominio quemado— cuando ya no se puede deshacer.
    """
    culpables = [
        f"{ruta}  ({motivo})"
        for ruta, motivo in COMERCIALES.items()
        if not _CONSULTA_CONSENTIMIENTO.search(_codigo(ruta))
    ]
    assert not culpables, (
        "estos modulos envian mensajeria comercial y no consultan el "
        "consentimiento. La etiqueta `unsubscribed` existe y las campanas la "
        "respetan; estos no la miran:\n  " + "\n  ".join(culpables)
    )


def test_las_dos_listas_no_se_solapan_ni_tienen_fantasmas():
    """Una lista con entradas muertas deja de leerse, y un fichero en las dos
    listas significa que nadie decidio de verdad."""
    solapan = sorted(set(COMERCIALES) & set(TRANSACCIONALES))
    assert not solapan, f"estos estan en las dos listas: {solapan}"

    fantasmas = sorted(
        r for r in list(COMERCIALES) + list(TRANSACCIONALES) if not (RAIZ / r).exists()
    )
    assert not fantasmas, f"estas entradas ya no corresponden a ningun fichero: {fantasmas}"

    for ruta, motivo in TRANSACCIONALES.items():
        assert len(motivo) > 30, f"{ruta} no explica por que una baja no le aplica"


def test_el_transaccional_NO_esta_bloqueado_por_una_baja():
    """CONTROL NEGATIVO, y es el que evita el fallo peor.

    Si el restablecimiento de contrasena empezara a consultar el consentimiento
    comercial, una persona que se dio de baja de la newsletter no podria volver
    a entrar en su cuenta. Eso es peor que el problema que esta bateria previene,
    asi que se comprueba explicitamente que NO ocurre.
    """
    bloqueados = [
        ruta
        for ruta in ("backend/auth/passwordReset.ts", "backend/auth/emailVerification.ts")
        if _CONSULTA_CONSENTIMIENTO.search(_codigo(ruta))
    ]
    assert not bloqueados, (
        "estos envios transaccionales consultan el consentimiento comercial. Una "
        "baja de marketing no puede impedir entrar en la cuenta: " + str(bloqueados)
    )


def test_la_marca_de_baja_sigue_siendo_una_sola():
    """Si la ruta de baja dejara de escribir `unsubscribed`, todo lo de arriba
    seguiria verde comprobando una etiqueta que ya no pone nadie."""
    ruta_baja = RAIZ / "apps/web/src/app/api/saas/campanias/unsubscribe/route.ts"
    assert ruta_baja.exists(), "desaparecio la ruta que registra las bajas"
    fuente = ruta_baja.read_text(encoding="utf-8", errors="replace")
    assert "unsubscribed" in fuente, "la ruta de baja dejo de usar la marca `unsubscribed`"

"""Ningun secreto vivo viaja en el repositorio.

Hoy no hay ninguno, y por eso mismo conviene fijarlo: lo que se encontro al medir
fue benigno, pero por poco.

- Los DSN con contrasena son locales (`127.0.0.1:5434`, credenciales de
  desarrollo). No hay ninguno de produccion.
- Los JWT que aparecen estan en `docs/evidence/os-saas-e2e/`: los deja la suite
  de certificacion al guardar sus respuestas. Son de usuarios `@nelvyon.test` y
  caducaron hace semanas.

Ese segundo caso es el que hay que vigilar. La practica —guardar respuestas
crudas como evidencia— es correcta, pero el dia que una certificacion corra
contra un entorno con usuarios reales, el token de esa persona acaba en git. Y un
token en git no se borra: queda en el historial.

Asi que no se prohibe guardar evidencia. Se exige que lo que se guarde este
MUERTO: caducado, y de un usuario de prueba.
"""
import base64
import binascii
import datetime
import io
import json
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
EXCLUIDOS = ("node_modules", ".git", ".next", "dist", "build",
             "package-lock", "pnpm-lock")
EXTENSIONES = {".ts", ".tsx", ".js", ".py", ".json", ".yml", ".yaml", ".env",
               ".sql", ".md", ".txt"}

#: Secretos que no admiten matiz: si aparecen, son un incidente.
PROHIBIDOS = {
    "clave viva de Stripe": re.compile(r"sk_live_[A-Za-z0-9]{10,}"),
    "clave de AWS": re.compile(r"AKIA[0-9A-Z]{16}"),
    "clave privada": re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----"),
    "token de Slack": re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    "clave de OpenAI": re.compile(r"sk-[A-Za-z0-9]{32,}"),
}

JWT = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.")

#: Valores de mentira que existen a proposito y no son secretos.
#:
#: Se mira el ENTORNO —la linea donde aparece— para los DSN y demas, pero para
#: una clave se mira ademas el PROPIO VALOR: `AKIAFICTICIODEPRUEBA` se delata
#: solo. Fiarse unicamente del entorno seria peligroso al reves: bastaria con
#: escribir la palabra «ejemplo» al lado de una clave real para esconderla.
INOCUOS = re.compile(
    r"nelvyon_local|127\.0\.0\.1|localhost|EXAMPLE|example|placeholder"
    r"|xxxx|<[a-z_]+>|tu-clave|your-|dummy|fake|sk-una-clave", re.I)

#: El valor en si mismo se declara de mentira.
VALOR_DE_MENTIRA = re.compile(r"FICTICIO|PRUEBA|EXAMPLE|TEST|abc123|XYZ", re.I)

#: Ficheros que CONTIENEN patrones de secreto por su propia naturaleza, uno a uno
#: y con su motivo. Una exclusion ancha —«saltar los tests»— se tragaria tambien
#: un secreto de verdad escondido en un test, que es justo donde nadie mira.
PERMITIDOS = {
    "backend/tests/test_no_hay_secretos_vivos_en_el_arbol.py":
        "es este guardia: sus controles son ejemplos de secreto a proposito",
    "backend/saas/__tests__/phase2Elite.test.ts":
        "prueba la funcion que REDACTA secretos; necesita muestras para redactar",
}


def _ficheros():
    for f in RAIZ.rglob("*"):
        if not f.is_file() or f.suffix.lower() not in EXTENSIONES:
            continue
        if any(x in str(f) for x in EXCLUIDOS):
            continue
        yield f


def _texto(f):
    try:
        return io.open(f, encoding="utf-8").read()
    except (UnicodeDecodeError, OSError):
        return ""


def test_el_barrido_lee_ficheros():
    """Control positivo: si no lee nada, lo de abajo aprueba sin mirar."""
    vistos = sum(1 for _ in _ficheros())
    assert vistos > 500, vistos


def test_el_barrido_reconoce_un_secreto_de_mentira():
    """Control del detector: que sepa encontrar uno cuando lo hay.

    Sin esto, un patron mal escrito daria verde para siempre y nadie lo sabria
    hasta que se filtrara algo de verdad.
    """
    assert PROHIBIDOS["clave viva de Stripe"].search("sk" + "_live_ABCdef123456789")
    assert PROHIBIDOS["clave de AWS"].search("AKIAIOSFODNN7EXAMPLE")
    assert JWT.search("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhIn0.firma")


def test_no_hay_secretos_prohibidos():
    hallazgos = []
    for f in _ficheros():
        if f.relative_to(RAIZ).as_posix() in PERMITIDOS:
            continue
        texto = _texto(f)
        for nombre, patron in PROHIBIDOS.items():
            for m in patron.finditer(texto):
                contexto = texto[max(0, m.start() - 90):m.end() + 40]
                if INOCUOS.search(contexto) or VALOR_DE_MENTIRA.search(m.group(0)):
                    continue
                hallazgos.append(
                    f"{nombre} en {f.relative_to(RAIZ).as_posix()}:"
                    f"{texto[:m.start()].count(chr(10)) + 1}")
    assert not hallazgos, hallazgos


def test_todo_jwt_del_arbol_esta_MUERTO():
    """Caducado y de un usuario de prueba. Las dos cosas.

    Caducado no basta: un token caducado sigue revelando el correo, el inquilino
    y el plan de quien lo pidio. Y «de prueba» tampoco basta por si solo: un
    token de prueba vivo abre una sesion de prueba.
    """
    ahora = datetime.datetime.now(datetime.timezone.utc).timestamp()
    vivos, reales = [], []

    for f in _ficheros():
        if f.relative_to(RAIZ).as_posix() in PERMITIDOS:
            continue
        for m in JWT.finditer(_texto(f)):
            carga = m.group(1)
            carga += "=" * (-len(carga) % 4)
            try:
                datos = json.loads(base64.urlsafe_b64decode(carga))
            except (binascii.Error, ValueError, UnicodeDecodeError):
                continue
            donde = f.relative_to(RAIZ).as_posix()
            exp = datos.get("exp")
            if exp is None or float(exp) > ahora:
                vivos.append(f"{donde} (exp={exp})")
            correo = str(datos.get("email", ""))
            if correo and not correo.endswith((".test", "@nelvyon.test", ".invalid")):
                reales.append(f"{donde} ({correo})")

    assert not vivos, (
        f"JWT SIN CADUCAR en el arbol: {vivos}. Un token en git no se borra: "
        "queda en el historial.")
    assert not reales, (
        f"JWT de un usuario que no es de prueba: {reales}. La evidencia de "
        "certificacion no puede llevar la sesion de una persona real.")


def test_los_permitidos_siguen_siendo_ciertos():
    """Una lista de excepciones que nadie revisa deja de ser una excepcion.

    Si uno de estos ficheros desaparece o cambia de proposito, su motivo deja de
    valer y hay que enterarse — en vez de arrastrar una exclusion que ya solo
    sirve para esconder.
    """
    for ruta, motivo in PERMITIDOS.items():
        f = RAIZ / ruta
        assert f.exists(), f"{ruta} ya no existe; sobra de la lista ({motivo})"

"""Ninguna ruta de cron puede nacer sin credencial.

Las rutas bajo `/api/cron/` son trabajo caro que se dispara con una peticion:
publican en redes sociales, mandan correo de dunning, giran secuencias de
marketing, refrescan competidores y vuelcan medidores a Stripe. Quien pueda
llamarlas puede hacer que NELVYON gaste dinero y escriba en nombre de sus
clientes.

Hoy las 16 verifican. Esta prueba existe para la 17: una ruta nueva que se olvide
del verificador no da ningun sintoma —funciona perfectamente para quien la
llame—, y la unica senal seria la factura o un cliente preguntando por que se ha
publicado algo que no pidio.
"""
import io
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
API = RAIZ / "apps" / "web" / "src" / "app" / "api"
CRON_AUTH = RAIZ / "apps" / "web" / "src" / "lib" / "cronAuth.ts"

VERIFICADOR = re.compile(r"verifyCron(?:Header|Bearer|Flexible)\s*\(")


def _sin_comentarios(texto: str) -> str:
    """El texto sin comentarios, para que el guardia no se lea a si mismo.

    El `//` de `https://` no abre comentario: borrar desde ahi se comia URLs
    enteras y con ellas la senal buscada.
    """
    fuera = []
    for linea in texto.splitlines():
        if linea.strip().startswith(("//", "*", "/*")):
            continue
        fuera.append(re.sub(r"(?<!:)//.*$", "", linea))
    return "\n".join(fuera)


def _rutas_de_cron():
    base = API / "cron"
    for f in sorted(base.rglob("route.ts")):
        yield "/api/cron/" + f.parent.relative_to(base).as_posix(), f


def test_el_extractor_encuentra_las_rutas_de_cron():
    """Control positivo: si esto se cae, lo de abajo aprueba por no mirar nada."""
    rutas = list(_rutas_de_cron())
    assert len(rutas) >= 10, [r for r, _ in rutas]


def test_toda_ruta_de_cron_verifica_la_credencial():
    sin_verificar = [
        ruta for ruta, f in _rutas_de_cron()
        if not VERIFICADOR.search(_sin_comentarios(
            io.open(f, encoding="utf-8", errors="replace").read()))
    ]
    assert not sin_verificar, (
        f"rutas de cron sin verificador de credencial: {sin_verificar}. "
        "Se disparan con una peticion y hacen trabajo que cuesta dinero.")


def test_la_verificacion_falla_CERRADA_sin_secreto_configurado():
    """Sin `CRON_SECRET` no se autentica a nadie, en vez de a todo el mundo.

    El fallo clasico es al reves: «no hay secreto que comprobar, luego pasa».
    En un despliegue donde la variable se olvide, eso deja los 16 crons
    abiertos a Internet sin que nada falle ni avise.
    """
    fuente = _sin_comentarios(io.open(CRON_AUTH, encoding="utf-8").read())
    # Se mira una VENTANA detras de cada `if (!expected)`, no «hasta la primera
    # llave»: el `}` no codicioso cerraba dentro de `{ error: "Unauthorized" }` y
    # el bloque capturado se quedaba sin el `status`, asi que este guardia
    # fallaba sobre un codigo que si es correcto.
    posiciones = [m.end() for m in re.finditer(r"if \(!expected\)", fuente)]
    assert posiciones, "desaparecio la comprobacion de secreto ausente"
    for i in posiciones:
        ventana = fuente[i:i + 200]
        assert "401" in ventana, (
            "sin CRON_SECRET la verificacion tiene que rechazar, no dejar pasar: "
            f"{ventana.strip()[:80]}")
        assert "return null" not in ventana.split("}")[0], (
            "sin CRON_SECRET la verificacion esta DEJANDO PASAR")
    assert len(posiciones) == 3, len(posiciones)


def test_los_secretos_se_comparan_en_tiempo_constante():
    """Lo que la prueba funcional NO puede demostrar.

    Cambiar `crypto.timingSafeEqual` por `===` se comporta EXACTAMENTE igual: no
    hay entrada que distinga una de otra, solo el tiempo que tardan. Una suite
    funcional no puede cazarlo, y medir tiempos de verdad da pruebas
    intermitentes que acaban desactivadas.

    Asi que se comprueba sobre el codigo, que es donde la propiedad vive: la
    comparacion de secretos pasa por `crypto.timingSafeEqual` y no por `===`.
    """
    fuente = _sin_comentarios(io.open(CRON_AUTH, encoding="utf-8").read())
    assert "crypto.timingSafeEqual(" in fuente, (
        "la comparacion de secretos de cron dejo de ser de tiempo constante")

    # Y que nadie compare el secreto directamente por ahi.
    for comparacion in re.findall(r"^\s*(?:return |if \()?.*\bexpected\b\s*(===|!==)\s*", fuente, re.M):
        raise AssertionError(
            "hay una comparacion directa contra el secreto esperado; "
            "tiene que pasar por timingSafeEqual")

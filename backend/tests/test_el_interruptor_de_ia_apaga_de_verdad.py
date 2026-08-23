"""Con `NELVYON_AI_ENABLED=0` no sale ni una llamada de pago, haya clave o no.

EL DEFECTO
----------
`core/ai_provider.py` es un embudo bien hecho: sin configuracion explicita
devuelve `None`, y ya estaba probado que «una clave suelta no activa OpenAI».

Pero **25 servicios no pasan por el**. Cada uno tiene su propia copia de
`_openai_client()` —nueve variantes de lo mismo, catorce identicas— que lee
`OPENAI_API_KEY` / `APP_AI_KEY` del entorno y construye el cliente por su cuenta:

    def _openai_client() -> AsyncOpenAI | None:
        key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
        if not key:
            return None
        ...

Asi que el interruptor maestro no apagaba nada en esos caminos: bastaba con que
apareciera una clave en el entorno —puesta para otra cosa, heredada de una
plantilla, copiada de otro servicio— para que 25 servicios empezaran a gastar.

Lo unico que evitaba el gasto era la ausencia de la clave. Eso es una casualidad,
no un interruptor.

QUE SE EXIGE AQUI
-----------------
1. Con el interruptor a 0 y una clave puesta: `None`, en los 25.
2. Con el interruptor a 1 y configuracion completa: cliente, en los 25 — porque
   un interruptor que apaga y no vuelve a encender no es un interruptor, es una
   averia.
3. La degradacion es EXPLICITA. Vale devolver `None` y vale LANZAR: las dos
   dicen «aqui no hay IA» y ninguna se confunde con una respuesta. Lo que no vale
   es entregar un cliente utilizable. La primera version de esta prueba exigia
   `None` y marcaba como culpables cuatro servicios que lanzan `ValueError`
   —degradacion explicita tambien, y mas ruidosa—; el error era de la prueba.
"""
import importlib
import io
import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[1]
SERVICIOS = RAIZ / "services"


def _modulos_con_cliente():
    """Los servicios que construyen su propio cliente de IA."""
    encontrados = []
    for f in sorted(SERVICIOS.glob("*_service.py")):
        texto = io.open(f, encoding="utf-8", errors="replace").read()
        if re.search(r"^def _openai_client\(", texto, re.M):
            encontrados.append(f.stem)
    return encontrados


MODULOS = _modulos_con_cliente()


def _intentar_cliente(modulo: str) -> str:
    """`cliente`, `ninguno` o `error`. Solo el primero significa que se puede gastar."""
    m = importlib.import_module(f"services.{modulo}")
    try:
        return "cliente" if m._openai_client() is not None else "ninguno"
    except Exception:
        return "error"


@pytest.fixture
def entorno_con_clave(monkeypatch):
    """Una clave puesta, como si alguien la hubiera dejado ahi para otra cosa."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-una-clave-cualquiera")
    monkeypatch.setenv("NELVYON_AI_BASE_URL", "https://api.openai.com/v1")
    monkeypatch.delenv("NELVYON_AI_ENABLED", raising=False)
    yield


def test_el_extractor_encuentra_los_servicios():
    """Control positivo: si esto se cae, lo de abajo aprueba por no mirar nada."""
    assert len(MODULOS) >= 20, MODULOS


@pytest.mark.parametrize("modulo", MODULOS)
def test_con_el_interruptor_apagado_no_hay_cliente(modulo, entorno_con_clave):
    """Aunque la clave este puesta: 0 clientes, luego 0 llamadas, luego 0 gasto."""
    assert _intentar_cliente(modulo) != "cliente", (
        f"{modulo} construye un cliente de IA con el interruptor maestro apagado")


@pytest.mark.parametrize("modulo", MODULOS)
def test_EL_CONTROL_con_el_interruptor_encendido_SI_hay_cliente(modulo, monkeypatch):
    """Sin este control, `return None` siempre aprobaria la prueba de arriba.

    Y dejaria la IA rota para siempre sin que nada lo dijera: un interruptor que
    apaga y no vuelve a encender no es un interruptor, es una averia.
    """
    monkeypatch.setenv("NELVYON_AI_ENABLED", "1")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-una-clave-cualquiera")
    monkeypatch.setenv("NELVYON_AI_BASE_URL", "https://api.openai.com/v1")

    # Algunos servicios —`memory_service`— no leen el entorno: leen `settings`,
    # que se resuelve una vez al importar. Cambiar la variable de entorno no les
    # llega, asi que el control tiene que configurarlos por donde miran ellos.
    # Sin esto, este control fallaba y parecia un defecto del guardia cuando lo
    # que fallaba era la prueba.
    m = importlib.import_module(f"services.{modulo}")
    ajustes = getattr(m, "settings", None)
    if ajustes is not None:
        for atributo, valor in (("app_ai_key", "sk-una-clave-cualquiera"),
                                ("app_ai_base_url", "https://api.openai.com/v1")):
            if hasattr(ajustes, atributo):
                monkeypatch.setattr(ajustes, atributo, valor, raising=False)

    assert _intentar_cliente(modulo) == "cliente", (
        f"{modulo} no construye cliente ni con el interruptor encendido")


@pytest.mark.parametrize("modulo", MODULOS)
def test_sin_clave_sigue_sin_cliente_aunque_el_interruptor_este_encendido(
    modulo, monkeypatch
):
    """Encender el interruptor no inventa un proveedor.

    Las dos condiciones son necesarias: interruptor Y configuracion. Si encender
    el interruptor bastara para salir a `api.openai.com` por defecto, el
    interruptor seria un gatillo.
    """
    monkeypatch.setenv("NELVYON_AI_ENABLED", "1")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("APP_AI_KEY", raising=False)
    monkeypatch.delenv("NELVYON_AI_API_KEY", raising=False)

    assert _intentar_cliente(modulo) != "cliente", (
        f"{modulo} construye cliente sin clave configurada")


def test_la_degradacion_es_explicita_y_no_un_falso_exito():
    """`None` es lo que ya tratan todos los llamantes.

    Devolver un cliente falso que respondiera algo inventado seria peor que no
    tener IA: un resultado inventado no se distingue de uno real hasta que alguien
    actua sobre el.
    """
    for modulo in MODULOS:
        f = SERVICIOS / f"{modulo}.py"
        texto = io.open(f, encoding="utf-8", errors="replace").read()
        cuerpo = re.search(r"def _openai_client\(\).*?(?=\n(?:def |class |@|\Z))",
                           texto, re.S)
        assert cuerpo, modulo
        # `return None` o `raise`: las dos dicen «aqui no hay IA» y ninguna se
        # confunde con una respuesta. Exigir solo `None` marcaba como culpables
        # a cuatro servicios que lanzan `ValueError` —degradacion explicita
        # tambien, y mas ruidosa—; el error era de la prueba, no del codigo.
        assert "return None" in cuerpo.group(0) or "raise" in cuerpo.group(0), (
            f"{modulo} no tiene camino de degradacion explicita")

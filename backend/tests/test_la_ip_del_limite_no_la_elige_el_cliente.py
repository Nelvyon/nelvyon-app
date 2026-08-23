"""Los tres limitadores montados deben usar la MISMA nocion de origen.

EL DEFECTO
----------
`main.py` monta tres middlewares que cuentan por IP:

    RateLimiterMiddleware        (middlewares/rate_limiter.py)
    IntelligentRateLimitMiddleware (middleware/rate_limit.py)
    AntiScrapingMiddleware       (middleware/anti_scraping.py)

Solo el del medio usaba `ip_del_cliente`. Los otros dos leian
`x-forwarded-for.split(",")[0]` — el extremo del CLIENTE. Detras de un proxy que
anade al final, ese elemento lo escribe quien hace la peticion:

    manda el atacante : X-Forwarded-For: 9.9.9.9
    reenvia el proxy  : X-Forwarded-For: 9.9.9.9, <ip real>
    leian los dos     : 9.9.9.9

Como esa cadena es la CLAVE del cubo, cambiarla en cada peticion daba un cubo
nuevo y el limite desaparecia.

Y EN ANTI-SCRAPING, PEOR
------------------------
Ahi la clave no solo cuenta: tambien BLOQUEA, y durante `BLOCK_TTL = 3600`. Con
la clave elegible, un atacante podia mandar la IP de OTRO, gastarle el cupo y
dejar a esa persona bloqueada una hora. No es evadir el limite: es usarlo como
arma contra un tercero.

Se arregla en los dos delegando en `core.identidad_peticion.ip_del_cliente`, que
ya existia y ya lee desde el extremo del servidor.
"""
import pytest

from core.identidad_peticion import ip_del_cliente
from middleware.anti_scraping import _client_ip
from middlewares.rate_limiter import RateLimiterMiddleware


class _Cliente:
    def __init__(self, host: str) -> None:
        self.host = host


class _Peticion:
    """Lo minimo que leen las tres funciones: cabeceras y `client`."""

    def __init__(self, cabeceras: dict, host: str = "10.0.0.1") -> None:
        self.headers = {k.lower(): v for k, v in cabeceras.items()}
        self.client = _Cliente(host)


#: Las tres implementaciones que deben coincidir, con su nombre para el informe.
def _limitador_ip(peticion):
    medio = RateLimiterMiddleware(app=None, enabled=True)
    return medio._get_client_ip(peticion)


IMPLEMENTACIONES = [
    ("identidad_peticion.ip_del_cliente", ip_del_cliente),
    ("middlewares/rate_limiter", _limitador_ip),
    ("middleware/anti_scraping", _client_ip),
]


@pytest.mark.parametrize("nombre,fn", IMPLEMENTACIONES)
def test_el_cliente_no_elige_su_cubo(nombre, fn):
    """La cabecera que manda el cliente no puede ganarle a la que pone el proxy."""
    assert fn(_Peticion({"x-forwarded-for": "9.9.9.9, 203.0.113.7"})) == "203.0.113.7", nombre


@pytest.mark.parametrize("nombre,fn", IMPLEMENTACIONES)
def test_una_cadena_larga_de_saltos_falsos_tampoco_sirve(nombre, fn):
    cabecera = "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 203.0.113.7"
    assert fn(_Peticion({"x-forwarded-for": cabecera})) == "203.0.113.7", nombre


@pytest.mark.parametrize("nombre,fn", IMPLEMENTACIONES)
def test_dos_cabeceras_distintas_caen_en_el_mismo_cubo(nombre, fn):
    """Lo que de verdad importa: el limite cuenta en UN solo sitio."""
    a = fn(_Peticion({"x-forwarded-for": "9.9.9.9, 203.0.113.7"}))
    b = fn(_Peticion({"x-forwarded-for": "8.8.8.8, 203.0.113.7"}))
    assert a == b, nombre


@pytest.mark.parametrize("nombre,fn", IMPLEMENTACIONES)
def test_no_se_puede_bloquear_a_un_tercero_suplantando_su_ip(nombre, fn):
    """El caso grave de anti-scraping: gastar el cupo de OTRO.

    Si la clave de la victima se puede escribir desde fuera, gastarle el cupo la
    deja bloqueada `BLOCK_TTL` segundos sin haber hecho nada.
    """
    victima = "198.51.100.20"
    suplantada = fn(_Peticion({"x-forwarded-for": f"{victima}, 203.0.113.7"}))
    assert suplantada != victima, nombre


@pytest.mark.parametrize("nombre,fn", IMPLEMENTACIONES)
def test_EL_CONTROL_dos_clientes_distintos_siguen_separados(nombre, fn):
    """Sin esto, devolver siempre una constante aprobaria todo lo de arriba.

    Y meteria al planeta entero en un solo cubo compartido: «nadie pasa» no es
    proteccion, es una averia.
    """
    a = fn(_Peticion({"x-forwarded-for": "9.9.9.9, 203.0.113.7"}))
    b = fn(_Peticion({"x-forwarded-for": "9.9.9.9, 198.51.100.4"}))
    assert a != b, nombre


@pytest.mark.parametrize("nombre,fn", IMPLEMENTACIONES)
def test_sin_cabecera_cae_a_la_conexion_directa(nombre, fn):
    """El control positivo del camino normal: sin proxy tambien tiene que medir."""
    assert fn(_Peticion({}, host="203.0.113.55")) == "203.0.113.55", nombre

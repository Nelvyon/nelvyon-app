"""El registro de anti-scraping no puede crecer indefinidamente.

EL DEFECTO
----------
`_track_ip` poda las marcas de tiempo DENTRO de cada entrada:

    hits[:] = [t for t in hits if now - t < IP_WINDOW]

pero nunca borra la ENTRADA. Como `_ip_hits` es un `defaultdict`, cada IP
distinta que pasa por el middleware crea una clave que se queda ahi para siempre,
aunque su lista quede vacia. `_blocked_ips` si se poda —lineas 62-64—; este no.

En un SaaS publico eso es memoria que solo sube mientras el proceso viva. Antes
era peor que un goteo: como la clave se leia de `x-forwarded-for.split(",")[0]`,
la elegia el cliente, y bastaba con mandar una IP inventada distinta en cada
peticion para llenar el diccionario a voluntad. Eso ya no se puede —la clave la
pone ahora el proxy—, pero el crecimiento por trafico legitimo sigue.

EL ARREGLO
----------
Un barrido cuando el diccionario pasa de `_MAX_ENTRADAS`, que quita las entradas
sin actividad reciente. Amortizado: no se recorre en cada peticion.
"""
import time

import pytest

from middleware import anti_scraping as m


@pytest.fixture(autouse=True)
def _registro_limpio():
    """Cada prueba parte de cero: el estado es de MODULO y se pega entre pruebas."""
    m._ip_hits.clear()
    m._blocked_ips.clear()
    yield
    m._ip_hits.clear()
    m._blocked_ips.clear()


def test_las_entradas_viejas_se_sueltan():
    """Las IPs de paso no dejan su entrada ahi para siempre.

    Se usa `_MAX_ENTRADAS` en vez de un numero escrito a mano: la prueba se
    ajusta al umbral real. Bajar el umbral para que la prueba pasara seria
    cambiar el producto para acomodar la prueba, no medirlo.
    """
    cuantas = m._MAX_ENTRADAS + 2000
    for i in range(cuantas):
        m._track_ip(f"203.0.113.{i}", suspicious=False)

    # Envejecerlas mas alla de la ventana: ya no son trafico activo.
    for lista in m._ip_hits.values():
        lista[:] = [t - (m.IP_WINDOW + 10) for t in lista]
    m._track_ip("198.51.100.1", suspicious=False)

    assert len(m._ip_hits) < 100, (
        f"quedan {len(m._ip_hits)} entradas de {cuantas} IPs que ya no estan activas")


def test_el_registro_esta_ACOTADO_pase_lo_que_pase():
    """La garantia de verdad: el diccionario no crece sin techo.

    Aunque no paren de llegar IPs nuevas, lo que queda vivo tiene un tope
    relacionado con el umbral, no con cuantas IPs se han visto en toda la vida
    del proceso.
    """
    for i in range(m._MAX_ENTRADAS * 3):
        m._track_ip(f"198.51.100.{i}", suspicious=False)
        if i % 500 == 0:  # el trafico envejece mientras entra trafico nuevo
            for lista in list(m._ip_hits.values()):
                lista[:] = [t - (m.IP_WINDOW + 10) for t in lista]

    assert len(m._ip_hits) <= m._MAX_ENTRADAS + 600, len(m._ip_hits)


def test_EL_CONTROL_una_ip_activa_NO_se_suelta():
    """Sin esto, un barrido que vaciara el registro entero aprobaria lo de arriba.

    Y dejaria el anti-scraping ciego: contar desde cero en cada peticion es no
    contar. La entrada de quien esta llamando AHORA tiene que sobrevivir.
    """
    for _ in range(30):
        m._track_ip("203.0.113.7", suspicious=False)
    for i in range(1200):
        m._track_ip(f"198.51.100.{i % 256}.{i // 256}", suspicious=False)

    assert "203.0.113.7" in m._ip_hits
    assert len(m._ip_hits["203.0.113.7"]) == 30


def test_EL_OTRO_CONTROL_sigue_bloqueando_al_que_martillea():
    """El anti-scraping tiene que seguir haciendo su trabajo."""
    ip = "203.0.113.9"
    permitidas = sum(1 for _ in range(m.IP_MAX + 20) if m._track_ip(ip, suspicious=False))
    assert permitidas == m.IP_MAX, permitidas
    assert m._track_ip(ip, suspicious=False) is False


def test_un_bloqueo_caduca_solo():
    """Y el bloqueo se suelta cuando pasa su tiempo, sin intervencion."""
    ip = "203.0.113.11"
    for _ in range(m.IP_MAX + 5):
        m._track_ip(ip, suspicious=False)
    assert m._track_ip(ip, suspicious=False) is False

    m._blocked_ips[ip] = time.time() - 1        # ya caducado
    m._ip_hits[ip].clear()
    assert m._track_ip(ip, suspicious=False) is True

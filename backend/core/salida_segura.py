"""A donde puede NELVYON hacer una peticion saliente. Fail-closed.

EL DEFECTO QUE ESTO CIERRA
--------------------------
`webhook_service.register_webhook` aceptaba cualquier URL con un `url.strip()` y
despues hacia `POST` a ella. Un inquilino podia registrar un webhook apuntando a:

    http://postgres.railway.internal:5432     la base de datos interna
    http://169.254.169.254/latest/meta-data/  credenciales de la nube
    http://localhost:8000/api/v1/...          la propia aplicacion, desde dentro
    http://10.0.0.5/                          cualquier servicio de la red privada

Y no era SSRF ciego: la respuesta se guarda en `webhook_deliveries.response_body`
—2000 caracteres— y se le devuelve al inquilino. Podia LEER lo que contestara el
servicio interno.

QUE SE COMPRUEBA
----------------
    esquema        solo http y https. `file://`, `gopher://` y compania fuera.
    puerto         solo los normales de web. Nada de 5432, 6379, 11211, 22...
    destino        se RESUELVE el nombre y se rechaza cualquier IP privada, de
                   loopback, de enlace local, reservada o de multicast.
    dominio        los sufijos internos conocidos, aunque resuelvan a publico.

SE COMPRUEBA DOS VECES, Y ESO NO ES REDUNDANCIA
------------------------------------------------
Al REGISTRAR, para dar un error claro en vez de un fallo silencioso semanas
despues. Y otra vez justo ANTES de conectar, porque entre las dos cosas el DNS
puede cambiar: registrar `mi-dominio.com` apuntando a una IP publica y luego
repuntarlo a `127.0.0.1` es el ataque clasico contra un guard que solo valida al
registrar.

La ventana entre la comprobacion y la conexion sigue existiendo —cerrarla del
todo exige fijar la IP resuelta en el socket— pero pasa de semanas a
milisegundos, y queda anotado como lo que es.

LO QUE NO SE HACE
-----------------
No se siguen redirecciones: `httpx` no las sigue por defecto y aqui se deja asi a
proposito. Un 302 hacia `169.254.169.254` convertiria cualquier URL publica en
una interna.
"""
from __future__ import annotations

import ipaddress
import logging
import socket
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

#: Puertos que puede tener un servicio web publico legitimo.
PUERTOS_PERMITIDOS = frozenset({80, 443, 8080, 8443})

#: Sufijos de dominio que son internos por definicion. Se rechazan aunque su DNS
#: resolviera a una IP publica.
SUFIJOS_INTERNOS = (
    ".railway.internal",
    ".internal",
    ".local",
    ".localdomain",
    ".cluster.local",
    ".svc",
)

#: Nombres que no hace falta resolver para saber que no valen.
NOMBRES_PROHIBIDOS = frozenset({"localhost", "ip6-localhost", "ip6-loopback"})


class DestinoNoPermitido(ValueError):
    """La URL apunta a un sitio al que NELVYON no debe hacer peticiones."""


def _ip_es_interna(ip: ipaddress._BaseAddress) -> bool:
    """Todo lo que no sea internet publico de verdad.

    `is_global` seria mas corto pero deja pasar casos segun version; se
    enumeran las clases a proposito para que se vea que se esta rechazando.
    """
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def comprobar_destino(url: str, *, resolver: bool = True) -> str:
    """Lanza `DestinoNoPermitido` si la URL no es un destino publico legitimo.

    Devuelve la URL normalizada cuando pasa. `resolver=False` salta la
    resolucion DNS: solo para pruebas que comprueban las reglas sintacticas.
    """
    crudo = (url or "").strip()
    if not crudo:
        raise DestinoNoPermitido("la URL esta vacia")

    partes = urlparse(crudo)
    if partes.scheme not in ("http", "https"):
        raise DestinoNoPermitido(
            f"esquema '{partes.scheme or '(ninguno)'}' no permitido; solo http y https")

    host = (partes.hostname or "").strip().lower()
    if not host:
        raise DestinoNoPermitido("la URL no tiene host")

    if host in NOMBRES_PROHIBIDOS:
        raise DestinoNoPermitido(f"'{host}' es la propia maquina")

    for sufijo in SUFIJOS_INTERNOS:
        if host == sufijo.lstrip(".") or host.endswith(sufijo):
            raise DestinoNoPermitido(
                f"'{host}' es un nombre de red interna")

    puerto = partes.port or (443 if partes.scheme == "https" else 80)
    if puerto not in PUERTOS_PERMITIDOS:
        raise DestinoNoPermitido(
            f"puerto {puerto} no permitido; solo {sorted(PUERTOS_PERMITIDOS)}. "
            f"Un webhook legitimo no escucha en el puerto de una base de datos.")

    # Una IP escrita directamente no necesita DNS.
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip is not None:
        if _ip_es_interna(ip):
            raise DestinoNoPermitido(f"{ip} no es una direccion publica")
        return crudo

    if not resolver:
        return crudo

    try:
        infos = socket.getaddrinfo(host, puerto, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise DestinoNoPermitido(f"no se pudo resolver '{host}': {exc}") from exc

    if not infos:
        raise DestinoNoPermitido(f"'{host}' no resolvio a ninguna direccion")

    for info in infos:
        direccion = info[4][0]
        try:
            resuelta = ipaddress.ip_address(direccion)
        except ValueError:
            raise DestinoNoPermitido(f"'{host}' resolvio a algo que no es una IP")
        if _ip_es_interna(resuelta):
            # TODAS las direcciones tienen que ser publicas: basta una interna
            # para que el destino sea alcanzable por dentro.
            raise DestinoNoPermitido(
                f"'{host}' resuelve a {resuelta}, que es una direccion interna")

    return crudo


def es_destino_permitido(url: str, *, resolver: bool = True) -> bool:
    """Version booleana, para sitios donde no interesa el motivo."""
    try:
        comprobar_destino(url, resolver=resolver)
        return True
    except DestinoNoPermitido:
        return False

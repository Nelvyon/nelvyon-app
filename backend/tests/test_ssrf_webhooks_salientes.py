"""Un inquilino no puede hacer que NELVYON llame a la red interna.

EL DEFECTO
----------
`webhook_service.register_webhook` aceptaba cualquier URL con un `url.strip()` y
despues hacia `POST` a ella. Un inquilino podia registrar un webhook apuntando a
la base de datos interna, al endpoint de metadatos de la nube o a la propia
aplicacion.

Y NO era SSRF ciego: la respuesta se guarda en
`webhook_deliveries.response_body` —2000 caracteres— y se le devuelve al
inquilino. Podia LEER lo que contestara el servicio interno.

Se encontro buscando huecos de cobertura: de las clases de seguridad del bloque F,
`ssrf` aparecia en CERO ficheros de prueba. No estaba mal cubierta: no estaba
cubierta.

QUE SE COMPRUEBA AQUI
---------------------
Las reglas, cada una por separado, y despues el camino real del servicio. Las
reglas por separado importan porque un guard que bloquea «casi todo» por un
motivo equivocado se rompe en cuanto alguien lo toque.
"""
from __future__ import annotations

import pytest

from core.salida_segura import DestinoNoPermitido, comprobar_destino


# ═══════════════════════════════════════════════════════════════════════════
# Lo que hay que bloquear, y por que cada uno
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("url,razon", [
    ("http://postgres.railway.internal:5432/", "la base de datos interna"),
    ("http://169.254.169.254/latest/meta-data/", "credenciales de la nube"),
    ("http://localhost:8000/api/v1/clients", "la propia aplicacion, desde dentro"),
    ("http://127.0.0.1/", "loopback"),
    ("http://[::1]/", "loopback IPv6"),
    ("http://10.0.0.5/", "red privada clase A"),
    ("http://172.16.0.1/", "red privada clase B"),
    ("http://192.168.1.1/", "red privada clase C"),
    ("http://0.0.0.0/", "sin especificar"),
    ("http://mi-servicio.internal/", "nombre de red interna"),
    ("http://algo.cluster.local/", "servicio de cluster"),
])
def test_los_destinos_internos_se_rechazan(url, razon):
    with pytest.raises(DestinoNoPermitido):
        comprobar_destino(url)


@pytest.mark.parametrize("url", [
    "file:///etc/passwd",
    "gopher://interno/",
    "ftp://interno/",
    "//sin-esquema.com/",
])
def test_solo_http_y_https(url):
    """`file://` leeria ficheros del contenedor; `gopher://` permite hablar con
    protocolos de texto como Redis o SMTP."""
    with pytest.raises(DestinoNoPermitido):
        comprobar_destino(url)


@pytest.mark.parametrize("puerto", [5432, 6379, 11211, 22, 25, 3306, 27017])
def test_los_puertos_de_servicios_internos_se_rechazan(puerto):
    """Un webhook legitimo no escucha en el puerto de una base de datos.

    Esto cierra el caso del dominio PUBLICO apuntando a un puerto interno, que
    la comprobacion de IP no atrapa.
    """
    with pytest.raises(DestinoNoPermitido):
        comprobar_destino(f"https://ejemplo-publico.com:{puerto}/hook",
                          resolver=False)


# ═══════════════════════════════════════════════════════════════════════════
# El control: un guard que bloquea todo no sirve
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("url", [
    "https://hooks.ejemplo-publico.com/nelvyon",
    "http://ejemplo-publico.com:8080/webhook",
    "https://ejemplo-publico.com:8443/webhook",
])
def test_una_url_publica_normal_pasa(url):
    """Sin esto, la forma mas facil de pasar las pruebas de arriba seria
    rechazarlo todo — y entonces ningun cliente podria recibir webhooks."""
    comprobar_destino(url, resolver=False)


# ═══════════════════════════════════════════════════════════════════════════
# El camino real del servicio
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_registrar_un_webhook_interno_falla(db_session):
    """Contra el servicio, no contra el ayudante.

    El defecto no estaba en `comprobar_destino` —no existia— sino en que nadie
    comprobaba nada antes de guardar la URL.
    """
    from services.webhook_service import WebhookService

    svc = WebhookService(db_session, workspace_id=1)
    with pytest.raises(ValueError) as exc:
        await svc.register_webhook(
            url="http://postgres.railway.internal:5432/",
            events=["deliverable.published"])
    assert "no permitida" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_registrar_uno_publico_si_funciona(db_session):
    """Control del anterior contra el servicio real."""
    from services.webhook_service import WebhookService

    svc = WebhookService(db_session, workspace_id=1)
    creado = await svc.register_webhook(
        url="https://hooks.ejemplo-publico.com/nelvyon",
        events=["deliverable.published"])
    assert creado and creado.get("id")


# ═══════════════════════════════════════════════════════════════════════════
# Se comprueba DOS veces, y eso no es redundancia
# ═══════════════════════════════════════════════════════════════════════════


def test_el_servicio_comprueba_tambien_antes_de_conectar():
    """Registrar y entregar pueden estar separados por semanas.

    Un dominio propio registrado apuntando a una IP publica y repuntado despues
    a `127.0.0.1` es el ataque clasico contra un guard que solo valida al
    registrar. Se comprueba que la llamada existe en el camino de entrega.
    """
    import inspect

    from services import webhook_service

    fuente = inspect.getsource(webhook_service)
    entrega = fuente[fuente.index("httpx.AsyncClient") - 2000:
                     fuente.index("httpx.AsyncClient")]
    assert "comprobar_destino" in entrega, (
        "el camino de entrega no vuelve a comprobar el destino: bastaria "
        "repuntar el DNS despues de registrar")


def test_no_se_siguen_redirecciones():
    """Un 302 hacia `169.254.169.254` convertiria cualquier URL publica en una
    interna, y la comprobacion previa no habria servido de nada."""
    import inspect

    from services import webhook_service

    fuente = inspect.getsource(webhook_service)
    assert "follow_redirects=False" in fuente, (
        "el cliente HTTP podria seguir una redireccion hacia la red interna")

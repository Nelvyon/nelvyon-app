"""El destino de un clic tiene que estar en la campana que lo genero.

EL PROBLEMA
-----------
`GET /api/campaigns/track/click/{campaign_id}/{recipient_id}?url=...` es publico
—es el clic de un correo— y redirigia a cualquier http(s) que le pusieran. Eso
convierte el dominio de NELVYON en un trampolin: un enlace con nuestro dominio
delante que aterriza donde el atacante quiera. En un producto de email marketing
eso tiene publico garantizado, y el dominio es justo lo que la victima mira.

POR QUE NO SE FIRMA EL ENLACE
-----------------------------
Firmarlo invalidaria todos los correos ya enviados, que llevan el enlace sin
firma y no se pueden reescribir.

Y no hace falta. Los enlaces legitimos los genera
`CampaignService._wrap_links_for_tracking`, que envuelve los `href` del
contenido de la campana. Es decir: el propio contenido ES la lista de destinos
validos. Comprobar contra el no rompe ningun enlace existente y cierra el salto
arbitrario.

POR QUE LA COMPARACION IGNORA LA QUERY
--------------------------------------
Los enlaces de campana suelen llevar parametros que cambian por destinatario
—`utm_*`, identificadores— y exigir igualdad exacta rechazaria clics legitimos.
Se compara esquema, host y ruta: es lo que decide A DONDE se va. La query no
puede cambiar el destino, solo lo que se le cuenta al llegar.
"""
from __future__ import annotations

import re
from urllib.parse import unquote, urlparse

#: `href="..."` y `href='...'`, que es como los escribe el editor de campanas.
_HREF = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)


def _clave(url: str) -> tuple[str, str, str]:
    """Lo que decide el destino: esquema, host y ruta. La query no."""
    partes = urlparse(unquote(url).strip())
    ruta = partes.path or "/"
    if len(ruta) > 1 and ruta.endswith("/"):
        ruta = ruta.rstrip("/")
    return (partes.scheme.lower(), partes.netloc.lower(), ruta)


def destinos_de(contenido: str | None) -> set[tuple[str, str, str]]:
    """Los destinos http(s) que aparecen en el contenido de la campana."""
    fuera: set[tuple[str, str, str]] = set()
    for bruto in _HREF.findall(contenido or ""):
        clave = _clave(bruto)
        if clave[0] in ("http", "https") and clave[1]:
            fuera.add(clave)
    return fuera


def destino_pertenece_a_la_campana(destino: str, contenido: str | None) -> bool:
    """False si el destino no sale del contenido. Falla cerrado.

    Una campana sin contenido no autoriza ningun destino: es el estado en el que
    la comprobacion no puede hacerse, y dejar pasar «porque no hay con que
    comparar» reabriria exactamente el agujero.
    """
    permitidos = destinos_de(contenido)
    if not permitidos:
        return False
    return _clave(destino) in permitidos

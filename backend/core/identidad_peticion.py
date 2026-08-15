"""Quien hace la peticion, resuelto UNA vez para todo el que lo necesite.

EL FALLO QUE ESTO IMPIDE
------------------------
El limitador de peticiones resolvia la identidad por su cuenta y solo probaba
`decode_access_token`, que valida los JWT nativos de FastAPI con
`JWT_SECRET_KEY`. Pero la mayoria del trafico real llega con tokens emitidos
por el BFF, firmados con `JWT_SECRET` y validados por
`decode_nelvyon_app_token`, que es la segunda via que si prueba
`get_current_user`.

Resultado en produccion: peticiones perfectamente autenticadas —el endpoint las
servia— caian en el cubo ANONIMO del limitador, con diez peticiones por minuto,
y al agotarlo la IP quedaba bloqueada una hora. Se midieron 176
`Token validation failed: JWTError` en una sola ventana y dos bloqueos por
abuso, uno de ellos sobre una IP externa que no era la de la certificacion.

La causa no era el JWTError: era que dos capas respondian por separado a la
misma pregunta —«¿quien es este?»— y una de las dos conocia solo la mitad de
las respuestas. Por eso el arreglo es un unico resolutor compartido y no un
`except` mas.

DOS VIAS DE EVASION QUE SE CIERRAN AQUI
---------------------------------------
1. La clave del cubo anonimo incluia `X-Workspace-Id`. Ese encabezado lo pone
   el cliente, asi que bastaba con ir cambiandolo para estrenar cubo en cada
   peticion y no alcanzar nunca el limite. El trafico anonimo se identifica solo
   por su origen de red.

2. La IP se tomaba del PRIMER valor de `X-Forwarded-For`, que tambien lo pone el
   cliente: enviando uno inventado se conseguia el mismo efecto. La unica parte
   fiable de esa cabecera es la que anade la propia infraestructura, que va al
   final. Se cuenta desde el final tantos saltos como proxies haya de verdad
   delante (`TRUSTED_PROXY_HOPS`, 1 por defecto: Railway).

QUE NO HACE
-----------
No valida claves de API (`nlv_`), que exigen consulta a base de datos: para
limitar basta con reconocer el prefijo y darles cubo propio. Y no decide
politica —limites, ventanas, exenciones—; solo dice quien llama.
"""
from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass
from typing import Optional

from jose import JWTError, jwt

#: Prefijo de las claves de API del producto.
PREFIJO_CLAVE_API = "nlv_"


@dataclass(frozen=True)
class Identidad:
    """Quien llama, y por que via se le reconocio."""

    esquema: str  # "jwt_fastapi" | "jwt_bff" | "clave_api"
    sujeto: str   # id de usuario, o huella de la clave de API

    @property
    def clave(self) -> str:
        """Clave estable y sin secretos para agrupar por identidad."""
        return f"{self.esquema}:{self.sujeto}"


def _secreto_fastapi() -> Optional[str]:
    return os.environ.get("JWT_SECRET_KEY", "").strip() or None


def _secreto_bff() -> Optional[str]:
    """Mismo orden que `core.nelvyon_jwt`: JWT_SECRET y, si no, JWT_SECRET_KEY."""
    bruto = os.environ.get("JWT_SECRET", "").strip()
    if len(bruto) < 32:
        bruto = os.environ.get("JWT_SECRET_KEY", "").strip()
    return bruto if len(bruto) >= 32 else None


def _algoritmo() -> str:
    return os.environ.get("JWT_ALGORITHM", "HS256").strip() or "HS256"


def _sujeto_si_valida(token: str, secreto: Optional[str], algoritmos: list[str]) -> Optional[str]:
    """Decodifica en silencio. Firma mala, caducado o sin sujeto -> None.

    En silencio a proposito: probar el primer esquema y fallar es el camino
    NORMAL de un token del BFF, no una anomalia. Registrarlo como aviso llenaba
    los logs de produccion —176 en una ventana— y enterraba los avisos reales.
    Quien rechaza de verdad una credencial invalida es la autenticacion, que si
    deja rastro.
    """
    if not secreto:
        return None
    try:
        carga = jwt.decode(token, secreto, algorithms=algoritmos)
    except JWTError:
        return None
    if not isinstance(carga, dict):
        return None
    # `sub` es el sujeto normalizado de FastAPI; `userId` el del BFF.
    sujeto = carga.get("sub") or carga.get("userId")
    return str(sujeto) if sujeto else None


def identificar_token(token: Optional[str]) -> Optional[Identidad]:
    """Identidad del portador, probando los esquemas EN EL MISMO ORDEN que la
    autenticacion: clave de API, JWT nativo y JWT del BFF.

    Devuelve None si el token falta, esta caducado, tiene mala firma o no lleva
    sujeto. Un token invalido NO produce identidad: cae en el cubo anonimo, que
    es lo correcto.
    """
    if not token:
        return None
    token = token.strip()
    if not token:
        return None

    if token.startswith(PREFIJO_CLAVE_API):
        # Sin consultar la base: para agrupar basta un prefijo estable, y la
        # validez real la comprueba la autenticacion. Se recorta para que la
        # clave completa no acabe en ninguna estructura ni en ningun log.
        return Identidad(esquema="clave_api", sujeto=token[:16])

    algoritmos = [_algoritmo()]
    sujeto = _sujeto_si_valida(token, _secreto_fastapi(), algoritmos)
    if sujeto:
        return Identidad(esquema="jwt_fastapi", sujeto=sujeto)

    sujeto = _sujeto_si_valida(token, _secreto_bff(), ["HS256"])
    if sujeto:
        return Identidad(esquema="jwt_bff", sujeto=sujeto)

    return None


def token_de_la_peticion(request) -> Optional[str]:
    """El portador, de la cabecera Authorization o de la cookie de sesion.

    Mismo par de fuentes que `dependencies.auth.get_access_token`, mas la cookie
    que emite el BFF (`nelvyon_token`), que es la que usa el navegador.
    """
    autorizacion = request.headers.get("authorization") or ""
    if autorizacion.lower().startswith("bearer "):
        candidato = autorizacion[7:].strip()
        if candidato:
            return candidato
    for nombre in ("nelvyon_session", "nelvyon_token"):
        valor = request.cookies.get(nombre)
        if valor:
            return valor
    return None


def _saltos_de_proxy_confiables() -> int:
    bruto = os.environ.get("TRUSTED_PROXY_HOPS", "").strip()
    try:
        saltos = int(bruto) if bruto else 1
    except ValueError:
        saltos = 1
    return max(0, saltos)


def _normaliza(ip: str) -> Optional[str]:
    """Forma canonica de la IP; None si no lo es.

    Normalizar importa: `::ffff:1.2.3.4` y `1.2.3.4` son el mismo origen, y sin
    canonizar serian dos cubos distintos para el mismo cliente.
    """
    ip = ip.strip()
    if not ip:
        return None
    if ip.startswith("[") and "]" in ip:  # [::1]:443
        ip = ip[1 : ip.index("]")]
    try:
        direccion = ipaddress.ip_address(ip)
    except ValueError:
        # host:puerto en IPv4
        if ip.count(":") == 1:
            try:
                direccion = ipaddress.ip_address(ip.split(":", 1)[0])
            except ValueError:
                return None
        else:
            return None
    if isinstance(direccion, ipaddress.IPv6Address) and direccion.ipv4_mapped:
        direccion = direccion.ipv4_mapped
    return str(direccion)


def ip_del_cliente(request) -> str:
    """Origen de red, contando desde el extremo que anade la infraestructura.

    `X-Forwarded-For` se lee de derecha a izquierda: el ultimo valor lo escribe
    el proxy mas cercano al servidor y el cliente no puede falsearlo; los
    primeros si. Con un salto confiable —el caso de Railway— se toma el ultimo.
    """
    reenviada = request.headers.get("x-forwarded-for") or ""
    partes = [p for p in (x.strip() for x in reenviada.split(",")) if p]
    if partes:
        saltos = _saltos_de_proxy_confiables()
        indice = max(0, len(partes) - max(1, saltos))
        candidata = _normaliza(partes[indice])
        if candidata:
            return candidata
        ultima = _normaliza(partes[-1])
        if ultima:
            return ultima

    directa = getattr(request, "client", None)
    if directa is not None and getattr(directa, "host", None):
        normalizada = _normaliza(directa.host)
        if normalizada:
            return normalizada
    return "desconocida"

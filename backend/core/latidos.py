"""Latidos de los procesos de fondo. Para que un worker mudo no pase por sano.

EL PROBLEMA QUE RESUELVE
------------------------
NELVYON arranca seis bucles de fondo. Autopilot y el vigilante publican su estado
—ciclos, frescura, cerrojo, ultimo error— y por eso el fallo del cerrojo del
planner se pudo ver: `con_cerrojo: false` estaba a la vista.

Los otros tres —publicacion social, reentrenamiento e informes ejecutivos— no
publicaban nada. Arrancaban, y a partir de ahi eran invisibles. Si uno moria, se
quedaba mudo o se atascaba, no habia forma de saberlo: el API respondia 200, el
proceso vivia, y el trabajo simplemente dejaba de hacerse.

Es exactamente el modo de fallo contra el que existe todo este proyecto: un
sistema que no falla y tampoco funciona.

POR QUE EN MEMORIA Y NO EN LA BASE
-----------------------------------
Porque escribir una fila por tick añade carga a la base para observar procesos
que ya escriben en ella cuando trabajan, y porque exigiria una migracion. El
latido en memoria responde la pregunta que importa —«¿este bucle sigue vivo y
cuando dio su ultima vuelta?»— y se pierde al reiniciar, que es lo correcto: tras
un reinicio no hay historia que conservar, hay un proceso nuevo.

Lo que NO responde es «¿estuvo caido mientras nadie miraba?». Para eso hace falta
persistencia, y es una decision aparte con su propia migracion.

QUE ES «FRESCO»
---------------
Cada bucle declara su intervalo. Se considera fresco mientras su ultimo latido no
supere DOS intervalos y medio: uno de margen para la vuelta en curso, medio para
la latencia. Un umbral mas ajustado daria falsos positivos en cada tick lento; uno
mas laxo tardaria demasiado en ver un bucle muerto.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

#: Cuantos intervalos puede tardar un latido antes de considerarse rancio.
MARGEN = 2.5


@dataclass
class Latido:
    """Lo que se sabe de un bucle de fondo."""

    nombre: str
    intervalo_seg: int
    vueltas: int = 0
    ultimo: Optional[datetime] = None
    ultimo_error: Optional[str] = None
    #: Contadores propios del bucle: publicados, omitidos, lo que declare.
    detalle: dict[str, Any] = field(default_factory=dict)
    arrancado_en: Optional[datetime] = None


_LATIDOS: dict[str, Latido] = {}
_CERROJO = threading.Lock()


def registrar(nombre: str, intervalo_seg: int) -> None:
    """Declara un bucle. Se llama AL ARRANCAR, no en el primer tick.

    La diferencia importa: un bucle que se registra al arrancar y nunca late se
    ve como `nunca_ha_latido`. Uno que solo apareciera en su primer tick seria
    indistinguible de uno que no existe.
    """
    with _CERROJO:
        _LATIDOS[nombre] = Latido(nombre=nombre, intervalo_seg=int(intervalo_seg),
                                  arrancado_en=datetime.now(timezone.utc))


def latir(nombre: str, error: Optional[str] = None, **detalle: Any) -> None:
    """Una vuelta completa del bucle. Se llama al TERMINARLA, no al empezarla."""
    with _CERROJO:
        l = _LATIDOS.get(nombre)
        if l is None:
            l = Latido(nombre=nombre, intervalo_seg=60,
                       arrancado_en=datetime.now(timezone.utc))
            _LATIDOS[nombre] = l
        l.vueltas += 1
        l.ultimo = datetime.now(timezone.utc)
        l.ultimo_error = error
        if detalle:
            l.detalle.update(detalle)


def _frescura(l: Latido, ahora: datetime) -> str:
    if l.ultimo is None:
        # Recien arrancado: casi todos esperan unos segundos antes del primer
        # tick, asi que no se declara muerto de inmediato.
        arranque = l.arrancado_en or ahora
        if ahora - arranque < timedelta(seconds=l.intervalo_seg * MARGEN):
            return "arrancando"
        return "nunca_ha_latido"
    if ahora - l.ultimo > timedelta(seconds=l.intervalo_seg * MARGEN):
        return "rancio"
    return "ok"


def estado(ahora: Optional[datetime] = None) -> dict[str, Any]:
    """Estado de todos los bucles. Nunca lanza: es una ruta de salud."""
    ahora = ahora or datetime.now(timezone.utc)
    with _CERROJO:
        bucles = list(_LATIDOS.values())

    detalle = {}
    for l in bucles:
        f = _frescura(l, ahora)
        detalle[l.nombre] = {
            "frescura": f,
            "vueltas": l.vueltas,
            "intervalo_seg": l.intervalo_seg,
            "ultimo": l.ultimo.isoformat() if l.ultimo else None,
            "ultimo_error": l.ultimo_error,
            **l.detalle,
        }

    rancios = [n for n, d in detalle.items()
               if d["frescura"] in ("rancio", "nunca_ha_latido")]
    con_error = [n for n, d in detalle.items() if d["ultimo_error"]]

    # Sin ningun bucle registrado NO se dice «healthy»: o el arranque fallo, o
    # este proceso no es el que los corre. Las dos cosas hay que verlas.
    if not detalle:
        estado_global = "unknown"
    elif rancios:
        estado_global = "degraded"
    else:
        estado_global = "healthy"

    return {
        "status": estado_global,
        "bucles": detalle,
        "rancios": rancios,
        "con_error": con_error,
        "registrados": len(detalle),
    }


def olvidar_todo() -> None:
    """Solo para pruebas. Nunca se llama en produccion."""
    with _CERROJO:
        _LATIDOS.clear()

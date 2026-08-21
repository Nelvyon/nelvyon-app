"""El enrutador de modelos. Desacoplado del proveedor, y fail-closed.

POR QUE UN ENRUTADOR Y NO UNA LLAMADA DIRECTA
---------------------------------------------
Porque el proveedor cambia y la arquitectura no debe cambiar con el. Un agente
pide un NIVEL —`rapido`, `estandar`, `profundo`— y este modulo decide con que se
sirve. Cambiar de proveedor, de modelo o de precios es tocar una tabla de
constantes; no es reescribir veintitantos agentes.

QUE NO HACE
-----------
No inventa un endpoint. `core/ai_provider` ya resuelve eso con precedencia
explicita y SIN fallback a api.openai.com; aqui se respeta esa decision. Si no
hay endpoint configurado, este modulo devuelve `NO_CONFIGURADO` y el runtime
registra la ejecucion como `sin_modelo` y escala.

Eso importa mas de lo que parece: la alternativa habitual —degradar a «responde
lo mejor que puedas»— produce un agente que inventa con total confianza, y en un
sistema que actua sobre clientes reales eso es peor que no hacer nada.

EL COSTE SE ESTIMA ANTES, NO SE DESCUBRE DESPUES
------------------------------------------------
El presupuesto se comprueba antes de llamar. Para eso hace falta una estimacion,
y para estimar hace falta una tabla de precios. La de abajo es explicita y
versionada: si un precio cambia y nadie actualiza esto, el sistema gastara mas de
lo que cree. Por eso `PRECIOS` lleva fecha y hay una prueba que obliga a
revisarla.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

logger = logging.getLogger(__name__)

NIVELES = ("rapido", "estandar", "profundo")

#: Que modelo sirve cada nivel. La clave es el nivel; el valor es el nombre que
#: se le pasa al endpoint. Cambiar de proveedor es cambiar esta tabla.
#:
#: Nada de esto se elige solo: `NELVYON_MODELO_<NIVEL>` lo sobreescribe, para que
#: el operador pueda apuntar a un modelo local sin tocar codigo.
MODELO_POR_NIVEL: dict[str, str] = {
    "rapido": "gpt-4o-mini",
    "estandar": "gpt-4o",
    "profundo": "gpt-4o",
}

#: Precio por millon de tokens, en centimos de euro. Entrada y salida.
#:
#: REVISADO: 2026-08-21. Si esta fecha envejece demasiado, la prueba
#: `test_los_precios_no_pueden_envejecer_en_silencio` lo dice: un presupuesto
#: calculado con precios de hace un año no es un presupuesto.
PRECIOS_REVISADOS_EN = "2026-08-21"
PRECIOS: dict[str, tuple[int, int]] = {
    # modelo: (centimos por millon de tokens de entrada, idem de salida)
    "gpt-4o-mini": (15, 60),
    "gpt-4o": (250, 1000),
}

#: Lo que se cobra cuando el modelo no esta en la tabla. Deliberadamente CARO:
#: un modelo desconocido debe consumir presupuesto rapido y hacerse notar, no
#: colarse como gratis.
PRECIO_DESCONOCIDO = (1000, 4000)


@dataclass(frozen=True)
class Eleccion:
    """Con que se va a servir esta peticion, y cuanto se espera que cueste."""

    disponible: bool
    modelo: str
    base_url: str
    #: `True` si el destino es infraestructura propia de NELVYON.
    propio: bool
    motivo: str = ""

    @property
    def no_configurado(self) -> bool:
        return not self.disponible


def _modelo_de(nivel: str) -> str:
    import os

    override = (os.environ.get(f"NELVYON_MODELO_{nivel.upper()}") or "").strip()
    return override or MODELO_POR_NIVEL.get(nivel, MODELO_POR_NIVEL["estandar"])


def elegir(nivel: str) -> Eleccion:
    """Resuelve nivel -> modelo + endpoint. Nunca inventa un destino."""
    if nivel not in NIVELES:
        return Eleccion(False, "", "", False,
                        f"nivel de modelo desconocido: {nivel!r}")

    from core.ai_provider import resolve_ai_endpoint

    try:
        endpoint = resolve_ai_endpoint()
    except Exception as exc:  # noqa: BLE001
        logger.warning("router de modelos: no se pudo resolver el endpoint: %s", exc)
        return Eleccion(False, "", "", False, f"error al resolver: {type(exc).__name__}")

    if endpoint is None:
        return Eleccion(
            False, "", "", False,
            "no hay endpoint de IA configurado (NELVYON_AI_BASE_URL / "
            "OPENAI_BASE_URL). La capacidad queda NOT_CONFIGURED: no se degrada "
            "a inventar una respuesta")

    return Eleccion(True, _modelo_de(nivel), endpoint.base_url,
                    bool(getattr(endpoint, "nelvyon_controlled", False)))


def coste_estimado_centimos(modelo: str, tokens_entrada: int,
                            tokens_salida: int) -> int:
    """Coste en centimos, redondeado SIEMPRE hacia arriba.

    Hacia arriba a proposito: un presupuesto que redondea a la baja se pasa un
    poco cada vez, y «un poco cada vez» es como se acaba con una factura que
    nadie esperaba.
    """
    entrada, salida = PRECIOS.get(modelo, PRECIO_DESCONOCIDO)
    total = (max(0, tokens_entrada) * entrada + max(0, tokens_salida) * salida)
    # Division con techo, sin float: los centimos no admiten error de coma
    # flotante acumulado.
    return -(-total // 1_000_000)


def estimar_tokens(texto: str) -> int:
    """Estimacion deliberadamente CONSERVADORA: ~3 caracteres por token.

    La regla habitual es ~4. Se usa 3 para sobrestimar: en un control de
    presupuesto, equivocarse por exceso frena de mas y equivocarse por defecto
    deja pasar un gasto que no estaba autorizado.
    """
    return max(1, (len(texto or "") + 2) // 3)

"""Embeddings para NELVYON, sin depender de una API de pago.

POR QUE EXISTE
--------------
`services/memory_service` exigia `APP_AI_BASE_URL` + `APP_AI_KEY` y hablaba con un
cliente OpenAI. En produccion solo esta la clave, asi que TODA llamada lanzaba
`ValueError("AI service not configured")`: ni escritura ni busqueda. Por eso
`client_memory` tiene cero filas.

Mientras tanto NELVYON ya tiene IA propia —`backend/local-ai/`, con
`LocalEmbeddingProvider`, cliente de Ollama, migraciones y simetria de RLS— pero
esa pila es TypeScript y NINGUN modulo Python la conocia. Dos pilas paralelas,
que es la deuda que la evidencia de `ai.ollama_rag_dual` ya declaraba.

Este modulo es el puente, y la regla es: **primero lo propio, nunca lo de pago
por defecto**.

ORDEN DE RESOLUCION
-------------------
    1. Ollama propio        si hay `OLLAMA_BASE_URL` / `NELVYON_LOCAL_AI_URL` /
                            `OLLAMA_HOST`. Coste cero: corre en hardware propio.
    2. Respaldo lexico      determinista, en proceso, sin red y sin coste. No es
                            un modelo neuronal y no pretende serlo: mantiene la
                            memoria FUNCIONANDO y degradada en vez de caida.
    3. OpenAI               SOLO si alguien pone `APP_AI_BASE_URL` a proposito.
                            Nunca por defecto.

NUNCA SE MEZCLAN VECTORES DE MODELOS DISTINTOS
----------------------------------------------
Dos embebedores distintos producen espacios distintos. Comparar un vector lexico
con uno de Ollama da una similitud que parece un numero y no significa nada — y
esa es la peor clase de fallo, porque devuelve resultados en vez de un error.

Cada vector se guarda con el nombre del modelo que lo produjo, y toda busqueda
filtra por el modelo ACTIVO. Cambiar de modelo no corrompe nada: los recuerdos
viejos dejan de encontrarse hasta que se reindexen, y eso se puede contar y
mostrar. Se guarda en `metadata`, que ya existe: no hace falta migracion.
"""
from __future__ import annotations

import hashlib
import logging
import math
import os
import re
from dataclasses import dataclass
from typing import Iterable, Sequence

logger = logging.getLogger(__name__)

#: Dimension del indice. Fijada por la columna `vector(1536)` de `client_memory`.
DIMENSION = 1536

#: Nombre del respaldo. Va dentro de cada vector que produce, para que ninguna
#: busqueda lo confunda con uno de Ollama.
MODELO_RESPALDO = "nelvyon-lexico-v1"


class EmbeddingsNoDisponibles(RuntimeError):
    """No hay ningun proveedor utilizable y el modo estricto lo exige."""


@dataclass(frozen=True)
class Vector:
    valores: list[float]
    modelo: str
    #: `True` cuando viene del respaldo lexico: la calidad es menor y quien lo
    #: consuma tiene derecho a saberlo en vez de deducirlo.
    degradado: bool


# ═══════════════════════════════════════════════════════════════════════════
# De donde sale el proveedor propio
# ═══════════════════════════════════════════════════════════════════════════


def url_de_ollama() -> str:
    """La URL del Ollama propio, normalizada.

    `OLLAMA_HOST` es, en la convencion OFICIAL de Ollama, un `host:port` SIN
    esquema. La pila TypeScript ya documenta que consumirlo tal cual producia
    `Failed to parse URL` y el sistema lo reportaba como «ollama inalcanzable»,
    indistinguible de «no esta levantado». Se normaliza igual aqui para no
    repetir el mismo fallo en el otro lenguaje.
    """
    crudo = ""
    for nombre in ("OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "OLLAMA_HOST"):
        crudo = (os.environ.get(nombre) or "").strip()
        if crudo:
            break
    if not crudo:
        return ""
    if not re.match(r"^https?://", crudo):
        crudo = "http://" + crudo
    return crudo.rstrip("/")


def modelo_de_embeddings() -> str:
    return (os.environ.get("OLLAMA_EMBEDDING_MODEL")
            or os.environ.get("NELVYON_EMBEDDING_MODEL")
            or "nomic-embed-text")


def modo_estricto() -> bool:
    """Con esto puesto, NO se degrada: se corta.

    Existe porque hay contextos donde media memoria es peor que ninguna —una
    busqueda de conocimiento que decide una respuesta a un cliente— y quien
    opera debe poder exigir calidad o nada.
    """
    return (os.environ.get("NELVYON_EMBEDDINGS_STRICT") or "").strip() in ("1", "true", "yes")


# ═══════════════════════════════════════════════════════════════════════════
# El respaldo: determinista, sin red, sin coste
# ═══════════════════════════════════════════════════════════════════════════


_PALABRA = re.compile(r"[a-z0-9áéíóúüñ]+", re.IGNORECASE)


def _fichas(texto: str) -> list[str]:
    """Palabras normalizadas mas bigramas: sin bigramas, «no cobrar» y «cobrar»
    quedan casi identicos, que es justo lo contrario de lo que hace falta."""
    palabras = [p.lower() for p in _PALABRA.findall(texto or "")]
    bigramas = [f"{a}_{b}" for a, b in zip(palabras, palabras[1:])]
    return palabras + bigramas


def vector_lexico(texto: str, dimension: int = DIMENSION) -> list[float]:
    """Hashing de caracteristicas con signo, normalizado a la unidad.

    QUE ES Y QUE NO ES
    ------------------
    Es una tecnica clasica —feature hashing— que proyecta las fichas del texto en
    un espacio fijo. Recupera coincidencias LEXICAS: dos textos que comparten
    palabras salen cercanos.

    NO entiende sinonimos ni parafrasis. No sustituye a un modelo neuronal y no
    se presenta como tal: los vectores que produce llevan su propio nombre de
    modelo y jamas se comparan con los de Ollama.

    El signo del hash evita que dos fichas distintas se sumen siempre en la misma
    direccion, que es lo que degrada un hashing ingenuo.
    """
    acumulado = [0.0] * dimension
    for ficha in _fichas(texto):
        digest = hashlib.blake2b(ficha.encode("utf-8"), digest_size=8).digest()
        indice = int.from_bytes(digest[:4], "big") % dimension
        signo = 1.0 if digest[4] & 1 else -1.0
        acumulado[indice] += signo

    norma = math.sqrt(sum(v * v for v in acumulado))
    if norma == 0.0:
        # Texto sin fichas: un vector cero haria que la similitud coseno fuera
        # indefinida y pgvector devolveria NaN. Se marca una posicion estable.
        acumulado[0] = 1.0
        return acumulado
    return [v / norma for v in acumulado]


# ═══════════════════════════════════════════════════════════════════════════
# La entrada publica
# ═══════════════════════════════════════════════════════════════════════════


async def embeber(texto: str) -> Vector:
    """El vector de `texto`, del mejor proveedor disponible.

    Nunca llama a un proveedor de pago salvo que alguien lo haya configurado a
    proposito. Si el propio no responde, degrada al respaldo lexico y lo dice —
    salvo en modo estricto, donde corta.
    """
    entrada = (texto or "").strip()
    if not entrada:
        raise ValueError("no se puede embeber texto vacio")

    base = url_de_ollama()
    if base:
        try:
            valores = await _embeber_con_ollama(base, entrada)
            return Vector(valores, modelo_de_embeddings(), degradado=False)
        except Exception as exc:  # noqa: BLE001
            if modo_estricto():
                raise EmbeddingsNoDisponibles(
                    f"Ollama propio no responde ({type(exc).__name__}) y el modo "
                    f"estricto prohibe degradar") from exc
            logger.warning(
                "embeddings_degradado",
                extra={"embeddings_motivo": type(exc).__name__,
                       "embeddings_base": base},
            )

    elif modo_estricto():
        raise EmbeddingsNoDisponibles(
            "no hay proveedor de embeddings propio configurado "
            "(OLLAMA_BASE_URL / NELVYON_LOCAL_AI_URL / OLLAMA_HOST) y el modo "
            "estricto prohibe el respaldo lexico")

    return Vector(vector_lexico(entrada), MODELO_RESPALDO, degradado=True)


async def _embeber_con_ollama(base: str, texto: str) -> list[float]:
    """Habla con el Ollama propio. Acepta sus dos formas de API.

    `/api/embeddings` es la antigua y `/api/embed` la nueva; segun version
    responde una u otra, asi que se prueban las dos antes de darlo por caido.
    """
    import httpx

    modelo = modelo_de_embeddings()
    async with httpx.AsyncClient(timeout=120.0) as cliente:
        r = await cliente.post(f"{base}/api/embeddings",
                               json={"model": modelo, "prompt": texto})
        if r.status_code == 404:
            r = await cliente.post(f"{base}/api/embed",
                                   json={"model": modelo, "input": texto})
        r.raise_for_status()
        cuerpo = r.json()

    vector = cuerpo.get("embedding") or (cuerpo.get("embeddings") or [[]])[0]
    if not vector:
        raise RuntimeError("Ollama devolvio un embedding vacio")
    return _ajustar_dimension([float(x) for x in vector])


def _ajustar_dimension(vector: list[float]) -> list[float]:
    """Encaja el vector en la dimension del indice sin mentir sobre el resultado.

    Los modelos propios no tienen por que producir 1536 —`nomic-embed-text` da
    768—. Truncar o rellenar con ceros conserva la geometria lo suficiente para
    una busqueda por coseno DENTRO del mismo modelo, que es la unica comparacion
    que este modulo permite.

    Lo que no se hace es fingir que un vector de 768 y uno de 1536 son
    comparables: cada uno queda etiquetado con su modelo.
    """
    if len(vector) == DIMENSION:
        return vector
    if len(vector) > DIMENSION:
        return vector[:DIMENSION]
    return vector + [0.0] * (DIMENSION - len(vector))


# ═══════════════════════════════════════════════════════════════════════════
# Estado, para que la degradacion se vea
# ═══════════════════════════════════════════════════════════════════════════


async def estado() -> dict:
    """Que proveedor hay y si responde. Para `/health` y para el panel.

    Un sistema de memoria degradado que no lo dice es indistinguible de uno
    sano que no encuentra nada.
    """
    base = url_de_ollama()
    info: dict = {
        "proveedor": "ollama_propio" if base else "respaldo_lexico",
        "modelo": modelo_de_embeddings() if base else MODELO_RESPALDO,
        "estricto": modo_estricto(),
        "coste_por_llamada": False,
    }
    if not base:
        info["estado"] = "degradado"
        info["motivo"] = (
            "no hay Ollama propio configurado; se usa el respaldo lexico, que "
            "encuentra coincidencias de palabras pero no de significado")
        return info

    info["url_configurada"] = True
    try:
        import httpx

        async with httpx.AsyncClient(timeout=5.0) as cliente:
            r = await cliente.get(f"{base}/api/tags")
            r.raise_for_status()
            modelos = [m.get("name", "") for m in (r.json().get("models") or [])]
        info["estado"] = "ok"
        info["modelos_cargados"] = len(modelos)
        deseado = modelo_de_embeddings()
        if not any(m.split(":")[0] == deseado.split(":")[0] for m in modelos):
            info["estado"] = "degradado"
            info["motivo"] = (
                f"el modelo `{deseado}` no esta descargado en el Ollama propio; "
                f"hay {len(modelos)}. Se degrada al respaldo lexico.")
    except Exception as exc:  # noqa: BLE001
        info["estado"] = "inalcanzable"
        info["motivo"] = f"{type(exc).__name__}: no responde en {base}"
    return info


def similitud(a: Sequence[float], b: Sequence[float]) -> float:
    """Coseno. Solo tiene sentido entre vectores del MISMO modelo."""
    num = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return 0.0 if na == 0 or nb == 0 else num / (na * nb)


def a_pgvector(valores: Iterable[float]) -> str:
    return "[" + ",".join(str(float(v)) for v in valores) + "]"

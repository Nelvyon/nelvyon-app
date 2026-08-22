"""El estado de la IA propia es visible, y distingue degradado de ausente.

POR QUE HACIA FALTA
-------------------
NELVYON tiene su propia pila de IA —Ollama en hardware propio, coste cero— y dos
capacidades dependen de ella: la memoria de los agentes y los comandos de voz.
Las dos estaban CAIDAS en produccion y no habia forma de verlo:

    `/health/ready`     200
    `/health/business`  ok
    `client_memory`     cero filas

Una capacidad apagada sin senal es indistinguible de una que nadie usa. El
sintoma es el mismo que el de los seis webhooks inalcanzables y el de los tres
bucles de fondo mudos: silencio que parece calma.

LA DISTINCION QUE MAS IMPORTA
-----------------------------
`degradada` y `no_disponible` NO son lo mismo, y mezclarlas seria mentir en las
dos direcciones:

    memoria    DEGRADADA. Sin Ollama se embebe con el respaldo lexico: encuentra
               coincidencias de palabras, no de significado. Funciona peor, pero
               funciona.
    voz        NO DISPONIBLE. No hay respaldo local para transcribir audio. No se
               degrada: no esta.

Decir «degradada» de la voz haria creer que algo llega. Decir «no disponible» de
la memoria haria buscar un fallo que no existe.
"""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_la_ruta_responde_sin_autenticacion(client):
    """Es una ruta de salud: tiene que poder consultarse desde fuera."""
    r = await client.get("/health/ia")
    assert r.status_code == 200, r.text


async def test_nunca_devuelve_5xx_aunque_no_haya_ia(client):
    """Una IA degradada no puede hacer que el orquestador reinicie el contenedor.

    Es la misma regla que `/health/workers`: informar de un problema no puede
    causar uno mayor.
    """
    r = await client.get("/health/ia")
    assert r.status_code < 500


async def test_declara_que_no_hay_coste_por_llamada(client):
    """La restriccion del fundador, comprobada: nada de proveedores de pago.

    Si algun dia se conectara uno, este campo tendria que cambiar — y esta prueba
    obligaria a decirlo en vez de que pasara desapercibido.
    """
    cuerpo = (await client.get("/health/ia")).json()
    assert cuerpo["coste_por_llamada"] is False


async def test_distingue_degradado_de_no_disponible(client, monkeypatch):
    """LA PRUEBA. Sin Ollama, memoria degradada y voz ausente."""
    for v in ("OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "OLLAMA_HOST"):
        monkeypatch.delenv(v, raising=False)
    from core.config import settings
    monkeypatch.setattr(settings, "app_ai_base_url", "", raising=False)

    cuerpo = (await client.get("/health/ia")).json()
    por_nombre = {c["capacidad"]: c for c in cuerpo["capacidades"]}

    assert por_nombre["memoria_de_agentes"]["estado"] == "degradada", (
        "la memoria funciona con el respaldo lexico: llamarla `no_disponible` "
        "haria buscar un fallo que no existe")
    assert por_nombre["comandos_de_voz"]["estado"] == "no_disponible", (
        "no hay respaldo local para transcribir: llamarla `degradada` haria "
        "creer que algo llega")


async def test_cada_capacidad_rota_explica_la_consecuencia(client):
    """Un estado sin consecuencia no es accionable.

    «degradada» a secas no dice si hay que actuar hoy o el mes que viene.
    """
    cuerpo = (await client.get("/health/ia")).json()
    for c in cuerpo["capacidades"]:
        if c["estado"] == "ok":
            continue
        assert c.get("consecuencia"), (
            f"`{c['capacidad']}` esta en estado `{c['estado']}` y no dice que "
            f"implica para el producto")
        assert len(c["consecuencia"]) > 40, (
            f"la consecuencia de `{c['capacidad']}` es demasiado corta para "
            f"servir de algo: {c['consecuencia']!r}")


async def test_nombra_el_bloqueo_externo_cuando_lo_hay(client, monkeypatch):
    """Que el bloqueo tenga nombre es lo que lo hace accionable.

    «la IA no va» no se puede resolver. «falta la clave de la malla privada» si.
    """
    for v in ("OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "OLLAMA_HOST"):
        monkeypatch.delenv(v, raising=False)

    cuerpo = (await client.get("/health/ia")).json()
    assert cuerpo.get("bloqueo_externo"), "no se nombra el bloqueo"
    assert "MESH_AUTHKEY" in cuerpo["bloqueo_externo"]


async def test_el_estado_global_es_el_peor_de_las_capacidades(client):
    """Un resumen que promedia esconde la capacidad rota entre las que van bien.

    Con la voz ausente y la memoria degradada, el global tiene que ser
    `no_disponible`: lo contrario invitaria a no mirar el detalle.
    """
    cuerpo = (await client.get("/health/ia")).json()
    estados = {c["estado"] for c in cuerpo["capacidades"]}
    if "no_disponible" in estados:
        assert cuerpo["status"] == "no_disponible"
    elif "degradada" in estados:
        assert cuerpo["status"] == "degradada"
    else:
        assert cuerpo["status"] == "ok"

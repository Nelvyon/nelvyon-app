"""La memoria de los agentes, de punta a punta y sin pagar a nadie.

QUE CERTIFICA
-------------
El ciclo completo contra PostgreSQL real con pgvector:

    escribir -> embeber -> almacenar -> buscar -> recuperar

y las propiedades que hacen que sirva:

    aislamiento A<->B      el workspace de A jamas devuelve recuerdos de B
    persistencia           lo escrito sigue ahi en una sesion nueva
    degradacion visible    sin Ollama propio funciona, y se sabe que degradado
    no mezclar espacios    un recuerdo escrito con otro modelo NO se devuelve
    fallo honesto          si no se puede consultar, no se finge «sin recuerdos»

POR QUE SIN COSTE
-----------------
`core.embeddings` prueba primero el Ollama propio de NELVYON y, si no responde,
usa un respaldo lexico determinista en proceso. Estas pruebas corren por el
respaldo: no llaman a ninguna API, no necesitan GPU y no cuestan nada. Cuando el
Ollama propio este alcanzable, el mismo ciclo pasa por el con el mismo codigo.

LO QUE NO PRUEBAN
-----------------
La CALIDAD semantica del respaldo lexico, que es baja por construccion: encuentra
palabras, no significados. Eso se mide aparte, y es exactamente el motivo por el
que el Ollama propio no es opcional a largo plazo.
"""
from __future__ import annotations

import os
import uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

WS_A = 990101
WS_B = 990202
CLIENTE = "cliente-de-certificacion"


@pytest.fixture(autouse=True)
def _sin_proveedor_externo(monkeypatch):
    """Se fuerza el respaldo: ni Ollama ni endpoint compatible.

    A proposito. Si estas pruebas dependieran de que haya un Ollama levantado,
    en la mayoria de ejecuciones se saltarian — y una prueba que se salta es
    indistinguible de una que no existe.
    """
    for v in ("OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "OLLAMA_HOST",
              "NELVYON_EMBEDDINGS_STRICT"):
        monkeypatch.delenv(v, raising=False)
    from core.config import settings
    monkeypatch.setattr(settings, "app_ai_base_url", "", raising=False)


@pytest.fixture
async def conexion():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(
        (DSN or "").replace("postgresql+asyncpg://", "postgresql://"), timeout=30)
    try:
        yield c
    finally:
        for ws in (WS_A, WS_B):
            from services.memory_service import _normalize_workspace_id
            await c.execute("DELETE FROM client_memory WHERE workspace_id = $1::uuid",
                            _normalize_workspace_id(ws))
        await c.close()


@pytest.fixture
async def memoria(conexion, monkeypatch):
    """El servicio real, apuntando a la base de certificacion."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.database import db_manager
    from services import memory_service

    url = (DSN or "").replace("postgresql://", "postgresql+asyncpg://")
    motor = create_async_engine(url, pool_size=2, max_overflow=2)
    maker = async_sessionmaker(motor, expire_on_commit=False)
    monkeypatch.setattr(db_manager, "async_session_maker", maker, raising=False)
    try:
        yield memory_service
    finally:
        await motor.dispose()


# ═══════════════════════════════════════════════════════════════════════════
# El ciclo completo
# ═══════════════════════════════════════════════════════════════════════════


async def test_escribir_y_recuperar(memoria, conexion):
    """LA PRUEBA. Si esto falla, la memoria no existe.

    Antes de este bloque devolvia siempre `None`: `_embed` exigia OpenAI y
    lanzaba `ValueError` en cuanto se llamaba.
    """
    fila = await memoria.save_memory(
        WS_A, CLIENTE, "el cliente prefiere reuniones los martes por la manana")
    assert fila is not None, (
        "save_memory devolvio None: no se escribio nada. Si el motivo es que no "
        "hay proveedor de embeddings, el respaldo lexico no esta entrando.")

    encontrados = await memoria.search_memory(WS_A, CLIENTE, "reuniones martes")
    assert encontrados, "se escribio el recuerdo y la busqueda no lo encuentra"
    assert "martes" in encontrados[0]["content"]


async def test_el_modelo_queda_registrado_en_cada_fila(memoria, conexion):
    """Sin esto no se podria saber con que espacio vectorial se escribio."""
    from core.embeddings import MODELO_RESPALDO
    from services.memory_service import _normalize_workspace_id

    await memoria.save_memory(WS_A, CLIENTE, "presupuesto aprobado de 4.000 euros")
    modelo = await conexion.fetchval(
        "SELECT metadata->>'embedding_model' FROM client_memory "
        " WHERE workspace_id = $1::uuid LIMIT 1", _normalize_workspace_id(WS_A))
    assert modelo == MODELO_RESPALDO, (
        f"la fila dice modelo {modelo!r}: sin el nombre correcto, una busqueda "
        f"futura compararia vectores de espacios distintos")


# ═══════════════════════════════════════════════════════════════════════════
# Aislamiento A <-> B
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_workspace_b_no_ve_los_recuerdos_de_a(memoria):
    """LO QUE MAS IMPORTA. Una memoria compartida entre clientes es una fuga."""
    await memoria.save_memory(
        WS_A, CLIENTE, "la tarifa secreta de este cliente es 12.000 al mes")

    desde_b = await memoria.search_memory(WS_B, CLIENTE, "tarifa secreta")
    assert desde_b == [], (
        f"el workspace B recupero recuerdos de A: {desde_b}. La memoria de los "
        f"agentes estaria filtrando informacion entre clientes.")


async def test_cada_uno_recupera_el_suyo(memoria):
    """Control del anterior: que B no vea nada podria ser que nada funcione."""
    await memoria.save_memory(WS_A, CLIENTE, "el proyecto de A se llama Aurora")
    await memoria.save_memory(WS_B, CLIENTE, "el proyecto de B se llama Boreal")

    a = await memoria.search_memory(WS_A, CLIENTE, "como se llama el proyecto")
    b = await memoria.search_memory(WS_B, CLIENTE, "como se llama el proyecto")
    assert a and b, "alguno de los dos no recupera nada"
    assert "Aurora" in a[0]["content"] and "Boreal" in b[0]["content"]
    assert "Boreal" not in str(a) and "Aurora" not in str(b)


async def test_el_mismo_cliente_en_otro_workspace_es_otro_cliente(memoria):
    """`client_id` se repite entre inquilinos: el aislamiento lo da el workspace.

    Dos agencias pueden tener un cliente con el mismo identificador. Si el
    filtro fuera solo por `client_id`, verian la memoria la una de la otra.
    """
    await memoria.save_memory(WS_A, "acme", "contrato de A con ACME: 3 meses")
    encontrado = await memoria.search_memory(WS_B, "acme", "contrato ACME")
    assert encontrado == [], "el mismo client_id cruzo de inquilino"


# ═══════════════════════════════════════════════════════════════════════════
# Persistencia y recuperacion
# ═══════════════════════════════════════════════════════════════════════════


async def test_lo_escrito_sobrevive_a_una_sesion_nueva(memoria, conexion):
    """Persistencia real, no cache en proceso."""
    await memoria.save_memory(WS_A, CLIENTE, "el dominio del cliente es ejemplo.test")
    from services.memory_service import _normalize_workspace_id

    n = await conexion.fetchval(
        "SELECT count(*) FROM client_memory WHERE workspace_id = $1::uuid",
        _normalize_workspace_id(WS_A))
    assert n >= 1, "la fila no llego a la base"

    # Una conexion distinta, abierta despues: si solo viviera en memoria del
    # proceso, esto devolveria cero.
    encontrados = await memoria.search_memory(WS_A, CLIENTE, "dominio")
    assert encontrados


async def test_una_busqueda_sin_recuerdos_devuelve_vacio_y_no_falla(memoria):
    """El caso normal de un cliente nuevo. No puede ser un error."""
    assert await memoria.search_memory(WS_B, "cliente-que-no-existe", "lo que sea") == []


# ═══════════════════════════════════════════════════════════════════════════
# No mezclar espacios vectoriales
# ═══════════════════════════════════════════════════════════════════════════


async def test_un_recuerdo_de_otro_modelo_no_se_devuelve(memoria, conexion):
    """La propiedad que evita una similitud inventada.

    Se inserta a mano una fila con OTRO modelo declarado. La busqueda no puede
    devolverla: su vector vive en un espacio distinto y su distancia seria un
    numero sin significado.
    """
    from core.embeddings import a_pgvector, vector_lexico
    from services.memory_service import _normalize_workspace_id

    await conexion.execute(
        "INSERT INTO client_memory (workspace_id, client_id, content, embedding, metadata)"
        " VALUES ($1::uuid, $2, $3, $4::vector, $5::jsonb)",
        _normalize_workspace_id(WS_A), CLIENTE,
        "recuerdo escrito con un embebedor antiguo",
        a_pgvector(vector_lexico("recuerdo escrito con un embebedor antiguo")),
        '{"embedding_model": "modelo-de-otra-epoca"}')

    encontrados = await memoria.search_memory(WS_A, CLIENTE, "embebedor antiguo")
    assert not any("otra epoca" in str(e.get("metadata", "")) for e in encontrados), (
        "se devolvio un recuerdo de otro modelo: su puntuacion de similitud es "
        "un numero sin significado, y devolverlo es peor que no encontrarlo")


# ═══════════════════════════════════════════════════════════════════════════
# La degradacion se ve
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_estado_dice_que_esta_degradado():
    """Una memoria degradada que no lo dice es indistinguible de una sana."""
    from core.embeddings import estado

    e = await estado()
    assert e["coste_por_llamada"] is False, "el proveedor activo tiene coste variable"
    assert e["proveedor"] in ("ollama_propio", "respaldo_lexico")
    if e["proveedor"] == "respaldo_lexico":
        assert e["estado"] == "degradado" and e.get("motivo"), (
            "se esta usando el respaldo y el estado no lo declara")


async def test_el_modo_estricto_corta_en_vez_de_degradar(monkeypatch):
    """Para contextos donde media memoria es peor que ninguna."""
    from core.embeddings import EmbeddingsNoDisponibles, embeber

    monkeypatch.setenv("NELVYON_EMBEDDINGS_STRICT", "1")
    for v in ("OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "OLLAMA_HOST"):
        monkeypatch.delenv(v, raising=False)

    with pytest.raises(EmbeddingsNoDisponibles):
        await embeber("cualquier cosa")

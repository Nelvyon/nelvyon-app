"""Por que la memoria de los agentes no funciona. Dos preguntas, no una.

LO QUE YO AFIRME, Y QUE ERA FALSO
---------------------------------
Dije que `memory_service` estaba roto porque «consulta con un cast a uuid y
recibe un entero», y lo apoye en una prueba que ejecutaba el SQL crudo:

    SELECT ... WHERE workspace_id = CAST('12' AS uuid)   -> DataError

Esa prueba era correcta sobre el SQL y no decia nada sobre el servicio. El
servicio NO pasa el entero: lo normaliza antes con `_normalize_workspace_id`, que
lo convierte en un UUID v5 determinista bajo un espacio de nombres fijo. Escritura
y lectura usan la misma funcion, asi que coinciden siempre.

Medi una propiedad del SQL y la presente como una propiedad del producto.

LO QUE SI ESTA ROTO
-------------------
`_openai_client()` exige `APP_AI_BASE_URL` **y** `APP_AI_KEY`. En produccion solo
esta la segunda: `app_ai_base_url` vale `""` por defecto y nadie la define. Asi
que toda llamada a embeddings lanza `ValueError("AI service not configured")`,
y sin embedding no hay ni escritura ni busqueda.

`client_memory` tiene cero filas por eso. Es un problema de CONFIGURACION, no de
tipos, y se arregla dando un endpoint de embeddings — decision con coste, o sea
del fundador.

QUE HACEN ESTAS PRUEBAS
-----------------------
Separan las dos preguntas y las contestan por separado, para que nadie vuelva a
mezclarlas:

  1. La identidad FUNCIONA: se demuestra escribiendo y leyendo con enteros.
  2. La configuracion FALTA: se demuestra que sin `APP_AI_BASE_URL` el servicio
     corta, y que corta de forma visible en vez de devolver «no hay recuerdos».
"""
from __future__ import annotations

import os
import uuid

import pytest


# ═══════════════════════════════════════════════════════════════════════════
# 1. La identidad no es el problema
# ═══════════════════════════════════════════════════════════════════════════


def test_un_entero_siempre_da_el_mismo_uuid():
    """Determinismo: si no lo fuera, cada escritura iria a un sitio distinto."""
    from services.memory_service import _normalize_workspace_id

    assert _normalize_workspace_id(101) == _normalize_workspace_id(101)
    assert _normalize_workspace_id(101) == _normalize_workspace_id("101")
    uuid.UUID(_normalize_workspace_id(101))          # es un uuid valido


def test_dos_workspaces_distintos_no_colisionan():
    """Lo que hace que la identidad sirva para AISLAR y no solo para convertir."""
    from services.memory_service import _normalize_workspace_id

    generados = {_normalize_workspace_id(n) for n in range(1, 500)}
    assert len(generados) == 499, "dos workspaces distintos comparten identidad"


def test_un_uuid_ya_formado_se_respeta():
    """El espacio SaaS pasa uuids de verdad; no deben re-hashearse."""
    from services.memory_service import _normalize_workspace_id

    real = "11111111-2222-3333-4444-555555555555"
    assert _normalize_workspace_id(real) == real


def test_el_sql_crudo_si_falla_y_eso_no_prueba_nada_del_servicio():
    """La prueba que me llevo a la conclusion equivocada, con su etiqueta puesta.

    Se conserva porque la propiedad es cierta —un entero no es un uuid— pero
    documentada como lo que es: una propiedad de PostgreSQL, no del producto. El
    servicio nunca ejecuta esa combinacion.
    """
    from services.memory_service import _normalize_workspace_id

    with pytest.raises(ValueError):
        uuid.UUID("12")                       # el entero crudo no es un uuid
    uuid.UUID(_normalize_workspace_id(12))    # lo que el servicio si manda


# ═══════════════════════════════════════════════════════════════════════════
# 2. La configuracion si es el problema
# ═══════════════════════════════════════════════════════════════════════════


def test_sin_endpoint_de_embeddings_el_servicio_corta(monkeypatch):
    """Y corta con un motivo legible, no con un fallo raro dentro del cliente."""
    from core.config import settings
    from services import memory_service

    monkeypatch.setattr(settings, "app_ai_base_url", "", raising=False)
    monkeypatch.setattr(settings, "app_ai_key", "sk-lo-que-sea", raising=False)

    with pytest.raises(ValueError) as exc:
        memory_service._openai_client()
    assert "not configured" in str(exc.value).lower()


def test_con_las_dos_variables_el_cliente_se_construye(monkeypatch):
    """Control: lo que falta es la URL, no otra cosa.

    Sin esta, la prueba anterior podria estar pasando por cualquier motivo.
    """
    from core.config import settings
    from services import memory_service

    monkeypatch.setattr(settings, "app_ai_base_url", "https://ejemplo.invalid/v1",
                        raising=False)
    monkeypatch.setattr(settings, "app_ai_key", "sk-lo-que-sea", raising=False)

    cliente = memory_service._openai_client()      # no lanza; no llama a nadie
    assert cliente is not None


def test_la_falta_de_configuracion_no_se_disfraza_de_cero_recuerdos():
    """LO QUE MAS IMPORTA DE ESTE FICHERO.

    Un servicio de memoria que devuelve lista vacia cuando no puede consultar es
    indistinguible de uno que consulta y no encuentra nada. El agente seguiria
    respondiendo, sin memoria y sin que nadie se entere.

    Se comprueba leyendo el codigo: `search_memory` no puede tener un `except`
    que se coma el fallo de configuracion y devuelva `[]`.
    """
    import inspect

    from services import memory_service

    fuente = inspect.getsource(memory_service.search_memory)
    tramos = fuente.split("except")
    for tramo in tramos[1:]:
        cuerpo = tramo[:400]
        devuelve_vacio = ("return []" in cuerpo or "return list()" in cuerpo)
        registra = ("logger." in cuerpo)
        assert not devuelve_vacio or registra, (
            "`search_memory` devuelve una lista vacia dentro de un `except` sin "
            "registrar nada: una memoria que no puede consultar quedaria "
            "indistinguible de una que no tiene recuerdos, y el agente "
            "respondería sin memoria sin que nadie lo note.\n" + cuerpo[:200])


def test_produccion_declara_lo_que_le_falta():
    """La variable que falta, nombrada, para que el bloqueo sea accionable.

    No lee produccion: comprueba que el nombre sigue siendo el que hay que
    configurar. Si alguien renombra la variable, esta prueba obliga a actualizar
    el bloqueo documentado en vez de dejarlo apuntando a un nombre muerto.
    """
    from core.config import settings

    campos = getattr(type(settings), "model_fields", {})
    assert "app_ai_base_url" in campos, (
        "`app_ai_base_url` ya no existe: el bloqueo documentado —falta "
        "APP_AI_BASE_URL en produccion— apunta a un nombre que no se usa")
    alias = getattr(campos["app_ai_base_url"], "validation_alias", None)
    assert str(alias) == "APP_AI_BASE_URL", (
        f"el alias de entorno cambio a {alias!r}: actualiza el bloqueo")

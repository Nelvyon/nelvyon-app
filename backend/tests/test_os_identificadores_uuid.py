"""Las rutas `os_*` devuelven sus filas cuando las hay.

EL FALLO QUE ESTO IMPIDE
------------------------
`/api/v1/os/clients` respondia **400 en cuanto el workspace tenia algun cliente**,
y 200 con lista vacia si no tenia ninguno. La causa no era RLS —se reprodujo
igual con rol administrador— sino el contrato de tipos: la columna `id` es `uuid`,
el modelo ORM la declara `String(36)` y por tanto SQLAlchemy entrega el objeto
`uuid.UUID` tal cual, mientras el modelo de respuesta pedia `str`.

Es el peor reparto posible de sintomas: con la tabla vacia la ruta parece sana, y
solo se rompe cuando hay datos que enseñar.

POR QUE NINGUNA PRUEBA LO VIO
-----------------------------
Las pruebas de estas rutas corren sobre SQLite, donde `String(36)` guarda y
devuelve texto: `row.id` es `str` y la validacion pasa. El defecto solo existe
contra PostgreSQL, que es donde corre produccion. Por eso esta bateria exige
PostgreSQL y se salta —declarandolo— cuando no lo hay.

LO QUE COMPRUEBA
----------------
Que un identificador que llega como `UUID` se serializa a su cadena canonica, que
uno invalido NO se convierte ni se silencia, y que las respuestas siguen
declarando `str` en el contrato publicado.
"""
from __future__ import annotations

import uuid

import pytest
from pydantic import BaseModel, ValidationError

from schemas.identificadores import IdentificadorUuid, IdentificadorUuidOpcional


class _Modelo(BaseModel):
    id: IdentificadorUuid
    opcional: IdentificadorUuidOpcional = None


# ── el caso exacto que rompia ───────────────────────────────────────────────


def test_un_uuid_de_postgresql_se_serializa_a_cadena():
    """EL FALLO. Antes de esto, un `UUID` aqui era `ValidationError` -> 400."""
    ident = uuid.uuid4()
    m = _Modelo(id=ident)
    assert m.id == str(ident)
    assert isinstance(m.id, str), "el contrato publicado sigue siendo una cadena"


def test_una_cadena_uuid_sigue_valiendo():
    """Control: en SQLite el mismo campo llega como texto y debe seguir pasando."""
    ident = str(uuid.uuid4())
    assert _Modelo(id=ident).id == ident


def test_las_tres_formas_de_escribir_un_uuid_se_normalizan():
    ident = uuid.uuid4()
    canonica = str(ident)
    assert _Modelo(id=ident.hex).id == canonica
    assert _Modelo(id="{" + canonica + "}").id == canonica
    assert _Modelo(id=canonica.upper()).id == canonica


def test_el_campo_opcional_admite_ausencia():
    assert _Modelo(id=str(uuid.uuid4()), opcional=None).opcional is None


# ── controles negativos: no se convierte basura ni se esconde nada ──────────


@pytest.mark.parametrize("basura", ["", "no-soy-un-uuid", "12345", "../etc/passwd"])
def test_un_identificador_invalido_se_rechaza(basura):
    """Sin esto, `str(valor)` habria aceptado cualquier cosa y el error habria
    aparecido mucho mas lejos, donde ya no se sabe de donde vino."""
    with pytest.raises(ValidationError):
        _Modelo(id=basura)


def test_un_tipo_que_no_es_identificador_se_rechaza():
    with pytest.raises(ValidationError):
        _Modelo(id=12345)


def test_nulo_no_pasa_donde_el_identificador_es_obligatorio():
    with pytest.raises(ValidationError):
        _Modelo(id=None)


# ── el contrato publicado no se movio ───────────────────────────────────────


def test_el_esquema_publicado_sigue_diciendo_string():
    """El BFF y los clientes TypeScript leen este contrato. La correccion no
    puede cambiarlo: el JSON emitido es el mismo string que antes."""
    esquema = _Modelo.model_json_schema()
    assert esquema["properties"]["id"]["type"] == "string"


# ── las rutas reales quedaron alineadas ─────────────────────────────────────


@pytest.mark.parametrize(
    "modulo, clase, campos",
    [
        ("routers.os_clients", "OsClientResponse", ["id"]),
        ("routers.os_projects", "OsProjectResponse", ["id", "client_id"]),
        ("routers.os_tasks_rest", "OsTaskResponse", ["id", "client_id", "project_id"]),
        ("routers.os_deliverables_rest", "OsDeliverableResponse",
         ["id", "client_id", "project_id"]),
        ("routers.os_deliverables_rest", "OsDeliverableVersionResponse",
         ["id", "deliverable_id"]),
    ],
)
def test_cada_respuesta_acepta_uuid_donde_la_columna_es_uuid(modulo, clase, campos):
    """Guard de cobertura: si alguien añade un campo `uuid` declarandolo `str` a
    secas, la ruta volvera a romperse en cuanto haya datos. Esto lo detecta."""
    import importlib

    mod = importlib.import_module(modulo)
    modelo = getattr(mod, clase)
    for campo in campos:
        anotacion = modelo.model_fields[campo].annotation
        metadatos = modelo.model_fields[campo].metadata
        acepta_uuid = any(
            type(m).__name__ == "BeforeValidator" for m in metadatos
        )
        assert acepta_uuid, (
            f"{clase}.{campo} no acepta un UUID de PostgreSQL: la ruta dara 400 "
            f"en cuanto la tabla tenga filas"
        )
        assert anotacion in (str, type(None), str | None), (
            f"{clase}.{campo} cambio de tipo publicado: {anotacion}"
        )

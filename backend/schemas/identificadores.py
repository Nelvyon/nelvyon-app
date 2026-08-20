"""Identificadores `uuid` en la frontera HTTP.

EL FALLO QUE ESTO CORRIGE
------------------------
Las tablas `os_*` tienen la clave primaria en `uuid`. Sus modelos ORM la declaran
`String(36)`, asi que SQLAlchemy no convierte nada al leer: entrega el objeto
`uuid.UUID` que devuelve el driver. Los modelos de respuesta declaraban `id: str`
y Pydantic v2 —estricto a proposito— rechaza un `UUID` donde se pide `str`:

    1 validation error for OsClientResponse
    id  Input should be a valid string [input_value=UUID('d01fd120-...')]

El router lo convertia en `HTTPException(400)`. Resultado: `/api/v1/os/clients`
respondia 400 EN CUANTO EL WORKSPACE TENIA ALGUN CLIENTE, y 200 con lista vacia
si no tenia ninguno. Se comprobo con rol administrador y con rol restringido: el
fallo es identico, no tiene nada que ver con RLS.

POR QUE ASI Y NO DE OTRA FORMA
------------------------------
Tres opciones se descartaron por escrito:

- `id=str(row.id)` en cada constructor: convierte cualquier cosa sin mirar. Un
  valor corrupto se serializaria tal cual y el error saldria mas lejos, donde ya
  no se sabe de donde vino.
- `id: UUID` en el modelo Pydantic: correcto, pero cambia el tipo publicado en
  OpenAPI. El BFF y los clientes TypeScript leen ese contrato; no hay motivo para
  moverlo cuando el JSON emitido es exactamente el mismo string.
- Cambiar el ORM a un tipo UUID: es la correccion de fondo, pero el tipo generico
  de SQLAlchemy se materializa distinto en SQLite —donde corre la mayor parte de
  la suite— y arrastra los cuatro modelos y sus pruebas. Queda anotado como deuda
  separada, no se mezcla con esta.

Lo que hace este tipo: acepta un `UUID` o una cadena que SEA un UUID, normaliza a
su forma canonica, y RECHAZA cualquier otra cosa. No hay conversion silenciosa ni
valor de reserva: un identificador que no es un UUID es un error, y se ve.
"""
from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from pydantic import BeforeValidator


def _a_texto_canonico(valor: Any) -> Any:
    """`UUID` o cadena-uuid -> cadena canonica. Lo demas, error."""
    if isinstance(valor, UUID):
        return str(valor)
    if isinstance(valor, str):
        # `UUID(valor)` acepta con guiones, sin ellos y con llaves; devolver
        # `str(UUID(...))` normaliza las tres a la misma forma.
        return str(UUID(valor))
    return valor  # que falle la validacion de `str` con el valor original


#: Un identificador `uuid` tal y como viaja en el JSON: una cadena canonica.
#:
#: Se anota `str` y no `UUID` a proposito: el contrato publicado no cambia.
IdentificadorUuid = Annotated[str, BeforeValidator(_a_texto_canonico)]

#: Igual, pero para columnas `uuid` que admiten NULL.
IdentificadorUuidOpcional = Annotated[str | None, BeforeValidator(_a_texto_canonico)]


def _clave_a_texto(valor: Any) -> Any:
    """Como `_a_texto_canonico`, pero admite ademas la clave entera de SQLite.

    POR QUE EXISTE ESTE SEGUNDO TIPO
    --------------------------------
    `subscriptions.id` es `uuid` en PostgreSQL, pero su modelo declara una
    variante entera para SQLite: buena parte de la suite inserta con SQL literal
    sin `id` y se apoya en el autorrelleno de `INTEGER PRIMARY KEY`.

    En produccion —PostgreSQL, unico motor— el valor SIEMPRE es un uuid; que eso
    sea asi lo comprueba `test_subscriptions_id_uuid` contra la base real, no este
    validador. Aqui solo se admite el entero para no obligar a que el contrato
    HTTP mienta sobre el sustrato de pruebas.

    Sigue sin aceptarse basura: una cadena que no sea un uuid se rechaza igual.
    """
    if isinstance(valor, bool):
        return valor  # un booleano no es una clave; que falle
    if isinstance(valor, int):
        return str(valor)
    return _a_texto_canonico(valor)


#: Identificador de clave primaria que en PostgreSQL es `uuid` y en el sustrato
#: de pruebas puede ser un entero. Se publica como cadena en ambos casos.
IdentificadorClave = Annotated[str, BeforeValidator(_clave_a_texto)]

#: Igual que `IdentificadorClave`, para respuestas donde el identificador puede
#: faltar (p. ej. un pago verificado que todavia no tiene suscripcion asociada).
IdentificadorClaveOpcional = Annotated[str | None, BeforeValidator(_clave_a_texto)]

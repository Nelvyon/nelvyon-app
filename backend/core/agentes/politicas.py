"""Que puede hacer cada agente. La frontera, y por que esta donde esta.

DENY POR DEFECTO
----------------
Una accion sin politica escrita se DENIEGA. No se permite «porque parece
inofensiva» ni se pregunta: se deniega y se registra. La alternativa —permitir lo
que nadie prohibio— significa que cada capacidad nueva amplia la superficie sin
que nadie lo decida, y eso es exactamente como se acaba con un agente enviando
correos que nadie autorizo.

LOS CUATRO MODOS
----------------
    AUTOMATIC_SAFE           solo lee y compone. Deshacerlo es borrar una fila.
    AUTOMATIC_WITH_LIMITS    escribe, acotado y reversible, con el tope declarado
                             y comprobado. Sin tope declarado no se ejecuta.
    HUMAN_APPROVAL_REQUIRED  sale hacia fuera, gasta, borra, cambia permisos o es
                             irreversible. Se prepara y se espera.
    DENY                     no se hace, ni con aprobacion. Lo que esta aqui no
                             es «peligroso»: es que NELVYON no debe poder hacerlo
                             desde un agente, punto.

LO QUE NUNCA SE AUTOMATIZA, Y NO ES NEGOCIABLE
----------------------------------------------
Un agente jamas puede: inventar un precio, un descuento o una condicion
contractual; saltarse un consentimiento o una politica de comunicacion; mover
dinero; borrar informacion critica; cambiar permisos; publicar algo de alto
riesgo; ni asumir autoridad contractual fuera de una politica explicita.

Eso no se implementa con un prompt que pide por favor. Se implementa con las
listas de abajo, con un CHECK en la base y con una prueba que lo intenta.

POR QUE LA POLITICA VIVE EN LA BASE Y NO EN EL CODIGO
-----------------------------------------------------
Porque cambiarla tiene que ser un acto revisable y auditable, no un despliegue.
Y porque el motor la lee con un rol que solo tiene SELECT: un agente que pudiera
reescribir su propia politica no tiene politica.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

AUTOMATICO = "AUTOMATIC_SAFE"
AUTOMATICO_CON_LIMITES = "AUTOMATIC_WITH_LIMITS"
APROBACION_HUMANA = "HUMAN_APPROVAL_REQUIRED"
DENEGADO = "DENY"

MODOS = (AUTOMATICO, AUTOMATICO_CON_LIMITES, APROBACION_HUMANA, DENEGADO)

#: Acciones que NINGUNA politica puede declarar automaticas, escriba lo que
#: escriba en la base. Es una segunda barrera a proposito: la primera es que
#: nadie escriba esa fila; esta es para el dia en que alguien la escriba.
#:
#: Cada entrada esta aqui por una razon concreta, no por prudencia genérica:
#:
#:   precio/descuento/contrato  un numero inventado por una maquina se convierte
#:                              en una obligacion con un cliente
#:   dinero                     no se deshace
#:   permisos                   un cambio de permisos abre puertas que nadie ve
#:   borrado                    no se deshace
#:   publicacion                queda indexada, cacheada y vista
#:   comunicacion saliente      un correo enviado ya lo ha leido alguien
JAMAS_AUTOMATICO = frozenset({
    "precio.fijar",
    "descuento.conceder",
    "contrato.firmar",
    "contrato.modificar",
    "pago.cobrar",
    "pago.reembolsar",
    "pago.transferir",
    "permisos.cambiar",
    "rol.asignar",
    "datos.borrar",
    "cliente.borrar",
    "web.publicar",
    "tienda.publicar",
    "redes.publicar",
    "anuncio.lanzar",
    "correo.enviar",
    "sms.enviar",
    "llamada.realizar",
})

#: Acciones que no se hacen NUNCA desde un agente, ni con aprobacion humana.
#: Aprobar no las vuelve seguras: el problema no es quien decide, es que el
#: camino no debe existir.
NUNCA_DESDE_UN_AGENTE = frozenset({
    "credenciales.leer",
    "credenciales.rotar",
    "rls.desactivar",
    "migracion.aplicar",
    "rol.crear",
    "auditoria.borrar",
    "auditoria.modificar",
    "kill_switch.desactivar",
    "politica.modificar",
})


@dataclass(frozen=True)
class Decision:
    """Lo que la politica decidio, y por que. Se guarda entero en la auditoria."""

    modo: str
    permitido: bool
    motivo: str
    limites: dict[str, Any]
    politica_id: Optional[int] = None

    @property
    def necesita_aprobacion(self) -> bool:
        return self.modo == APROBACION_HUMANA


def _denegar(motivo: str) -> Decision:
    return Decision(modo=DENEGADO, permitido=False, motivo=motivo, limites={})


async def decidir(sesion, agente: str, accion: str) -> Decision:
    """Que puede hacer `agente` con `accion`. Deny por defecto.

    El orden de las comprobaciones importa y no es casual: las prohibiciones
    absolutas se evaluan ANTES de mirar la base. Asi una fila mal escrita —o
    escrita a proposito por alguien que no deberia— no puede abrir un camino que
    el codigo declara cerrado.
    """
    if accion in NUNCA_DESDE_UN_AGENTE:
        return _denegar(
            f"'{accion}' no se ejecuta desde un agente en ningun caso; "
            "aprobarla no la volveria segura")

    fila = (await sesion.execute(
        text("SELECT id, modo, limites, motivo FROM agent_policies "
             "WHERE agente = :a AND accion = :c"),
        {"a": agente, "c": accion})).mappings().first()

    if fila is None:
        return _denegar(
            f"no hay politica escrita para '{agente}' + '{accion}'; "
            "lo que no esta declarado no se permite")

    modo = str(fila["modo"])
    limites = fila["limites"] or {}
    if isinstance(limites, str):
        import json
        limites = json.loads(limites)

    # La segunda barrera. Si alguien declaro automatica una accion de la lista,
    # se degrada a aprobacion humana en vez de ejecutarse, y se registra: el
    # sistema no obedece a una fila que contradice una regla del producto.
    if accion in JAMAS_AUTOMATICO and modo in (AUTOMATICO, AUTOMATICO_CON_LIMITES):
        logger.error(
            "politica incoherente: '%s' esta declarada %s para el agente %s, y "
            "esa accion no puede ser automatica. Se degrada a aprobacion humana.",
            accion, modo, agente)
        return Decision(
            modo=APROBACION_HUMANA, permitido=False,
            motivo=(f"'{accion}' estaba declarada {modo}, pero no puede ser "
                    "automatica; se exige aprobacion"),
            limites=limites, politica_id=int(fila["id"]))

    if modo == DENEGADO:
        return Decision(modo=DENEGADO, permitido=False,
                        motivo=str(fila["motivo"]), limites=limites,
                        politica_id=int(fila["id"]))

    if modo == APROBACION_HUMANA:
        return Decision(modo=modo, permitido=False, motivo=str(fila["motivo"]),
                        limites=limites, politica_id=int(fila["id"]))

    if modo == AUTOMATICO_CON_LIMITES and not limites:
        # El CHECK de la base ya lo impide; esto cubre el caso de que alguien lo
        # haya retirado. Fail-closed: sin tope, no se actua.
        return _denegar(
            f"'{accion}' es automatica con limites pero no los declara; "
            "una accion automatica sin tope es una accion sin frontera")

    return Decision(modo=modo, permitido=True, motivo=str(fila["motivo"]),
                    limites=limites, politica_id=int(fila["id"]))


async def herramientas_permitidas(sesion, agente: str) -> frozenset[str]:
    """Las herramientas que este agente puede invocar. Vacio si no existe."""
    fila = (await sesion.execute(
        text("SELECT herramientas, activo FROM agent_catalog WHERE clave = :a"),
        {"a": agente})).mappings().first()
    if fila is None or not fila["activo"]:
        return frozenset()
    lista = fila["herramientas"] or []
    if isinstance(lista, str):
        import json
        lista = json.loads(lista)
    return frozenset(str(x) for x in lista)

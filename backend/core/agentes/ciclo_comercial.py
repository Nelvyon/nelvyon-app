"""El ciclo comercial de NELVYON, etapa por etapa, con lo que falta en cada una.

POR QUE ESTO ES CODIGO Y NO UN DOCUMENTO
----------------------------------------
Porque un documento envejece sin avisar. Esto se comprueba con pruebas: que nada
que salga hacia un cliente este declarado automatico, que toda etapa bloqueada
diga QUE le falta y QUIEN puede desbloquearlo, y que lo que se declara listo
tenga de verdad quien lo ejecute.

Si alguien marca «listo» una etapa sin implementacion, la prueba lo dice. Si
alguien marca «automatica» una etapa que envia correos, la prueba lo dice.

LOS TRES ESTADOS, Y LA DIFERENCIA QUE IMPORTA
---------------------------------------------
    LISTA                 hay implementacion, esta certificada y corre sola
    ESPERA_APROBACION     hay implementacion, pero produce un borrador y para
    BLOQUEADA_EXTERNA     falta algo que NELVYON no puede darse a si misma:
                          una credencial, un dominio verificado, una cuenta

La tercera no es una excusa ni una tarea pendiente de programacion. Es trabajo
que solo una persona puede hacer, y por eso cada entrada dice exactamente que es.

LO QUE NO SE HACE, Y NO POR FALTA DE TIEMPO
-------------------------------------------
Contactar, negociar, fijar precio, cobrar y publicar NO se automatizan. No es una
limitacion tecnica pendiente de resolver: es la frontera del producto. Un agente
que contacta clientes solo, aunque funcione perfectamente, compromete a la
empresa con terceros sin que nadie lo haya decidido.
"""
from __future__ import annotations

from dataclasses import dataclass, field

LISTA = "LISTA"
ESPERA_APROBACION = "ESPERA_APROBACION"
BLOQUEADA_EXTERNA = "BLOQUEADA_EXTERNA"

ESTADOS = (LISTA, ESPERA_APROBACION, BLOQUEADA_EXTERNA)


@dataclass(frozen=True)
class Etapa:
    """Una etapa del ciclo, y todo lo que hace falta saber de ella."""

    orden: int
    clave: str
    descripcion: str
    estado: str
    #: Agente que la sirve, si hay alguno.
    agente: str = ""
    #: Que falta, para las bloqueadas. Vacio en las demas.
    falta: str = ""
    #: Quien puede desbloquearla. Siempre una persona.
    desbloquea: str = ""
    #: Por que no es automatica, para las de aprobacion.
    motivo_frontera: str = ""
    #: Si la etapa produce un efecto fuera de NELVYON.
    sale_fuera: bool = False


CICLO: tuple[Etapa, ...] = (
    Etapa(1, "oportunidad.detectar",
          "Detectar una oportunidad en el pipeline del workspace.",
          LISTA, agente="sdr.calificar"),

    Etapa(2, "oportunidad.calificar",
          "Calificar segun un umbral explicito y revisable.",
          LISTA, agente="sdr.calificar"),

    Etapa(3, "prospecto.investigar",
          "Enriquecer con datos publicos del prospecto.",
          BLOQUEADA_EXTERNA,
          falta="Ninguna fuente de enriquecimiento contratada. Requiere una "
                "cuenta con un proveedor de datos de empresa y su clave.",
          desbloquea="fundador: contratar proveedor y aportar credencial",
          sale_fuera=True),

    Etapa(4, "prospecto.contactar",
          "Primer contacto con el prospecto.",
          BLOQUEADA_EXTERNA,
          falta="SES esta verificado para ALERTAS internas, no para correo "
                "comercial: falta dominio verificado, salida del sandbox, "
                "registro de consentimiento y politica de bajas.",
          desbloquea="fundador: verificar dominio en SES, solicitar salida de "
                     "sandbox y definir la politica de consentimiento",
          sale_fuera=True),

    Etapa(5, "conversacion.mantener",
          "Sostener la conversacion comercial.",
          ESPERA_APROBACION, agente="ventas.redactar_propuesta",
          motivo_frontera="Cada mensaje compromete a la empresa. El borrador lo "
                          "compone NELVYON; quien lo envia decide una persona.",
          sale_fuera=True),

    Etapa(6, "seguimiento.programar",
          "Programar y recordar el seguimiento pendiente.",
          LISTA, agente="operaciones.plan_semanal"),

    Etapa(7, "propuesta.redactar",
          "Redactar la propuesta con el precio DADO.",
          ESPERA_APROBACION, agente="ventas.redactar_propuesta",
          motivo_frontera="Una propuesta compromete precio y condiciones. El "
                          "precio entra como dato: no se genera. Ademas necesita "
                          "un modelo de lenguaje, hoy NOT_CONFIGURED.",
          sale_fuera=True),

    Etapa(8, "cierre.cobrar",
          "Cobrar y activar la suscripcion.",
          BLOQUEADA_EXTERNA,
          falta="Stripe esta en modo test (`sk_test`). Sin claves de produccion "
                "no hay cobro real, y activarlo es una decision del fundador.",
          desbloquea="fundador: aportar claves live de Stripe y confirmar precios",
          sale_fuera=True),

    Etapa(9, "provisioning.crear",
          "Crear el workspace y encender Autopilot con defaults seguros.",
          LISTA, agente="(planner: provisionar_nuevos)"),

    Etapa(10, "onboarding.guiar",
           "Decir que le falta al cliente para empezar a recibir valor.",
           LISTA, agente="onboarding.siguiente_paso"),

    Etapa(11, "servicio.planificar",
           "Planificar el trabajo contratado.",
           LISTA, agente="operaciones.plan_semanal"),

    Etapa(12, "servicio.ejecutar",
           "Ejecutar las capacidades de OS contratadas.",
           LISTA, agente="(Autopilot: 21 capacidades de OS y soporte)"),

    Etapa(13, "calidad.validar",
           "Detectar entregables que no deberian entregarse.",
           LISTA, agente="qa.revisar_entregables"),

    Etapa(14, "entrega.publicar",
           "Publicar el entregable al cliente.",
           ESPERA_APROBACION, agente="os_web_builder.preparar_borrador",
           motivo_frontera="Publicar no se deshace: queda indexado, cacheado y "
                           "visto. NELVYON prepara el borrador y espera.",
           sale_fuera=True),

    Etapa(15, "soporte.atender",
           "Clasificar, priorizar y detectar SLA en riesgo.",
           LISTA, agente="soporte.priorizar"),

    Etapa(16, "soporte.responder",
           "Responder al cliente.",
           ESPERA_APROBACION, agente="soporte.redactar_respuesta",
           motivo_frontera="Un correo enviado ya lo ha leido alguien. Ademas "
                           "necesita un modelo de lenguaje, hoy NOT_CONFIGURED.",
           sale_fuera=True),

    Etapa(17, "cs.vigilar",
           "Salud de cuenta y senales de abandono, a partir de hechos.",
           LISTA, agente="cs.salud_cuenta"),

    Etapa(18, "renovacion.gestionar",
           "Retener o renovar.",
           ESPERA_APROBACION, agente="os_lifecycle.campana_de_retencion",
           motivo_frontera="Contactar a un cliente en riesgo es una decision "
                           "comercial, y el mensaje sale de NELVYON.",
           sale_fuera=True),
)


def por_estado(estado: str) -> list[Etapa]:
    return [e for e in CICLO if e.estado == estado]


def bloqueos_externos() -> list[dict[str, str]]:
    """La checklist para el fundador. Solo lo que una persona puede resolver."""
    return [{"etapa": e.clave, "falta": e.falta, "quien": e.desbloquea}
            for e in CICLO if e.estado == BLOQUEADA_EXTERNA]


def cobertura() -> dict[str, int]:
    return {estado: len(por_estado(estado)) for estado in ESTADOS}

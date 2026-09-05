/**
 * Que pide de verdad quien escribe, y quien tiene que contestarle.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * El helpdesk sabe crear tickets, contestarlos, aplicar macros y medir SLA. Lo
 * que no habia era el paso de ANTES: leer lo que llega y decidir de que va, cuan
 * urgente es, a quien va y —sobre todo— si un agente puede contestarlo solo.
 *
 * Sin ese paso, o lo clasifica una persona una por una, o el agente contesta
 * todo por igual: incluida una cancelacion, una reclamacion legal o un aviso de
 * seguridad.
 *
 * ── CUATRO DECISIONES INDEPENDIENTES ────────────────────────────────────────
 *
 * Se sigue el patron que ya funciona en `clasificarRespuesta`: la categoria no
 * decide sola. Hay cuatro respuestas separadas porque no van juntas:
 *
 *   · `urgencia`           — cuanto puede esperar
 *   · `equipo`             — a quien le toca
 *   · `requiereHumano`     — si una persona TIENE que mirarlo
 *   · `puedeAutoResponder` — si un agente puede contestar sin que nadie revise
 *
 * Un «no me funciona nada» es urgente y NO necesita humano: lo puede coger un
 * agente tecnico. Una consulta de RGPD no es urgente y SI lo necesita. Meter las
 * cuatro en un solo campo obliga a elegir mal en uno de los dos casos.
 *
 * ── FALLA CERRADO ───────────────────────────────────────────────────────────
 *
 * Lo que no se reconoce va a una persona y NO se auto-responde. Un triaje que
 * ante la duda contesta solo es peor que no tener triaje: da confianza sin
 * haberla ganado.
 *
 * COSTE EXTERNO: 0 EUR. Es analisis de texto, sin modelo.
 */

/** De que va el ticket. */
export type CategoriaDeTicket =
  | "seguridad"
  | "legal_privacidad"
  | "cancelacion"
  | "facturacion"
  | "incidencia_tecnica"
  | "como_se_hace"
  | "comercial"
  | "indeterminado";

/** Cuanto puede esperar. */
export type UrgenciaDeTicket = "critica" | "alta" | "normal" | "baja";

/** A quien le toca. */
export type EquipoDeSoporte =
  | "seguridad"
  | "legal"
  | "retencion"
  | "facturacion"
  | "tecnico"
  | "soporte"
  | "comercial";

export type TicketTriado = {
  categoria: CategoriaDeTicket;
  urgencia: UrgenciaDeTicket;
  equipo: EquipoDeSoporte;
  /** Una persona tiene que mirarlo antes de que salga nada. */
  requiereHumano: boolean;
  /** Un agente puede contestar sin revision previa. */
  puedeAutoResponder: boolean;
  /** Por que se decidio asi, para que quede en el registro. */
  porQue: string;
};

/**
 * El orden importa, y no es alfabetico.
 *
 * Se mira primero lo que no admite equivocacion. Un mensaje que dice «me han
 * entrado en la cuenta y quiero cancelar y que me devolvais el dinero» es un
 * incidente de seguridad, no una cancelacion ni una factura: si ganara la regla
 * de facturacion, el aviso de seguridad se perderia en una cola de cobros.
 */
const REGLAS: ReadonlyArray<{
  categoria: CategoriaDeTicket;
  patron: RegExp;
  urgencia: UrgenciaDeTicket;
  equipo: EquipoDeSoporte;
  requiereHumano: boolean;
  puedeAutoResponder: boolean;
  porQue: string;
}> = [
  {
    categoria: "seguridad",
    // «acceso no autorizado», «me han hackeado», «filtracion de datos».
    //
    // SIN `\b` al final a proposito: son PREFIJOS. «hacke» tiene que casar
    // dentro de «hackeado» y de «hackearon», y un limite de palabra al final lo
    // impide. Fue el primer fallo que cazaron sus propias pruebas.
    patron:
      /\b(hacke|hacki|acceso no autorizado|entrado en (mi|la|nuestra) cuenta|suplanta|phishing|filtraci[oó]n|brecha|robad[oa] la cuenta|vulnerabilidad)/i,
    urgencia: "critica",
    equipo: "seguridad",
    requiereHumano: true,
    puedeAutoResponder: false,
    porQue: "posible incidente de seguridad: lo mira una persona antes de contestar nada",
  },
  {
    categoria: "legal_privacidad",
    patron:
      /\b(rgpd|gdpr|lopd|datos personales|derecho al olvido|borrad m[ií]s datos|abogad|demanda|denuncia|reclamaci[oó]n formal|consumo)\b/i,
    urgencia: "alta",
    equipo: "legal",
    requiereHumano: true,
    puedeAutoResponder: false,
    porQue: "asunto legal o de privacidad: una respuesta automatica puede comprometer",
  },
  {
    categoria: "cancelacion",
    patron:
      /\b(dar de baja|darme de baja|cancelar (mi )?(la )?(suscripci[oó]n|cuenta|plan)|no quiero seguir|quiero irme|rescindir)\b/i,
    urgencia: "alta",
    equipo: "retencion",
    requiereHumano: true,
    puedeAutoResponder: false,
    porQue: "quiere irse: lo atiende una persona, no una plantilla",
  },
  {
    categoria: "facturacion",
    patron:
      /\b(factura|cobro|cargo|me hab[eé]is cobrado|devoluci[oó]n|reembolso|iva|recibo|domiciliaci[oó]n|tarjeta)\b/i,
    urgencia: "alta",
    equipo: "facturacion",
    requiereHumano: true,
    puedeAutoResponder: false,
    porQue: "toca dinero del cliente: no se contesta sin que alguien lo mire",
  },
  {
    categoria: "incidencia_tecnica",
    patron:
      /\b(error|fallo|no funciona|no carga|ca[ií]do|lento|se cuelga|no puedo acceder|no me deja|pantalla en blanco|500|404)\b/i,
    urgencia: "alta",
    equipo: "tecnico",
    requiereHumano: false,
    puedeAutoResponder: true,
    porQue: "incidencia tecnica: un agente puede diagnosticar y responder",
  },
  {
    categoria: "como_se_hace",
    patron:
      /\b(c[oó]mo (se |puedo |hago )|d[oó]nde (est[aá]|encuentro)|para qu[eé] sirve|se puede|es posible|tutorial|manual)\b/i,
    urgencia: "normal",
    equipo: "soporte",
    requiereHumano: false,
    puedeAutoResponder: true,
    porQue: "consulta de uso: la documentacion la resuelve",
  },
  {
    categoria: "comercial",
    patron:
      /\b(precio|presupuesto|contratar|plan|tarifa|descuento|prueba gratis|demo|ampliar)\b/i,
    urgencia: "normal",
    equipo: "comercial",
    requiereHumano: false,
    puedeAutoResponder: true,
    porQue: "interes comercial: se le puede dar informacion y avisar a ventas",
  },
];

/** Lo que se hace cuando no se reconoce nada: a una persona, sin responder. */
const POR_DEFECTO: TicketTriado = {
  categoria: "indeterminado",
  urgencia: "normal",
  equipo: "soporte",
  requiereHumano: true,
  puedeAutoResponder: false,
  porQue: "no se reconoce de que va: ante la duda lo lee una persona",
};

/**
 * Triaje de lo que llega.
 *
 * @param texto  el mensaje del cliente, tal cual.
 */
export function triarTicket(texto: string | null | undefined): TicketTriado {
  const limpio = (texto ?? "").trim();
  if (limpio.length === 0) {
    return {
      ...POR_DEFECTO,
      porQue: "llego vacio: sin texto no hay nada que clasificar",
    };
  }

  for (const r of REGLAS) {
    if (r.patron.test(limpio)) {
      return {
        categoria: r.categoria,
        urgencia: r.urgencia,
        equipo: r.equipo,
        requiereHumano: r.requiereHumano,
        puedeAutoResponder: r.puedeAutoResponder,
        porQue: r.porQue,
      };
    }
  }
  return POR_DEFECTO;
}

/**
 * Lo que un agente de soporte puede hacer con este ticket.
 *
 * Se expone aparte porque es la pregunta que hace quien va a ACTUAR, y conviene
 * que sea una sola linea imposible de leer al reves.
 */
export function unAgentePuedeContestarlo(triado: TicketTriado): boolean {
  return triado.puedeAutoResponder && !triado.requiereHumano;
}

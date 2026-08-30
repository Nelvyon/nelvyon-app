/**
 * MODO COSTE ADICIONAL CERO.
 *
 * LA REGLA, Y TODO LO DEMÁS SON EXCEPCIONES A ELLA:
 *
 *     SI NO SE PUEDE DEMOSTRAR QUE NO CUESTA, NO SE HACE.
 *
 * POR QUÉ NO BASTA CON LA GUARDA DE GASTO. `GuardaDeGasto` protege el dinero
 * que se declara: una acción que dice «voy a gastar 5.000 céntimos» pasa por
 * ella. Pero el dinero también se va por sitios que nadie declara como gasto:
 *
 *   - una llamada a un modelo de pago, que factura por token y no por «importe»;
 *   - un mensaje de WhatsApp, que se cobra por conversación abierta;
 *   - subir una réplica o un plan, que no es una operación de negocio sino de
 *     infraestructura y por eso no pasa por ninguna puerta de gasto;
 *   - un proveedor cuyo coste sencillamente NO SE SABE.
 *
 * Ese último es el peligroso, y es el que gobierna este fichero. Un proveedor
 * desconocido no es «probablemente gratis»: es desconocido. Bajo este modo,
 * desconocido significa DENEGADO. Y esa decisión no puede depender de que
 * alguien se acuerde de mirar la documentación.
 *
 * FALLA CERRADO, SIEMPRE. Cualquier duda —una operación sin clasificar, un
 * proveedor que no está en la tabla, una clasificación que no se puede leer—
 * cae del lado de denegar. Es lo contrario de lo que hace un sistema cómodo, y
 * es exactamente lo que hace falta cuando el error se mide en euros de otra
 * persona.
 *
 * LO QUE ESTE FICHERO NO HACE. No llama a nadie, no consulta precios, no
 * estima. Clasifica y decide. Ejecutar es de quien lo llama, y por eso se puede
 * probar entero sin gastar un céntimo.
 */

/**
 * De qué tipo es el coste de una operación.
 *
 * Las cuatro primeras se pueden ejecutar bajo el modo; las tres últimas no.
 * La frontera es exactamente ahí y está puesta a propósito: no es una escala
 * de «más o menos caro», es la línea entre «demostrado que no incrementa la
 * factura» y todo lo demás.
 */
export type ClaseDeCoste =
  /** Ya se paga y pasa igual si esto se ejecuta o no. Un servidor encendido. */
  | "ALREADY_PAID_FIXED_COST"
  /** Cabe dentro de lo que el plan actual ya incluye, sin exceso posible. */
  | "FREE_WITHIN_EXISTING_PLAN"
  /** Ocurre en esta máquina. No sale de aquí. */
  | "FREE_LOCAL"
  /** Se sirve solo, sobre hardware que ya estaba y ya se paga. */
  | "FREE_SELF_HOSTED_ON_EXISTING_HARDWARE"
  /** Puede subir la factura. No necesariamente lo hace: puede. Basta. */
  | "MAY_INCREASE_BILL"
  /** Cuesta dinero, sin más. */
  | "PAID"
  /** No se sabe. Es la peor de todas, porque parece la más inofensiva. */
  | "UNKNOWN_COST";

const EJECUTABLES: ReadonlySet<ClaseDeCoste> = new Set<ClaseDeCoste>([
  "ALREADY_PAID_FIXED_COST",
  "FREE_WITHIN_EXISTING_PLAN",
  "FREE_LOCAL",
  "FREE_SELF_HOSTED_ON_EXISTING_HARDWARE",
]);

export type MotivoDeDenegacionDeCoste =
  | "clase_de_pago"
  | "puede_subir_la_factura"
  | "coste_desconocido"
  | "sin_clasificar"
  | "proveedor_de_pago"
  | "gasto_publicitario"
  | "mensaje_facturable"
  | "ampliacion_de_recurso";

export type VeredictoDeCoste =
  | { permitido: true; clase: ClaseDeCoste; porQue: string }
  | { permitido: false; motivo: MotivoDeDenegacionDeCoste; clase: ClaseDeCoste; porQue: string };

/** Lo que se le pregunta a la política antes de hacer nada que pueda costar. */
export interface OperacionConCoste {
  /** Quién la atiende: `ollama`, `openai`, `meta_ads`, `ses`, `railway`… */
  proveedor: string;
  /** Qué se le pide: `generar`, `crear_campana`, `enviar`, `escalar`… */
  operacion: string;
  /** Céntimos declarados, si se conocen. `null` cuando el coste no es por importe. */
  importeCents?: number | null;
  /** Contexto, para el rastro. Nunca credenciales. */
  tenantId?: string;
  serviceId?: string;
  agente?: string;
  actor?: string;
  autorizacionId?: string;
}

/** El interruptor. Encendido por defecto: hay que apagarlo a propósito. */
export function modoCosteCeroActivo(): boolean {
  // OJO AL SENTIDO. El modo está encendido salvo que alguien escriba
  // exactamente "0". Si la variable falta, si está vacía, si tiene un valor
  // raro o si nadie la ha configurado, el modo SIGUE ENCENDIDO.
  //
  // Al revés —encender sólo con "1"— un despliegue que se olvide de la
  // variable se queda sin protección y nadie se entera hasta la factura. El
  // valor por defecto de una protección tiene que ser protegido.
  return process.env.NELVYON_MODO_COSTE_CERO?.trim() !== "0";
}

/**
 * Cómo cuesta cada proveedor conocido.
 *
 * Escrito a mano y a propósito: el coste de un proveedor no se deduce de su
 * nombre ni de su adaptador. Lo que sí se comprueba en pruebas es que TODO
 * proveedor que el árbol sabe usar esté aquí — un proveedor que no aparezca
 * cae en `UNKNOWN_COST`, que es lo correcto, pero conviene que no ocurra por
 * despiste.
 */
export const COSTE_POR_PROVEEDOR: Readonly<Record<string, { clase: ClaseDeCoste; porQue: string }>> = {
  ollama: {
    clase: "FREE_SELF_HOSTED_ON_EXISTING_HARDWARE",
    porQue: "modelo local sobre hardware que ya estaba; no sale del perímetro y no factura nadie",
  },
  openai: { clase: "PAID", porQue: "factura por token de entrada y de salida, sin nivel gratuito" },
  anthropic: { clase: "PAID", porQue: "factura por token de entrada y de salida, sin nivel gratuito" },
  gemini: { clase: "PAID", porQue: "factura por token fuera de su cuota gratuita, que no se puede garantizar" },
  openrouter: { clase: "PAID", porQue: "intermediario de modelos de pago" },
  groq: { clase: "UNKNOWN_COST", porQue: "tiene nivel gratuito con límites que pueden cambiar sin aviso" },
  together: { clase: "UNKNOWN_COST", porQue: "crédito inicial que se agota y después factura" },
  fireworks: { clase: "UNKNOWN_COST", porQue: "crédito inicial que se agota y después factura" },

  meta_ads: { clase: "PAID", porQue: "el presupuesto de una campaña es dinero del cliente" },
  google_ads: { clase: "PAID", porQue: "el presupuesto de una campaña es dinero del cliente" },
  tiktok_ads: { clase: "PAID", porQue: "el presupuesto de una campaña es dinero del cliente" },
  linkedin_ads: { clase: "PAID", porQue: "el presupuesto de una campaña es dinero del cliente" },

  whatsapp: { clase: "PAID", porQue: "Meta cobra por conversación abierta" },
  twilio: { clase: "PAID", porQue: "cobra por mensaje y por minuto" },
  ses: {
    clase: "MAY_INCREASE_BILL",
    porQue: "hay envíos incluidos, pero el exceso factura y no se puede garantizar que no se llegue",
  },

  railway: {
    clase: "MAY_INCREASE_BILL",
    porQue: "ampliar una réplica, un volumen o un plan cambia la factura del mes",
  },
  upstash: {
    clase: "MAY_INCREASE_BILL",
    porQue: "su nivel gratuito tiene tope de peticiones y por encima factura",
  },
  sentry: { clase: "MAY_INCREASE_BILL", porQue: "el nivel gratuito tiene tope de eventos" },

  // Lectura de metadatos sobre infraestructura que ya está encendida y pagada.
  railway_lectura: {
    clase: "FREE_WITHIN_EXISTING_PLAN",
    porQue: "leer estado y variables de un servicio ya encendido no arranca nada",
  },
  postgres_produccion_lectura: {
    clase: "FREE_WITHIN_EXISTING_PLAN",
    porQue: "consultar catálogos y recuentos son kilobytes contra una base que ya está encendida",
  },
  local: { clase: "FREE_LOCAL", porQue: "ocurre en esta máquina" },
};

/**
 * Operaciones que cuestan por lo que HACEN, no por quién las atiende.
 *
 * Un `escalar` es caro lo pida quien lo pida. Esta tabla gana a la del
 * proveedor: si la operación es de esta lista, no importa que el proveedor
 * esté clasificado como gratuito.
 */
const OPERACIONES_QUE_CUESTAN: Readonly<Record<string, MotivoDeDenegacionDeCoste>> = {
  crear_campana: "gasto_publicitario",
  activar_campana: "gasto_publicitario",
  cambiar_presupuesto: "gasto_publicitario",
  reanudar_campana: "gasto_publicitario",
  enviar_mensaje: "mensaje_facturable",
  enviar_whatsapp: "mensaje_facturable",
  enviar_sms: "mensaje_facturable",
  enviar_campana_masiva: "mensaje_facturable",
  escalar: "ampliacion_de_recurso",
  ampliar_plan: "ampliacion_de_recurso",
  anadir_replica: "ampliacion_de_recurso",
  ampliar_volumen: "ampliacion_de_recurso",
  comprar_creditos: "clase_de_pago",
  activar_facturacion: "clase_de_pago",
};

/** La clase de coste de una operación, sin decidir todavía si se permite. */
export function claseDe(op: OperacionConCoste): { clase: ClaseDeCoste; porQue: string } {
  const porOperacion = OPERACIONES_QUE_CUESTAN[op.operacion];
  if (porOperacion) {
    return {
      clase: "PAID",
      porQue: `la operación «${op.operacion}» cuesta por lo que hace, la atienda quien la atienda`,
    };
  }
  const porProveedor = COSTE_POR_PROVEEDOR[op.proveedor];
  if (!porProveedor) {
    return {
      clase: "UNKNOWN_COST",
      porQue: `«${op.proveedor}» no está clasificado, y sin clasificar no se puede afirmar que sea gratis`,
    };
  }
  // Un importe declarado mayor que cero es dinero, diga lo que diga la tabla.
  if (typeof op.importeCents === "number" && op.importeCents > 0) {
    return {
      clase: "PAID",
      porQue: `declara ${op.importeCents} céntimos: eso es dinero aunque el proveedor sea barato`,
    };
  }
  return porProveedor;
}

/**
 * ¿Se puede hacer esto sin que suba la factura?
 *
 * Con el modo apagado devuelve siempre permitido y lo dice: no es que no haya
 * política, es que alguien la ha apagado a propósito y eso queda en el rastro.
 */
export function decidirCoste(op: OperacionConCoste): VeredictoDeCoste {
  const { clase, porQue } = claseDe(op);

  if (!modoCosteCeroActivo()) {
    return { permitido: true, clase, porQue: `modo coste cero APAGADO · ${porQue}` };
  }

  if (EJECUTABLES.has(clase)) return { permitido: true, clase, porQue };

  const motivo: MotivoDeDenegacionDeCoste =
    OPERACIONES_QUE_CUESTAN[op.operacion] ??
    (clase === "UNKNOWN_COST"
      ? "coste_desconocido"
      : clase === "MAY_INCREASE_BILL"
        ? "puede_subir_la_factura"
        : "proveedor_de_pago");

  return { permitido: false, motivo, clase, porQue };
}

/**
 * Lo que queda escrito de cada decisión.
 *
 * Sin esto, la política sólo existe mientras alguien la mira. Con esto se puede
 * contestar después a «¿quién autorizó esto y cuánto costó?», que es la
 * pregunta que se hace cuando ya ha pasado.
 */
export interface ApunteDeCoste {
  momento: string;
  proveedor: string;
  operacion: string;
  clase: ClaseDeCoste;
  permitido: boolean;
  motivo: MotivoDeDenegacionDeCoste | null;
  importeCentsDeclarado: number | null;
  /** Se conoce cuando el proveedor lo dice. `null` es una respuesta legítima. */
  costeRealCents: number | null;
  tenantId: string | null;
  serviceId: string | null;
  agente: string | null;
  actor: string | null;
  autorizacionId: string | null;
}

export function apuntar(op: OperacionConCoste, v: VeredictoDeCoste, costeRealCents: number | null = null): ApunteDeCoste {
  return {
    momento: new Date().toISOString(),
    proveedor: op.proveedor,
    operacion: op.operacion,
    clase: v.clase,
    permitido: v.permitido,
    motivo: v.permitido ? null : v.motivo,
    importeCentsDeclarado: op.importeCents ?? null,
    costeRealCents,
    tenantId: op.tenantId ?? null,
    serviceId: op.serviceId ?? null,
    agente: op.agente ?? null,
    actor: op.actor ?? null,
    autorizacionId: op.autorizacionId ?? null,
  };
}

/** Los proveedores clasificados. Lo usan las pruebas para comprobar cobertura. */
export function proveedoresClasificados(): string[] {
  return Object.keys(COSTE_POR_PROVEEDOR).sort();
}

/** Las operaciones que cuestan por sí mismas. Lo usan las pruebas. */
export function operacionesQueCuestan(): string[] {
  return Object.keys(OPERACIONES_QUE_CUESTAN).sort();
}

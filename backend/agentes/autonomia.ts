/**
 * NIVELES DE AUTONOMÍA.
 *
 * El objetivo es máxima autonomía sin perder el control, y eso no se consigue
 * con un interruptor de «automático sí/no». Se consigue clasificando CADA
 * acción por lo que pasa si sale mal, y dándole a cada agente el nivel más alto
 * que su acción tolere.
 *
 * La pregunta que define el nivel no es «¿cuánto confío en el agente?» sino
 * «¿qué cuesta deshacerlo?». Un borrador equivocado se tira. Una campaña
 * lanzada con el presupuesto mal no se puede des-gastar.
 *
 * COMPATIBILIDAD. El árbol ya tiene una taxonomía de riesgo para herramientas
 * MCP y otra para aprobaciones de pack. Ésta NO las sustituye ni las renombra:
 * se mapea a ellas (`aNivelDeRiesgoMcp`) para que un agente pueda declarar su
 * nivel sin que nadie tenga que migrar lo que ya funciona.
 */

export type NivelDeAutonomia =
  /** Sólo mira. Leer analítica, leer el CRM, leer la web del cliente. */
  | "L0_OBSERVAR"
  /** Propone y no toca nada. Un informe, una recomendación, un diagnóstico. */
  | "L1_RECOMENDAR"
  /** Produce algo que existe pero no está publicado: un borrador. */
  | "L2_BORRADOR"
  /** Actúa, y deshacerlo es barato y completo: guardar, etiquetar, programar. */
  | "L3_EJECUTAR_REVERSIBLE"
  /** Actúa con consecuencias acotadas por un tope declarado de antemano. */
  | "L4_EJECUTAR_ACOTADO"
  /** No se hace sin que una persona diga que sí. */
  | "L5_APROBACION_HUMANA";

export const NIVELES: readonly NivelDeAutonomia[] = [
  "L0_OBSERVAR",
  "L1_RECOMENDAR",
  "L2_BORRADOR",
  "L3_EJECUTAR_REVERSIBLE",
  "L4_EJECUTAR_ACOTADO",
  "L5_APROBACION_HUMANA",
] as const;

const ORDEN = new Map(NIVELES.map((n, i) => [n, i]));

export function ordenDe(n: NivelDeAutonomia): number {
  return ORDEN.get(n) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Qué hace que una acción NO pueda estar por debajo de cierto nivel.
 *
 * Es una lista de consecuencias, no de tecnologías: lo que importa no es que
 * algo use una API externa, sino qué pasa después de usarla.
 */
export type Consecuencia =
  /** Sale dinero de una cuenta. */
  | "gasta_dinero"
  /** Alguien fuera lo va a ver con la cara del cliente. */
  | "publica_en_nombre_del_cliente"
  /** Se manda algo a personas: correo, SMS, mensaje. */
  | "contacta_personas"
  /** Toca credenciales o permisos. */
  | "toca_credenciales"
  /** Lee o mueve datos personales. */
  | "toca_datos_personales"
  /** Borra o sobrescribe sin copia. */
  | "es_irreversible"
  /** Produce una afirmación con efectos legales o de cumplimiento. */
  | "tiene_efecto_legal";

/**
 * El suelo de cada consecuencia. Una acción con varias consecuencias toma el
 * más alto de sus suelos.
 *
 * `gasta_dinero` está en L4 y no en L5 a propósito: exigir aprobación humana
 * para CADA euro haría inviable la operación, y la guarda de gasto ya obliga a
 * presupuesto, tope por operación y ventana. Lo que L5 protege es lo que ningún
 * tope puede acotar — publicar algo que no se puede despublicar de la memoria
 * de quien lo vio, o borrar sin copia.
 */
const SUELO: Readonly<Record<Consecuencia, NivelDeAutonomia>> = {
  gasta_dinero: "L4_EJECUTAR_ACOTADO",
  publica_en_nombre_del_cliente: "L5_APROBACION_HUMANA",
  contacta_personas: "L5_APROBACION_HUMANA",
  toca_credenciales: "L5_APROBACION_HUMANA",
  toca_datos_personales: "L3_EJECUTAR_REVERSIBLE",
  es_irreversible: "L5_APROBACION_HUMANA",
  tiene_efecto_legal: "L5_APROBACION_HUMANA",
};

export function sueloDe(consecuencias: readonly Consecuencia[]): NivelDeAutonomia {
  let suelo: NivelDeAutonomia = "L0_OBSERVAR";
  for (const c of consecuencias) {
    const s = SUELO[c];
    if (ordenDe(s) > ordenDe(suelo)) suelo = s;
  }
  return suelo;
}

export type VeredictoDeAutonomia =
  | { permitido: true }
  | { permitido: false; motivo: string; sueloExigido: NivelDeAutonomia };

/**
 * ¿Puede este agente, con el nivel que declara, hacer una acción con estas
 * consecuencias?
 *
 * Se comprueba en el momento de actuar y no sólo al declarar el contrato,
 * porque las consecuencias reales dependen de los argumentos: el mismo agente
 * que redacta un correo puede estar a punto de enviarlo.
 */
export function puedeActuar(
  nivelDelAgente: NivelDeAutonomia,
  consecuencias: readonly Consecuencia[],
): VeredictoDeAutonomia {
  const suelo = sueloDe(consecuencias);
  if (ordenDe(nivelDelAgente) >= ordenDe(suelo)) return { permitido: true };
  return {
    permitido: false,
    sueloExigido: suelo,
    motivo:
      `la acción tiene consecuencias [${consecuencias.join(", ")}], que exigen ` +
      `${suelo}, y el agente declara ${nivelDelAgente}`,
  };
}

/**
 * ¿Esta acción necesita que una persona diga que sí antes de ocurrir?
 *
 * Es distinto de `puedeActuar`: un agente L5 SÍ puede hacer acciones L5, pero
 * sólo después de la aprobación. Confundir las dos preguntas es cómo un agente
 * con permiso acaba actuando sin que nadie lo haya aprobado.
 */
export function exigeAprobacionHumana(consecuencias: readonly Consecuencia[]): boolean {
  return sueloDe(consecuencias) === "L5_APROBACION_HUMANA";
}

/**
 * Traducción al vocabulario de riesgo que ya usan las herramientas MCP del
 * árbol. Existe para no obligar a migrar lo que funciona.
 */
export function aNivelDeRiesgoMcp(n: NivelDeAutonomia): "low" | "medium" | "high" {
  switch (n) {
    case "L0_OBSERVAR":
    case "L1_RECOMENDAR":
      return "low";
    case "L2_BORRADOR":
    case "L3_EJECUTAR_REVERSIBLE":
      return "medium";
    case "L4_EJECUTAR_ACOTADO":
    case "L5_APROBACION_HUMANA":
      return "high";
  }
}

/** Explicación en una frase, para poder pintarla en una consola sin traducir. */
export function explicar(n: NivelDeAutonomia): string {
  switch (n) {
    case "L0_OBSERVAR":
      return "Sólo lee. No cambia nada en ningún sitio.";
    case "L1_RECOMENDAR":
      return "Propone. Lo que decida hacerse con su propuesta es de otro.";
    case "L2_BORRADOR":
      return "Produce algo que existe pero nadie ha visto todavía.";
    case "L3_EJECUTAR_REVERSIBLE":
      return "Actúa, y deshacerlo es barato y completo.";
    case "L4_EJECUTAR_ACOTADO":
      return "Actúa dentro de un tope declarado de antemano.";
    case "L5_APROBACION_HUMANA":
      return "No ocurre hasta que una persona dice que sí.";
  }
}

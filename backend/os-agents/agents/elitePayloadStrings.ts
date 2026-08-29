import type { OsJobPayload } from "../types";

function asTrimmedString(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function asJoinedList(v: unknown, fallback: string): string {
  if (Array.isArray(v)) {
    const parts = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
    if (parts.length > 0) return parts.join(", ");
  }
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function defaultBrief(payload: OsJobPayload): string {
  const raw = typeof payload.brief === "string" ? payload.brief.trim() : "";
  return raw.length > 0
    ? raw
    : "Brief adicional pendiente: infiere objetivos premium coherentes con sector y posicionamiento.";
}

/**
 * LA CLAVE QUE `buildPrompt` PREPONE SIEMPRE.
 *
 * Empieza por `__` para que ninguna plantilla la trate como una variable a
 * interpolar: no se sustituye en ningún `{{hueco}}`, se pega delante.
 */
export const CLAVE_CONTEXTO = "__contextoDelCliente";

function comoLista(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
  }
  if (typeof v === "string" && v.trim().length > 0) return [v.trim()];
  return [];
}

/**
 * EL CONTEXTO QUE LLEGA A TODOS LOS AGENTES, SIEMPRE.
 *
 * POR QUÉ EXISTE. Se midió qué parte de lo que distingue a un cliente llegaba
 * de verdad a la instrucción del agente, con cinco clientes que no se parecen
 * en nada. Resultado: el 40 %. El otro 60 % —presupuesto, ubicación,
 * restricciones legales, lo que ya probó y le salió mal— no salía del intake.
 *
 * Y lo más grave no era el presupuesto: eran las RESTRICCIONES. Una tienda de
 * suplementos que legalmente no puede prometer resultados y una clínica dental
 * sujeta a la normativa de publicidad sanitaria recibían un plan que ignoraba
 * las dos cosas. Eso no es un plan flojo: es un plan que puede costarle una
 * sanción al cliente.
 *
 * POR QUÉ AQUÍ Y NO EN CADA PLANTILLA. Porque son veinticuatro plantillas y
 * confiar en que todas se acuerden de interpolar una variable es exactamente
 * cómo se perdió el 60 %. Este bloque lo prepone `buildPrompt`, así que llega
 * aunque la plantilla no sepa que existe.
 *
 * LO QUE NO SE INVENTA. Un campo que el cliente no ha dado NO aparece. Nada de
 * «presupuesto: por definir» disfrazado de dato: si no se sabe, no se dice, y
 * el agente escala en vez de suponer.
 */
export function contextoDelCliente(payload: OsJobPayload): string {
  const lineas: string[] = [];

  const decir = (etiqueta: string, valor: unknown): void => {
    if (typeof valor === "string" && valor.trim()) lineas.push(`- ${etiqueta}: ${valor.trim()}`);
    else if (typeof valor === "number" && Number.isFinite(valor)) lineas.push(`- ${etiqueta}: ${valor}`);
  };

  decir("Objetivo del cliente", payload.mainGoal ?? payload.businessGoal ?? payload.campaignGoal);
  decir("Qué le hace distinto", payload.uniqueValue ?? payload.usp);
  decir("Dónde opera", payload.location);

  const presupuesto = payload.monthlyBudget ?? payload.budget;
  if (typeof presupuesto === "number" && Number.isFinite(presupuesto)) {
    lineas.push(`- Presupuesto mensual disponible: ${presupuesto} EUR`);
  } else if (typeof presupuesto === "string" && presupuesto.trim()) {
    lineas.push(`- Presupuesto mensual disponible: ${presupuesto.trim()}`);
  }

  // LO QUE YA PROBÓ. Proponerle otra vez lo que le salió mal es la forma más
  // rápida de que deje de leer.
  decir("Lo que ya intentó y qué pasó", payload.history ?? payload.pastResults);

  // LAS RESTRICCIONES, EN BLOQUE APARTE Y EN MAYÚSCULAS.
  // Van separadas de los datos porque no son contexto: son límites. Mezcladas
  // entre viñetas se leen como una preferencia más.
  const restricciones = [...comoLista(payload.constraints), ...comoLista(payload.restrictions)];

  if (lineas.length === 0 && restricciones.length === 0) return "";

  const partes: string[] = [];
  if (lineas.length > 0) partes.push(`### CONTEXTO REAL DEL CLIENTE
${lineas.join("\n")}`);
  if (restricciones.length > 0) {
    partes.push(
      "### LÍMITES INNEGOCIABLES\n" +
        "Nada de lo que propongas puede saltarse esto. Si el plan obvio los incumple, " +
        "propón otro o di explícitamente que hace falta una decisión del cliente.\n" +
        restricciones.map((r) => `- ${r}`).join("\n"),
    );
  }
  return partes.join("\n\n");
}

/** Base intake fields shared by Lote 1 elite agents (Stripe + form pipeline). */
export function eliteCommonIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return {
    [CLAVE_CONTEXTO]: contextoDelCliente(payload),
    clientName: asTrimmedString(payload.clientName, "Cliente premium (nombre por confirmar en kickoff)"),
    industry: asTrimmedString(payload.industry, "Sector a definir con el cliente en sesión estratégica"),
    targetAudience: asTrimmedString(payload.targetAudience, "Público objetivo por perfilar con research cualitativo/cuantitativo"),
    tone: asTrimmedString(payload.tone, "Tono de marca a acordar (referencia: profesional, preciso, aspiracional)"),
    competitors: asJoinedList(
      payload.competitors,
      "Competidores por mapear en benchmark competitivo (indicar referencias en kickoff)",
    ),
    brief: defaultBrief(payload),
    primaryColor: asTrimmedString(payload.primaryColor, "#0f172a (sugerencia base hasta guía cromática)"),
    secondaryColor: asTrimmedString(payload.secondaryColor, "#64748b (sugerencia secundaria hasta brand system)"),
    referenceUrls: asJoinedList(
      payload.referenceUrls,
      "Referencias visuales por recabar (URLs o descripciones en briefing creativo)",
    ),
  };
}

export function eliteSeoIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return {
    ...eliteCommonIntakeStrings(payload),
    targetKeywords: asJoinedList(payload.targetKeywords, "Palabras clave objetivo por investigar con Ahrefs/SEMrush"),
    mainGoal: asTrimmedString(payload.mainGoal, "Objetivo SEO principal por consensuar con negocio"),
    currentWebsiteUrl: asTrimmedString(payload.currentWebsiteUrl, "Sin URL de web actual informada"),
  };
}

export function eliteAdsIntakeStrings(payload: OsJobPayload): Record<string, string> {
  const mb = payload.monthlyBudget;
  const budgetStr =
    typeof mb === "number" && Number.isFinite(mb)
      ? String(mb)
      : typeof mb === "string" && mb.trim().length > 0
        ? mb.trim()
        : "Presupuesto mensual por definir con media planning";
  return {
    ...eliteCommonIntakeStrings(payload),
    adPlatforms: asJoinedList(payload.platforms, "Plataformas de pago por priorizar (Google, Meta, TikTok, LinkedIn)"),
    monthlyBudget: budgetStr,
    campaignGoal: asTrimmedString(payload.campaignGoal, "Objetivo de campaña por alinear con KPIs de negocio"),
  };
}

export function eliteSocialIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return {
    ...eliteCommonIntakeStrings(payload),
    socialPlatforms: asJoinedList(payload.platforms, "Redes sociales por priorizar (Instagram, LinkedIn, TikTok, etc.)"),
    postFrequency: asTrimmedString(payload.postFrequency, "Frecuencia de publicación por acordar en calendario"),
    contentStyle: asTrimmedString(payload.contentStyle, "Estilo visual preferido por definir con moodboard"),
  };
}

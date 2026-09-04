import type { OsJobPayload } from "../types";
import { CLAVE_CEREBRO, CLAVE_CONTEXTO, eliteCommonIntakeStrings } from "./elitePayloadStrings";

/** Replaces `{{KEY}}` placeholders (Lote 2 prompt convention). */
/**
 * Compone el prompt e IMPONE el contexto del cliente.
 *
 * `CLAVE_CONTEXTO` no se interpola en ningún hueco: se PREPONE. Es
 * deliberado. Son veinticuatro plantillas, y confiar en que todas se acuerden
 * de colocar una variable es exactamente cómo se perdió el 60 % de lo que
 * distingue a un cliente — incluidas sus restricciones legales.
 *
 * Medido antes: cobertura 0,40. Es decir, más de la mitad de lo que hace único
 * a un cliente no llegaba al agente que trabaja para él.
 */
export function buildPrompt(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    if (key === CLAVE_CONTEXTO || key === CLAVE_CEREBRO) continue;
    out = out.split(`{{${key}}}`).join(value);
  }

  // El Business Brain va DESPUÉS del contexto del encargo y ANTES de la
  // plantilla. El orden no es estético: lo que el cliente acaba de decir en
  // este trabajo manda sobre lo que sabíamos de antes, así que se lee primero.
  const cerebro = vars[CLAVE_CEREBRO];
  if (cerebro && cerebro.trim()) out = `${cerebro.trim()}\n\n${out}`;

  const contexto = vars[CLAVE_CONTEXTO];
  return contexto && contexto.trim() ? `${contexto.trim()}\n\n${out}` : out;
}

/** Uppercase intake keys for Lote 2 templates ({{CLIENT_NAME}}, …). */
export function eliteLote2CommonVars(payload: OsJobPayload): Record<string, string> {
  const b = eliteCommonIntakeStrings(payload);
  return {
    // LA CLAVE SE REENVIA. Esta funcion reconstruye el mapa con nombres en
    // mayusculas y, al hacerlo, descartaba el contexto del cliente. Doce
    // familias de prompts pasan por aqui: era el unico sitio por el que el
    // presupuesto y las restricciones legales dejaban de llegar a doce
    // servicios a la vez.
    [CLAVE_CONTEXTO]: b[CLAVE_CONTEXTO] ?? "",
    // Y el cerebro, por lo mismo. Reconstruir el mapa en mayusculas es
    // exactamente donde se pierde una clave que empieza por `__`: paso ya una
    // vez con el contexto del encargo y doce servicios se quedaron sin el.
    [CLAVE_CEREBRO]: b[CLAVE_CEREBRO] ?? "",
    CLIENT_NAME: b.clientName,
    INDUSTRY: b.industry,
    TARGET_AUDIENCE: b.targetAudience,
    TONE: b.tone,
    COMPETITORS: b.competitors,
    PRIMARY_COLOR: b.primaryColor,
    SECONDARY_COLOR: b.secondaryColor,
    BRIEF: b.brief,
    REFERENCE_URLS: b.referenceUrls,
  };
}

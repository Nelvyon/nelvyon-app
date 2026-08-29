import type { OsJobPayload } from "../types";
import { CLAVE_CONTEXTO, eliteCommonIntakeStrings } from "./elitePayloadStrings";

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
    if (key === CLAVE_CONTEXTO) continue;
    out = out.split(`{{${key}}}`).join(value);
  }
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

/**
 * Qué trabajo puede degradarse a reglas y qué trabajo no.
 *
 * NELVYON vende servicios de agencia. Un cliente que contrata `seo_premium`
 * está pagando por trabajo hecho, y entregarle contenido de plantilla sin
 * decírselo no es una degradación aceptable: es entregar otra cosa. En cambio
 * hay salidas que por diseño no necesitan modelo (la configuración de un bot se
 * calcula, no se redacta) y ahí no hay nada que degradar.
 *
 * La regla por defecto es la estricta —los 25 servicios vendibles exigen IA
 * real— y aflojarla exige un gesto explícito y visible en el entorno, no un
 * descuido.
 */

import { OS_PREMIUM_SERVICE_IDS } from "../../os-agents/constants";
import type { LlmProvenance } from "./llmProvenance";
import { esPublicable } from "./llmProvenance";

/** Servicios vendibles: por defecto NO admiten degradación silenciosa. */
const SERVICIOS_VENDIBLES: ReadonlySet<string> = new Set(OS_PREMIUM_SERVICE_IDS);

export type ContextoDePolitica = {
  /** Id de servicio contratado, cuando el trabajo nace de uno. */
  serviceId?: string | null;
  /** Id de pack, cuando el trabajo nace de un pack sectorial. */
  packId?: string | null;
  /**
   * Trabajo interno: diagnóstico, simulación, seed, prueba. No se entrega a
   * ningún cliente, así que degradar no engaña a nadie.
   */
  interno?: boolean;
};

/**
 * Permiso explícito para degradar. Existe para poder desarrollar y ejecutar la
 * suite sin un modelo levantado. Es una sola variable, se lee en cada llamada
 * —para que una prueba pueda quitarla— y no tiene valor por defecto.
 */
export function degradacionPermitidaPorEntorno(): boolean {
  return process.env.NELVYON_LLM_ALLOW_DEGRADATION?.trim() === "1";
}

/**
 * ¿Se permite entregar como bueno un trabajo producido sin modelo real?
 *
 * Orden deliberado: lo interno primero (nunca llega al cliente), el permiso de
 * entorno después, y sólo entonces la regla del servicio. Un servicio vendible
 * sin permiso explícito devuelve `false`.
 */
export function degradacionPermitida(ctx: ContextoDePolitica = {}): boolean {
  if (ctx.interno === true) return true;
  if (degradacionPermitidaPorEntorno()) return true;
  const servicio = ctx.serviceId?.trim();
  if (servicio && SERVICIOS_VENDIBLES.has(servicio)) return false;
  // Un pack sectorial también se vende, aunque su id no esté en la lista.
  if (ctx.packId?.trim()) return false;
  // Sin contexto no se puede afirmar que sea entregable a un cliente, pero
  // tampoco lo contrario. Fail-closed: se trata como si lo fuera.
  return false;
}

export type VeredictoDeEntrega =
  | { publicable: true }
  | { publicable: false; motivo: string; outcome: LlmProvenance["outcome"] };

/**
 * Veredicto de entrega para UNA salida de agente. Es lo que impide el
 * certificado engañoso: se aplica antes de emitir certificado y antes de
 * publicar, no después.
 */
export function veredictoDeEntrega(p: LlmProvenance): VeredictoDeEntrega {
  if (esPublicable(p)) return { publicable: true };
  const motivo =
    p.outcome === "ERROR"
      ? `el agente no produjo salida válida (${p.errorKind ?? "desconocido"}): ${p.reason}`
      : `producido sin modelo real (${p.outcome}) y este trabajo no admite degradación: ${p.reason}`;
  return { publicable: false, motivo, outcome: p.outcome };
}

/**
 * Veredicto para un conjunto de salidas: un entregable lo componen varios
 * agentes y basta que UNO no sea publicable para que el conjunto no lo sea.
 */
export function veredictoDeEntregaDelConjunto(
  procedencias: readonly LlmProvenance[],
): VeredictoDeEntrega {
  for (const p of procedencias) {
    const v = veredictoDeEntrega(p);
    if (!v.publicable) return v;
  }
  return { publicable: true };
}

/** Recuento por estado, para poder medir sin recorrer a mano. */
export function recuentoPorEstado(
  procedencias: readonly LlmProvenance[],
): Record<LlmProvenance["outcome"], number> {
  const r = {
    REAL_LLM_SUCCESS: 0,
    RULE_ENGINE: 0,
    MOCK: 0,
    FALLBACK: 0,
    ERROR: 0,
  };
  for (const p of procedencias) r[p.outcome] += 1;
  return r;
}

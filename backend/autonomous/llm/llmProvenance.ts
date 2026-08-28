/**
 * Procedencia de una salida de agente: CON QUÉ se produjo, sin ambigüedad.
 *
 * El motivo de que esto exista está medido, no supuesto. En producción hay
 * 14.178 eventos de auditoría de agente entre el 29 de junio y el 22 de julio
 * de 2026, y los 14.178 dicen `model = 'mock-rules-v1'` con 0 tokens. Ninguno
 * dice `llm_mode = 'real'`. Todo el trabajo entregado en ese periodo lo generó
 * un motor de reglas, y nada aguas abajo lo distinguía de trabajo hecho por un
 * modelo: `mockFallback` registraba `ok: true` y el certificado se emitía igual.
 *
 * El adaptador ya falla cerrado desde `d4afec6c` (23-07-2026) cuando Ollama
 * está configurado y falla. Eso tapa el agujero más grande, pero deja tres:
 *
 *   1. `AUTONOMOUS_LLM_MODE=mock` sigue devolviendo contenido de reglas sin
 *      que nadie aguas abajo sepa que lo es.
 *   2. Sin ningún proveedor configurado, lo mismo.
 *   3. `mock` mezcla dos cosas que no son la misma: una degradación (quería un
 *      modelo y no lo hubo) y un generador determinista que por diseño no
 *      necesita modelo (`llmChatbotConfig`). La primera es un defecto que hay
 *      que escalar; la segunda es correcta.
 *
 * Por eso los estados son cinco y no dos, y por eso la decisión de si algo es
 * publicable se toma con el estado y no con una cadena de texto libre.
 */

/** Los cinco estados. Cerrados: no hay un sexto ni un "otro". */
export type LlmOutcome =
  /** Un modelo real respondió y su salida es la que se usa. */
  | "REAL_LLM_SUCCESS"
  /** Por diseño no había que llamar a ningún modelo: salida determinista. */
  | "RULE_ENGINE"
  /** Se pidió modo simulado de forma explícita (desarrollo, pruebas). */
  | "MOCK"
  /** Se quería un modelo real, no lo hubo, y se degradó a reglas. */
  | "FALLBACK"
  /** Se quería un modelo real, no lo hubo, y NO se degrada. */
  | "ERROR";

export const LLM_OUTCOMES: readonly LlmOutcome[] = [
  "REAL_LLM_SUCCESS",
  "RULE_ENGINE",
  "MOCK",
  "FALLBACK",
  "ERROR",
] as const;

export type LlmProviderId = "ollama" | "openai" | "none";

/**
 * Familias de error. Se clasifican para poder decidir qué se reintenta y qué
 * no: un JSON malformado se reintenta, una clave inválida no.
 */
export type LlmErrorKind =
  | "not_configured"
  | "forbidden"
  | "unreachable"
  | "timeout"
  | "auth"
  | "rate_limit"
  | "bad_json"
  | "empty_response"
  | "budget_exhausted"
  | "limit_exceeded"
  | "unknown";

/** Errores que tiene sentido reintentar. Los demás no mejoran con insistir. */
const REINTENTABLES: ReadonlySet<LlmErrorKind> = new Set<LlmErrorKind>([
  "unreachable",
  "timeout",
  "rate_limit",
  "bad_json",
  "empty_response",
]);

export function esReintentable(kind: LlmErrorKind): boolean {
  return REINTENTABLES.has(kind);
}

export interface LlmProvenance {
  outcome: LlmOutcome;
  provider: LlmProviderId;
  model: string;
  tokensIn: number;
  tokensOut: number;
  /**
   * En USD. `null` cuando no hay tarifa conocida para ese modelo — nunca se
   * inventa un número. Un modelo local vale 0, que no es lo mismo que `null`.
   */
  costEstimateUsd: number | null;
  latencyMs: number;
  /** Intentos ADICIONALES al primero. Un éxito a la primera son 0. */
  retries: number;
  /** Proveedor desde el que se degradó, cuando lo hubo. */
  fallbackFrom: LlmProviderId | null;
  errorKind: LlmErrorKind | null;
  /**
   * Si la degradación estaba permitida para este trabajo. Lo decide la política
   * del servicio, no el adaptador. Ver `llmPolicy.ts`.
   */
  degradationAllowed: boolean;
  /** Causa legible. Nunca contiene el prompt ni datos del cliente. */
  reason: string;
}

/** Tokens totales, que es lo que la auditoría venía guardando en un solo número. */
export function tokensTotales(p: LlmProvenance): number {
  return p.tokensIn + p.tokensOut;
}

/**
 * ¿Puede publicarse o certificarse una salida producida así?
 *
 * Esta es la función que impide el certificado engañoso. Es deliberadamente
 * estricta: cualquier estado que no sea trabajo real o determinista por diseño
 * exige que la degradación estuviera permitida de antemano.
 */
export function esPublicable(p: LlmProvenance): boolean {
  switch (p.outcome) {
    case "REAL_LLM_SUCCESS":
      return true;
    case "RULE_ENGINE":
      // Determinista por diseño: no había nada que degradar.
      return true;
    case "MOCK":
    case "FALLBACK":
      return p.degradationAllowed;
    case "ERROR":
      return false;
  }
}

/** Estados que representan trabajo NO hecho por un modelo real. */
export function esDegradacion(outcome: LlmOutcome): boolean {
  return outcome === "MOCK" || outcome === "FALLBACK";
}

/**
 * Traduce a la pareja `llm_mode` que la auditoría ya guarda, para no romper
 * `os_agent_audit_events` ni las consultas existentes. `RULE_ENGINE`, `MOCK` y
 * `FALLBACK` se guardan como `mock` igual que antes; el estado fino va en su
 * propia columna.
 */
export function aLlmModeHeredado(outcome: LlmOutcome): "mock" | "real" {
  return outcome === "REAL_LLM_SUCCESS" ? "real" : "mock";
}

/**
 * Clasifica el error de un proveedor sin depender de la clase del error, que
 * varía entre `fetch`, `AbortController` y el cliente de Ollama.
 */
export function clasificarErrorDeProveedor(err: unknown): LlmErrorKind {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (!msg) return "unknown";
  if (msg.includes("budget") || msg.includes("presupuesto")) return "budget_exhausted";
  if (msg.includes("not allowed") || msg.includes("private_mode") || msg.includes("forbidden")) {
    return "forbidden";
  }
  if (msg.includes("missing") || msg.includes("not configured")) return "not_configured";
  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("etimedout")) return "timeout";
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("api key")) {
    return "auth";
  }
  if (msg.includes("429") || msg.includes("rate limit")) return "rate_limit";
  if (msg.includes("empty content") || msg.includes("empty response")) return "empty_response";
  if (msg.includes("not valid json") || msg.includes("json")) return "bad_json";
  if (
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("ehostunreach") ||
    msg.includes("enetunreach") ||
    msg.includes("socket hang up") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  ) {
    return "unreachable";
  }
  return "unknown";
}

/** Procedencia de un generador determinista. No es una degradación. */
export function procedenciaDeMotorDeReglas(
  model: string,
  latencyMs: number,
  reason = "generador determinista por diseño",
): LlmProvenance {
  return {
    outcome: "RULE_ENGINE",
    provider: "none",
    model,
    tokensIn: 0,
    tokensOut: 0,
    costEstimateUsd: 0,
    latencyMs,
    retries: 0,
    fallbackFrom: null,
    errorKind: null,
    degradationAllowed: true,
    reason,
  };
}

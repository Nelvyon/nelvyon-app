/**
 * Presupuesto agregado de LLM por ejecución de SKU.
 *
 * PROBLEMA QUE RESUELVE
 * ---------------------
 * El pipeline Phase C tenía timeout POR LLAMADA pero ningún tope agregado. El
 * peor caso legítimo era:
 *
 *   4 intentos (1 + max_retries=3)
 *     x 3 agentes LLM (pm, strategist, copywriter)
 *     x 2 llamadas (original + pase de reparación de JSON)
 *     x timeout por llamada (120s modelo rápido / 300s modelo 8b)
 *   = 48 min con modelo 3b, 120 min con modelo 8b
 *
 * frente a un presupuesto de job en CI de 35 min. Por eso `sku_chatbot` medía
 * 1m42s una vez y se quedaba 29m50s clavado otra: ambas conductas eran
 * "correctas" para el código. El chatbot es el más expuesto porque genera hasta
 * 60 FAQs en una sola llamada.
 *
 * DISEÑO
 * ------
 * Un presupuesto en milisegundos se instala para toda la ejecución del SKU con
 * `runWithLlmBudget`. Se propaga por el árbol de llamadas asíncronas mediante
 * `AsyncLocalStorage`, de modo que no hay que enhebrar un parámetro por las
 * ~20 funciones de agente: cualquier punto del pipeline puede preguntar cuánto
 * queda sin cambiar su firma.
 *
 * Reglas:
 *   - Sin presupuesto instalado, `remainingLlmBudgetMs()` devuelve `null` y todo
 *     se comporta EXACTAMENTE como antes. El cambio es inerte fuera de Phase C.
 *   - Cada llamada a Ollama recibe `timeoutMs = min(restante, timeout_normal)`,
 *     así una llamada nunca puede desbordar el presupuesto que queda.
 *   - Agotado el presupuesto, las llamadas siguientes fallan de inmediato con
 *     `LlmBudgetExhaustedError` en lugar de esperar su timeout completo.
 *   - El agotamiento se marca en el contexto para que la ejecución quede
 *     registrada como DEGRADADA, no como éxito normal.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export const LLM_BUDGET_DEGRADED_MODEL = "budget-exhausted";

/** Margen bajo el cual no merece la pena iniciar otra llamada LLM. */
export const LLM_BUDGET_MIN_CALL_MS = 5_000;

export type LlmBudgetState = {
  /** Instante (epoch ms) en el que expira el presupuesto. */
  readonly expiresAt: number;
  /** Presupuesto total concedido, para trazas. */
  readonly budgetMs: number;
  /** Se pone a true en cuanto una llamada se rechaza o recorta por presupuesto. */
  exhausted: boolean;
  /** Motivo legible de la primera degradación. */
  reason: string | null;
};

export class LlmBudgetExhaustedError extends Error {
  readonly code = "llm_budget_exhausted";
  constructor(message = "LLM budget exhausted for this SKU run") {
    super(message);
    this.name = "LlmBudgetExhaustedError";
  }
}

const storage = new AsyncLocalStorage<LlmBudgetState>();

/** Milisegundos de presupuesto por ejecución de SKU. `0` o negativo lo desactiva. */
export function configuredLlmBudgetMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.AUTONOMOUS_SKU_BUDGET_MS ?? 600_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/**
 * Instala un presupuesto para `fn`. Con `budgetMs <= 0` no instala nada y `fn`
 * corre con el comportamiento histórico, sin tope.
 */
export async function runWithLlmBudget<T>(
  budgetMs: number,
  fn: (state: LlmBudgetState | null) => Promise<T>,
): Promise<T> {
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) return fn(null);
  const state: LlmBudgetState = {
    expiresAt: Date.now() + budgetMs,
    budgetMs,
    exhausted: false,
    reason: null,
  };
  return storage.run(state, () => fn(state));
}

/** Estado activo, o `null` si no hay presupuesto instalado. */
export function currentLlmBudget(): LlmBudgetState | null {
  return storage.getStore() ?? null;
}

/** Milisegundos restantes, o `null` si no hay presupuesto instalado. */
export function remainingLlmBudgetMs(): number | null {
  const state = storage.getStore();
  if (!state) return null;
  return Math.max(0, state.expiresAt - Date.now());
}

/** Marca la ejecución como degradada por presupuesto. Idempotente en el motivo. */
export function markLlmBudgetExhausted(reason: string): void {
  const state = storage.getStore();
  if (!state) return;
  state.exhausted = true;
  if (!state.reason) state.reason = reason;
}

/** `true` si en algún momento de esta ejecución se recortó trabajo por presupuesto. */
export function wasLlmBudgetExhausted(): boolean {
  return storage.getStore()?.exhausted === true;
}

/** Motivo de la degradación, o `null` si no la hubo. */
export function llmBudgetDegradationReason(): string | null {
  return storage.getStore()?.reason ?? null;
}

/**
 * Presupuesto efectivo para una llamada concreta. Devuelve el timeout a aplicar,
 * recortado al presupuesto restante.
 *
 * Lanza `LlmBudgetExhaustedError` cuando no queda margen útil, para que la
 * llamada falle YA en vez de consumir su timeout completo.
 */
export function claimLlmCallTimeoutMs(defaultTimeoutMs: number, label: string): number {
  const remaining = remainingLlmBudgetMs();
  if (remaining === null) return defaultTimeoutMs;
  if (remaining < LLM_BUDGET_MIN_CALL_MS) {
    markLlmBudgetExhausted(`${label}: sin presupuesto restante (${remaining}ms)`);
    throw new LlmBudgetExhaustedError(
      `LLM budget exhausted before ${label} (${remaining}ms left)`,
    );
  }
  if (remaining < defaultTimeoutMs) {
    markLlmBudgetExhausted(`${label}: timeout recortado a ${remaining}ms por presupuesto`);
    return remaining;
  }
  return defaultTimeoutMs;
}

/** `true` si queda margen para iniciar otro intento completo del pipeline. */
export function hasBudgetForAnotherAttempt(estimatedAttemptMs: number): boolean {
  const remaining = remainingLlmBudgetMs();
  if (remaining === null) return true;
  return remaining >= Math.max(LLM_BUDGET_MIN_CALL_MS, estimatedAttemptMs);
}

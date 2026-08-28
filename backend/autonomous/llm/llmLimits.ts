/**
 * Límites configurables de uso de modelo.
 *
 * Existen porque hoy el consumo medido es 0 y el día que se conecte un modelo
 * dejará de serlo. `llmBudget.ts` ya acota el TIEMPO agregado de un SKU; esto
 * acota lo demás: llamadas, tokens, coste y reintentos. Los dos conviven: el
 * presupuesto de tiempo recorta el timeout de cada llamada, éste decide si la
 * llamada llega a hacerse.
 *
 * Todos los valores salen del entorno y ninguno es un secreto. Un valor
 * ausente, vacío o no numérico usa el de por defecto: nunca deja el límite en
 * infinito por un error de escritura.
 */

import type { LlmErrorKind } from "./llmProvenance";

export interface LlmLimits {
  /** Reintentos ADICIONALES por llamada. 0 = un solo intento. */
  maxRetries: number;
  /** Milisegundos entre reintentos, antes de aplicar el crecimiento. */
  retryBaseDelayMs: number;
  /** Tope del crecimiento exponencial. */
  retryMaxDelayMs: number;
  /** Llamadas a modelo en una sola ejecución de pack. 0 = sin tope. */
  maxCallsPerRun: number;
  /** Tokens (entrada + salida) en una sola ejecución. 0 = sin tope. */
  maxTokensPerRun: number;
  /** Coste estimado en USD de una sola ejecución. 0 = sin tope. */
  maxCostPerRunUsd: number;
}

function entero(nombre: string, pordefecto: number, minimo = 0): number {
  const crudo = process.env[nombre]?.trim();
  if (!crudo) return pordefecto;
  const n = Number(crudo);
  if (!Number.isFinite(n) || n < minimo) return pordefecto;
  return Math.floor(n);
}

function decimal(nombre: string, pordefecto: number, minimo = 0): number {
  const crudo = process.env[nombre]?.trim();
  if (!crudo) return pordefecto;
  const n = Number(crudo);
  if (!Number.isFinite(n) || n < minimo) return pordefecto;
  return n;
}

export function resolverLimitesLlm(): LlmLimits {
  return {
    maxRetries: entero("NELVYON_LLM_MAX_RETRIES", 1),
    retryBaseDelayMs: entero("NELVYON_LLM_RETRY_BASE_MS", 500),
    retryMaxDelayMs: entero("NELVYON_LLM_RETRY_MAX_MS", 8_000),
    maxCallsPerRun: entero("NELVYON_LLM_MAX_CALLS_PER_RUN", 60),
    maxTokensPerRun: entero("NELVYON_LLM_MAX_TOKENS_PER_RUN", 400_000),
    maxCostPerRunUsd: decimal("NELVYON_LLM_MAX_COST_PER_RUN_USD", 5),
  };
}

/** Espera de reintento con crecimiento exponencial y tope. Sin aleatoriedad. */
export function esperaDeReintento(intento: number, limites: LlmLimits): number {
  const crecida = limites.retryBaseDelayMs * 2 ** Math.max(0, intento - 1);
  return Math.min(crecida, limites.retryMaxDelayMs);
}

export class LlmLimiteExcedidoError extends Error {
  readonly kind: LlmErrorKind = "limit_exceeded";
  constructor(
    readonly limite: keyof LlmLimits,
    readonly consumido: number,
    readonly tope: number,
  ) {
    super(`límite ${limite} excedido: ${consumido} sobre un tope de ${tope}`);
    this.name = "LlmLimiteExcedidoError";
  }
}

/**
 * Contador de una ejecución. Vive en el contexto de un pack run, no global:
 * dos inquilinos ejecutando a la vez no comparten cupo.
 */
export class ContadorDeEjecucion {
  private llamadas = 0;
  private tokens = 0;
  private costeUsd = 0;

  constructor(private readonly limites: LlmLimits = resolverLimitesLlm()) {}

  /** Se llama ANTES de gastar. Lanza si esta llamada rebasaría el tope. */
  reservarLlamada(): void {
    const tope = this.limites.maxCallsPerRun;
    if (tope > 0 && this.llamadas + 1 > tope) {
      throw new LlmLimiteExcedidoError("maxCallsPerRun", this.llamadas + 1, tope);
    }
    this.llamadas += 1;
  }

  /** Se llama DESPUÉS de gastar: los tokens no se conocen hasta responder. */
  anotarConsumo(tokens: number, costeUsd: number | null): void {
    this.tokens += Math.max(0, tokens);
    this.costeUsd += Math.max(0, costeUsd ?? 0);

    const topeTokens = this.limites.maxTokensPerRun;
    if (topeTokens > 0 && this.tokens > topeTokens) {
      throw new LlmLimiteExcedidoError("maxTokensPerRun", this.tokens, topeTokens);
    }
    const topeCoste = this.limites.maxCostPerRunUsd;
    if (topeCoste > 0 && this.costeUsd > topeCoste) {
      throw new LlmLimiteExcedidoError("maxCostPerRunUsd", this.costeUsd, topeCoste);
    }
  }

  estado(): { llamadas: number; tokens: number; costeUsd: number } {
    return { llamadas: this.llamadas, tokens: this.tokens, costeUsd: this.costeUsd };
  }
}

/**
 * Contador de la ejecución en curso. `null` fuera de una ejecución, y entonces
 * no hay tope: el adaptador se usa también desde guiones sueltos y pruebas.
 */
let contadorActual: ContadorDeEjecucion | null = null;

export function conContadorDeEjecucion<T>(
  contador: ContadorDeEjecucion,
  fn: () => T,
): T {
  const previo = contadorActual;
  contadorActual = contador;
  try {
    return fn();
  } finally {
    contadorActual = previo;
  }
}

export function contadorDeEjecucionActual(): ContadorDeEjecucion | null {
  return contadorActual;
}

export function limpiarContadorParaPruebas(): void {
  contadorActual = null;
}

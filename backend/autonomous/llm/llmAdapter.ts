/**
 * Adaptador de modelo. Ollama primero (local, gratis); OpenAI sólo con permiso
 * explícito y nunca como salto automático desde un fallo local.
 *
 * Qué cambió y por qué. Antes este fichero tenía dos bloques `if` cableados,
 * uno por proveedor, y devolvía `mode: "mock" | "real"` — dos estados para
 * cuatro situaciones distintas. Con eso, un generador determinista por diseño y
 * una degradación por proveedor caído se registraban idénticos, y en producción
 * eso produjo 14.178 eventos de auditoría indistinguibles: todos `mock`, cero
 * tokens, y ningún modo de saber cuáles eran correctos.
 *
 * Ahora cada llamada devuelve además una `LlmProvenance` con uno de cinco
 * estados cerrados, el proveedor, los tokens de entrada y salida por separado,
 * el coste estimado, la latencia, los reintentos y la familia del error.
 * `mode` se conserva para no romper a quien ya lo lee.
 *
 * Lo que NO cambió: las cuatro puertas de OpenAI, el fail-closed cuando Ollama
 * está configurado y falla, el recorte de timeout contra el presupuesto del SKU
 * y el enrutado de calidad 3b/8b.
 *
 * Sin registro de prompts: sólo id de agente, modo, modelo y conteos.
 */

import {
  LLM_BUDGET_MIN_CALL_MS,
  markLlmBudgetExhausted,
  remainingLlmBudgetMs,
} from "./llmBudget";
import {
  ContadorDeEjecucion,
  LlmLimiteExcedidoError,
  contadorDeEjecucionActual,
  esperaDeReintento,
  resolverLimitesLlm,
} from "./llmLimits";
import { parseJsonFromLlm } from "./parseJson";
import type { ContextoDePolitica } from "./llmPolicy";
import type { LlmErrorKind, LlmProvenance, LlmProviderId } from "./llmProvenance";
import {
  aLlmModeHeredado,
  clasificarErrorDeProveedor,
  esReintentable,
  procedenciaDeMotorDeReglas,
} from "./llmProvenance";
import type { AgentRole } from "./promptTemplates";
import { buildUserPrompt, getSystemPrompt } from "./promptTemplates";
import {
  proveedoresDisponibles,
  registrarProveedor,
  type ProveedorLlm,
} from "./providers";
import { ollamaEstaConfigurado, proveedorOllama } from "./providers/ollamaProvider";
import { openAiEstaPermitido, proveedorOpenAi } from "./providers/openAiProvider";

// Registro por defecto. Registrar no habilita: cada proveedor sigue decidiendo
// si está configurado y si la política le deja actuar.
registrarProveedor(proveedorOllama);
registrarProveedor(proveedorOpenAi);

export type LlmMode = "mock" | "real";

export interface LlmRequest {
  agentId: AgentRole;
  payload: Record<string, unknown>;
  /** Generador offline cuando no hay modelo disponible o la llamada falla. */
  mockGenerator: () => unknown;
  /**
   * El generador es determinista POR DISEÑO y no había que llamar a ningún
   * modelo. Se registra como `RULE_ENGINE`, que sí es publicable: no es una
   * degradación, es la salida correcta.
   */
  ruleEngine?: boolean;
  /**
   * Trabajo que exige modelo real. Sin modelo disponible se lanza en vez de
   * devolver contenido de reglas. Por defecto `false` para no cambiar el
   * comportamiento de guiones y simulaciones; la protección que no depende de
   * que nadie se acuerde de ponerlo es la puerta de entrega (`llmPolicy`).
   */
  requiereIaReal?: boolean;
  /** Contexto de servicio/pack, si se conoce. Viaja a la procedencia. */
  policy?: ContextoDePolitica;
}

export interface LlmResponse {
  mode: LlmMode;
  agentId: AgentRole;
  model: string;
  parsed: unknown;
  /** Total entrada+salida. Se conserva por compatibilidad. */
  tokens: number;
  fallbackReason?: string;
  duration_ms: number;
  /** Con qué se produjo esto exactamente. */
  provenance: LlmProvenance;
}

export type LlmInvokeFn = (req: LlmRequest) => Promise<LlmResponse>;

export class LlmSinModeloRealError extends Error {
  constructor(
    readonly provenance: LlmProvenance,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "LlmSinModeloRealError";
  }
}

let customInvoke: LlmInvokeFn | null = null;

export function setLlmInvokeForTests(fn: LlmInvokeFn | null): void {
  customInvoke = fn;
}

/** True cuando el pipeline autónomo puede usar Ollama local (camino real). */
export function isAutonomousOllamaConfigured(): boolean {
  return ollamaEstaConfigurado();
}

/**
 * Permiso explícito para OpenAI remoto. Nunca es un salto automático.
 * Apagado por defecto; fail-closed bajo modo privado sin ventana de internet.
 */
export function isAutonomousOpenAiAllowed(): boolean {
  return openAiEstaPermitido().permitido;
}

/**
 * Enrutado local de calidad (ADR-036): 3b rápido vs 8b para entregables
 * críticos. Apagado por defecto — no cambia el Model Router certificado.
 */
export function isAutonomousQualityRoutingEnabled(): boolean {
  return process.env.AUTONOMOUS_QUALITY_ROUTING?.trim() === "1";
}

/** Roles cuyo entregable es crítico para QA (hero/copy/SEO). */
const QUALITY_CRITICAL_ROLES = new Set<AgentRole>([
  "agent-copywriter-landing",
  "agent-designer-landing",
  "agent-seo-landing",
  "agent-copywriter-chatbot",
  "agent-copywriter-seo",
  "agent-seo-audit",
  "agent-seo-report",
  "agent-strategist-landing",
  "agent-strategist-seo",
  "agent-strategist-chatbot",
  "agent-pm-seo",
  "agent-pm-chatbot",
]);

export type AutonomousOllamaSlot = "fast" | "strategy";

export function resolveAutonomousOllamaModel(agentId: AgentRole): {
  slot: AutonomousOllamaSlot;
  model?: string;
  reason: string;
} {
  if (!isAutonomousQualityRoutingEnabled()) {
    return { slot: "fast", model: undefined, reason: "quality_routing_off" };
  }
  const fast =
    process.env.OLLAMA_MODEL?.trim() ||
    process.env.NELVYON_LOCAL_AI_MODEL?.trim() ||
    undefined;
  const strategy =
    process.env.OLLAMA_STRATEGY_MODEL?.trim() ||
    process.env.BENCHMARK_STRATEGY_MODEL?.trim() ||
    undefined;

  if (QUALITY_CRITICAL_ROLES.has(agentId)) {
    if (strategy) {
      return { slot: "strategy", model: strategy, reason: "critical_deliverable_8b" };
    }
    return { slot: "fast", model: fast, reason: "critical_but_no_strategy_model" };
  }
  return { slot: "fast", model: fast, reason: "fast_path_3b" };
}

export function resolveLlmMode(): LlmMode {
  if (process.env.AUTONOMOUS_LLM_MODE === "mock") return "mock";
  if (process.env.AUTONOMOUS_LLM_MODE === "real") return "real";
  return proveedoresDisponibles().length > 0 ? "real" : "mock";
}

function logLlmEvent(p: LlmProvenance, agentId: string, ok: boolean): void {
  const msg = [
    `[autonomous-llm] agent=${agentId}`,
    `outcome=${p.outcome}`,
    `provider=${p.provider}`,
    `model=${p.model}`,
    `ok=${ok}`,
    `tok_in=${p.tokensIn}`,
    `tok_out=${p.tokensOut}`,
    p.costEstimateUsd === null ? "cost=unknown" : `cost_usd=${p.costEstimateUsd}`,
    `ms=${p.latencyMs}`,
    `retries=${p.retries}`,
    p.errorKind ? `err=${p.errorKind}` : "",
    p.reason ? `reason=${p.reason}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  console.error(msg);
}

function respuestaDesdeProcedencia(
  req: LlmRequest,
  parsed: unknown,
  p: LlmProvenance,
): LlmResponse {
  return {
    mode: aLlmModeHeredado(p.outcome),
    agentId: req.agentId,
    model: p.model,
    parsed,
    tokens: p.tokensIn + p.tokensOut,
    fallbackReason: p.reason ? p.reason : undefined,
    duration_ms: p.latencyMs,
    provenance: p,
  };
}

/** Salida de reglas, con el estado que le corresponda. Nunca finge ser real. */
function salidaDeReglas(
  req: LlmRequest,
  started: number,
  outcome: "MOCK" | "FALLBACK" | "RULE_ENGINE",
  reason: string,
  errorKind: LlmErrorKind | null,
  fallbackFrom: LlmProviderId | null,
  retries: number,
  degradationAllowed: boolean,
): LlmResponse {
  const parsed = req.mockGenerator();
  const p: LlmProvenance =
    outcome === "RULE_ENGINE"
      ? procedenciaDeMotorDeReglas("mock-rules-v1", Date.now() - started, reason)
      : {
          outcome,
          provider: "none",
          model: "mock-rules-v1",
          tokensIn: 0,
          tokensOut: 0,
          costEstimateUsd: 0,
          latencyMs: Date.now() - started,
          retries,
          fallbackFrom,
          errorKind,
          degradationAllowed,
          reason,
        };
  // `ok` es falso para toda degradación: antes se registraba `ok: true` y por
  // eso 14.178 eventos de reglas parecían ejecuciones correctas.
  logLlmEvent(p, req.agentId, outcome === "RULE_ENGINE");
  return respuestaDesdeProcedencia(req, parsed, p);
}

function procedenciaDeError(
  started: number,
  provider: LlmProviderId,
  model: string,
  errorKind: LlmErrorKind | null,
  reason: string,
  fallbackFrom: LlmProviderId | null = null,
): LlmProvenance {
  return {
    outcome: "ERROR",
    provider,
    model,
    tokensIn: 0,
    tokensOut: 0,
    costEstimateUsd: null,
    latencyMs: Date.now() - started,
    retries: 0,
    fallbackFrom,
    errorKind,
    degradationAllowed: false,
    reason,
  };
}

async function dormir(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Un proveedor, con reintentos acotados y espera creciente. Devuelve la salida
 * ya validada como JSON: un JSON malformado es un fallo reintentable, no una
 * respuesta.
 */
async function intentarProveedor(
  proveedor: ProveedorLlm,
  req: LlmRequest,
  system: string,
  user: string,
  modelo: string | undefined,
): Promise<{
  parsed: object;
  model: string;
  tokensIn: number;
  tokensOut: number;
  retries: number;
}> {
  const limites = resolverLimitesLlm();
  const contador = contadorDeEjecucionActual();
  let ultimoError: unknown = new Error("sin intento");
  let tokensIn = 0;
  let tokensOut = 0;

  for (let intento = 0; intento <= limites.maxRetries; intento += 1) {
    if (intento > 0) {
      // El pase de reparación duplica el coste del agente. Sólo se intenta si
      // queda margen de presupuesto; si no, se marca y se deja fallar.
      const restante = remainingLlmBudgetMs();
      if (restante !== null && restante < LLM_BUDGET_MIN_CALL_MS) {
        markLlmBudgetExhausted(`${req.agentId}: reintento omitido por presupuesto`);
        break;
      }
      await dormir(esperaDeReintento(intento, limites));
    }

    contador?.reservarLlamada();

    const esReparacion = intento > 0 && clasificarErrorDeProveedor(ultimoError) === "bad_json";
    const userDeEsteIntento = esReparacion
      ? `${user}\n\nCRITICAL: previous output was not valid JSON. Respond with ONE JSON object only, no markdown.`
      : user;

    try {
      const r = await proveedor.generar({
        system,
        user: userDeEsteIntento,
        modelo,
        etiqueta: `${req.agentId}:${intento === 0 ? "primary" : "repair"}`,
      });
      tokensIn += r.tokensEntrada;
      tokensOut += r.tokensSalida;
      contador?.anotarConsumo(
        r.tokensEntrada + r.tokensSalida,
        proveedor.estimarCoste(r.model, r.tokensEntrada, r.tokensSalida),
      );

      const parsed = parseJsonFromLlm(r.content);
      if (!parsed || typeof parsed !== "object") {
        ultimoError = new Error(`${proveedor.id} response is not valid JSON object`);
        continue;
      }
      return { parsed, model: r.model, tokensIn, tokensOut, retries: intento };
    } catch (err) {
      // Un límite excedido no se reintenta: insistir es justo lo que el tope
      // existe para impedir.
      if (err instanceof LlmLimiteExcedidoError) throw err;
      ultimoError = err;
      if (!esReintentable(clasificarErrorDeProveedor(err))) break;
    }
  }

  throw ultimoError;
}

/**
 * Completa la procedencia de una respuesta inyectada por una prueba. Sin esto,
 * cualquier doble de `setLlmInvokeForTests` devolveria `provenance: undefined`
 * y quien lo lea aguas abajo trataria "no lo se" como "no hubo degradacion".
 */
function normalizarRespuesta(req: LlmRequest, res: LlmResponse): LlmResponse {
  if (res.provenance) return res;
  const real = res.mode === "real";
  return {
    ...res,
    provenance: {
      outcome: real ? "REAL_LLM_SUCCESS" : "MOCK",
      provider: real ? "ollama" : "none",
      model: res.model,
      tokensIn: 0,
      tokensOut: res.tokens ?? 0,
      costEstimateUsd: real ? null : 0,
      latencyMs: res.duration_ms ?? 0,
      retries: 0,
      fallbackFrom: null,
      errorKind: null,
      degradationAllowed: req.requiereIaReal !== true,
      reason: res.fallbackReason ?? "respuesta inyectada en pruebas",
    },
  };
}

export async function invokeLlm(req: LlmRequest): Promise<LlmResponse> {
  if (customInvoke) return normalizarRespuesta(req, await customInvoke(req));

  const started = Date.now();
  const system = getSystemPrompt(req.agentId);
  const user = buildUserPrompt(req.agentId, req.payload);
  // La degradación se marca como permitida sólo cuando quien llama declara que
  // no exige IA real. La puerta de entrega vuelve a comprobarlo con el contexto
  // del servicio, que aquí no siempre se conoce.
  const degradacionOk = req.requiereIaReal !== true;

  if (req.ruleEngine === true) {
    return salidaDeReglas(
      req,
      started,
      "RULE_ENGINE",
      "generador determinista por diseño",
      null,
      null,
      0,
      true,
    );
  }

  if (process.env.AUTONOMOUS_LLM_MODE === "mock") {
    const motivo = "AUTONOMOUS_LLM_MODE=mock";
    if (req.requiereIaReal === true) {
      const p = procedenciaDeError(
        started,
        "none",
        "mock-rules-v1",
        "forbidden",
        `${motivo} y este trabajo exige modelo real`,
      );
      logLlmEvent(p, req.agentId, false);
      throw new LlmSinModeloRealError(p, p.reason);
    }
    return salidaDeReglas(req, started, "MOCK", motivo, null, null, 0, degradacionOk);
  }

  const disponibles = proveedoresDisponibles();

  if (disponibles.length === 0) {
    const motivo = "ningún proveedor de modelo configurado y permitido";
    if (req.requiereIaReal === true) {
      const p = procedenciaDeError(started, "none", "mock-rules-v1", "not_configured", motivo);
      logLlmEvent(p, req.agentId, false);
      throw new LlmSinModeloRealError(p, motivo);
    }
    return salidaDeReglas(
      req,
      started,
      "FALLBACK",
      motivo,
      "not_configured",
      null,
      0,
      degradacionOk,
    );
  }

  const fallos: string[] = [];
  let ultimoErrorKind: LlmErrorKind | null = null;
  let ultimoProveedor: LlmProviderId | null = null;

  for (const proveedor of disponibles) {
    const ruta = proveedor.id === "ollama" ? resolveAutonomousOllamaModel(req.agentId) : null;
    try {
      const r = await intentarProveedor(proveedor, req, system, user, ruta?.model);
      const p: LlmProvenance = {
        outcome: "REAL_LLM_SUCCESS",
        provider: proveedor.id,
        model: r.model,
        tokensIn: r.tokensIn,
        tokensOut: r.tokensOut,
        costEstimateUsd: proveedor.estimarCoste(r.model, r.tokensIn, r.tokensOut),
        latencyMs: Date.now() - started,
        retries: r.retries,
        fallbackFrom: ultimoProveedor,
        errorKind: null,
        degradationAllowed: degradacionOk,
        reason:
          ruta && ruta.reason !== "quality_routing_off"
            ? `slot=${ruta.slot};${ruta.reason}`
            : fallos.join("; "),
      };
      logLlmEvent(p, req.agentId, true);
      return respuestaDesdeProcedencia(req, r.parsed, p);
    } catch (err) {
      if (err instanceof LlmLimiteExcedidoError) {
        const p = procedenciaDeError(
          started,
          proveedor.id,
          ruta?.model ?? proveedor.id,
          "limit_exceeded",
          err.message,
          ultimoProveedor,
        );
        logLlmEvent(p, req.agentId, false);
        throw err;
      }
      ultimoErrorKind = clasificarErrorDeProveedor(err);
      ultimoProveedor = proveedor.id;
      fallos.push(`${proveedor.id}: ${err instanceof Error ? err.message : "unknown_error"}`);
    }
  }

  // Fail-closed histórico: con Ollama configurado NUNCA se cae en silencio a
  // reglas. Se conserva tal cual porque es lo que impide que un entregable
  // crítico salga de plantilla cuando el modelo local está caído.
  if (ollamaEstaConfigurado() && fallos.some((f) => f.startsWith("ollama:"))) {
    const mensaje = fallos.join("; ");
    const p = procedenciaDeError(
      started,
      "ollama",
      resolveAutonomousOllamaModel(req.agentId).model ?? "ollama-unresolved",
      ultimoErrorKind,
      mensaje,
    );
    logLlmEvent(p, req.agentId, false);
    throw new LlmSinModeloRealError(p, `LLM Ollama failed (no silent mock): ${mensaje}`);
  }

  const motivo = fallos.length > 0 ? fallos.join("; ") : "no_llm_provider_available";
  if (req.requiereIaReal === true) {
    const p = procedenciaDeError(
      started,
      ultimoProveedor ?? "none",
      "mock-rules-v1",
      ultimoErrorKind,
      motivo,
      ultimoProveedor,
    );
    logLlmEvent(p, req.agentId, false);
    throw new LlmSinModeloRealError(p, motivo);
  }
  return salidaDeReglas(
    req,
    started,
    "FALLBACK",
    motivo,
    ultimoErrorKind,
    ultimoProveedor,
    0,
    degradacionOk,
  );
}

export { ContadorDeEjecucion, resolverLimitesLlm };
export type { LlmProvenance, LlmProviderId };

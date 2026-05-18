import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type PublicApiPlan = "starter" | "pro" | "agency";

/** Eventos webhook NELVYON OS */
export type PublicApiWebhookEvent =
  | "agent.completed"
  | "agent.failed"
  | "client.created"
  | "client.churned"
  | "billing.paid"
  | "billing.failed";

export interface PublicApiInput {
  userId: string;
  sector: string;
  brand: string;
  /** Plan API para rate limits y docs */
  plan?: PublicApiPlan;
  /** Evento webhook (suscripción / dispatch) */
  webhookEvent?: PublicApiWebhookEvent | string;
  /** Endpoint o ruta orientativa para router */
  endpointBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface PublicApiOutput {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
}

function parseJson<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

export function llmOpts(agentId: string, temperature: number): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parsePublicApiLlmJson(raw: string, label: string): Omit<PublicApiOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; highlights?: unknown; metrics?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const h = p.highlights;
  const highlights = Array.isArray(h)
    ? h.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const m = p.metrics;
  const metrics = Array.isArray(m) ? m.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean) : [];
  return { content, score, highlights, metrics };
}

export function buildPublicApiPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PublicApiInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const plan = params.input.plan ?? "inferir desde cuenta";
  const ev = params.input.webhookEvent?.toString().trim() ? String(params.input.webhookEvent).trim() : "no indicado";
  const ep = params.input.endpointBrief?.trim() ? params.input.endpointBrief.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA API PÚBLICA v2 + WEBHOOKS v1 NELVYON:
- **API keys**: formato **nlv_live_XXXXX** (producción) / **nlv_test_XXXXX** (sandbox); solo hash en **api_keys**.
- **Rate limit por plan**: Starter **100 req/h**, Pro **1000**, Agency **10000**.
- **Cabeceras respuesta**: **X-RateLimit-Limit**, **X-RateLimit-Remaining**, **X-RateLimit-Reset**.
- **Router**: enruta requests externos al agente OS correcto.
- **Webhooks**: eventos **agent.completed**, **agent.failed**, **client.created**, **client.churned**, **billing.paid**, **billing.failed**.
- **Dispatch**: **3 intentos**, backoff exponencial **1s**, **5s**, **25s**; si fallan los 3 → webhook **suspended**.
- Tablas: **publicapi_results**, **api_keys** (user_id, key_hash, plan, req_count, last_used), **webhook_subscriptions** (user_id, event, url, secret, activo).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector / integración: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- Plan API: ${plan}
- Evento webhook: ${ev}
- Endpoint / ruta (router): ${ep}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runPublicApiAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PublicApiInput,
  temperature: number,
): Promise<PublicApiOutput> {
  const prompt = buildPublicApiPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parsePublicApiLlmJson(raw, agentId);
  const out: PublicApiOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPublicApiLlm(): ILlmClient {
  return LlmClient.getInstance();
}

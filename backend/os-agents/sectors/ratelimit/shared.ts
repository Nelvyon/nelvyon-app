import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type RateLimitPlan = "starter" | "pro" | "agency";

export interface RateLimitInput {
  userId: string;
  sector: string;
  brand: string;
  plan?: RateLimitPlan | string;
  planBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface RateLimitOutput {
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

export function parseRateLimitLlmJson(raw: string, label: string): Omit<RateLimitOutput, "agentId"> {
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

export function buildRateLimitPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: RateLimitInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const plan = params.input.plan?.toString().trim() ? String(params.input.plan).trim() : "no indicado";
  const pb = params.input.planBrief?.trim() ? params.input.planBrief.trim() : "inferir desde plan";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

RATE LIMITING + COST CONTROLS NELVYON OS (v1):
- **Prefijo agentes**: **RateLimit**; enforcement por plan cliente.
- **Límites por plan**:
  - **Starter**: **100 req/h**, máx **2.000 req/día**, presupuesto OpenAI **5€/mes**.
  - **Pro**: **1.000 req/h**, máx **20.000 req/día**, presupuesto OpenAI **25€/mes**.
  - **Agency**: **10.000 req/h**, máx **200.000 req/día**, presupuesto OpenAI **100€/mes**.
- **Headers respuesta**: **X-RateLimit-Limit**, **X-RateLimit-Remaining**, **X-RateLimit-Reset**.
- **Alertas consumo**: aviso al **80%** y **95%** del límite.
- **Throttling**: priorizar agentes **críticos** sobre **secundarios**.
- **Upgrade automático**: si supera límite **3 días seguidos** → **email automático** con oferta de upgrade.
- **Resets**: automáticos **hora / día / mes** según ventana.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- Plan: ${plan}
- Contexto plan: ${pb}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runRateLimitAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: RateLimitInput,
  temperature: number,
): Promise<RateLimitOutput> {
  const prompt = buildRateLimitPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseRateLimitLlmJson(raw, agentId);
  const out: RateLimitOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultRateLimitLlm(): ILlmClient {
  return LlmClient.getInstance();
}

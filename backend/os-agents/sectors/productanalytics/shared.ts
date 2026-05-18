import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";
import { ELITE_V300_STANDARDS, resolveSpecialtyElitePrompt } from "../../prompts/elitePromptLibrary";

export interface ProductAnalyticsInput {
  userId: string;
  sector: string;
  brand: string;
  productAnalyticsBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductAnalyticsOutput {
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

export function parseProductAnalyticsLlmJson(
  raw: string,
  label: string,
): Omit<ProductAnalyticsOutput, "agentId"> {
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

export function buildProductAnalyticsPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ProductAnalyticsInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const analyticsCtx = params.input.productAnalyticsBrief?.trim()
    ? params.input.productAnalyticsBrief.trim()
    : "inferir desde sector";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PRODUCT ANALYTICS NELVYON OS (v1):
- **Prefijo agentes**: **ProductAnalytics**; analítica de producto.
- **Eventos sin código <5 min** setup; **funnel análisis <60 s**.
- **Retención cohortes cada 24 h** automático; **feature adoption score RT** por usuario.
- **Predicción churn producto accuracy >87%**; **0 implementación técnica** por el cliente.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / tenant: ${params.input.brand}
- Product analytics / contexto: ${analyticsCtx}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runProductAnalyticsAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ProductAnalyticsInput,
  temperature: number,
): Promise<ProductAnalyticsOutput> {
  const eliteRole = resolveSpecialtyElitePrompt(
    agentId,
    {
      sector: input.sector,
      brand: input.brand,
      businessContext: input.productAnalyticsBrief,
      metricsBrief: input.metricsBrief,
    },
    params.eliteRole,
  );
  const prompt = buildProductAnalyticsPrompt({
    eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseProductAnalyticsLlmJson(raw, agentId);
  const out: ProductAnalyticsOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultProductAnalyticsLlm(): ILlmClient {
  return LlmClient.getInstance();
}

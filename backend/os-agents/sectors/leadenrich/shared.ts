import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface LeadEnrichInput {
  userId: string;
  sector: string;
  brand: string;
  leadBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface LeadEnrichOutput {
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

export function parseLeadEnrichLlmJson(raw: string, label: string): Omit<LeadEnrichOutput, "agentId"> {
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

export function buildLeadEnrichPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: LeadEnrichInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const lead = params.input.leadBrief?.trim() ? params.input.leadBrief.trim() : "inferir desde sector";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

LEAD ENRICHMENT NELVYON OS (v1):
- **Prefijo agentes**: **LeadEnrich**; enriquecimiento automático por lead en **<5 segundos**.
- **ICP NELVYON**: empresa **1-200 empleados**, sector **servicios / ecommerce / SaaS**, presupuesto marketing **>500€/mes**, dolor: **falta de tiempo** o **resultados inconsistentes**.
- **Lead Score**: **Fit 40% + Intent 40% + Timing 20%** (0-100).
- **Segmentación**: **SQL** score **>75**, **MQL** **50-75**, **no-fit** **<30**, **ICP** alineado al perfil ideal.
- **Perfil**: nombre, cargo, empresa, LinkedIn, email verificable.
- **Empresa**: sector, tamaño, revenue, stack tecnológico.
- **Intent**: búsquedas, visitas, eventos de compra.
- **Contacto**: emails y teléfonos verificados; **sync CRM** NELVYON en tiempo real.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / tenant: ${params.input.brand}
- Lead / fuente: ${lead}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runLeadEnrichAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: LeadEnrichInput,
  temperature: number,
): Promise<LeadEnrichOutput> {
  const prompt = buildLeadEnrichPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseLeadEnrichLlmJson(raw, agentId);
  const out: LeadEnrichOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultLeadEnrichLlm(): ILlmClient {
  return LlmClient.getInstance();
}

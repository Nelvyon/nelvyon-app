import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface MarketplaceInput {
  userId: string;
  sector: string;
  brand: string;
  /** Desarrollador publicador (workspace / cuenta) */
  developerId?: string;
  /** Listing del marketplace de terceros */
  listingAgentId?: string;
  /** Precio mensual orientativo (€); mínimo 9€ salvo freemium */
  priceMonthlyEur?: number;
  /** Caso de uso o query para búsqueda/recomendador */
  useCaseBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceOutput {
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

export function parseMarketplaceLlmJson(raw: string, label: string): Omit<MarketplaceOutput, "agentId"> {
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

export function buildMarketplacePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: MarketplaceInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const dev = params.input.developerId?.trim() ? params.input.developerId.trim() : "no indicado";
  const lid = params.input.listingAgentId?.trim() ? params.input.listingAgentId.trim() : "no indicado";
  const price =
    params.input.priceMonthlyEur !== undefined && Number.isFinite(params.input.priceMonthlyEur)
      ? String(params.input.priceMonthlyEur)
      : "no indicado";
  const uc = params.input.useCaseBrief?.trim() ? params.input.useCaseBrief.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA MARKETPLACE AGENTES TERCEROS NELVYON OS (v1):
- **Split ingresos**: **NELVYON 30%** / **desarrollador 70%** sobre ventas de marketplace.
- **Precio mínimo** listing de pago: **9€/mes** (orientativo); **agentes gratuitos** permitidos (freemium).
- **QA obligatorio antes de publicar** (**MarketplaceQAAgent**): validar **prompt injection**, **calidad de salida**, **latencia < 3s** (orientativo).
- **Rating mínimo** para mantener listing visible: **3.5 / 5** (orientativo; política producto).
- Listings persistidos en tabla **marketplace_listings** (agentId, developerId, nombre, categoría, precio, installs, rating).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente / vertical: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- Developer ID: ${dev}
- Listing agent ID (terceros): ${lid}
- Precio €/mes (orientativo): ${price}
- Caso de uso / búsqueda: ${uc}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runMarketplaceAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: MarketplaceInput,
  temperature: number,
): Promise<MarketplaceOutput> {
  const prompt = buildMarketplacePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseMarketplaceLlmJson(raw, agentId);
  const out: MarketplaceOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultMarketplaceLlm(): ILlmClient {
  return LlmClient.getInstance();
}

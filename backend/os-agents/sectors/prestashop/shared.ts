import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
/** Segmentación PrestaShop NELVYON */
export type PrestaShopBuyerSegment = "one_time" | "recurring" | "vip";

export interface PrestaShopInput {
  userId: string;
  sector: string;
  brand: string;
  /** URL tienda (orientativo) */
  storeUrl?: string;
  segment?: PrestaShopBuyerSegment | string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface PrestaShopOutput {
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

export function parsePrestaShopLlmJson(raw: string, label: string): Omit<PrestaShopOutput, "agentId"> {
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

export function buildPrestaShopPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PrestaShopInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const url = params.input.storeUrl?.trim() ? params.input.storeUrl.trim() : "no indicado";
  const seg = params.input.segment?.toString().trim() ? String(params.input.segment).trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

INTEGRACIÓN PRESTASHOP NELVYON (v1):
- **WebService PrestaShop (API Key)** — prefijo **PrestaShop**; HTTPS; permisos mínimos; nunca exponer clave en cliente.
- **Mercados prioritarios**: **España**, **Francia**, **Italia** — priorizar copy en **es**, **fr**, **it** según tienda.
- **Carrito abandonado**: secuencia **3 emails** (**1h**, **24h**, **72h**) con descuento progresivo (**5%**, **10%**, **15%**).
- **Post-compra**: **confirmación** + **upsell producto relacionado** + solicitud **review a los 7 días**.
- **SEO**: **title < 60 caracteres**, **description < 160 caracteres**, **URL amigable sin parámetros**.
- **Segmentación**: compradores **una vez**, **recurrentes**, **VIP** (**>3 compras** o **>500€** gastados).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector / vertical: ${params.input.sector}
- Marca / tienda: ${params.input.brand}
- URL tienda: ${url}
- Segmento cliente: ${seg}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief multilingüe","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runPrestaShopAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PrestaShopInput,
  temperature: number,
): Promise<PrestaShopOutput> {
  const prompt = buildPrestaShopPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parsePrestaShopLlmJson(raw, agentId);
  const out: PrestaShopOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPrestaShopLlm(): ILlmClient {
  return LlmClient.getInstance();
}

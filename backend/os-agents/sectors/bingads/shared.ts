import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface BingAdsInput {
  userId: string;
  sector: string;
  brand: string;
  /** CPA objetivo orientativo (€) */
  targetCpaEur?: number;
  verticalBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface BingAdsOutput {
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

export function parseBingAdsLlmJson(raw: string, label: string): Omit<BingAdsOutput, "agentId"> {
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

export function buildBingAdsPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: BingAdsInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const vb = params.input.verticalBrief?.trim() ? params.input.verticalBrief.trim() : "inferir desde sector";
  const cpa =
    params.input.targetCpaEur !== undefined && Number.isFinite(params.input.targetCpaEur)
      ? String(params.input.targetCpaEur)
      : "20 orientativo";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

INTEGRACIÓN MICROSOFT ADVERTISING / BING ADS NELVYON (v1):
- **Ventaja clave**: **LinkedIn Profile Targeting** (cargo, empresa, sector) — **único en Microsoft Advertising**, no existe en Google Ads de la misma forma.
- **CPC medio Bing**: típicamente **30–40% más barato** que Google para keywords comparables (orientativo).
- **CPA objetivo**: **< 20€** (orientativo). **ROAS mínimo aceptable**: **2x**.
- **RSA (Responsive Search Ads)**: hasta **15 títulos + 4 descripciones**. **ETA (Expanded Text Ads, legado)**: **3 títulos + 2 descripciones** donde aún aplique.
- **Campañas**: **Search + Shopping** en el ecosistema Microsoft.
- **Audiencias**: LinkedIn profile, **remarketing**, **in-market** y combinaciones.
- **Sectores con mejor rendimiento típico en Bing**: **software B2B**, **finanzas**, **legal**, **salud**, **seguros**.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / cuenta ads: ${params.input.brand}
- Vertical / foco: ${vb}
- CPA objetivo (€): ${cpa}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runBingAdsAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: BingAdsInput,
  temperature: number,
): Promise<BingAdsOutput> {
  const prompt = buildBingAdsPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseBingAdsLlmJson(raw, agentId);
  const out: BingAdsOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultBingAdsLlm(): ILlmClient {
  return LlmClient.getInstance();
}

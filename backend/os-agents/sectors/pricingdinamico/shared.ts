import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface PricingDinamicoInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface PricingDinamicoOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const pricingDinamicoLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.3,
  maxTokens: 1500,
};

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

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parsePricingDinamicoLlmJson(raw: string, label: string): Omit<PricingDinamicoOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const PRICING_DINAMICO_OS_RULES = `PRICING DINÁMICO INTELIGENTE NELVYON OS (v1):
- **Optimización dinámica de precios** por demanda en tiempo real (guardrails, fairness, transparencia regulatoria).
- Análisis de **elasticidad precio-demanda** por segmento (curvas, confianza estadística, supuestos explícitos).
- **Precios personalizados** por cliente/región/canal (consentimiento, anti-discriminación, límites de uso).
- **Detección de precio óptimo** vía A/B testing (tamaño muestra, duración, parada ética, no engañar).
- **Alertas** cuando competidores cambian precios (umbrales, falsos positivos, fuentes).
- **Descuentos automáticos** por comportamiento (abandono carrito, inactividad, volumen; límites legales promos).
- **Bundles y upsell dinámicos** (compatibilidad SKU, margen conjunto, cannibalización).
- **Maximización de margen y LTV** simultáneamente (trade-offs, cohortes, riesgo churn por precio).`;

export function buildPricingDinamicoPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PricingDinamicoInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${PRICING_DINAMICO_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio / unidad: ${params.input.businessName}
- Datos / fuentes: ${services}
- Horizonte / mercados: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runPricingDinamicoAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PricingDinamicoInput,
): Promise<PricingDinamicoOutput> {
  const prompt = buildPricingDinamicoPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, pricingDinamicoLlmOpts);
  const parsed = parsePricingDinamicoLlmJson(raw, agentId);
  const out: PricingDinamicoOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "pricingdinamico", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPricingDinamicoLlm(): ILlmClient {
  return LlmClient.getInstance();
}

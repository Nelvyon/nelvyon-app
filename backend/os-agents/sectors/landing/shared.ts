import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface LandingInput {
  userId: string;
  sector: string;
  brand: string;
  campaignGoal: string;
  targetAudience: string;
  product?: string;
  tone?: string;
  cta?: string;
}

export interface LandingOutput {
  agentId: string;
  content: string;
  score: number;
  sections: string[];
  ctaVariants: string[];
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

export function llmOpts(agentId: string, temperature = 0.7): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 3000,
    temperature,
  };
}

/** Copy/creative → 0.7; audit/análisis → 0.2 */
export function landingTemperature(agentId: string): number {
  return agentId.toLowerCase().includes("conversion-audit") ? 0.2 : 0.7;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseLandingLlmJson(raw: string, label: string): Omit<LandingOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; sections?: unknown; ctaVariants?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const sec = p.sections;
  const sections = Array.isArray(sec)
    ? sec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const cta = p.ctaVariants;
  const ctaVariants = Array.isArray(cta)
    ? cta.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, sections, ctaVariants };
}

export function buildConvertPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: LandingInput;
}): string {
  const product = params.input.product?.trim() ? params.input.product.trim() : "no especificado";
  const tone = params.input.tone?.trim() ? params.input.tone.trim() : "profesional persuasivo";
  const cta = params.input.cta?.trim() ? params.input.cta.trim() : "inferir CTA coherente con objetivo";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK CONVERT (top 1%):
- **Capture**: gancho sobre el dolor/deseo del visitante en 3 segundos mentales.
- **Objection**: anticipa objeciones típicas del sector y audiencia.
- **Narrative**: historia mínima viable (antes / después / puente) sin relleno.
- **Value**: beneficio medible o emocional claro, no lista de features plana.
- **Evidence**: prueba social, datos o garantías creíbles (sin inventar logos).
- **Resolve**: mitiga fricción (riesgo, tiempo, precio) con microcopy concreto.
- **Test**: hipótesis de mejora y qué medir (scroll, click CTA, form start).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Objetivo campaña: ${params.input.campaignGoal}
- Audiencia: ${params.input.targetAudience}
- Producto/oferta: ${product}
- Tono: ${tone}
- CTA preferente: ${cta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"copy o auditoría detallada en español salvo brief","score":0-100,"sections":["nombres cortos de bloques sugeridos"],"ctaVariants":["variantes de CTA o hallazgos si es auditoría"]}`;
}

export async function runLandingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: LandingInput,
): Promise<LandingOutput> {
  const prompt = buildConvertPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, landingTemperature(agentId)));
  const parsed = parseLandingLlmJson(raw, agentId);
  const out: LandingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* tests sin DB */
  }
  return out;
}

export function getDefaultLandingLlm(): ILlmClient {
  return LlmClient.getInstance();
}

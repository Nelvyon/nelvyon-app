import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ReviewsInput {
  userId: string;
  sector: string;
  businessName: string;
  platform: string;
  reviewText?: string;
  rating?: number;
  language?: string;
}

export type ReviewsSentiment = "positive" | "neutral" | "negative";

export interface ReviewsOutput {
  agentId: string;
  content: string;
  score: number;
  sentiment: ReviewsSentiment;
  actions: string[];
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

export function llmOpts(agentId: string, temperature = 0.5): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature,
  };
}

/** copy/response → 0.5; analysis/strategy → 0.2 */
export function reviewsTemperature(agentId: string): number {
  const id = agentId.toLowerCase();
  const copyStyle = [
    "request-crafter",
    "response-generator",
    "escalation-handler",
    "testimonial-extractor",
  ];
  if (copyStyle.some((k) => id.includes(k))) return 0.5;
  return 0.2;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeSentiment(v: unknown, score: number): ReviewsSentiment {
  const s = typeof v === "string" ? v.toLowerCase().trim() : "";
  if (s === "positive" || s === "neutral" || s === "negative") return s;
  if (score >= 70) return "positive";
  if (score >= 40) return "neutral";
  return "negative";
}

export function parseReviewsLlmJson(raw: string, label: string): Omit<ReviewsOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; sentiment?: unknown; actions?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const sentiment = normalizeSentiment(p.sentiment, score);
  const act = p.actions;
  const actions = Array.isArray(act)
    ? act.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, sentiment, actions };
}

export function buildTrustPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ReviewsInput;
}): string {
  const rt = params.input.reviewText?.trim()
    ? params.input.reviewText.trim().slice(0, 8000)
    : "no proporcionado";
  const rating =
    typeof params.input.rating === "number" && Number.isFinite(params.input.rating)
      ? String(params.input.rating)
      : "no indicado";
  const lang = params.input.language?.trim() ? params.input.language.trim() : "es (salvo que el brief indique otro)";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK TRUST (top 1%):
- **Tone**: tono adecuado a marca, plataforma y severidad; sin tono defensivo ante crítica válida.
- **Respond**: estructura clara de respuesta o mensaje; límites legales/compliance cuando aplique.
- **Understand**: reformula el problema o motivación del cliente; evidencia que hubo lectura real.
- **Strengthen**: cómo reforzar confianza (acción, compensación sugerida, seguimiento interno).
- **Track**: qué medir después (CSAT, reply rate, NPS), sin KPIs inventados.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Negocio: ${params.input.businessName}
- Plataforma reseñas: ${params.input.platform}
- Idioma salida preferente: ${lang}
- Texto reseña (si aplica): ${rt}
- Valoración numérica (si aplica): ${rating}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown).
sentiment debe ser exactamente uno de: "positive", "neutral", "negative".
{"content":"string detallada en español salvo brief","score":0-100,"sentiment":"positive"|"neutral"|"negative","actions":["mínimo 3 acciones"]}`;
}

export async function runReviewsAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ReviewsInput,
): Promise<ReviewsOutput> {
  const prompt = buildTrustPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, reviewsTemperature(agentId)));
  const parsed = parseReviewsLlmJson(raw, agentId);
  const out: ReviewsOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultReviewsLlm(): ILlmClient {
  return LlmClient.getInstance();
}

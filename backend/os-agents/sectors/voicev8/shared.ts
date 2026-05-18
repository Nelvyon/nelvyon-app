import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV8Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV8Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV8LlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.4,
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

export function parseVoiceV8LlmJson(raw: string, label: string): Omit<VoiceV8Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV8Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV8Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v8 — ANALYTICS LLAMADAS + COACHING NELVYON OS (v1):
- Análisis post-llamada automático: duración, silencios, interrupciones, ratio habla/escucha.
- Scoring de agente IA 0-100 con desglose interpretable (claridad, empatía, resolución).
- Detección de objeciones y qué respuestas fueron más efectivas (win/loss por patrón).
- Coaching automático con sugerencias accionables y micro-rúbricas por rol.
- Benchmarking por sector y tamaño de cuenta (percentiles anonimizados).
- Reportes semanales de rendimiento (tendencias, cohortes, outliers).
- Alertas de calidad en tiempo real (MOS bajo, escaladas, loops de repetición).
- Heatmaps de conversación (densidad por minuto, solapes, handoff).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / canales: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runVoiceV8AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV8Input,
): Promise<VoiceV8Output> {
  const prompt = buildVoiceV8Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV8LlmOpts);
  const parsed = parseVoiceV8LlmJson(raw, agentId);
  const out: VoiceV8Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev8", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV8Llm(): ILlmClient {
  return LlmClient.getInstance();
}

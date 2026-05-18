import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV10Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV10Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV10LlmOpts: LlmOptions = {
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

export function parseVoiceV10LlmJson(raw: string, label: string): Omit<VoiceV10Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV10Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV10Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v10 — DETECCIÓN DE EMOCIONES NELVYON OS (v1):
- Detección en tiempo real: frustración, satisfacción, duda, urgencia, interés (señales prosódicas + léxicas + contexto).
- Ajuste dinámico del tono del agente según emoción detectada (empatía, ritmo, claridad, límites de promesas).
- Escalación automática a humano si la frustración supera umbral (histeresis, cooldown, handoff con contexto emocional).
- Registro emocional por cliente para personalización futura (minimización, TTL, opt-out).
- Alertas en dashboard cuando emoción negativa es sostenida (ventana deslizante, deduplicación).
- Análisis agregado de sentimiento por campaña/sector (k-anonimity, cohortes mínimas).
- Correlación emoción → conversión (uplift, causalidad cautelosa, experimentación).

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

export async function runVoiceV10AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV10Input,
): Promise<VoiceV10Output> {
  const prompt = buildVoiceV10Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV10LlmOpts);
  const parsed = parseVoiceV10LlmJson(raw, agentId);
  const out: VoiceV10Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev10", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV10Llm(): ILlmClient {
  return LlmClient.getInstance();
}

import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV5Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV5Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV5LlmOpts: LlmOptions = {
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

export function parseVoiceV5LlmJson(raw: string, label: string): Omit<VoiceV5Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV5Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV5Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v5 — VOZ PERSONALIZADA POR MARCA NELVYON OS (v1):
- Voz única por marca: tono, velocidad, acento y personalidad alineados con guidelines.
- Clonación / síntesis de voz con ElevenLabs (o equivalente): consentimiento, calidad, y cumplimiento de uso de marca.
- Ajuste dinámico por contexto del cliente (sentimiento, segmento, canal) sin romper la identidad vocal.
- A/B testing de voces con métricas de retención y claridad (no solo preferencia subjetiva).
- Branding vocal coherente en todos los canales (IVR, chat leído en voz, anuncios, hold music copy).
- Localización y variantes regionales respetando la marca.
- Analytics de adopción vocal, errores ASR/TTS y satisfacción.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / canales de voz: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runVoiceV5AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV5Input,
): Promise<VoiceV5Output> {
  const prompt = buildVoiceV5Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV5LlmOpts);
  const parsed = parseVoiceV5LlmJson(raw, agentId);
  const out: VoiceV5Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev5", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV5Llm(): ILlmClient {
  return LlmClient.getInstance();
}

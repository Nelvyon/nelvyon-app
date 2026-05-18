import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV9Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV9Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV9LlmOpts: LlmOptions = {
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

export function parseVoiceV9LlmJson(raw: string, label: string): Omit<VoiceV9Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV9Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV9Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v9 — WHATSAPP + SMS + VÍDEO NELVYON OS (v1):
- Agente omnicanal: **WhatsApp Business API**, **SMS** y **videollamada** con experiencia unificada.
- Continuidad de conversación entre canales con **contexto compartido** (case_id, resúmenes, preferencias).
- Envío automático de **documentos/contratos por WhatsApp** tras llamada (plantillas aprobadas, enlaces firmados temporales).
- **SMS de seguimiento** post-conversación (confirmación, recordatorio, deep link seguro).
- **Videollamada IA con avatar HeyGen v3** (disclosure, latencia, fallback audio-only).
- **Notificaciones proactivas** por canal preferido del cliente (preferencia explícita, quiet hours).
- **Opt-in / opt-out GDPR** por canal con registro auditable y revocación inmediata.
- **Métricas de entrega y apertura** por canal (sin PII innecesaria, agregación por campaña).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / integraciones: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runVoiceV9AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV9Input,
): Promise<VoiceV9Output> {
  const prompt = buildVoiceV9Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV9LlmOpts);
  const parsed = parseVoiceV9LlmJson(raw, agentId);
  const out: VoiceV9Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev9", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV9Llm(): ILlmClient {
  return LlmClient.getInstance();
}

import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV2Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV2Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV2LlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.7,
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

export function parseVoiceV2LlmJson(raw: string, label: string): Omit<VoiceV2Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV2Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV2Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v2 — MEMORIA + CONTEXTO NELVYON OS (v1):
- Memoria persistente entre llamadas (almacenamiento versionado, TTL, consentimiento y minimización de datos).
- Contexto de cliente unificado (CRM, tickets, últimas interacciones) disponible antes y durante la llamada.
- Historial de conversaciones indexado para búsqueda semántica y continuidad de hilo.
- Personalización por usuario (tono, idioma, preferencias, límites de disclosure).
- Recuperación de contexto mid-call (re-ranking, ventanas deslizantes, señales de barge-in).
- Resúmenes post-llamada accionables y handoff a humanos cuando aplique.
- Seguimiento de acuerdos y compromisos con recordatorios y estados.
- Integración memoria ↔ CRM / base de datos con idempotencia y trazabilidad.
- Analytics de patrones conversacionales y efectividad de la memoria (sin PII innecesaria).

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

export async function runVoiceV2AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV2Input,
): Promise<VoiceV2Output> {
  const prompt = buildVoiceV2Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV2LlmOpts);
  const parsed = parseVoiceV2LlmJson(raw, agentId);
  const out: VoiceV2Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev2", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV2Llm(): ILlmClient {
  return LlmClient.getInstance();
}

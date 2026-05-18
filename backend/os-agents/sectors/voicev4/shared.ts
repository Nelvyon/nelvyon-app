import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV4Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV4Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV4LlmOpts: LlmOptions = {
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

export function parseVoiceV4LlmJson(raw: string, label: string): Omit<VoiceV4Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV4Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV4Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v4 — TRANSFERENCIA OMNICANAL NELVYON OS (v1):
- Transferencia fluida desde voz hacia chat, email, WhatsApp u otros canales con un solo hilo de caso.
- Handoff a agente humano con paquete de contexto (resumen, intención, datos verificados, último turno).
- Continuidad de contexto entre canales sin pérdida (IDs de conversación, versionado de estado, deduplicación).
- Reglas de consentimiento y canal preferido del cliente antes de enviar enlaces o datos sensibles.
- WhatsApp: deep links, plantillas aprobadas, ventanas de servicio y trazabilidad del salto voz→WA.
- Email: resumen automático, adjuntos controlados y threading con ticket/CRM.
- Chat web: historial visible, cola y presencia, reanudación tras abandono de voz.
- Escalación por urgencia o complejidad (SLA, colas skills-based, fallback humano).
- Analytics de rutas omnicanal y puntos de abandono (embudo multicanal, latencias de handoff).

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

export async function runVoiceV4AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV4Input,
): Promise<VoiceV4Output> {
  const prompt = buildVoiceV4Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV4LlmOpts);
  const parsed = parseVoiceV4LlmJson(raw, agentId);
  const out: VoiceV4Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev4", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV4Llm(): ILlmClient {
  return LlmClient.getInstance();
}

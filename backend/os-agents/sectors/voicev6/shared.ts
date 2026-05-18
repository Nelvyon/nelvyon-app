import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV6Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV6Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV6LlmOpts: LlmOptions = {
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

export function parseVoiceV6LlmJson(raw: string, label: string): Omit<VoiceV6Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV6Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV6Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v6 — ESCALA MILLONES DE LLAMADAS NELVYON OS (v1):
- Orquestación de millones de llamadas concurrentes (particionado regional, límites de sesión, backpressure).
- Balanceo de carga dinámico entre pools SIP/media y workers de NLU/TTS.
- Colas prioritarias por cliente / plan / SLA (weighted fair queue, aging anti-starvation).
- Failover automático multi-proveedor (carrier, TTS, ASR) con health checks y circuit breakers.
- Rate limiting inteligente (token bucket por tenant, burst controlado, prioridad emergencias).
- Monitorización en tiempo real de infraestructura (latencias, jitter, MOS, errores de señalización).
- Auto-scaling predictivo (series temporales, colas observadas, cold start mitigation).
- Gestión de costes por volumen (unit economics por minuto, proveedor, cohorte de campaña).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / plataforma: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runVoiceV6AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV6Input,
): Promise<VoiceV6Output> {
  const prompt = buildVoiceV6Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV6LlmOpts);
  const parsed = parseVoiceV6LlmJson(raw, agentId);
  const out: VoiceV6Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev6", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV6Llm(): ILlmClient {
  return LlmClient.getInstance();
}

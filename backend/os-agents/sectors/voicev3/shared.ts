import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV3Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV3Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV3LlmOpts: LlmOptions = {
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

export function parseVoiceV3LlmJson(raw: string, label: string): Omit<VoiceV3Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV3Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV3Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v3 — CIERRE VENTAS + CONTRATO NELVYON OS (v1):
- Cierre de ventas por voz con guiones asistidos, prueba social y urgencia ética (sin engaño).
- Manejo de objeciones en tiempo real (precio, timing, competencia, autoridad) con playbook.
- Generación de propuesta comercial durante la llamada (alcance, precio, plazos, riesgos).
- Generación automática de contrato post-cierre (cláusulas estándar, jurisdicción, anexos).
- Firma digital y validación legal (cadena de custodia, evidencia, revocación).
- Follow-up automático post-cierre (onboarding, facturación, SLA de entrega).
- Upsell y cross-sell detectados en llamada con límites de disclosure y consentimiento.
- Analytics de tasa de cierre, objeciones frecuentes y conversión (agregados, privacidad).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / oferta: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runVoiceV3AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV3Input,
): Promise<VoiceV3Output> {
  const prompt = buildVoiceV3Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV3LlmOpts);
  const parsed = parseVoiceV3LlmJson(raw, agentId);
  const out: VoiceV3Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev3", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV3Llm(): ILlmClient {
  return LlmClient.getInstance();
}

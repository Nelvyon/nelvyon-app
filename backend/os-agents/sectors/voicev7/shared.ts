import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VoiceV7Input {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VoiceV7Output {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const voiceV7LlmOpts: LlmOptions = {
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

export function parseVoiceV7LlmJson(raw: string, label: string): Omit<VoiceV7Output, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildVoiceV7Prompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VoiceV7Input;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

VOICE AGENT v7 — GRABACIÓN + COMPLIANCE NELVYON OS (v1):
- Grabación automática de llamadas solo con **consentimiento** documentado (opt-in/opt-out, prueba de aviso).
- Transcripción legal en tiempo real (p. ej. Whisper) con cadena de custodia y control de calidad.
- Almacenamiento cifrado compatible con marcos **GDPR / CCPA / HIPAA** según el caso de uso (clave por tenant, rotación).
- Retención configurable por país/jurisdicción y políticas de minimización (TTL, legal hold, borrado certificado).
- Redacción automática de datos sensibles (**PII**) en transcripciones y metadatos exportables.
- Acceso auditado (quién, cuándo, motivo) y principio de necesidad.
- Exportación para cumplimiento regulatorio (paquetes eDiscovery, formato estándar, hash de integridad).
- Notificación de consentimiento al **inicio de llamada** (script, idioma, canal alternativo si el usuario no acepta).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / stack: ${services}
- Mercados / targets regulatorios: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runVoiceV7AgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VoiceV7Input,
): Promise<VoiceV7Output> {
  const prompt = buildVoiceV7Prompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, voiceV7LlmOpts);
  const parsed = parseVoiceV7LlmJson(raw, agentId);
  const out: VoiceV7Output = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "voicev7", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVoiceV7Llm(): ILlmClient {
  return LlmClient.getInstance();
}

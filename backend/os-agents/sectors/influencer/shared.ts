import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface InfluencerInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  /** Opcional: etiqueta de programa OS (p. ej. influencer_v1) para auditoría en BD. */
  metadata?: { program?: string };
}

export interface InfluencerOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const influencerLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.6,
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

export function parseInfluencerLlmJson(raw: string, label: string): Omit<InfluencerOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const INFLUENCER_VIRTUAL_OS_RULES = `INFLUENCER VIRTUAL IA NELVYON OS (v1):
- Identidad propia: nombre, personalidad, nicho, estética visual y límites éticos (disclaimer no sustituye persona real).
- Contenido automático Instagram / TikTok / YouTube / X (hooks, formatos nativos, cadencia, cumplimiento de políticas plataforma).
- Avatar visual HeyGen v3 + Flux Pro Ultra (consistencia, variaciones, revisión humana recomendada).
- Voz consistente ElevenLabs (casting, guía de pronunciación, SSML).
- Calendario editorial automático (pilares, repurposing, picos de audiencia).
- Comunidad: gestión comentarios y DMs con IA (escalación humano, tóxicos, PII).
- Colaboraciones marca automatizadas (brief, deliverables, disclosure #ad).
- Métricas engagement y crecimiento (KPIs, cohortes, experimentación).
- Monetización: afiliados, sponsors, productos digitales (transparencia, impuestos placeholder).`;

export function buildInfluencerPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: InfluencerInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${INFLUENCER_VIRTUAL_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / stack: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runInfluencerAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: InfluencerInput,
): Promise<InfluencerOutput> {
  const prompt = buildInfluencerPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, influencerLlmOpts);
  const parsed = parseInfluencerLlmJson(raw, agentId);
  const out: InfluencerOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "influencer", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultInfluencerLlm(): ILlmClient {
  return LlmClient.getInstance();
}

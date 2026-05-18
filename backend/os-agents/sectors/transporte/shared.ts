import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface TransporteInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface TransporteOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const transporteLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 1200,
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

export function parseTransporteLlmJson(raw: string, label: string): Omit<TransporteOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildTransportePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: TransporteInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

TRANSPORTE / MOVILIDAD NELVYON OS (v1):
- Sector transporte y movilidad: empresas de logística y mensajería, gestión de flotas y última milla, mudanzas y porte, taxi y VTC, alquiler de vehículos, movilidad urbana compartida, delivery food y paquetería B2B/B2C.
- Captación clientes B2B y B2C, optimización de flota y rutas, pricing de tarifas y presupuestos, SEO local y comparadores, social de confianza y operativa, email de seguimiento de envíos y fidelización, reputación e incidencias, analytics de entregas, tiempos y NPS.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Empresa: ${params.input.businessName}
- Servicios / modalidades: ${services}
- Mercados / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runTransporteAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: TransporteInput,
): Promise<TransporteOutput> {
  const prompt = buildTransportePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, transporteLlmOpts);
  const parsed = parseTransporteLlmJson(raw, agentId);
  const out: TransporteOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "transporte", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultTransporteLlm(): ILlmClient {
  return LlmClient.getInstance();
}

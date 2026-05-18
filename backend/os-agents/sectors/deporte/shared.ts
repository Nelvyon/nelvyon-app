import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface DeporteInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface DeporteOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const deporteLlmOpts: LlmOptions = {
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

export function parseDeporteLlmJson(raw: string, label: string): Omit<DeporteOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildDeportePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: DeporteInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

DEPORTE / ESPORTS NELVYON OS (v1):
- Sector deporte y competición digital: clubes y federaciones, gimnasios y centros fitness, entrenadores personales y academias, equipos eSports y organizadores de torneos, marcas deportivas y retail especializado, eventos y ligas con ticketing.
- Captación y fidelización de fans y miembros, patrocinadores y partners, pricing de membresías, entradas y merchandising, SEO local de clubes y calendarios de eventos, social y streaming para engagement, email de temporada y retención, reputación y comunidad, analytics de asistencia, engagement y revenue.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Marca / club: ${params.input.businessName}
- Servicios / producto: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runDeporteAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: DeporteInput,
): Promise<DeporteOutput> {
  const prompt = buildDeportePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, deporteLlmOpts);
  const parsed = parseDeporteLlmJson(raw, agentId);
  const out: DeporteOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "deporte", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultDeporteLlm(): ILlmClient {
  return LlmClient.getInstance();
}

import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface FotografiaInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface FotografiaOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const fotografiaLlmOpts: LlmOptions = {
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

export function parseFotografiaLlmJson(raw: string, label: string): Omit<FotografiaOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildFotografiaPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: FotografiaInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FOTOGRAFÍA NELVYON OS (v1):
- Sector imagen: fotógrafos profesionales freelance y equipos, estudios de foto y alquiler set, fotografía de bodas y eventos corporativos, producto y e-commerce, moda y editorial, inmobiliaria y arquitectura, food y retrato.
- Portfolio online y galería optimizada, captación por especialidad, pricing de sesiones y paquetes, SEO local y por nicho, social en Instagram, Pinterest y TikTok visual, email de seguimiento de leads y entrega de trabajos, reputación y testimonios, analytics de sesiones, conversión y ticket medio.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Marca / estudio: ${params.input.businessName}
- Servicios / especialidades: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runFotografiaAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: FotografiaInput,
): Promise<FotografiaOutput> {
  const prompt = buildFotografiaPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, fotografiaLlmOpts);
  const parsed = parseFotografiaLlmJson(raw, agentId);
  const out: FotografiaOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "fotografia", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultFotografiaLlm(): ILlmClient {
  return LlmClient.getInstance();
}

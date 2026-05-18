import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ArquitecturaInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface ArquitecturaOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const arquitecturaLlmOpts: LlmOptions = {
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

export function parseArquitecturaLlmJson(raw: string, label: string): Omit<ArquitecturaOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildArquitecturaPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ArquitecturaInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

ARQUITECTURA / INTERIORISMO NELVYON OS (v1):
- Sector espacio: estudios de arquitectura, interioristas y decoradores, reformas integrales y llave en mano, diseño de oficinas, retail y vivienda, visualización 3D y styling.
- Portfolio y galería de proyectos, captación de clientes particulares y promotores, pricing de proyectos y honorarios, SEO local de estudio, social en Instagram, Pinterest y Houzz, email de seguimiento de obra y leads, reputación y testimonios, analytics de leads, conversión y ticket medio.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Estudio / marca: ${params.input.businessName}
- Servicios / especialidad: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runArquitecturaAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ArquitecturaInput,
): Promise<ArquitecturaOutput> {
  const prompt = buildArquitecturaPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, arquitecturaLlmOpts);
  const parsed = parseArquitecturaLlmJson(raw, agentId);
  const out: ArquitecturaOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "arquitectura", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultArquitecturaLlm(): ILlmClient {
  return LlmClient.getInstance();
}

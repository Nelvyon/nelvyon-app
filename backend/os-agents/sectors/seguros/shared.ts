import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface SegurosInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface SegurosOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const segurosLlmOpts: LlmOptions = {
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

export function parseSegurosLlmJson(raw: string, label: string): Omit<SegurosOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildSegurosPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: SegurosInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

SEGUROS NELVYON OS (v1):
- Sector seguros: corredurías y agentes vinculados, comparadores online, aseguradoras directas, brokers; ramos vida, salud, auto, hogar y responsabilidad civil.
- Captación de leads cualificados por ramo, retención de pólizas y cancelaciones, pricing comparativo y argumentario de valor, SEO de comparadores e intención de compra, social de confianza y educación financiera, email nurturing y renovación, reputación y testimonios, analytics de conversión, LTV y visión de ratio siniestros (sin asesoramiento jurídico ni cobertura garantizada).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio: ${params.input.businessName}
- Servicios / ramos: ${services}
- Objetivos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runSegurosAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: SegurosInput,
): Promise<SegurosOutput> {
  const prompt = buildSegurosPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, segurosLlmOpts);
  const parsed = parseSegurosLlmJson(raw, agentId);
  const out: SegurosOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "seguros", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultSegurosLlm(): ILlmClient {
  return LlmClient.getInstance();
}

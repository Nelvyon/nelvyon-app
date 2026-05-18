import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface FranquiciasInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface FranquiciasOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const franquiciasLlmOpts: LlmOptions = {
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

export function parseFranquiciasLlmJson(raw: string, label: string): Omit<FranquiciasOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildFranquiciasPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: FranquiciasInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRANQUICIAS NELVYON OS (v1):
- Sector franquicias: centrales franquiciadora, franquiciados, expansión de red, marketing local por unidad.
- Captación de franquiciados, marketing local, pricing y royalties, SEO nacional y local, social marca + local, email, reviews y analytics de red.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio: ${params.input.businessName}
- Servicios: ${services}
- Objetivos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runFranquiciasAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: FranquiciasInput,
): Promise<FranquiciasOutput> {
  const prompt = buildFranquiciasPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, franquiciasLlmOpts);
  const parsed = parseFranquiciasLlmJson(raw, agentId);
  const out: FranquiciasOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "franquicias", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultFranquiciasLlm(): ILlmClient {
  return LlmClient.getInstance();
}

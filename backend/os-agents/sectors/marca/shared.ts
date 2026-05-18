import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface MarcaInput {
  userId: string;
  businessName: string;
  industry: string;
  targets: string[];
}

export interface MarcaOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const marcaLlmOpts: LlmOptions = {
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

export function parseMarcaLlmJson(raw: string, label: string): Omit<MarcaOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildMarcaPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: MarcaInput;
}): string {
  const industry = params.input.industry.trim() || "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

ESTRATEGIA DE MARCA GLOBAL NELVYON OS (v1):
- Estrategia de marca global: identidad y sistema visual, posicionamiento y propuesta de valor, tono de voz y guías de comunicación, naming, taglines y vocabulario, arquitectura de marca y submarcas, brand guidelines y consistencia multicanal, percepción y benchmarking competitivo, evolución de marca en nuevos mercados y culturas.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Marca / organización: ${params.input.businessName}
- Industria / categoría: ${industry}
- Audiencias / mercados objetivo: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runMarcaAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: MarcaInput,
): Promise<MarcaOutput> {
  const prompt = buildMarcaPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, marcaLlmOpts);
  const parsed = parseMarcaLlmJson(raw, agentId);
  const out: MarcaOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "marca", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultMarcaLlm(): ILlmClient {
  return LlmClient.getInstance();
}

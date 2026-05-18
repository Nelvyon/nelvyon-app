import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface EsteticaInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface EsteticaOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const esteticaLlmOpts: LlmOptions = {
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

export function parseEsteticaLlmJson(raw: string, label: string): Omit<EsteticaOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildEsteticaPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: EsteticaInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PELUQUERÍAS Y ESTÉTICA NELVYON OS (v1):
- Sector estética: peluquerías, salones de belleza, barbershops, nail art, spas, centros de depilación.
- Reservas online, captación y fidelización, pricing, SEO local, social antes/después, email/WhatsApp, reviews y analytics.

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

export async function runEsteticaAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: EsteticaInput,
): Promise<EsteticaOutput> {
  const prompt = buildEsteticaPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, esteticaLlmOpts);
  const parsed = parseEsteticaLlmJson(raw, agentId);
  const out: EsteticaOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "estetica", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultEsteticaLlm(): ILlmClient {
  return LlmClient.getInstance();
}

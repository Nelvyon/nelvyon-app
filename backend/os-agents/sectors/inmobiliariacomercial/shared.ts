import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface InmobiliariaComercialInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface InmobiliariaComercialOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const inmobiliariaComercialLlmOpts: LlmOptions = {
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

export function parseInmobiliariaComercialLlmJson(
  raw: string,
  label: string,
): Omit<InmobiliariaComercialOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildInmobiliariaComercialPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: InmobiliariaComercialInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

INMOBILIARIA COMERCIAL NELVYON OS (v1):
- Sector B2B: agencias de oficinas y espacios corporativos, naves industriales y logística, locales comerciales y retail, coworkings y flex space, inversores y family offices inmobiliarios.
- Captación de inversores y empresas, gestión y optimización de listings, pricing y valoración de activos, SEO en portales inmobiliarios B2B, LinkedIn y social B2B, email nurturing, reputación y casos de éxito, analytics de leads, visitas y conversión.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Agencia / marca: ${params.input.businessName}
- Servicios / tipología activo: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runInmobiliariaComercialAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: InmobiliariaComercialInput,
): Promise<InmobiliariaComercialOutput> {
  const prompt = buildInmobiliariaComercialPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, inmobiliariaComercialLlmOpts);
  const parsed = parseInmobiliariaComercialLlmJson(raw, agentId);
  const out: InmobiliariaComercialOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "inmobiliariacomercial", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultInmobiliariaComercialLlm(): ILlmClient {
  return LlmClient.getInstance();
}

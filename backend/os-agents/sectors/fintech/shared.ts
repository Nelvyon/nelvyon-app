import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { getSeedByIndex } from "../../seeds/seed-selector";
import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface FintechInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  seedIndex?: number;
}

export interface FintechOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const fintechLlmOpts: LlmOptions = {
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

export function parseFintechLlmJson(raw: string, label: string): Omit<FintechOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildFintechPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: FintechInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";
  const seed = getSeedByIndex("fintech", params.input.seedIndex ?? 0);
  const seedCtx = seed ? `\nSEED TEMPLATE (adaptar al cliente):\n- Headline: ${seed.headline}\n- CTA: ${seed.cta_label}\n- Chatbot: ${seed.chatbot_greeting}` : "";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

BANCA / FINTECH NELVYON OS (v1):
- Sector banca y fintech: neobancos, fintechs de pagos y lending, apps financieras, brokers de bolsa/FX, plataformas de inversión retail, exchanges de criptoactivos bajo marco regulado aplicable.
- Captación y onboarding digital, activación y first transaction, pricing de comisiones/spreads y propuesta de valor, SEO de finanzas personales y comparadores, social de confianza y educación financiera, email lifecycle y notificaciones transaccionales, reputación en tiendas y agregadores, analytics DAU/MAU, volumen de transacciones y LTV (sin asesoramiento de inversión personalizado ni promesas de rentabilidad).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio: ${params.input.businessName}
- Servicios / producto: ${services}
- Objetivos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}${seedCtx}`;
}

export async function runFintechAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: FintechInput,
): Promise<FintechOutput> {
  const prompt = buildFintechPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, fintechLlmOpts);
  const parsed = parseFintechLlmJson(raw, agentId);
  const out: FintechOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "fintech", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultFintechLlm(): ILlmClient {
  return LlmClient.getInstance();
}

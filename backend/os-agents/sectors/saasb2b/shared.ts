import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { getSeedByIndex } from "../../seeds/seed-selector";
import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface SaasB2bInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  seedIndex?: number;
}

export interface SaasB2bOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const saasB2bLlmOpts: LlmOptions = {
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

export function parseSaasB2bLlmJson(raw: string, label: string): Omit<SaasB2bOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildSaasB2bPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: SaasB2bInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";
  const seed = getSeedByIndex("saasb2b", params.input.seedIndex ?? 0);
  const seedCtx = seed ? `\nSEED TEMPLATE (adaptar al cliente):\n- Headline: ${seed.headline}\n- CTA: ${seed.cta_label}\n- Chatbot: ${seed.chatbot_greeting}` : "";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

SAAS B2B NELVYON OS (v1):
- Sector SaaS B2B: productos software B2B, PLG, enterprise sales, trial-to-paid, onboarding SaaS.
- Demos/trials, lead gen cualificado, onboarding, SEO product-led, LinkedIn, email nurturing, G2/Capterra y product analytics.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio: ${params.input.businessName}
- Servicios: ${services}
- Objetivos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}${seedCtx}`;
}

export async function runSaasB2bAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: SaasB2bInput,
): Promise<SaasB2bOutput> {
  const prompt = buildSaasB2bPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, saasB2bLlmOpts);
  const parsed = parseSaasB2bLlmJson(raw, agentId);
  const out: SaasB2bOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "saasb2b", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultSaasB2bLlm(): ILlmClient {
  return LlmClient.getInstance();
}

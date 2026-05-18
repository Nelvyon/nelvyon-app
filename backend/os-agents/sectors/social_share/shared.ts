import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface SocialShareInput {
  userId: string;
  sector: string;
  brand: string;
  referralLink?: string;
  primaryNetwork?: string;
  metricsSummary?: string;
  metadata?: Record<string, unknown>;
}

export interface SocialShareOutput {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
}

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

export function llmOpts(agentId: string, temperature: number): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseSocialShareLlmJson(raw: string, label: string): Omit<SocialShareOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; highlights?: unknown; metrics?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const h = p.highlights;
  const highlights = Array.isArray(h)
    ? h.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const m = p.metrics;
  const metrics = Array.isArray(m) ? m.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean) : [];
  return { content, score, highlights, metrics };
}

export function buildSocialSharePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: SocialShareInput;
}): string {
  const link = params.input.referralLink?.trim() ? params.input.referralLink.trim() : "no indicado (obligatorio en prod)";
  const net = params.input.primaryNetwork?.trim() ? params.input.primaryNetwork.trim() : "multi-red";
  const metrics = params.input.metricsSummary?.trim() ? params.input.metricsSummary.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PRODUCTO SHARED RESULTS RRSS NELVYON:
- **Cada share** debe incluir el **link de referral único** del cliente (tracking + atribución).
- Si el share genera **registro nuevo** → **crédito automático** al cliente vía **ReferralRewardAgent** (pipeline billing).
- **Viral threshold**: **>500 clicks en 24h** → **SocialShareViralAgent** amplifica con **boost de presupuesto** (orientativo).

FRAMEWORK SHARE (orientativo):
- **Surface**: formato OG/card/copy por red.
- **Timing**: ventanas horarias por audiencia.
- **Truth**: métricas del cliente sin inflar.
- **Growth**: CTA referral visible y único.
- **Measure**: clicks, impresiones, conversiones por URL.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Link referral: ${link}
- Red principal / foco: ${net}
- Resumen métricas cliente: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI o chips"]}`;
}

export async function runSocialShareAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: SocialShareInput,
  temperature: number,
): Promise<SocialShareOutput> {
  const prompt = buildSocialSharePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseSocialShareLlmJson(raw, agentId);
  const out: SocialShareOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultSocialShareLlm(): ILlmClient {
  return LlmClient.getInstance();
}

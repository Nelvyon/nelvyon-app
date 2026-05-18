import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ReferralInput {
  userId: string;
  sector: string;
  brand: string;
  referralCode?: string;
  audienceHint?: string;
  metadata?: Record<string, unknown>;
}

export interface ReferralOutput {
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

export function parseReferralLlmJson(raw: string, label: string): Omit<ReferralOutput, "agentId"> {
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

export function buildReferralPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ReferralInput;
}): string {
  const code = params.input.referralCode?.trim() ? params.input.referralCode.trim() : "no indicado";
  const audience = params.input.audienceHint?.trim() ? params.input.audienceHint.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA REFERRAL NELVYON (reglas producto):
- Referidor: **30% del primer pago** del referido como **crédito en billing** (automático).
- Referido: **1 mes gratis** al activar suscripción pagada.
- Fraude: **bloqueo** si misma IP o mismo dispositivo entre referidor y referido.

FRAMEWORK REFERR (orientativo):
- **Reach**: alcance del código/enlace.
- **Evidence**: señales de clicks, registros y pagos.
- **Fairness**: anti-abuso y límites claros.
- **Experience**: mensajes y UX de invitación.
- **Reward**: aplicación de créditos y mes gratis sin ambigüedad.
- **Audit**: trazabilidad para soporte y finanzas.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector: ${params.input.sector}
- Marca / producto: ${params.input.brand}
- Código referral (si aplica): ${code}
- Audiencia objetivo: ${audience}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets accionables"],"metrics":["KPI o líneas métricas tipo chip"]}`;
}

export async function runReferralAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ReferralInput,
  temperature: number,
): Promise<ReferralOutput> {
  const prompt = buildReferralPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseReferralLlmJson(raw, agentId);
  const out: ReferralOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultReferralLlm(): ILlmClient {
  return LlmClient.getInstance();
}

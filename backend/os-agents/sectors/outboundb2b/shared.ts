import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface OutboundB2BInput {
  userId: string;
  sector: string;
  brand: string;
  outboundBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface OutboundB2BOutput {
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

export function parseOutboundB2BLlmJson(raw: string, label: string): Omit<OutboundB2BOutput, "agentId"> {
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

export function buildOutboundB2BPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: OutboundB2BInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const outbound = params.input.outboundBrief?.trim() ? params.input.outboundBrief.trim() : "inferir desde sector";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

OUTBOUND B2B NELVYON OS (v1):
- **Prefijo agentes**: **OutboundB2B**; prospección y outreach B2B automático.
- **Secuencia estándar**: **D1** email inicial · **D3** LinkedIn · **D5** follow-up email · **D8** llamada · **D12** email cierre.
- **Reply rate objetivo**: **>12%**. **Meeting booked rate**: **>3%**.
- **Personalización obligatoria**: cada email menciona **empresa**, **cargo**, **trigger event reciente** y **pain point** específico (no genérico).
- **Trigger events**: financiación reciente, nueva contratación, expansión, producto lanzado, cambio de CEO.
- **Límite diario**: **50 emails/día por dominio** para evitar spam filters.
- **Canales**: email + LinkedIn + llamada; cualificación de respuestas y agenda de reuniones.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / tenant: ${params.input.brand}
- Outbound / ICP: ${outbound}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runOutboundB2BAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: OutboundB2BInput,
  temperature: number,
): Promise<OutboundB2BOutput> {
  const prompt = buildOutboundB2BPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseOutboundB2BLlmJson(raw, agentId);
  const out: OutboundB2BOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultOutboundB2BLlm(): ILlmClient {
  return LlmClient.getInstance();
}

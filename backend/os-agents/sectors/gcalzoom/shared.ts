import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type GCalZoomMeetingType = "demo" | "onboarding" | "review_mensual" | "upsell" | "soporte";

export interface GCalZoomInput {
  userId: string;
  sector: string;
  brand: string;
  meetingType?: GCalZoomMeetingType | string;
  /** Contexto reunión / IDs orientativos */
  meetingBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface GCalZoomOutput {
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

export function parseGCalZoomLlmJson(raw: string, label: string): Omit<GCalZoomOutput, "agentId"> {
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

export function buildGCalZoomPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: GCalZoomInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const mt = params.input.meetingType?.toString().trim() ? String(params.input.meetingType).trim() : "no indicado";
  const mb = params.input.meetingBrief?.trim() ? params.input.meetingBrief.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

INTEGRACIÓN GOOGLE CALENDAR + ZOOM NELVYON (v1):
- **OAuth2** separado para **Google Calendar** y **Zoom** (scopes mínimos calendario + meetings + recordings según producto).
- **Tipos de reunión**: **demo**, **onboarding**, **review_mensual**, **upsell**, **soporte**.
- **Follow-up automático**: dentro de **30 minutos** post-reunión → **resumen**, **action items**, **propuesta próxima reunión**.
- **No-show detection**: si el **cliente no entra a Zoom en 5 minutos** tras hora de inicio → **email automático** con **enlace para reagendar**.
- **Grabaciones Zoom**: **resumen IA en menos de 2 minutos**; persistencia en resultados con **timestamp** y **participantes**.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- Tipo reunión: ${mt}
- Contexto reunión: ${mb}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runGCalZoomAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: GCalZoomInput,
  temperature: number,
): Promise<GCalZoomOutput> {
  const prompt = buildGCalZoomPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseGCalZoomLlmJson(raw, agentId);
  const out: GCalZoomOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultGCalZoomLlm(): ILlmClient {
  return LlmClient.getInstance();
}

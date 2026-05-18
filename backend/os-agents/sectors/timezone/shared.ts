import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
/** Zonas IANA cubiertas v1 (NELVYON). */
export type TimezoneId =
  | "Europe/Madrid"
  | "Europe/London"
  | "Europe/Paris"
  | "America/Mexico_City"
  | "America/Bogota"
  | "America/Santiago"
  | "America/Sao_Paulo"
  | "America/New_York"
  | "America/Los_Angeles"
  | "Asia/Tokyo"
  | "UTC";

export interface TimezoneInput {
  userId: string;
  sector: string;
  brand: string;
  /** País orientativo (ISO-3166 alpha-2) */
  countryCode?: string;
  /** Hint IP / región para detector */
  ipHint?: string;
  /** Zona IANA preferida del cliente */
  preferredTimezone?: TimezoneId;
  /** ISO 8601 orientativo para conversiones */
  referenceTimestamp?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface TimezoneOutput {
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

export function parseTimezoneLlmJson(raw: string, label: string): Omit<TimezoneOutput, "agentId"> {
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

export function buildTimezonePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: TimezoneInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const cc = params.input.countryCode?.trim() ? params.input.countryCode.trim().toUpperCase() : "no indicado";
  const ip = params.input.ipHint?.trim() ? params.input.ipHint.trim() : "no indicado";
  const tz = params.input.preferredTimezone ?? "inferir / lista cubierta";
  const ts = params.input.referenceTimestamp?.trim() ? params.input.referenceTimestamp.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA MULTI-TIMEZONE NELVYON (v1):
- **Zonas cubiertas**: Europe/Madrid, Europe/London, Europe/Paris, America/Mexico_City, America/Bogota, America/Santiago, America/Sao_Paulo, America/New_York, America/Los_Angeles, Asia/Tokyo, **UTC**.
- **Silencio notificaciones**: **TimezoneNotifierAgent** no programa envíos entre **22:00 y 08:00** en **hora local del cliente** (ventana "no molestar").
- **Hora óptima por sector (orientativo)**:
  - Restaurantes: **11h** y **18h** locales
  - E-commerce: **20h** local
  - B2B: **9h** y **14h** locales
  - Coaches: **7h** y **19h** locales

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector actividad: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- País: ${cc}
- IP / región hint: ${ip}
- Zona preferida (IANA): ${tz}
- Timestamp referencia (conversiones): ${ts}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runTimezoneAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: TimezoneInput,
  temperature: number,
): Promise<TimezoneOutput> {
  const prompt = buildTimezonePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseTimezoneLlmJson(raw, agentId);
  const out: TimezoneOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultTimezoneLlm(): ILlmClient {
  return LlmClient.getInstance();
}

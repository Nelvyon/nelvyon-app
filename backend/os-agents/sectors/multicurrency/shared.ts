import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
/** Monedas soportadas NELVYON (precios base en EUR). */
export type MultiCurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "BRL"
  | "MXN"
  | "ARS"
  | "COP"
  | "CLP"
  | "PEN"
  | "UYU";

export interface MultiCurrencyInput {
  userId: string;
  sector: string;
  brand: string;
  /** País orientativo (ISO-3166 alpha-2), ej. ES, MX, AR */
  countryCode?: string;
  /** Hint IP / región para detector */
  ipHint?: string;
  /** Preferencia explícita del cliente */
  preferredCurrency?: MultiCurrencyCode;
  /** Moneda destino para conversiones */
  targetCurrency?: MultiCurrencyCode;
  /** Locale BCP-47 para display, ej. es-MX */
  locale?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface MultiCurrencyOutput {
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

export function parseMultiCurrencyLlmJson(raw: string, label: string): Omit<MultiCurrencyOutput, "agentId"> {
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

export function buildMultiCurrencyPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: MultiCurrencyInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const cc = params.input.countryCode?.trim() ? params.input.countryCode.trim() : "no indicado";
  const ip = params.input.ipHint?.trim() ? params.input.ipHint.trim() : "no indicado";
  const pref = params.input.preferredCurrency ?? "inferir";
  const tgt = params.input.targetCurrency ?? "según brief";
  const loc = params.input.locale?.trim() ? params.input.locale.trim() : "default país/moneda";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA MULTI-MONEDA NELVYON (REAL v1):
- **Precios base en EUR**: Starter **47€**, Pro **197€**, Agency **497€** (localizar por tipo de cambio y país).
- **Monedas soportadas**: EUR, USD, GBP, BRL, MXN, ARS, COP, CLP, PEN, UYU.
- **Redondeo**: EUR / GBP / USD → **2 decimales**; LATAM (BRL, MXN, ARS, COP, CLP, PEN, UYU) → **enteros**.
- **Tipos de cambio**: orientativo **ECB / Fixer-style**; en producción **caché Redis** (no persistido en esta tabla).
- **Reporting interno**: consolidación ingresos en **EUR** para dirección.
- **Riesgo**: monedas hipervolátiles (**ARS**, **VES**, etc.) → **alerta** y recomendar **cobro en USD** cuando aplique.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- País: ${cc}
- IP / región hint: ${ip}
- Moneda preferida: ${pref}
- Moneda objetivo (conversiones): ${tgt}
- Locale display: ${loc}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runMultiCurrencyAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: MultiCurrencyInput,
  temperature: number,
): Promise<MultiCurrencyOutput> {
  const prompt = buildMultiCurrencyPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseMultiCurrencyLlmJson(raw, agentId);
  const out: MultiCurrencyOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultMultiCurrencyLlm(): ILlmClient {
  return LlmClient.getInstance();
}

import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type AgencyCertLevel = "silver" | "gold" | "platinum";

export interface AgencyCertInput {
  userId: string;
  sector: string;
  brand: string;
  /** Identificador de la agencia partner */
  agencyId?: string;
  /** País para leaderboard / reglas regionales */
  countryCode?: string;
  /** Nivel orientativo o objetivo */
  targetLevel?: AgencyCertLevel;
  /** Métricas para evaluación / renovación (clientes, NPS, meses…) */
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface AgencyCertOutput {
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

export function parseAgencyCertLlmJson(raw: string, label: string): Omit<AgencyCertOutput, "agentId"> {
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

export function buildAgencyCertPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: AgencyCertInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const aid = params.input.agencyId?.trim() ? params.input.agencyId.trim() : "no indicado";
  const cc = params.input.countryCode?.trim() ? params.input.countryCode.trim().toUpperCase() : "no indicado";
  const lvl = params.input.targetLevel ?? "evaluar según métricas";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA CERTIFICACIÓN AGENCIAS NELVYON (v1):
- **Niveles**: **Silver** (≥5 clientes gestionados), **Gold** (≥20 clientes, **NPS >8**), **Platinum** (≥50 clientes, **NPS >9**, **≥12 meses** trayectoria).
- **Beneficios Platinum**: **comisión 40%** recurrente (vs 30% estándar), **white-label completo**, **account manager dedicado** (orquestado/automatizado), **acceso beta features**.
- **Badge oficial**: **"NELVYON Certified Agency"**; persistencia orientativa en **agency_certifications** (agency_id, nivel, estado, score, badge_url, expires_at).
- **Renovación anual automática**: sin intervención humana obligatoria — evalúa métricas y **renueva o degrada** nivel.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector agencia: ${params.input.sector}
- Marca / nombre comercial: ${params.input.brand}
- Agency ID: ${aid}
- País: ${cc}
- Nivel objetivo / foco: ${lvl}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runAgencyCertAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: AgencyCertInput,
  temperature: number,
): Promise<AgencyCertOutput> {
  const prompt = buildAgencyCertPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseAgencyCertLlmJson(raw, agentId);
  const out: AgencyCertOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultAgencyCertLlm(): ILlmClient {
  return LlmClient.getInstance();
}

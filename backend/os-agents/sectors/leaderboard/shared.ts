import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type LeaderboardScope = "global" | "sector";

export interface LeaderboardInput {
  userId: string;
  sector: string;
  brand: string;
  scope?: LeaderboardScope;
  /** Opt-in para aparecer en rankings públicos por sector */
  optInPublic?: boolean;
  /** Identificador de semana ISO u orientativo, ej. 2026-W19 */
  week?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface LeaderboardOutput {
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

export function parseLeaderboardLlmJson(raw: string, label: string): Omit<LeaderboardOutput, "agentId"> {
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

export function buildLeaderboardPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: LeaderboardInput;
}): string {
  const scope = params.input.scope ?? "sector";
  const optIn = params.input.optInPublic === true ? "sí (opt-in público)" : "no / solo privado";
  const week = params.input.week?.trim() ? params.input.week.trim() : "semana actual (orientativo)";
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA LEADERBOARD CLIENTES NELVYON:
- **Score** (orientativo): agentes OS activos usados + outputs generados + tiempo en plataforma + referidos (pesos en billing/analytics).
- **Top 3 global**: **mes gratis** automático (billing).
- **Top 1% por sector**: badge **"Elite [Sector]"**.
- **Snapshot**: cada **lunes 00:00 UTC** (histórico semanal).
- **Rankings públicos**: solo **opt-in** del cliente.

FRAMEWORK RANK (orientativo):
- **Fair**: reglas anti-gaming y ties claros.
- **Transparent**: factores de score explicables.
- **Timely**: ventanas semanales y UTC explícito.
- **Reward**: créditos/descuentos acotados.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- Alcance ranking: ${scope}
- Público opt-in: ${optIn}
- Semana referencia: ${week}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runLeaderboardAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: LeaderboardInput,
  temperature: number,
): Promise<LeaderboardOutput> {
  const prompt = buildLeaderboardPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseLeaderboardLlmJson(raw, agentId);
  const out: LeaderboardOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultLeaderboardLlm(): ILlmClient {
  return LlmClient.getInstance();
}

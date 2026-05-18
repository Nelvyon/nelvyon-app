import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ContentScoreInput {
  userId: string;
  sector: string;
  brand: string;
  contentBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface ContentScoreOutput {
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

export function parseContentScoreLlmJson(raw: string, label: string): Omit<ContentScoreOutput, "agentId"> {
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

export function buildContentScorePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ContentScoreInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const draft = params.input.contentBrief?.trim() ? params.input.contentBrief.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

CONTENT SCORE ENGINE NELVYON OS (v1):
- **Prefijo agentes**: **ContentScore**; puntuación y optimización de contenido.
- **Dimensiones 0–100**: **claridad**, **persuasión**, **SEO**, **CTA** (+ legibilidad, engagement, conversión).
- **Legibilidad**: **Flesch-Kincaid adaptado al español**.
- **SEO**: **keyword density 1–3%**, **H1 único**, **meta description <160 chars**, estructura **H1–H6**.
- **Persuasión**: **AIDA** o **PAS** detectado, **urgencia**, **prueba social**.
- **CTA**: presente, **específico**, **visible**, **verbo de acción**.
- **Tono**: coherente con **sector** y **audiencia** (B2B, B2C, técnico, emocional).
- **Score global <70** → **reescritura automática**; **>90** → badge **"Content Elite"**.
- **Benchmark**: comparar vs **top 10 competidores** del sector en SERP.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- Contenido a evaluar: ${draft}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runContentScoreAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ContentScoreInput,
  temperature: number,
): Promise<ContentScoreOutput> {
  const prompt = buildContentScorePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseContentScoreLlmJson(raw, agentId);
  const out: ContentScoreOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultContentScoreLlm(): ILlmClient {
  return LlmClient.getInstance();
}

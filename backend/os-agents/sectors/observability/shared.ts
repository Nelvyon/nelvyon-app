import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ObservabilityInput {
  userId: string;
  sector: string;
  brand: string;
  environmentBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface ObservabilityOutput {
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

export function parseObservabilityLlmJson(raw: string, label: string): Omit<ObservabilityOutput, "agentId"> {
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

export function buildObservabilityPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ObservabilityInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const env = params.input.environmentBrief?.trim() ? params.input.environmentBrief.trim() : "producción NELVYON OS";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

OBSERVABILIDAD COMPLETA NELVYON OS (v1):
- **Prefijo agentes**: **Observability**; trazas, logs, métricas y auditoría unificados.
- **SLOs**: latencia **p95 < 2s**, **error rate < 0.5%**, **uptime > 99.9%**.
- **Alertas críticas**: **error rate > 1%** → **Slack + email inmediato**; **latencia p95 > 3s** → **alerta warning**.
- **Coste por ejecución**: **microsegundos** + **tokens** + **€**; **budget alert** si supera **80%** del límite del plan.
- **Retención**: logs **error 90 días**, logs **info 30 días**, **métricas agregadas 12 meses** (hot **30d** / cold **90d** donde aplique).
- **Trazas agente**: latencia, tokens, coste por ejecución; **auditoría LLM** (prompt, response, tokens, coste).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / tenant: ${params.input.brand}
- Entorno / stack: ${env}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runObservabilityAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ObservabilityInput,
  temperature: number,
): Promise<ObservabilityOutput> {
  const prompt = buildObservabilityPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseObservabilityLlmJson(raw, agentId);
  const out: ObservabilityOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultObservabilityLlm(): ILlmClient {
  return LlmClient.getInstance();
}

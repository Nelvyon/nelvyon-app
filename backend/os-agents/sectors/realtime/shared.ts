import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface RealtimeInput {
  userId: string;
  sector: string;
  brand: string;
  streamBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface RealtimeOutput {
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

export function parseRealtimeLlmJson(raw: string, label: string): Omit<RealtimeOutput, "agentId"> {
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

export function buildRealtimePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: RealtimeInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const stream = params.input.streamBrief?.trim() ? params.input.streamBrief.trim() : "inferir desde sector";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

DATOS EN TIEMPO REAL NELVYON OS (v1):
- **Prefijo agentes**: **Realtime**; streams, eventos y acciones sub-segundo.
- **Latencia máxima** procesamiento evento: **<500ms**.
- **Dashboard refresh**: cada **30 segundos** automático.
- **Spike detection**: **+200% tráfico en 5 min** → **alerta inmediata** + **escala automática**.
- **Personalización live**: si usuario **>2 min sin convertir** → **oferta personalizada** automática.
- **Segmentos dinámicos**: **hot lead** (3+ páginas), **abandonando** (inactivo 30s checkout), **VIP** (LTV >500€).
- **Eventos**: clicks, vistas, compras, sesiones; triggers y alertas instantáneas.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / tenant: ${params.input.brand}
- Stream / fuente: ${stream}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runRealtimeAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: RealtimeInput,
  temperature: number,
): Promise<RealtimeOutput> {
  const prompt = buildRealtimePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseRealtimeLlmJson(raw, agentId);
  const out: RealtimeOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultRealtimeLlm(): ILlmClient {
  return LlmClient.getInstance();
}

import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface WorkflowInput {
  userId: string;
  sector: string;
  brand: string;
  workflowBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowOutput {
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

export function parseWorkflowLlmJson(raw: string, label: string): Omit<WorkflowOutput, "agentId"> {
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

export function buildWorkflowPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: WorkflowInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const wf = params.input.workflowBrief?.trim() ? params.input.workflowBrief.trim() : "inferir desde sector";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

WORKFLOW MULTI-PASO NELVYON OS (v1):
- **Prefijo agentes**: **Workflow**; motor automático multi-paso con **estado persistente**.
- **Máximo 50 pasos** por workflow; **reintentos automáticos**: **3 intentos** con **backoff exponencial**.
- **Templates por sector**:
  - **Onboarding** (8 pasos): registro → activación → primer resultado → milestone → upsell.
  - **Nurturing B2B** (12 pasos): lead → educación → demo → propuesta → cierre.
  - **Churn rescue** (5 pasos): detección → email → oferta → llamada → cancelación gestionada.
  - **Upsell automático** (4 pasos): trigger → propuesta → seguimiento → activación.
- **Condiciones**: **if/else**, **switch**, **loops** automáticos.
- **Triggers**: **evento**, **schedule**, **webhook**, **manual**.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- Workflow / objetivo: ${wf}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runWorkflowAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: WorkflowInput,
  temperature: number,
): Promise<WorkflowOutput> {
  const prompt = buildWorkflowPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseWorkflowLlmJson(raw, agentId);
  const out: WorkflowOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultWorkflowLlm(): ILlmClient {
  return LlmClient.getInstance();
}

import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ApolloInput {
  userId: string;
  sector: string;
  brand: string;
  verticalBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface ApolloOutput {
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

export function parseApolloLlmJson(raw: string, label: string): Omit<ApolloOutput, "agentId"> {
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

export function buildApolloPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ApolloInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const vb = params.input.verticalBrief?.trim() ? params.input.verticalBrief.trim() : "inferir desde sector";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

INTEGRACIÓN APOLLO.IO NELVYON (v1):
- **API Apollo.io (API Key)** — prefijo **Apollo**, rotación, scopes mínimos, nunca exponer en cliente.
- **Secuencias outreach multicanal (5 pasos)**: **email D1** → **LinkedIn D3** → **email D5** → **llamada D8** → **email D12**.
- **KPIs objetivo**: **reply rate > 8%**; **meeting booked rate > 2%**; pipeline atribuible a secuencias.
- **Personalización email**: **nombre**, **empresa**, **sector**, **pain point** específico por prospecto.
- **Buyer intent (0–100)**: visitas web + búsquedas + interacciones LinkedIn ponderadas.
- **Prospecto / enriquecimiento**: filtros por sector, cargo, empresa, país; email, LinkedIn, teléfono, empresa.
- **Sync CRM NELVYON**: prospectos, estados de secuencia y resultados de outreach.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / workspace Apollo: ${params.input.brand}
- Vertical / ICP: ${vb}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runApolloAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ApolloInput,
  temperature: number,
): Promise<ApolloOutput> {
  const prompt = buildApolloPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseApolloLlmJson(raw, agentId);
  const out: ApolloOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultApolloLlm(): ILlmClient {
  return LlmClient.getInstance();
}

import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface CdpInput {
  userId: string;
  sector: string;
  brand: string;
  cdpBrief?: string;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface CdpOutput {
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

export function parseCdpLlmJson(raw: string, label: string): Omit<CdpOutput, "agentId"> {
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

export function buildCdpPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: CdpInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const cdpCtx = params.input.cdpBrief?.trim() ? params.input.cdpBrief.trim() : "inferir desde sector";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

CDP + IDENTITY RESOLUTION NELVYON OS (v1):
- **Prefijo agentes**: **CDP**; plataforma de datos de cliente e identidad.
- **Identity resolution accuracy >95%** cross-device.
- **Perfil unificado <2 s**; **segmentos dinámicos RT <1 min**.
- **Sync audiencias ads <5 min** (Meta, Google, TikTok, LinkedIn).
- **Consentimiento GDPR 100% automático**; **lookalikes IA <10 min**.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector cliente: ${params.input.sector}
- Marca / tenant: ${params.input.brand}
- CDP / contexto: ${cdpCtx}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runCdpAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: CdpInput,
  temperature: number,
): Promise<CdpOutput> {
  const prompt = buildCdpPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseCdpLlmJson(raw, agentId);
  const out: CdpOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultCdpLlm(): ILlmClient {
  return LlmClient.getInstance();
}

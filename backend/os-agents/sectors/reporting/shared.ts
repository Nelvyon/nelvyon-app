import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ReportingInput {
  userId: string;
  sector: string;
  clientName: string;
  period: string;
  metrics: Record<string, string>;
  brandColor?: string;
}

export interface ReportingOutput {
  agentId: string;
  content: string;
  score: number;
  sections: string[];
  highlights: string[];
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

/** Informes branded: gpt-4.1, 3000 tokens, temperatura baja para tono ejecutivo. */
export function llmOpts(agentId: string, temperature = 0.2): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 3000,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseReportingLlmJson(raw: string, label: string): Omit<ReportingOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; sections?: unknown; highlights?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const sec = p.sections;
  const sections = Array.isArray(sec)
    ? sec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const hi = p.highlights;
  const highlights = Array.isArray(hi)
    ? hi.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, sections, highlights };
}

export function buildClarityPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ReportingInput;
}): string {
  const metricsJson = JSON.stringify(params.input.metrics);
  const color = params.input.brandColor?.trim() ? params.input.brandColor.trim() : "marca (inferir neutro profesional)";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK CLARITY (top 1%):
- **Context**: situación del cliente, período y mercado; sin datos inventados fuera de metrics.
- **Lens**: cómo leer las métricas (qué importa y qué es ruido).
- **Action**: qué se hizo y qué implica para la siguiente iteración.
- **Results**: resultados cuantitativos/cualitativos alineados al brief.
- **Impact**: traducción a negocio (ingresos, eficiencia, riesgo).
- **Track**: qué vigilar en el próximo ciclo y cómo medirlo.
- **You**: tono hacia el cliente final del PDF (claro, premium, sin jerga vacía).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Cliente / marca informe: ${params.input.clientName}
- Período: ${params.input.period}
- Color marca (PDF): ${color}
- Métricas (clave/valor): ${metricsJson}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"texto listo para pegar en bloque del PDF (español salvo brief)","score":0-100,"sections":["títulos cortos de secciones sugeridas"],"highlights":["bullets de alto impacto para portada o Executive Summary"]}`;
}

export async function runReportingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ReportingInput,
): Promise<ReportingOutput> {
  const prompt = buildClarityPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, 0.2));
  const parsed = parseReportingLlmJson(raw, agentId);
  const out: ReportingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* tests sin DB */
  }
  return out;
}

export function getDefaultReportingLlm(): ILlmClient {
  return LlmClient.getInstance();
}

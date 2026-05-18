import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface InvestigadorInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface InvestigadorOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const investigadorLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.3,
  maxTokens: 2000,
};

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

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseInvestigadorLlmJson(raw: string, label: string): Omit<InvestigadorOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const INVESTIGADOR_OS_RULES = `INVESTIGADOR DE MERCADO NELVYON OS (v1):
- Investigación de mercado **automática y profunda** (fuentes citables, sesgo, fecha de corte, límites legales scraping).
- Análisis de **competidores en tiempo real** (precios, ofertas, posicionamiento; verificación cruzada; no difamación).
- **Tendencias de sector** por país/región (macro, regulación, estacionalidad, señales débiles vs fuertes).
- Análisis de **audiencia objetivo** (demografía, comportamiento, pain points; privacidad; evitar inferencias prohibidas).
- Identificación de **oportunidades de mercado** (white space, riesgos, dependencias, ventana de entrada).
- Análisis de **keywords y demanda SEO/SEM** (intención, cannibalización, SERP features, estacionalidad búsqueda).
- **Benchmarking de precios** automático (cesta comparable, promos, T&C, moneda e impuestos).
- **Reportes de inteligencia competitiva semanales** (KPIs, deltas, alertas, fuente y confianza por hallazgo).`;

export function buildInvestigadorPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: InvestigadorInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${INVESTIGADOR_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio / unidad: ${params.input.businessName}
- Datos / fuentes: ${services}
- Horizonte / mercados: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runInvestigadorAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: InvestigadorInput,
): Promise<InvestigadorOutput> {
  const prompt = buildInvestigadorPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, investigadorLlmOpts);
  const parsed = parseInvestigadorLlmJson(raw, agentId);
  const out: InvestigadorOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "investigador", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultInvestigadorLlm(): ILlmClient {
  return LlmClient.getInstance();
}

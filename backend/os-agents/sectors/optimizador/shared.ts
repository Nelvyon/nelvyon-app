import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface OptimizadorInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface OptimizadorOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const optimizadorLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.3,
  maxTokens: 1500,
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

export function parseOptimizadorLlmJson(raw: string, label: string): Omit<OptimizadorOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const OPTIMIZADOR_OS_RULES = `OPTIMIZADOR CONTINUO NELVYON OS (v1):
- Optimización continua y autónoma de todas las campañas activas del cliente (prioridades, guardrails, compliance anuncios).
- Ajuste automático de presupuestos por ROI en tiempo real (umbrales, pacing, límites de gasto, rollback si degradación).
- Pausar/activar anuncios por rendimiento (CTR, CPA, ROAS; falsos positivos; cooldowns).
- Reescritura automática de copies que bajan de CTR umbral (variantes A/B, tono de marca, límites legales sector).
- Redistribución de inversión entre canales por performance (atribución, saturación, correlaciones).
- A/B testing continuo sin intervención humana (muestreo, significancia práctica, parada temprana).
- Reportes de optimización semanales automáticos (insights ejecutivos, deltas, riesgos).
- Aprendizaje acumulativo por sector y tipo de cliente (memoria outcomes, políticas de reutilización).`;

export function buildOptimizadorPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: OptimizadorInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${OPTIMIZADOR_OS_RULES}

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

export async function runOptimizadorAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: OptimizadorInput,
): Promise<OptimizadorOutput> {
  const prompt = buildOptimizadorPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, optimizadorLlmOpts);
  const parsed = parseOptimizadorLlmJson(raw, agentId);
  const out: OptimizadorOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "optimizador", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultOptimizadorLlm(): ILlmClient {
  return LlmClient.getInstance();
}

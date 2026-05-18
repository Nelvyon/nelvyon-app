import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface GrowthHackingInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface GrowthHackingOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const growthHackingLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.6,
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

export function parseGrowthHackingLlmJson(raw: string, label: string): Omit<GrowthHackingOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const GROWTH_HACKING_OS_RULES = `GROWTH HACKING AUTOMÁTICO NELVYON OS (v1):
- **Identificación automática de canales** con mayor ROI por sector (supuestos, datos mínimos, riesgo de atribución).
- **Experimentos rápidos** en sprints de 2 semanas (hipótesis, métrica guardián, rollback, ética).
- **Viral loops y referral** automáticos (incentivos, fraude, compliance, transparencia).
- **Optimización de onboarding** para máxima activación (time-to-value, checklist, drop-off).
- **Retención semana 1 / mes 1** (cadencias, triggers, churn temprano, dark patterns prohibidos).
- **Expansión de revenue** por cliente (upsell/cross-sell automático; límites MAP y confianza).
- **Análisis de adquisición** y **redistribución de budget** (marginal ROI, saturación, experimentación).
- **Playbooks de crecimiento** por industria (plantillas, riesgos regulatorios, revisión humana legal).`;

export function buildGrowthHackingPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: GrowthHackingInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${GROWTH_HACKING_OS_RULES}

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

export async function runGrowthHackingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: GrowthHackingInput,
): Promise<GrowthHackingOutput> {
  const prompt = buildGrowthHackingPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, growthHackingLlmOpts);
  const parsed = parseGrowthHackingLlmJson(raw, agentId);
  const out: GrowthHackingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "growthhacking", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultGrowthHackingLlm(): ILlmClient {
  return LlmClient.getInstance();
}

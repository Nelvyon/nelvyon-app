import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface SlaInput {
  userId: string;
  sector: string;
  incidentType: string;
  downtimeMinutes?: number;
  affectedFeatures?: string[];
  planType?: string;
}

export interface SlaOutput {
  agentId: string;
  content: string;
  score: number;
  compensationOffer: string;
  communications: string[];
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

export function llmOpts(agentId: string): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature: 0.2,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseSlaLlmJson(raw: string, label: string): Omit<SlaOutput, "agentId"> {
  const p = parseJson<{
    content?: unknown;
    score?: unknown;
    compensationOffer?: unknown;
    communications?: unknown;
  }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const compensationOffer =
    typeof p.compensationOffer === "string" ? p.compensationOffer : String(p.compensationOffer ?? "");
  const c = p.communications;
  const communications = Array.isArray(c)
    ? c.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, compensationOffer, communications };
}

export function buildResolvePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: SlaInput;
}): string {
  const down =
    typeof params.input.downtimeMinutes === "number" && Number.isFinite(params.input.downtimeMinutes)
      ? String(params.input.downtimeMinutes)
      : "no indicado";
  const feats =
    params.input.affectedFeatures?.length && params.input.affectedFeatures.length > 0
      ? params.input.affectedFeatures.join(", ")
      : "no indicado";
  const plan = params.input.planType?.trim() ? params.input.planType.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK RESOLVE (top 1% incident response + SLA):
- **Recognize**: reconocer impacto, alcance y severidad con datos del brief.
- **Escalate**: escalar con claridad de roles, tiempos y canales.
- **Solve**: acciones inmediatas de mitigación y comunicación al cliente.
- **Own**: asumir responsabilidad donde corresponde; transparencia sin culpar usuarios.
- **Learn**: aprendizajes y cambios para reducir recurrencia.
- **Verify**: verificación post-fix y monitoreo de regresiones.
- **Ensure**: asegurar cumplimiento contractual y compensación alineada a política.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Tipo incidente: ${params.input.incidentType}
- Minutos caídos / degradación: ${down}
- Features afectadas: ${feats}
- Plan contratado: ${plan}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"compensationOffer":"oferta o cálculo de compensación (o N/A si no aplica)","communications":["piezas de comunicación al cliente o internas"]}`;
}

export async function runSlaAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: SlaInput,
): Promise<SlaOutput> {
  const prompt = buildResolvePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId));
  const parsed = parseSlaLlmJson(raw, agentId);
  const out: SlaOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultSlaLlm(): ILlmClient {
  return LlmClient.getInstance();
}

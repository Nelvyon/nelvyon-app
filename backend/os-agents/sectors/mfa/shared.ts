import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type MfaMethod = "totp" | "sms" | "email" | "backup";
export type MfaRiskLevel = "low" | "medium" | "high";

export interface MfaInput {
  userId: string;
  sector: string;
  userEmail: string;
  mfaMethod?: MfaMethod;
  riskLevel?: MfaRiskLevel;
}

export interface MfaOutput {
  agentId: string;
  content: string;
  score: number;
  instructions: string[];
  securityTips: string[];
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
    temperature: 0.1,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseMfaLlmJson(raw: string, label: string): Omit<MfaOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; instructions?: unknown; securityTips?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const ins = p.instructions;
  const instructions = Array.isArray(ins)
    ? ins.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const st = p.securityTips;
  const securityTips = Array.isArray(st)
    ? st.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, instructions, securityTips };
}

export function buildSecurePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: MfaInput;
}): string {
  const method = params.input.mfaMethod ?? "no indicado (elige según brief)";
  const risk = params.input.riskLevel ?? "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK SECURE (top 1% MFA / acceso):
- **Scan**: inventario de superficie de ataque y factores de riesgo relevantes al sector.
- **Evaluate**: criterios objetivos para método MFA, políticas y controles.
- **Control**: controles técnicos y organizativos (sin prometer cifras no verificables).
- **Understand**: claridad para el usuario final; sin jerga innecesaria.
- **Respond**: procedimientos ante incidentes o pérdida de factor.
- **Enforce**: cumplimiento, auditoría y revisión periódica.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Email de usuario (identificador en brief, no para envío real desde este agente): ${params.input.userEmail}
- Método MFA preferido o en evaluación: ${method}
- Nivel de riesgo declarado: ${risk}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"instructions":["pasos o requisitos accionables en orden"],"securityTips":["recomendaciones breves tipo chip"]}`;
}

export async function runMfaAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: MfaInput,
): Promise<MfaOutput> {
  const prompt = buildSecurePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId));
  const parsed = parseMfaLlmJson(raw, agentId);
  const out: MfaOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultMfaLlm(): ILlmClient {
  return LlmClient.getInstance();
}

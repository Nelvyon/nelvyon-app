import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface DemoInput {
  userId: string;
  sector: string;
  visitorType?: string;
  useCase?: string;
  companySize?: string;
  painPoint?: string;
}

export interface DemoOutput {
  agentId: string;
  content: string;
  score: number;
  demoSteps: string[];
  ctaMessages: string[];
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

export function parseDemoLlmJson(raw: string, label: string): Omit<DemoOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; demoSteps?: unknown; ctaMessages?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const ds = p.demoSteps;
  const demoSteps = Array.isArray(ds)
    ? ds.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const cta = p.ctaMessages;
  const ctaMessages = Array.isArray(cta)
    ? cta.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, demoSteps, ctaMessages };
}

export function buildShowPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: DemoInput;
}): string {
  const visitor = params.input.visitorType?.trim() ? params.input.visitorType.trim() : "visitante genérico";
  const useCase = params.input.useCase?.trim() ? params.input.useCase.trim() : "no indicado";
  const size = params.input.companySize?.trim() ? params.input.companySize.trim() : "no indicado";
  const pain = params.input.painPoint?.trim() ? params.input.painPoint.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK SHOW (top 1% demo sin registro):
- **Scenario**: contexto del visitante y momento de la jornada sin fricción.
- **Hook**: apertura que genera curiosidad y claridad de valor en segundos.
- **Outcome**: resultado tangible que el visitante “siente” en la demo.
- **Win**: siguiente paso claro (CTA) alineado al perfil, sin presión agresiva.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Tipo visitante: ${visitor}
- Caso de uso: ${useCase}
- Tamaño empresa: ${size}
- Pain point: ${pain}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"demoSteps":["pasos de la demo"],"ctaMessages":["mensajes CTA contextuales"]}`;
}

export async function runDemoAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: DemoInput,
  temperature: number,
): Promise<DemoOutput> {
  const prompt = buildShowPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseDemoLlmJson(raw, agentId);
  const out: DemoOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultDemoLlm(): ILlmClient {
  return LlmClient.getInstance();
}

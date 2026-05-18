import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface BadgesInput {
  userId: string;
  sector: string;
  productName: string;
  userActivity?: Record<string, string>;
  currentLevel?: string;
}

export interface BadgesOutput {
  agentId: string;
  content: string;
  score: number;
  badges: string[];
  milestones: string[];
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

export function parseBadgesLlmJson(raw: string, label: string): Omit<BadgesOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; badges?: unknown; milestones?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const b = p.badges;
  const badges = Array.isArray(b)
    ? b.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const m = p.milestones;
  const milestones = Array.isArray(m)
    ? m.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, badges, milestones };
}

export function buildAchievePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: BadgesInput;
}): string {
  const level = params.input.currentLevel?.trim() ? params.input.currentLevel.trim() : "no indicado";
  const activity =
    params.input.userActivity && Object.keys(params.input.userActivity).length > 0
      ? JSON.stringify(params.input.userActivity, null, 0)
      : "no proporcionada";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK ACHIEVE (top 1% gamificación ética):
- **Aspire**: aspiración clara y alcanzable sin manipulación oscura.
- **Challenge**: dificultad progresiva y feedback justo.
- **Hook**: momentos de “casi lo logro” que invitan a continuar.
- **Inspire**: narrativa de progreso y pertenencia.
- **Engage**: bucles sociales, reconocimiento y utilidad real.
- **Victory**: celebración de logros con significado.
- **Evolve**: evolución de metas y anti-estancamiento.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Producto: ${params.input.productName}
- Nivel actual usuario: ${level}
- Actividad (mapa clave→valor): ${activity}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"badges":["badges o piezas"],"milestones":["hitos o criterios"]}`;
}

export async function runBadgesAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: BadgesInput,
  temperature: number,
): Promise<BadgesOutput> {
  const prompt = buildAchievePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseBadgesLlmJson(raw, agentId);
  const out: BadgesOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultBadgesLlm(): ILlmClient {
  return LlmClient.getInstance();
}

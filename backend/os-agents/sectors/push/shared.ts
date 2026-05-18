import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type PushPlatform = "ios" | "android" | "both";

export interface PushInput {
  userId: string;
  sector: string;
  brand: string;
  triggerEvent: string;
  userSegment?: string;
  platform?: PushPlatform;
}

export interface PushOutput {
  agentId: string;
  content: string;
  score: number;
  notifications: string[];
  deepLinks: string[];
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

export function parsePushLlmJson(raw: string, label: string): Omit<PushOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; notifications?: unknown; deepLinks?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const n = p.notifications;
  const notifications = Array.isArray(n)
    ? n.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const d = p.deepLinks;
  const deepLinks = Array.isArray(d)
    ? d.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, notifications, deepLinks };
}

export function buildNotifyPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PushInput;
}): string {
  const platform = params.input.platform ?? "both";
  const segment = params.input.userSegment?.trim() ? params.input.userSegment.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK NOTIFY (top 1% push móvil):
- **Need**: necesidad del usuario o del negocio que justifica el ping.
- **Opportunity**: momento o ventana para maximizar apertura sin ser intrusivo.
- **Target**: audiencia/segmento y plataforma (iOS/Android) con reglas de tono.
- **Instant**: timing y cadencia sugerida (sin spam; respeta opt-in).
- **Focus**: mensaje único por notificación; sin wall of text.
- **Yield**: resultado esperado (acción, CTR, retorno a la app).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Evento / disparador: ${params.input.triggerEvent}
- Segmento de usuario: ${segment}
- Plataforma: ${platform}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"notifications":["textos de push listos o variantes A/B"],"deepLinks":["esquemas o rutas deep link sugeridas"]}`;
}

export async function runPushAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PushInput,
  temperature: number,
): Promise<PushOutput> {
  const prompt = buildNotifyPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parsePushLlmJson(raw, agentId);
  const out: PushOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPushLlm(): ILlmClient {
  return LlmClient.getInstance();
}

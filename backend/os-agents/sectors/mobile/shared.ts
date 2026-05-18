import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export type MobilePlatform = "ios" | "android" | "both";

export interface MobileInput {
  userId: string;
  sector: string;
  appName: string;
  platform: MobilePlatform;
  targetAudience: string;
  appGoal?: string;
}

export interface MobileOutput {
  agentId: string;
  content: string;
  score: number;
  screens: string[];
  features: string[];
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
    maxTokens: 2500,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseMobileLlmJson(raw: string, label: string): Omit<MobileOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; screens?: unknown; features?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const s = p.screens;
  const screens = Array.isArray(s)
    ? s.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const f = p.features;
  const features = Array.isArray(f)
    ? f.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, screens, features };
}

export function buildInstallPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: MobileInput;
}): string {
  const appGoal = params.input.appGoal?.trim()
    ? params.input.appGoal.trim()
    : "no indicado (explicitar supuestos razonables)";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK INSTALL (top 1% mobile growth):
- **Intent**: intención del usuario y objetivo de negocio alineados.
- **Navigation**: flujo y jerarquía de pantallas sin fricción.
- **Sticky**: hábitos, valor recurrente y motivación para volver.
- **Trial**: onboarding y primeros éxitos rápidos (time-to-value).
- **Activate**: activación de features clave y permisos con contexto.
- **Loop**: bucles de engagement, notificaciones y feedback medible.
- **Launch**: despliegue, ASO, deep links y experimentación.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- App: ${params.input.appName}
- Plataforma: ${params.input.platform}
- Audiencia: ${params.input.targetAudience}
- Objetivo app: ${appGoal}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"screens":["pantallas o pasos"],"features":["features o tácticas"]}`;
}

export async function runMobileAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: MobileInput,
  temperature: number,
): Promise<MobileOutput> {
  const prompt = buildInstallPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseMobileLlmJson(raw, agentId);
  const out: MobileOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultMobileLlm(): ILlmClient {
  return LlmClient.getInstance();
}

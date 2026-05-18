import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface SocialInput {
  userId: string;
  sector: string;
  brand: string;
  platforms: string[];
  targetAudience: string;
  tone?: string;
  campaignGoal?: string;
}

export interface SocialOutput {
  agentId: string;
  content: string;
  score: number;
  posts: string[];
  hashtags: string[];
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

export function llmOpts(agentId: string, temperature = 0.7): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2500,
    temperature,
  };
}

/** Copy/creative → 0.7; crisis / competencia / analytics narrativa → 0.2 */
export function socialTemperature(agentId: string): number {
  const id = agentId.toLowerCase();
  if (id.includes("crisis") || id.includes("competitor") || id.includes("analytics-narrator")) {
    return 0.2;
  }
  return 0.7;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseSocialLlmJson(raw: string, label: string): Omit<SocialOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; posts?: unknown; hashtags?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const po = p.posts;
  const posts = Array.isArray(po)
    ? po.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const ht = p.hashtags;
  const hashtags = Array.isArray(ht)
    ? ht.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, posts, hashtags };
}

export function buildEngagePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: SocialInput;
}): string {
  const plats = params.input.platforms.length > 0 ? params.input.platforms.join(", ") : "inferir por sector";
  const tone = params.input.tone?.trim() ? params.input.tone.trim() : "marca auténtica y consistente";
  const goal = params.input.campaignGoal?.trim()
    ? params.input.campaignGoal.trim()
    : "no indicado (explicitar supuestos)";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK ENGAGE (top 1%):
- **Emotion**: resonancia emocional sin manipulación tóxica; tono acorde a marca y plataforma.
- **Narrative**: hilo coherente (gancho, desarrollo, CTA / siguiente paso).
- **Goal**: alineación explícita con objetivo de negocio y funnel.
- **Action**: micro-acciones claras (guardar, comentar, clic bio, DM keyword).
- **Growth**: cómo escalar o iterar el formato sin quemar la audiencia.
- **Evaluate**: qué métrica mirar y qué harías si falla.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Plataformas: ${plats}
- Audiencia: ${params.input.targetAudience}
- Tono: ${tone}
- Objetivo campaña: ${goal}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown).
posts = lista de piezas de contenido (post completo o outline por ítem según agente).
hashtags = lista de hashtags sugeridos (sin # repetido en JSON si prefieres omitir #).
{"content":"contexto o briefing maestro en español salvo brief","score":0-100,"posts":["..."],"hashtags":["..."]}`;
}

export async function runSocialAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: SocialInput,
): Promise<SocialOutput> {
  const prompt = buildEngagePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, socialTemperature(agentId)));
  const parsed = parseSocialLlmJson(raw, agentId);
  const out: SocialOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultSocialLlm(): ILlmClient {
  return LlmClient.getInstance();
}

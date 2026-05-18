import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface VideoMarketingInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface VideoMarketingOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const videoMarketingLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.5,
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

export function parseVideoMarketingLlmJson(raw: string, label: string): Omit<VideoMarketingOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const VIDEO_MARKETING_OS_RULES = `VIDEO MARKETING IA NELVYON OS (v1):
- Vídeos publicitivos con pipeline Runway Gen-3 + Kling (plan de shots, continuidad, disclaimers de marca y derechos).
- Presentador IA HeyGen v3 premium (guion cámara, tono, lip-sync cauteloso, fallback voz-off).
- Voz en off ElevenLabs (casting de voz, SSML ligero, loudness broadcast -14 LUFS orientativo).
- Música original Suno v4 (stem strategy, loop-friendly, licencias resumidas en brief).
- Subtítulos automáticos Whisper (segmentación, safe area 9:16, export SRT/VTT).
- Formatos: 16:9 YouTube, 9:16 Reels+TikTok, 1:1 feed (reframe seguro, títulos safe zones).
- Adaptación por sector y audiencia (hooks, CTA, compliance sectorial genérico).
- Thumbnails IA optimizados CTR (contraste, rostro/producto, A/B sugerido).
- Guión automático GPT-4o (estructura AIDA/Story, supers, duración objetivo).
- Edición multicapa (LUT suave, motion graphics, brand kit).
- Distribución a plataformas conectadas (metadata, hashtags, scheduling cauteloso).`;

export function buildVideoMarketingPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: VideoMarketingInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${VIDEO_MARKETING_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / stack: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runVideoMarketingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: VideoMarketingInput,
): Promise<VideoMarketingOutput> {
  const prompt = buildVideoMarketingPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, videoMarketingLlmOpts);
  const parsed = parseVideoMarketingLlmJson(raw, agentId);
  const out: VideoMarketingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "videomarketing", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultVideoMarketingLlm(): ILlmClient {
  return LlmClient.getInstance();
}

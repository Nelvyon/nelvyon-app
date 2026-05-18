import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient, LlmOptions } from "./LlmClient";
import { LLM_DEFAULT_MODEL, LLM_DEFAULT_MAX_TOKENS, LlmClient } from "./LlmClient";
import {
  GenerativeClient,
  type GenerativeResult,
  type ImageGenerationOptions,
} from "./generative/GenerativeClient";

export type VideoPlatform = "youtube" | "tiktok" | "instagram" | "linkedin";

export type VideoEnhancementType = "script" | "thumbnail" | "subtitles";

export type EnhanceScriptInput = {
  originalScript: string;
  platform: VideoPlatform;
  targetDuration?: number;
  tone?: string;
};

export type EnhanceScriptResult = {
  enhancedScript: string;
  hooks: string[];
  callToAction: string;
  suggestedHashtags: string[];
  shortVersion: string;
};

export type ThumbnailInput = {
  title: string;
  platform: string;
  style?: string;
  brandColors?: string[];
};

export type ThumbnailResult = {
  imageUrl: string;
  prompt: string;
};

export type SubtitleSegment = {
  start: number;
  end: number;
  text: string;
};

export type SubtitlesResult = {
  srt: string;
  segments: SubtitleSegment[];
};

export type VideoEnhancementRecord = {
  id: string;
  userId: string;
  type: VideoEnhancementType;
  input: unknown;
  result: unknown;
  createdAt: string;
};

export type VideoEnhancerAgentDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
  generateImage?: (
    prompt: string,
    options?: ImageGenerationOptions,
  ) => Promise<GenerativeResult>;
};

const SCRIPT_TEMPERATURE = 0.7;
const SUBTITLES_TEMPERATURE = 0.1;

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function secondsToSrtTime(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) totalSec = 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const ms = Math.min(999, Math.round((totalSec - Math.floor(totalSec)) * 1000));
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms).padStart(3, "0")}`;
}

function buildSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((seg, i) => {
      const n = i + 1;
      return `${n}\n${secondsToSrtTime(seg.start)} --> ${secondsToSrtTime(seg.end)}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

function parseEnhanceScriptJson(raw: string): EnhanceScriptResult {
  const payload = extractJsonPayload(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("enhanceScript: respuesta no es JSON válido");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("enhanceScript: JSON inválido");
  }
  const o = parsed as Record<string, unknown>;
  const enhancedScript = typeof o.enhancedScript === "string" ? o.enhancedScript : "";
  const callToAction = typeof o.callToAction === "string" ? o.callToAction : "";
  const shortVersion = typeof o.shortVersion === "string" ? o.shortVersion : "";
  const hooks = Array.isArray(o.hooks) ? o.hooks.map((h) => String(h)) : [];
  const suggestedHashtags = Array.isArray(o.suggestedHashtags)
    ? o.suggestedHashtags.map((h) => String(h))
    : [];
  return { enhancedScript, hooks, callToAction, suggestedHashtags, shortVersion };
}

function parseSubtitlesJson(raw: string): SubtitleSegment[] {
  const payload = extractJsonPayload(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("generateSubtitles: respuesta no es JSON válido");
  }
  let segments: unknown = parsed;
  if (typeof parsed === "object" && parsed !== null && "segments" in (parsed as object)) {
    segments = (parsed as Record<string, unknown>).segments;
  }
  if (!Array.isArray(segments)) {
    throw new Error("generateSubtitles: se esperaba un array de segmentos");
  }
  const out: SubtitleSegment[] = [];
  for (const item of segments) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const start = typeof r.start === "number" ? r.start : Number(r.start);
    const end = typeof r.end === "number" ? r.end : Number(r.end);
    const text = typeof r.text === "string" ? r.text : "";
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    out.push({ start, end, text });
  }
  if (out.length === 0) {
    throw new Error("generateSubtitles: no hay segmentos válidos");
  }
  return out;
}

function buildThumbnailPrompt(input: ThumbnailInput): string {
  const colors =
    input.brandColors && input.brandColors.length > 0
      ? `brand colors ${input.brandColors.join(", ")}`
      : "cohesive brand colors";
  const style = input.style?.trim() ? input.style.trim() : "cinematic, bold typography zone";
  return `Professional video thumbnail for "${input.title}", ${input.platform} platform, ${style}, ${colors}, 16:9 composition, high contrast, readable hero text area, eye-catching, no watermarks, ultra high quality`;
}

function llmScriptOpts(): LlmOptions {
  return {
    model: LLM_DEFAULT_MODEL,
    maxTokens: LLM_DEFAULT_MAX_TOKENS,
    temperature: SCRIPT_TEMPERATURE,
  };
}

function llmSubtitlesOpts(): LlmOptions {
  return {
    model: LLM_DEFAULT_MODEL,
    maxTokens: LLM_DEFAULT_MAX_TOKENS,
    temperature: SUBTITLES_TEMPERATURE,
  };
}

export class VideoEnhancerAgent {
  constructor(private readonly deps: VideoEnhancerAgentDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  private async invokeImage(prompt: string): Promise<{ url: string }> {
    const gen = this.deps.generateImage ?? GenerativeClient.generateImage.bind(GenerativeClient);
    return gen(prompt, { size: "1792x1024", quality: "hd" });
  }

  async enhanceScript(userId: string, input: EnhanceScriptInput): Promise<EnhanceScriptResult> {
    void userId;
    const dur =
      typeof input.targetDuration === "number" && Number.isFinite(input.targetDuration)
        ? `Target duration: ~${input.targetDuration} seconds.`
        : "";
    const tone = input.tone?.trim() ? `Tone: ${input.tone.trim()}.` : "";
    const prompt = `You are a senior video scriptwriter. Improve this script for ${input.platform}. ${dur} ${tone}

Original script:
"""
${input.originalScript}
"""

Respond with ONLY valid JSON (no markdown outside JSON) with this exact shape:
{
  "enhancedScript": string,
  "hooks": string[],
  "callToAction": string,
  "suggestedHashtags": string[],
  "shortVersion": string (15-45s vertical-style cutdown for Reels/TikTok; punchy)
}`;

    const raw = await this.llm.complete(prompt, llmScriptOpts());
    return parseEnhanceScriptJson(raw);
  }

  async generateThumbnail(userId: string, input: ThumbnailInput): Promise<ThumbnailResult> {
    void userId;
    const prompt = buildThumbnailPrompt(input);
    const res = await this.invokeImage(prompt);
    return { imageUrl: res.url, prompt };
  }

  async generateSubtitles(userId: string, transcript: string): Promise<SubtitlesResult> {
    void userId;
    const trimmed = transcript.trim();
    if (!trimmed) {
      throw new Error("generateSubtitles: transcript vacío");
    }
    const prompt = `You format transcripts into subtitle segments for video.

Transcript:
"""
${trimmed}
"""

Respond with ONLY valid JSON (no markdown outside JSON):
{
  "segments": [
    { "start": number (seconds, float), "end": number (seconds, float), "text": string }
  ]
}

Rules: chronological order, non-overlapping times, start < end, split long lines (~42 chars per line ideal), language unchanged.`;

    const raw = await this.llm.complete(prompt, llmSubtitlesOpts());
    const segments = parseSubtitlesJson(raw);
    const srt = buildSrt(segments);
    return { srt, segments };
  }

  async saveEnhancement(
    userId: string,
    type: VideoEnhancementType,
    input: unknown,
    result: unknown,
  ): Promise<VideoEnhancementRecord> {
    const rows = await this.db.query<VideoEnhancementRecord>(
      `INSERT INTO video_enhancements (user_id, type, input, result)
       VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)
       RETURNING id,
                 user_id AS "userId",
                 type,
                 input,
                 result,
                 created_at AS "createdAt"`,
      [userId, type, JSON.stringify(input ?? {}), JSON.stringify(result ?? {})],
    );
    const row = rows[0];
    if (!row) throw new Error("saveEnhancement: insert returned no row");
    return {
      ...row,
      type: row.type as VideoEnhancementType,
      createdAt:
        typeof row.createdAt === "string"
          ? row.createdAt
          : (row.createdAt as Date).toISOString(),
    };
  }

  async getEnhancements(userId: string): Promise<VideoEnhancementRecord[]> {
    const rows = await this.db.query<VideoEnhancementRecord>(
      `SELECT id,
              user_id AS "userId",
              type,
              input,
              result,
              created_at AS "createdAt"
       FROM video_enhancements
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((row) => ({
      ...row,
      type: row.type as VideoEnhancementType,
      createdAt:
        typeof row.createdAt === "string"
          ? row.createdAt
          : (row.createdAt as Date).toISOString(),
    }));
  }
}

let cachedVideoEnhancerAgent: VideoEnhancerAgent | undefined;

export function getVideoEnhancerAgent(): VideoEnhancerAgent {
  if (!cachedVideoEnhancerAgent) cachedVideoEnhancerAgent = new VideoEnhancerAgent();
  return cachedVideoEnhancerAgent;
}

export function resetVideoEnhancerAgentForTests(): void {
  cachedVideoEnhancerAgent = undefined;
}

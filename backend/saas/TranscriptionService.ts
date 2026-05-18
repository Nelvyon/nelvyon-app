import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LLM_DEFAULT_MAX_TOKENS, LLM_DEFAULT_MODEL, LlmClient } from "../os-agents/LlmClient";

export type TranscriptionContext = "meeting" | "podcast" | "interview" | "lecture" | "call";

export type TranscriptionInput = {
  audioUrl: string;
  language?: string;
  context?: TranscriptionContext;
};

export type TranscribeResult = {
  text: string;
  duration?: number;
  language: string;
};

export type AnalysisResult = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  speakers?: string[];
  sentiment: "positive" | "neutral" | "negative";
  duration_estimate: string;
  topics: string[];
};

export type TranscriptionRecord = {
  id: string;
  userId: string;
  audioUrl: string;
  language: string | null;
  context: TranscriptionContext;
  transcriptText: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  topics: string[];
  sentiment: string;
  durationEstimate: string;
  createdAt: string;
};

export type TranscriptionListItem = {
  id: string;
  context: TranscriptionContext;
  durationEstimate: string;
  preview: string;
  createdAt: string;
};

export type TranscriptionServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
  /** Override for tests; default uses OpenAI Whisper HTTP API. */
  transcribeFn?: (audioUrl: string, language?: string) => Promise<TranscribeResult>;
};

const ANALYSIS_TEMPERATURE = 0.2;

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function readStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

function normalizeSentiment(v: unknown): AnalysisResult["sentiment"] {
  if (v === "positive" || v === "negative" || v === "neutral") return v;
  return "neutral";
}

async function defaultWhisperTranscribe(audioUrl: string, language?: string): Promise<TranscribeResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY requerido para Whisper");
  }

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`No se pudo descargar el audio (${audioRes.status})`);
  }
  const buf = await audioRes.arrayBuffer();
  const ext = audioUrl.split(".").pop()?.split("?")[0]?.toLowerCase() || "mp3";
  const safeExt = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"].includes(ext) ? ext : "mp3";

  const form = new FormData();
  form.append("file", new Blob([buf]), `audio.${safeExt}`);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  if (language?.trim()) form.append("language", language.trim());

  const tr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  const raw = await tr.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Whisper respuesta inválida: ${raw.slice(0, 200)}`);
  }

  if (!tr.ok) {
    const err = typeof parsed.error === "object" && parsed.error && "message" in parsed.error
      ? String((parsed.error as { message?: string }).message)
      : raw.slice(0, 300);
    throw new Error(`Whisper error: ${err}`);
  }

  const text = typeof parsed.text === "string" ? parsed.text : "";
  const dur = typeof parsed.duration === "number" ? parsed.duration : undefined;
  const lang = typeof parsed.language === "string" ? parsed.language : language ?? "unknown";

  return { text, duration: dur, language: lang };
}

function parseAnalysisJson(raw: string): AnalysisResult {
  const payload = extractJsonPayload(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("analyzeTranscription: JSON inválido");
  }
  const o = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};

  const speakersRaw = o.speakers;
  const speakers = Array.isArray(speakersRaw) ? speakersRaw.map((s) => String(s)) : undefined;

  return {
    summary: typeof o.summary === "string" ? o.summary : "",
    keyPoints: readStringArray(o.keyPoints),
    actionItems: readStringArray(o.actionItems),
    decisions: readStringArray(o.decisions),
    speakers: speakers && speakers.length > 0 ? speakers : undefined,
    sentiment: normalizeSentiment(o.sentiment),
    duration_estimate: typeof o.duration_estimate === "string" ? o.duration_estimate : "",
    topics: readStringArray(o.topics),
  };
}

type TranscriptionDbRow = {
  id: string;
  user_id: string;
  audio_url: string;
  language: string | null;
  context: string;
  transcript_text: string;
  summary: string;
  key_points: unknown;
  action_items: unknown;
  decisions: unknown;
  topics: unknown;
  sentiment: string;
  duration_estimate: string;
  created_at: Date | string;
};

function mapRow(r: TranscriptionDbRow): TranscriptionRecord {
  return {
    id: r.id,
    userId: r.user_id,
    audioUrl: r.audio_url,
    language: r.language,
    context: (r.context as TranscriptionContext) || "meeting",
    transcriptText: r.transcript_text,
    summary: r.summary,
    keyPoints: readStringArray(r.key_points),
    actionItems: readStringArray(r.action_items),
    decisions: readStringArray(r.decisions),
    topics: readStringArray(r.topics),
    sentiment: r.sentiment,
    durationEstimate: r.duration_estimate,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  };
}

export class TranscriptionService {
  constructor(private readonly deps: TranscriptionServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  private get transcribe(): (audioUrl: string, language?: string) => Promise<TranscribeResult> {
    return this.deps.transcribeFn ?? defaultWhisperTranscribe;
  }

  async transcribeAudio(userId: string, audioUrl: string, language?: string): Promise<TranscribeResult> {
    void userId;
    return this.transcribe(audioUrl.trim(), language);
  }

  async analyzeTranscription(
    userId: string,
    text: string,
    context: TranscriptionContext = "meeting",
  ): Promise<AnalysisResult> {
    void userId;
    const ctxLabel: Record<TranscriptionContext, string> = {
      meeting: "reunión de trabajo",
      podcast: "episodio de podcast",
      interview: "entrevista",
      lecture: "clase o conferencia",
      call: "llamada comercial o de soporte",
    };

    const prompt = `Eres un analista senior de contenido. Analiza la siguiente transcripción (tipo: ${ctxLabel[context]}).
Genera un análisis ejecutivo de nivel élite en español.

TRANSCRIPCIÓN:
"""
${text.slice(0, 120_000)}
"""

Responde SOLO con JSON válido:
{
  "summary": "resumen ejecutivo conciso",
  "keyPoints": ["punto clave 1", "..."],
  "actionItems": ["acción concreta 1", "..."],
  "decisions": ["decisión tomada o propuesta", "..."],
  "speakers": ["opcional: nombres o roles si se infieren"],
  "sentiment": "positive" | "neutral" | "negative",
  "duration_estimate": "estimación legible, ej. ~30 minutos",
  "topics": ["tema 1", "tema 2"]
}`;

    const raw = await this.llm.complete(prompt, {
      model: LLM_DEFAULT_MODEL,
      maxTokens: LLM_DEFAULT_MAX_TOKENS,
      temperature: ANALYSIS_TEMPERATURE,
    });
    return parseAnalysisJson(raw);
  }

  async processTranscription(
    userId: string,
    audioUrl: string,
    language?: string,
    context: TranscriptionContext = "meeting",
  ): Promise<TranscriptionRecord> {
    const t = await this.transcribeAudio(userId, audioUrl, language);
    if (!t.text.trim()) throw new Error("Transcripción vacía");
    const analysis = await this.analyzeTranscription(userId, t.text, context);
    const input: TranscriptionInput = { audioUrl, language, context };
    return this.saveTranscription(userId, input, t, analysis);
  }

  async saveTranscription(
    userId: string,
    input: TranscriptionInput,
    transcriptionResult: TranscribeResult,
    analysisResult: AnalysisResult,
  ): Promise<TranscriptionRecord> {
    const ctx = input.context ?? "meeting";
    const rows = await this.db.query<TranscriptionDbRow>(
      `INSERT INTO transcriptions (
         user_id, audio_url, language, context, transcript_text,
         summary, key_points, action_items, decisions, topics,
         sentiment, duration_estimate
       )
       VALUES (
         $1::uuid, $2, $3, $4, $5,
         $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
         $11, $12
       )
       RETURNING id::text, user_id::text, audio_url, language, context, transcript_text,
                 summary, key_points, action_items, decisions, topics,
                 sentiment, duration_estimate, created_at`,
      [
        userId,
        input.audioUrl.trim(),
        input.language?.trim() || null,
        ctx,
        transcriptionResult.text,
        analysisResult.summary,
        JSON.stringify(analysisResult.keyPoints),
        JSON.stringify(analysisResult.actionItems),
        JSON.stringify(analysisResult.decisions),
        JSON.stringify(analysisResult.topics),
        analysisResult.sentiment,
        analysisResult.duration_estimate ||
          (typeof transcriptionResult.duration === "number"
            ? `~${Math.round(transcriptionResult.duration / 60)} min`
            : ""),
      ],
    );
    const r = rows[0];
    if (!r) throw new Error("saveTranscription: insert fallido");
    return mapRow(r);
  }

  async getTranscriptions(userId: string): Promise<TranscriptionListItem[]> {
    const rows = await this.db.query<{
      id: string;
      context: string;
      duration_estimate: string;
      summary: string;
      created_at: Date | string;
    }>(
      `SELECT id::text, context, duration_estimate, summary, created_at
       FROM transcriptions
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      context: (r.context as TranscriptionContext) || "meeting",
      durationEstimate: r.duration_estimate,
      preview: r.summary.trim().length > 180 ? `${r.summary.trim().slice(0, 180)}…` : r.summary.trim(),
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    }));
  }

  async getTranscription(transcriptionId: string, userId: string): Promise<TranscriptionRecord | null> {
    const rows = await this.db.query<TranscriptionDbRow>(
      `SELECT id::text, user_id::text, audio_url, language, context, transcript_text,
              summary, key_points, action_items, decisions, topics,
              sentiment, duration_estimate, created_at
       FROM transcriptions
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [transcriptionId, userId],
    );
    const r = rows[0];
    return r ? mapRow(r) : null;
  }
}

let cachedTranscriptionService: TranscriptionService | undefined;

export function getTranscriptionService(): TranscriptionService {
  if (!cachedTranscriptionService) cachedTranscriptionService = new TranscriptionService();
  return cachedTranscriptionService;
}

export function resetTranscriptionServiceForTests(): void {
  cachedTranscriptionService = undefined;
}

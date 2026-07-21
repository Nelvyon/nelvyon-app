import { privateModeFetch } from "../private-ai/privateMode";
import { getLocalAiConfig } from "./config";

export type OllamaChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type OllamaGenerateOptions = {
  temperature?: number;
  numPredict?: number;
  numCtx?: number;
  numGpu?: number;
  format?: "json" | undefined;
  seed?: number;
  /** Override default model for this call (task routing prototype). */
  model?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type OllamaChatResult = {
  content: string;
  model: string;
  evalCount?: number;
  promptEvalCount?: number;
  totalDurationNs?: number;
  truncated: boolean;
};

const DEFAULT_OPTS = {
  temperature: 0.15,
  numPredict: 2048,
  numCtx: 8192,
  numGpu: undefined as number | undefined,
  format: undefined as "json" | undefined,
  seed: 42,
};

export class OllamaClient {
  constructor(private readonly cfg = getLocalAiConfig()) {}

  async chat(messages: OllamaChatMessage[], opts?: OllamaGenerateOptions): Promise<OllamaChatResult> {
    const o = { ...DEFAULT_OPTS, ...opts };
    const body: Record<string, unknown> = {
      model: o.model ?? this.cfg.ollamaModel,
      messages,
      stream: false,
      format: o.format,
      options: {
        temperature: o.temperature,
        num_predict: o.numPredict,
        num_ctx: o.numCtx,
        seed: o.seed,
      },
    };
    if (o.numGpu != null) (body.options as Record<string, unknown>).num_gpu = o.numGpu;

    const isHeavy = (o.model ?? this.cfg.ollamaModel).includes("8b");
    const timeoutMs =
      o.timeoutMs ??
      Number(
        isHeavy
          ? (process.env.OLLAMA_STRATEGY_TIMEOUT_MS ?? 300_000)
          : (process.env.OLLAMA_FAST_TIMEOUT_MS ?? 120_000),
      );
    const signal = mergeAbortSignals([AbortSignal.timeout(timeoutMs), o.signal]);

    const res = await privateModeFetch(`${this.cfg.ollamaBaseUrl}/api/chat`, "external_fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const raw = await res.text();
    let parsed: {
      message?: { content?: string };
      error?: string;
      eval_count?: number;
      prompt_eval_count?: number;
      total_duration?: number;
      model?: string;
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new Error(`Ollama chat non-JSON: ${raw.slice(0, 300)}`);
    }
    if (!res.ok) throw new Error(parsed.error ?? `Ollama chat HTTP ${res.status}`);
    const evalCount = parsed.eval_count;
    const truncated = evalCount != null && evalCount >= o.numPredict - 8;
    return {
      content: parsed.message?.content ?? "",
      model: parsed.model ?? this.cfg.ollamaModel,
      evalCount,
      promptEvalCount: parsed.prompt_eval_count,
      totalDurationNs: parsed.total_duration,
      truncated,
    };
  }

  /** Warm-load model and verify no OOM. */
  async probeLoad(opts?: { numGpu?: number; numCtx?: number; model?: string }): Promise<{ ok: boolean; ms: number; error?: string }> {
    const t0 = performance.now();
    try {
      await this.chat([{ role: "user", content: "Responde solo: OK" }], {
        numPredict: 8,
        numCtx: opts?.numCtx ?? 4096,
        numGpu: opts?.numGpu,
        model: opts?.model,
      });
      return { ok: true, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      return { ok: false, ms: Math.round(performance.now() - t0), error: e instanceof Error ? e.message : String(e) };
    }
  }

  async isModelAvailable(modelName?: string): Promise<boolean> {
    try {
      const res = await privateModeFetch(`${this.cfg.ollamaBaseUrl}/api/tags`, "external_fetch", {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { models?: { name: string }[] };
      const want = (modelName ?? this.cfg.ollamaModel).split(":")[0];
      return (data.models ?? []).some((m) => m.name.startsWith(want));
    } catch {
      return false;
    }
  }
}

let _client: OllamaClient | undefined;
export function getOllamaClient(): OllamaClient {
  _client ??= new OllamaClient();
  return _client;
}

export function resetOllamaClientForTests(): void {
  _client = undefined;
}

function mergeAbortSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
  const active = signals.filter((s): s is AbortSignal => s != null);
  const ctrl = new AbortController();
  for (const s of active) {
    if (s.aborted) {
      ctrl.abort(s.reason);
      return ctrl.signal;
    }
    s.addEventListener("abort", () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

import { getCurrentOpenAiApiKey } from "./llmAsyncContext";
import { OsAgentError } from "./OsAgentError";

export interface LlmOptions {
  model?: string;
  fallback?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ILlmClient {
  complete(prompt: string, options?: LlmOptions): Promise<string>;
}

type OpenAiChatCompletionResponse = {
  choices?: ReadonlyArray<{ message?: { content?: string | null } }>;
  error?: { message?: string; type?: string; code?: string };
};

/** Default chat model for OS elite pipelines (exported for tests / observability). */
export const LLM_DEFAULT_MODEL = "gpt-4o";
/** Default max completion tokens (exported for tests / observability). */
export const LLM_DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_TEMPERATURE = 0.3;

const DEFAULT_MODEL = LLM_DEFAULT_MODEL;
const DEFAULT_MAX_TOKENS = LLM_DEFAULT_MAX_TOKENS;

let singleton: LlmClient | undefined;
const contextClients = new Map<string, LlmClient>();

export function resetLlmClientSingletonForTests(): void {
  singleton = undefined;
  contextClients.clear();
}

/**
 * Singleton OpenAI chat client via native `fetch` (no official SDK in v1).
 * Throws on construction if `OPENAI_API_KEY` is missing — call after env is loaded.
 */
export class LlmClient implements ILlmClient {
  private readonly apiKey: string;

  private constructor(apiKey: string) {
    const key = apiKey.trim();
    if (!key) {
      throw new OsAgentError(
        "OPENAI_API_KEY is not defined. Set OPENAI_API_KEY in the environment before starting the OS LLM pipeline.",
        "llm_config",
      );
    }
    this.apiKey = key;
  }

  static getInstance(): LlmClient {
    const fromJob = getCurrentOpenAiApiKey();
    if (fromJob) {
      let c = contextClients.get(fromJob);
      if (!c) {
        c = new LlmClient(fromJob);
        contextClients.set(fromJob, c);
      }
      return c;
    }
    if (!singleton) {
      const key = process.env.OPENAI_API_KEY?.trim() ?? "";
      singleton = new LlmClient(key);
    }
    return singleton;
  }

  private async requestCompletion(
    prompt: string,
    model: string,
    max_tokens: number,
    temperature: number,
  ): Promise<{ text: string; status: number; raw: string; parsed: OpenAiChatCompletionResponse }> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens,
        temperature,
      }),
    });

    const raw = await res.text();
    let parsed: OpenAiChatCompletionResponse;
    try {
      parsed = JSON.parse(raw) as OpenAiChatCompletionResponse;
    } catch {
      throw new OsAgentError(
        `OpenAI returned non-JSON (HTTP ${res.status}). First bytes: ${raw.slice(0, 200)}`,
        "llm_http",
      );
    }

    if (!res.ok) {
      const msg = parsed.error?.message ?? raw.slice(0, 400);
      throw new OsAgentError(`OpenAI error (HTTP ${res.status}): ${msg}`, "llm_api");
    }

    if (parsed.error?.message) {
      throw new OsAgentError(`OpenAI error: ${parsed.error.message}`, "llm_api");
    }

    const text = parsed.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new OsAgentError("OpenAI returned an empty completion.", "llm_empty");
    }
    return { text, status: res.status, raw, parsed };
  }

  async completeWithMeta(prompt: string, options?: LlmOptions): Promise<{ text: string; metadata: { modelUsed: string } }> {
    const model = options?.model ?? DEFAULT_MODEL;
    const fallback = options?.fallback ?? DEFAULT_MODEL;
    const max_tokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

    try {
      const first = await this.requestCompletion(prompt, model, max_tokens, temperature);
      return { text: first.text, metadata: { modelUsed: model } };
    } catch (error) {
      if (fallback && fallback !== model && error instanceof OsAgentError && error.code === "llm_api") {
        // Retry only on model/rate-limit style API failures.
        const msg = error.message.toLowerCase();
        if (
          msg.includes("429") ||
          msg.includes("model") ||
          msg.includes("rate limit") ||
          msg.includes("unavailable") ||
          msg.includes("not found")
        ) {
          const second = await this.requestCompletion(prompt, fallback, max_tokens, temperature);
          return { text: second.text, metadata: { modelUsed: fallback } };
        }
      }
      throw error;
    }
  }

  async complete(prompt: string, options?: LlmOptions): Promise<string> {
    const out = await this.completeWithMeta(prompt, options);
    return out.text;
  }
}

/**
 * OS LLM dual-path (ADR-034): Ollama/local first; OpenAI only with explicit opt-in.
 * Never silent mock success — fail closed with OsAgentError when no path is available.
 */
import { getOllamaClient } from "../local-ai/OllamaClient";
import {
  assertPrivateOutboundAllowed,
  isInternetTaskAuthorized,
  isPrivateMode,
} from "../private-ai/privateMode";
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

/** Default remote model when OpenAI opt-in is active (not used by default). */
export const LLM_DEFAULT_MODEL = "gpt-4o";
export const LLM_DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MODEL = LLM_DEFAULT_MODEL;
const DEFAULT_MAX_TOKENS = LLM_DEFAULT_MAX_TOKENS;

let singleton: LlmClient | undefined;

export function resetLlmClientSingletonForTests(): void {
  singleton = undefined;
}

/** Local Ollama / NELVYON_LOCAL_AI configured for OS agents. */
export function isOsOllamaConfigured(): boolean {
  if (process.env.OLLAMA_CONFIGURED?.trim() === "1") return true;
  return Boolean(
    process.env.OLLAMA_HOST?.trim() ||
      process.env.OLLAMA_BASE_URL?.trim() ||
      process.env.NELVYON_LOCAL_AI_URL?.trim() ||
      process.env.LOCAL_AI_BASE_URL?.trim(),
  );
}

/**
 * OpenAI for OS agents — same opt-in as autonomous packs.
 * OFF by default; blocked under PRIVATE_MODE without internet window.
 */
export function isOsOpenAiAllowed(): boolean {
  if (process.env.AUTONOMOUS_ALLOW_OPENAI?.trim() !== "1") return false;
  const key = getCurrentOpenAiApiKey()?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!key) return false;
  if (isPrivateMode() && !isInternetTaskAuthorized()) return false;
  return true;
}

export type OsLlmProviderUsed = "ollama" | "openai";

/**
 * Dual-path OS LLM client. Prefer local Ollama; OpenAI only when explicitly allowed.
 */
export class LlmClient implements ILlmClient {
  private constructor() {}

  static getInstance(): LlmClient {
    if (!singleton) singleton = new LlmClient();
    return singleton;
  }

  private resolveOpenAiKey(): string {
    return (getCurrentOpenAiApiKey()?.trim() || process.env.OPENAI_API_KEY?.trim() || "");
  }

  private async completeViaOllama(
    prompt: string,
    options?: LlmOptions,
  ): Promise<{ text: string; modelUsed: string }> {
    const model =
      options?.model?.trim() ||
      process.env.OLLAMA_MODEL?.trim() ||
      process.env.NELVYON_LOCAL_AI_MODEL?.trim() ||
      undefined;
    const result = await getOllamaClient().chat([{ role: "user", content: prompt }], {
      model,
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      numPredict: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    });
    const text = result.content?.trim() ?? "";
    if (!text) {
      throw new OsAgentError("Ollama returned an empty completion.", "llm_empty");
    }
    return { text, modelUsed: result.model || model || "ollama" };
  }

  private async requestOpenAiCompletion(
    prompt: string,
    model: string,
    max_tokens: number,
    temperature: number,
  ): Promise<{ text: string; status: number; raw: string; parsed: OpenAiChatCompletionResponse }> {
    if (!isOsOpenAiAllowed()) {
      throw new OsAgentError(
        "OpenAI not allowed for OS agents. Set AUTONOMOUS_ALLOW_OPENAI=1 and OPENAI_API_KEY; check PRIVATE_MODE.",
        "llm_config",
      );
    }
    assertPrivateOutboundAllowed("remote_llm");
    const apiKey = this.resolveOpenAiKey();
    if (!apiKey) {
      throw new OsAgentError("OPENAI_API_KEY is not defined.", "llm_config");
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens,
        temperature,
      }),
      signal: AbortSignal.timeout(90_000),
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

  async completeWithMeta(
    prompt: string,
    options?: LlmOptions,
  ): Promise<{ text: string; metadata: { modelUsed: string; provider: OsLlmProviderUsed } }> {
    const failures: string[] = [];

    if (isOsOllamaConfigured()) {
      try {
        const local = await this.completeViaOllama(prompt, options);
        return { text: local.text, metadata: { modelUsed: local.modelUsed, provider: "ollama" } };
      } catch (e) {
        failures.push(`ollama: ${e instanceof Error ? e.message : String(e)}`);
        // Honest: do NOT auto-fall through to OpenAI unless explicitly allowed.
      }
    }

    if (isOsOpenAiAllowed()) {
      const model = options?.model ?? DEFAULT_MODEL;
      const fallback = options?.fallback ?? DEFAULT_MODEL;
      const max_tokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
      const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
      try {
        const first = await this.requestOpenAiCompletion(prompt, model, max_tokens, temperature);
        return { text: first.text, metadata: { modelUsed: model, provider: "openai" } };
      } catch (error) {
        if (
          fallback &&
          fallback !== model &&
          error instanceof OsAgentError &&
          error.code === "llm_api"
        ) {
          const msg = error.message.toLowerCase();
          if (
            msg.includes("429") ||
            msg.includes("model") ||
            msg.includes("rate limit") ||
            msg.includes("unavailable") ||
            msg.includes("not found")
          ) {
            const second = await this.requestOpenAiCompletion(prompt, fallback, max_tokens, temperature);
            return { text: second.text, metadata: { modelUsed: fallback, provider: "openai" } };
          }
        }
        failures.push(`openai: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else if (isOsOllamaConfigured()) {
      // Ollama was configured but failed; OpenAI not allowed — fail closed.
      throw new OsAgentError(
        `OS LLM unavailable. Ollama failed and OpenAI is OFF (AUTONOMOUS_ALLOW_OPENAI!=1). ${failures.join("; ")}`,
        "llm_config",
      );
    }

    throw new OsAgentError(
      "No OS LLM configured. Set OLLAMA_HOST (preferred) or AUTONOMOUS_ALLOW_OPENAI=1 + OPENAI_API_KEY. OpenAI is OFF by default.",
      "llm_config",
    );
  }

  async complete(prompt: string, options?: LlmOptions): Promise<string> {
    const out = await this.completeWithMeta(prompt, options);
    return out.text;
  }
}

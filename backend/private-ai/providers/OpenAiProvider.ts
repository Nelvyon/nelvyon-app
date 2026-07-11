import { getGlobalPrivateAiConfig, isNelvyonAiEnabled, isPrivateAiOnlyEnv } from "../config";
import { assertPrivateOutboundAllowed } from "../privateMode";
import type { GlobalPrivateAiConfig } from "../types";
import type { ILlmProvider, LlmCompletionRequest, LlmCompletionResult } from "../types";

type OpenAiResponse = {
  choices?: ReadonlyArray<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

/** Optional remote provider — never required for Nelvyon to operate. */
export class OpenAiProvider implements ILlmProvider {
  readonly id = "openai";
  readonly kind = "remote" as const;

  constructor(private readonly cfg: GlobalPrivateAiConfig = getGlobalPrivateAiConfig()) {}

  describe() {
    return { label: "OpenAI (opcional)" };
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.openaiApiKey);
  }

  async isAvailable(): Promise<boolean> {
    if (!isNelvyonAiEnabled() || isPrivateAiOnlyEnv() || this.cfg.privateAiOnly) return false;
    return this.isConfigured();
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    assertPrivateOutboundAllowed("remote_llm", "OpenAI API blocked in PRIVATE_MODE.");
    const key = this.cfg.openaiApiKey;
    if (!key) throw new Error("OPENAI_API_KEY is not configured (optional provider).");

    const model = request.model ?? this.cfg.openaiModel;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.3,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    const raw = await res.text();
    let parsed: OpenAiResponse;
    try {
      parsed = JSON.parse(raw) as OpenAiResponse;
    } catch {
      throw new Error(`OpenAI non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }

    if (!res.ok) throw new Error(parsed.error?.message ?? `OpenAI HTTP ${res.status}`);

    const text = parsed.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned empty completion.");

    return { text, provider: this.id, model, mock: false, configured: true, ready: true };
  }
}

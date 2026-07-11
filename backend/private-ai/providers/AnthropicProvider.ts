import { getGlobalPrivateAiConfig, isNelvyonAiEnabled, isPrivateAiOnlyEnv } from "../config";
import { assertPrivateOutboundAllowed } from "../privateMode";
import type { GlobalPrivateAiConfig } from "../types";
import type { ILlmProvider, LlmCompletionRequest, LlmCompletionResult } from "../types";

type AnthropicResponse = {
  content?: ReadonlyArray<{ type?: string; text?: string }>;
  error?: { message?: string };
};

/** Optional remote provider — never required for Nelvyon to operate. */
export class AnthropicProvider implements ILlmProvider {
  readonly id = "anthropic";
  readonly kind = "remote" as const;

  constructor(private readonly cfg: GlobalPrivateAiConfig = getGlobalPrivateAiConfig()) {}

  describe() {
    return { label: "Anthropic (opcional)" };
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.anthropicApiKey);
  }

  async isAvailable(): Promise<boolean> {
    if (!isNelvyonAiEnabled() || isPrivateAiOnlyEnv() || this.cfg.privateAiOnly) return false;
    return this.isConfigured();
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    assertPrivateOutboundAllowed("remote_llm", "Anthropic API blocked in PRIVATE_MODE.");
    const key = this.cfg.anthropicApiKey;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured (optional provider).");

    const model = request.model ?? this.cfg.anthropicModel;
    const system = request.messages.find((m) => m.role === "system")?.content;
    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.3,
        system: system ?? undefined,
        messages,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    const raw = await res.text();
    let parsed: AnthropicResponse;
    try {
      parsed = JSON.parse(raw) as AnthropicResponse;
    } catch {
      throw new Error(`Anthropic non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }

    if (!res.ok) throw new Error(parsed.error?.message ?? `Anthropic HTTP ${res.status}`);

    const text = parsed.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) throw new Error("Anthropic returned empty completion.");

    return { text, provider: this.id, model, mock: false, configured: true, ready: true };
  }
}

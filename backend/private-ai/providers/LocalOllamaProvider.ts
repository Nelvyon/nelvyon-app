import { getGlobalPrivateAiConfig, isLocalRuntimeConfigured, isNelvyonAiEnabled } from "../config";
import type { GlobalPrivateAiConfig } from "../types";
import type { ILlmProvider, LlmCompletionRequest, LlmCompletionResult } from "../types";

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

/**
 * Ollama-compatible local provider.
 * Does NOT probe the network unless NELVYON_AI_ENABLED=1 AND OLLAMA_CONFIGURED=1.
 */
export class LocalOllamaProvider implements ILlmProvider {
  readonly id = "local_ollama";
  readonly kind = "local" as const;

  constructor(private readonly cfg: GlobalPrivateAiConfig = getGlobalPrivateAiConfig()) {}

  describe() {
    return { label: "Runtime local (Ollama-compatible)" };
  }

  isConfigured(): boolean {
    return this.cfg.localRuntimeConfigured && Boolean(this.cfg.ollamaBaseUrl);
  }

  async isAvailable(): Promise<boolean> {
    if (!isNelvyonAiEnabled() || !isLocalRuntimeConfigured()) return false;
    try {
      const res = await fetch(`${this.cfg.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!this.isConfigured()) {
      throw new Error("Local runtime not configured. Set OLLAMA_CONFIGURED=1 after installing Ollama.");
    }
    if (!isNelvyonAiEnabled()) {
      throw new Error("Nelvyon AI is disabled. Set NELVYON_AI_ENABLED=1.");
    }

    const model = request.model ?? this.cfg.ollamaModel;
    const res = await fetch(`${this.cfg.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          temperature: request.temperature ?? 0.3,
          num_predict: request.maxTokens ?? 2048,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const raw = await res.text();
    let parsed: OllamaChatResponse;
    try {
      parsed = JSON.parse(raw) as OllamaChatResponse;
    } catch {
      throw new Error(`Local runtime non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(parsed.error ?? `Local runtime HTTP ${res.status}: ${raw.slice(0, 300)}`);
    }

    const text = parsed.message?.content?.trim();
    if (!text) throw new Error("Local runtime returned empty completion.");

    return { text, provider: this.id, model, mock: false, configured: true, ready: true };
  }
}

/** @deprecated alias */
export { LocalOllamaProvider as OllamaProvider };

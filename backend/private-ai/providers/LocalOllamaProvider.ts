import { getLocalAiConfig } from "../../local-ai/config";
import { OllamaClient } from "../../local-ai/OllamaClient";
import { getGlobalPrivateAiConfig, isLocalRuntimeConfigured, isNelvyonAiEnabled } from "../config";
import type { GlobalPrivateAiConfig } from "../types";
import type { ILlmProvider, LlmCompletionRequest, LlmCompletionResult } from "../types";

/**
 * Ollama-compatible local provider (Private AI chain fallback).
 * HTTP SSOT: delegates chat to `OllamaClient` (same client as certified Router path).
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

  private client(): OllamaClient {
    return new OllamaClient({
      ...getLocalAiConfig(),
      ollamaBaseUrl: this.cfg.ollamaBaseUrl.replace(/\/$/, ""),
      ollamaModel: this.cfg.ollamaModel,
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!isNelvyonAiEnabled() || !isLocalRuntimeConfigured()) return false;
    try {
      return await this.client().isModelAvailable(this.cfg.ollamaModel);
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
    const result = await this.client().chat(
      request.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      {
        model,
        temperature: request.temperature ?? 0.3,
        numPredict: request.maxTokens ?? 2048,
      },
    );

    const text = result.content?.trim();
    if (!text) throw new Error("Local runtime returned empty completion.");

    return { text, provider: this.id, model: result.model || model, mock: false, configured: true, ready: true };
  }
}

/** @deprecated alias */
export { LocalOllamaProvider as OllamaProvider };

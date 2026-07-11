import { privateModeFetch } from "../private-ai/privateMode";
import { getLocalAiConfig } from "./config";

export type EmbeddingResult = {
  vector: number[];
  model: string;
  dim: number;
};

type OllamaEmbedResponse = {
  embedding?: number[];
  error?: string;
};

/**
 * Local embeddings via Ollama — no paid APIs.
 * Model must be pulled by owner after hardware audit (not auto-downloaded).
 */
export class LocalEmbeddingProvider {
  constructor(private readonly cfg = getLocalAiConfig()) {}

  async embed(text: string): Promise<EmbeddingResult> {
    const input = text.trim();
    if (!input) throw new Error("Cannot embed empty text");

    const url = `${this.cfg.ollamaBaseUrl}/api/embeddings`;
    const res = await privateModeFetch(url, "external_fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.cfg.embeddingModel, prompt: input }),
      signal: AbortSignal.timeout(120_000),
    });

    const raw = await res.text();
    let parsed: OllamaEmbedResponse;
    try {
      parsed = JSON.parse(raw) as OllamaEmbedResponse;
    } catch {
      throw new Error(`Ollama embeddings non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(parsed.error ?? `Ollama embeddings HTTP ${res.status}`);
    }

    const vector = parsed.embedding ?? [];
    if (vector.length !== this.cfg.embeddingDim) {
      throw new Error(
        `Embedding dim mismatch: expected ${this.cfg.embeddingDim}, got ${vector.length}. ` +
          `Set LOCAL_AI_EMBEDDING_DIM or pull matching model.`,
      );
    }

    return { vector, model: this.cfg.embeddingModel, dim: vector.length };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await privateModeFetch(`${this.cfg.ollamaBaseUrl}/api/tags`, "external_fetch", {
        signal: AbortSignal.timeout(3_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

let _provider: LocalEmbeddingProvider | undefined;
export function getLocalEmbeddingProvider(): LocalEmbeddingProvider {
  _provider ??= new LocalEmbeddingProvider();
  return _provider;
}

export function resetLocalEmbeddingProviderForTests(): void {
  _provider = undefined;
}

import { afterEach, describe, expect, it, vi } from "vitest";

import { ModelRouter } from "../llm/ModelRouter";
import { LlmClient, resetLlmClientSingletonForTests } from "../LlmClient";

describe("ModelRouter", () => {
  it("copy agent -> gpt-4.1", () => {
    const m = ModelRouter.getModel("email-copy-agent");
    expect(m.model).toBe("gpt-4.1");
  });

  it("strategy agent -> o3", () => {
    const m = ModelRouter.getModel("seo-strategy-analysis-agent");
    expect(m.model).toBe("o3");
  });

  it("outreach agent -> gpt-4.1", () => {
    const m = ModelRouter.getModel("b2b-outreach-sequence-agent");
    expect(m.model).toBe("gpt-4.1");
  });

  it("quality evaluator -> o3", () => {
    const m = ModelRouter.getModel("quality-evaluator-service");
    expect(m.model).toBe("o3");
  });

  it("unknown agent -> gpt-4o-mini", () => {
    const m = ModelRouter.getModel("foo-unknown-agent");
    expect(m.model).toBe("gpt-4o-mini");
  });
});

describe("LlmClient fallback", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalAllow = process.env.AUTONOMOUS_ALLOW_OPENAI;
  const ollamaKeys = [
    "OLLAMA_HOST",
    "OLLAMA_BASE_URL",
    "OLLAMA_CONFIGURED",
    "NELVYON_LOCAL_AI_URL",
    "LOCAL_AI_BASE_URL",
  ] as const;
  const originalOllama = Object.fromEntries(ollamaKeys.map((k) => [k, process.env[k]]));

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
    if (originalAllow === undefined) delete process.env.AUTONOMOUS_ALLOW_OPENAI;
    else process.env.AUTONOMOUS_ALLOW_OPENAI = originalAllow;
    for (const k of ollamaKeys) {
      if (originalOllama[k] === undefined) delete process.env[k];
      else process.env[k] = originalOllama[k];
    }
    resetLlmClientSingletonForTests();
  });

  it("if primary model fails uses fallback", async () => {
    // OpenAI path only: clear local Ollama so the client does not prefer a polluted host.
    for (const k of ollamaKeys) delete process.env[k];
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "model unavailable" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const llm = LlmClient.getInstance();
    const text = await llm.complete("hi", { model: "o3", fallback: "gpt-4o", maxTokens: 50, temperature: 0.1 });
    expect(text).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]![1]?.body));
    expect(firstBody.model).toBe("o3");
    expect(secondBody.model).toBe("gpt-4o");
  });
});

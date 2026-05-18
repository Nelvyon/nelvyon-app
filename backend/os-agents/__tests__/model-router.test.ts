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

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
    resetLlmClientSingletonForTests();
  });

  it("if primary model fails uses fallback", async () => {
    process.env.OPENAI_API_KEY = "test-key";
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
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(firstBody.model).toBe("o3");
    expect(secondBody.model).toBe("gpt-4o");
  });
});

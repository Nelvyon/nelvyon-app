import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatMock = vi.fn();

vi.mock("../../local-ai/OllamaClient", () => ({
  getOllamaClient: () => ({ chat: chatMock }),
  OllamaClient: class {
    chat = chatMock;
  },
}));

import { invokeLlm, resolveLlmMode, setLlmInvokeForTests } from "../llm/llmAdapter";

describe("llmAdapter — Ollama-first real path", () => {
  beforeEach(() => {
    setLlmInvokeForTests(null);
    chatMock.mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_LLM_MODE;
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    setLlmInvokeForTests(null);
    vi.unstubAllGlobals();
  });

  it("prefers Ollama over OpenAI when both configured", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test-should-not-call";
    expect(resolveLlmMode()).toBe("real");

    chatMock.mockResolvedValue({
      content: JSON.stringify({ template_id: "from-ollama", blockers: [] }),
      model: "llama-local",
      evalCount: 10,
      promptEvalCount: 5,
      truncated: false,
    });

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: {},
      mockGenerator: () => ({ template_id: "from-mock", blockers: ["x"] }),
    });

    expect(res.mode).toBe("real");
    expect(res.model).toBe("llama-local");
    expect((res.parsed as { template_id: string }).template_id).toBe("from-ollama");
    expect(chatMock).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to OpenAI when Ollama fails", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    chatMock.mockRejectedValue(new Error("ollama down"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ template_id: "from-openai", blockers: [] }) } }],
          usage: { total_tokens: 12 },
          model: "gpt-4o-mini",
        }),
        text: async () => "",
      }),
    );

    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: {},
      mockGenerator: () => ({ template_id: "from-mock", blockers: ["x"] }),
    });

    expect(res.mode).toBe("real");
    expect(res.model).toBe("gpt-4o-mini");
    expect((res.parsed as { template_id: string }).template_id).toBe("from-openai");
  });

  it("falls back to mock when Ollama and OpenAI both fail", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    chatMock.mockRejectedValue(new Error("ollama down"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "boom",
        json: async () => ({}),
      }),
    );

    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: {},
      mockGenerator: () => ({ template_id: "from-mock", blockers: [] }),
    });

    expect(res.mode).toBe("mock");
    expect((res.parsed as { template_id: string }).template_id).toBe("from-mock");
    expect(res.fallbackReason).toMatch(/ollama|openai/i);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatMock = vi.fn();

vi.mock("../../local-ai/OllamaClient", () => ({
  getOllamaClient: () => ({ chat: chatMock }),
  OllamaClient: class {
    chat = chatMock;
  },
}));

import {
  invokeLlm,
  isAutonomousOpenAiAllowed,
  resolveLlmMode,
  setLlmInvokeForTests,
} from "../llm/llmAdapter";

describe("llmAdapter — Ollama-first real path", () => {
  beforeEach(() => {
    setLlmInvokeForTests(null);
    chatMock.mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_LLM_MODE;
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.PRIVATE_MODE;
    delete process.env.NELVYON_PRIVATE_MODE;
    delete process.env.PRIVATE_MODE_INTERNET_UNTIL;
  });

  afterEach(() => {
    setLlmInvokeForTests(null);
    vi.unstubAllGlobals();
  });

  it("prefers Ollama over OpenAI when both configured", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test-should-not-call";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
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

  it("does not auto-fallback to OpenAI when Ollama fails (key alone is not enough)", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    // AUTONOMOUS_ALLOW_OPENAI unset → OpenAI must stay OFF
    chatMock.mockRejectedValue(new Error("ollama down"));

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: {},
      mockGenerator: () => ({ template_id: "from-mock", blockers: [] }),
    });

    expect(res.mode).toBe("mock");
    expect((res.parsed as { template_id: string }).template_id).toBe("from-mock");
    expect(res.fallbackReason).toMatch(/ollama/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(isAutonomousOpenAiAllowed()).toBe(false);
  });

  it("uses OpenAI only with explicit AUTONOMOUS_ALLOW_OPENAI=1 and PRIVATE_MODE off", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
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
});

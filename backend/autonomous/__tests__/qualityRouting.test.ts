/**
 * Contract tests for autonomous quality routing (ADR-036).
 * Does not call live Ollama — asserts model selection only + invoke wiring.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatMock = vi.fn();

vi.mock("../../local-ai/OllamaClient", () => ({
  getOllamaClient: () => ({ chat: chatMock }),
}));

import {
  invokeLlm,
  isAutonomousQualityRoutingEnabled,
  resolveAutonomousOllamaModel,
  setLlmInvokeForTests,
} from "../llm/llmAdapter";

describe("autonomous quality routing 3b/8b (ADR-036)", () => {
  beforeEach(() => {
    setLlmInvokeForTests(null);
    chatMock.mockReset();
    delete process.env.AUTONOMOUS_QUALITY_ROUTING;
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_STRATEGY_MODEL;
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.OLLAMA_HOST;
  });

  afterEach(() => {
    setLlmInvokeForTests(null);
  });

  it("defaults OFF", () => {
    expect(isAutonomousQualityRoutingEnabled()).toBe(false);
    expect(resolveAutonomousOllamaModel("agent-copywriter-landing").reason).toBe("quality_routing_off");
  });

  it("never enables 8b path unless AUTONOMOUS_QUALITY_ROUTING=1 exactly", () => {
    process.env.AUTONOMOUS_QUALITY_ROUTING = "true";
    expect(isAutonomousQualityRoutingEnabled()).toBe(false);
    process.env.AUTONOMOUS_QUALITY_ROUTING = "0";
    expect(isAutonomousQualityRoutingEnabled()).toBe(false);
    process.env.OLLAMA_STRATEGY_MODEL = "llama3.1:8b-instruct-q4_K_M";
    expect(resolveAutonomousOllamaModel("agent-copywriter-landing").slot).toBe("fast");
    expect(resolveAutonomousOllamaModel("agent-copywriter-landing").reason).toBe("quality_routing_off");
  });

  it("routes critical copywriter to strategy 8b when enabled", () => {
    process.env.AUTONOMOUS_QUALITY_ROUTING = "1";
    process.env.OLLAMA_MODEL = "llama3.2:3b-instruct-q4_K_M";
    process.env.OLLAMA_STRATEGY_MODEL = "llama3.1:8b-instruct-q4_K_M";
    const r = resolveAutonomousOllamaModel("agent-copywriter-landing");
    expect(r.slot).toBe("strategy");
    expect(r.model).toBe("llama3.1:8b-instruct-q4_K_M");
    expect(r.reason).toBe("critical_deliverable_8b");
  });

  it("keeps PM on fast 3b when routing enabled", () => {
    process.env.AUTONOMOUS_QUALITY_ROUTING = "1";
    process.env.OLLAMA_MODEL = "llama3.2:3b-instruct-q4_K_M";
    process.env.OLLAMA_STRATEGY_MODEL = "llama3.1:8b-instruct-q4_K_M";
    const r = resolveAutonomousOllamaModel("agent-pm-landing");
    expect(r.slot).toBe("fast");
    expect(r.model).toBe("llama3.2:3b-instruct-q4_K_M");
  });

  it("invokeLlm passes strategy model to Ollama chat for critical roles", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.AUTONOMOUS_QUALITY_ROUTING = "1";
    process.env.OLLAMA_STRATEGY_MODEL = "llama3.1:8b-instruct-q4_K_M";
    chatMock.mockResolvedValue({
      content: JSON.stringify({
        version: 1,
        hero: { headline: "H", subheadline: "S", cta_label: "C" },
        benefits: ["a", "b", "c"],
        faq: [{ q: "?", a: "!" }],
        thank_you: {},
        meta: { title: "t", description: "d" },
        primary_cta_count: 1,
      }),
      model: "llama3.1:8b-instruct-q4_K_M",
      evalCount: 1,
      promptEvalCount: 1,
      truncated: false,
    });

    await invokeLlm({
      agentId: "agent-copywriter-landing",
      payload: {},
      mockGenerator: () => ({}),
    });

    expect(chatMock).toHaveBeenCalled();
    const opts = chatMock.mock.calls[0]?.[1] as { model?: string };
    expect(opts?.model).toBe("llama3.1:8b-instruct-q4_K_M");
  });
});

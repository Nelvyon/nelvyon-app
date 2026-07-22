/**
 * Contract: OS LlmClient is Ollama-first; OpenAI only with AUTONOMOUS_ALLOW_OPENAI=1.
 * Never silent mock success — fail closed when no path is available.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isOsOllamaConfigured,
  isOsOpenAiAllowed,
  LlmClient,
  resetLlmClientSingletonForTests,
} from "../LlmClient";
import { OsAgentError } from "../OsAgentError";

vi.mock("../../local-ai/OllamaClient", () => ({
  getOllamaClient: () => ({
    chat: vi.fn(async () => ({ content: "ollama-ok", model: "llama-test", truncated: false })),
  }),
}));

describe("LlmClient dual-path contract (ADR-034)", () => {
  afterEach(() => {
    resetLlmClientSingletonForTests();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.NELVYON_LOCAL_AI_URL;
    delete process.env.LOCAL_AI_BASE_URL;
    delete process.env.PRIVATE_MODE;
    delete process.env.NELVYON_PRIVATE_MODE;
    delete process.env.PRIVATE_MODE_INTERNET_UNTIL;
    vi.unstubAllGlobals();
  });

  it("isOsOpenAiAllowed is false by default even with OPENAI_API_KEY", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.PRIVATE_MODE = "OFF";
    expect(isOsOpenAiAllowed()).toBe(false);
  });

  it("getInstance complete throws when neither Ollama nor OpenAI opt-in", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;
    delete process.env.OLLAMA_HOST;
    await expect(LlmClient.getInstance().complete("ping")).rejects.toBeInstanceOf(OsAgentError);
    await expect(LlmClient.getInstance().complete("ping")).rejects.toThrow(/No OS LLM configured|OLLAMA|AUTONOMOUS_ALLOW_OPENAI/);
  });

  it("prefers Ollama when configured (no OpenAI call)", async () => {
    process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
    expect(isOsOllamaConfigured()).toBe(true);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const text = await LlmClient.getInstance().complete("ping");
    expect(text).toBe("ollama-ok");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses OpenAI only with AUTONOMOUS_ALLOW_OPENAI=1 and PRIVATE_MODE off", async () => {
    process.env.OPENAI_API_KEY = "sk-test-contract-only";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
    expect(isOsOpenAiAllowed()).toBe(true);

    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      (async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        calls.push(url);
        return new Response(JSON.stringify({ choices: [{ message: { content: "openai-ok" } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch,
    );

    const text = await LlmClient.getInstance().complete("ping");
    expect(text).toBe("openai-ok");
    expect(calls).toEqual(["https://api.openai.com/v1/chat/completions"]);
  });

  it("does not call OpenAI when Ollama is configured even if OpenAI opt-in is on", async () => {
    process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const meta = await LlmClient.getInstance().completeWithMeta("ping");
    expect(meta.metadata.provider).toBe("ollama");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

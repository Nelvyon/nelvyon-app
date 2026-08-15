import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatMock = vi.fn();

vi.mock("../../local-ai/OllamaClient", () => ({
  getOllamaClient: () => ({ chat: chatMock }),
  OllamaClient: class {
    chat = chatMock;
  },
}));

import { invokeLlm, setLlmInvokeForTests } from "../llm/llmAdapter";
import {
  runWithLlmBudget,
  wasLlmBudgetExhausted,
  llmBudgetDegradationReason,
} from "../llm/llmBudget";

/**
 * El pase de reparación de JSON duplicaba el coste de cada agente y era el
 * multiplicador que hacía impredecible la duración del SKU. Aquí se protege que
 * el presupuesto lo acota y que el recorte queda marcado como degradación.
 */
describe("llmAdapter — presupuesto agregado", () => {
  beforeEach(() => {
    setLlmInvokeForTests(null);
    chatMock.mockReset();
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.PRIVATE_MODE = "OFF";
    delete process.env.AUTONOMOUS_LLM_MODE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;
  });

  afterEach(() => {
    setLlmInvokeForTests(null);
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.PRIVATE_MODE;
    vi.useRealTimers();
  });

  const req = {
    agentId: "agent-pm-chatbot" as const,
    payload: {},
    mockGenerator: () => ({ ok: true }),
  };

  it("sin presupuesto: el timeout NO se pasa recortado y el repair pass ocurre", async () => {
    chatMock
      .mockResolvedValueOnce({ content: "no-json", model: "m", evalCount: 1, promptEvalCount: 1 })
      .mockResolvedValueOnce({ content: '{"ok":true}', model: "m", evalCount: 1, promptEvalCount: 1 });

    const res = await invokeLlm(req);

    expect(chatMock).toHaveBeenCalledTimes(2); // original + reparación
    expect(res.mode).toBe("real");
  });

  it("dentro de presupuesto: repair pass permitido y sin degradación", async () => {
    chatMock
      .mockResolvedValueOnce({ content: "no-json", model: "m", evalCount: 1, promptEvalCount: 1 })
      .mockResolvedValueOnce({ content: '{"ok":true}', model: "m", evalCount: 1, promptEvalCount: 1 });

    await runWithLlmBudget(600_000, async () => {
      const res = await invokeLlm(req);
      expect(res.mode).toBe("real");
      expect(chatMock).toHaveBeenCalledTimes(2);
      expect(wasLlmBudgetExhausted()).toBe(false);
    });
  });

  it("la llamada recibe un timeoutMs recortado al presupuesto restante", async () => {
    chatMock.mockResolvedValue({
      content: '{"ok":true}',
      model: "m",
      evalCount: 1,
      promptEvalCount: 1,
    });

    await runWithLlmBudget(30_000, async () => {
      await invokeLlm(req);
      const opts = chatMock.mock.calls[0]?.[1] as { timeoutMs?: number };
      expect(opts.timeoutMs).toBeDefined();
      expect(opts.timeoutMs!).toBeLessThanOrEqual(30_000);
      // sin presupuesto habría sido 120_000
      expect(opts.timeoutMs!).toBeLessThan(120_000);
      expect(wasLlmBudgetExhausted()).toBe(true);
    });
  });

  it("JSON inválido + presupuesto agotado: OMITE el repair pass y marca degradación", async () => {
    vi.useFakeTimers();
    chatMock.mockImplementation(async () => {
      vi.advanceTimersByTime(60_000); // la primera llamada consume todo el presupuesto
      return { content: "no-json", model: "m", evalCount: 1, promptEvalCount: 1 };
    });

    await runWithLlmBudget(60_000, async () => {
      await expect(invokeLlm(req)).rejects.toBeTruthy();
      // Lo esencial: el pase de reparación NO se intentó pese al JSON inválido.
      expect(chatMock).toHaveBeenCalledTimes(1);
      expect(wasLlmBudgetExhausted()).toBe(true);
      // El motivo conservado es el PRIMERO (recorte de la llamada primaria),
      // no el del repair: la degradación empezó antes.
      expect(llmBudgetDegradationReason()).toContain("agent-pm-chatbot:primary");
    });
  });

  it("presupuesto ya agotado: no se llega a llamar a Ollama", async () => {
    vi.useFakeTimers();
    chatMock.mockResolvedValue({ content: '{"ok":true}', model: "m" });

    await runWithLlmBudget(10_000, async () => {
      vi.advanceTimersByTime(10_000);
      await expect(invokeLlm(req)).rejects.toBeTruthy();
      expect(chatMock).not.toHaveBeenCalled();
      expect(wasLlmBudgetExhausted()).toBe(true);
    });
  });
});

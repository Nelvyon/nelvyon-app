import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Presupuesto agregado de LLM por ejecución de SKU.
 *
 * Contrato que se protege aquí:
 *   - sin presupuesto instalado, el comportamiento es EXACTAMENTE el histórico;
 *   - una llamada nunca puede desbordar el presupuesto restante;
 *   - agotado el presupuesto, se corta de inmediato en vez de esperar el timeout;
 *   - todo recorte queda marcado como degradación, nunca como éxito normal.
 */
import {
  LLM_BUDGET_MIN_CALL_MS,
  LlmBudgetExhaustedError,
  claimLlmCallTimeoutMs,
  configuredLlmBudgetMs,
  hasBudgetForAnotherAttempt,
  llmBudgetDegradationReason,
  markLlmBudgetExhausted,
  remainingLlmBudgetMs,
  runWithLlmBudget,
  wasLlmBudgetExhausted,
} from "../llm/llmBudget";

describe("llmBudget — sin presupuesto instalado (comportamiento histórico)", () => {
  it("no acota nada: restante null y timeout por defecto intacto", () => {
    expect(remainingLlmBudgetMs()).toBeNull();
    expect(claimLlmCallTimeoutMs(300_000, "x")).toBe(300_000);
    expect(hasBudgetForAnotherAttempt(999_999_999)).toBe(true);
    expect(wasLlmBudgetExhausted()).toBe(false);
  });

  it("runWithLlmBudget con budget<=0 no instala contexto", async () => {
    await runWithLlmBudget(0, async (state) => {
      expect(state).toBeNull();
      expect(remainingLlmBudgetMs()).toBeNull();
      expect(claimLlmCallTimeoutMs(120_000, "x")).toBe(120_000);
    });
  });
});

describe("llmBudget — caso normal dentro de presupuesto", () => {
  it("no degrada y respeta el timeout por defecto cuando sobra margen", async () => {
    await runWithLlmBudget(600_000, async () => {
      expect(claimLlmCallTimeoutMs(120_000, "pm")).toBe(120_000);
      expect(claimLlmCallTimeoutMs(120_000, "strategist")).toBe(120_000);
      expect(wasLlmBudgetExhausted()).toBe(false);
      expect(llmBudgetDegradationReason()).toBeNull();
    });
  });

  it("permite otro intento mientras quepa la estimación", async () => {
    await runWithLlmBudget(600_000, async () => {
      expect(hasBudgetForAnotherAttempt(60_000)).toBe(true);
    });
  });
});

describe("llmBudget — recorte y agotamiento", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("recorta el timeout de la llamada al restante y marca degradación", async () => {
    await runWithLlmBudget(100_000, async () => {
      vi.advanceTimersByTime(70_000); // quedan 30s
      const t = claimLlmCallTimeoutMs(120_000, "copywriter");
      expect(t).toBeLessThanOrEqual(30_000);
      expect(t).toBeGreaterThan(0);
      expect(wasLlmBudgetExhausted()).toBe(true);
      expect(llmBudgetDegradationReason()).toContain("copywriter");
    });
  });

  it("agotado: lanza LlmBudgetExhaustedError en vez de esperar el timeout", async () => {
    await runWithLlmBudget(10_000, async () => {
      vi.advanceTimersByTime(10_000);
      expect(() => claimLlmCallTimeoutMs(300_000, "pm")).toThrow(LlmBudgetExhaustedError);
      expect(wasLlmBudgetExhausted()).toBe(true);
    });
  });

  it("no autoriza otro intento cuando la estimación no cabe", async () => {
    await runWithLlmBudget(100_000, async () => {
      vi.advanceTimersByTime(80_000); // quedan 20s
      expect(hasBudgetForAnotherAttempt(60_000)).toBe(false);
      expect(hasBudgetForAnotherAttempt(10_000)).toBe(true);
    });
  });

  it("el margen mínimo evita iniciar llamadas inútiles", async () => {
    await runWithLlmBudget(LLM_BUDGET_MIN_CALL_MS + 1_000, async () => {
      vi.advanceTimersByTime(2_000);
      expect(() => claimLlmCallTimeoutMs(120_000, "pm")).toThrow(LlmBudgetExhaustedError);
    });
  });

  it("el motivo de degradación conserva el PRIMERO, no el último", async () => {
    await runWithLlmBudget(100_000, async () => {
      markLlmBudgetExhausted("primero");
      markLlmBudgetExhausted("segundo");
      expect(llmBudgetDegradationReason()).toBe("primero");
    });
  });
});

describe("llmBudget — aislamiento entre ejecuciones", () => {
  it("una ejecución degradada no contamina la siguiente", async () => {
    await runWithLlmBudget(1_000, async () => {
      markLlmBudgetExhausted("run A");
      expect(wasLlmBudgetExhausted()).toBe(true);
    });
    await runWithLlmBudget(600_000, async () => {
      expect(wasLlmBudgetExhausted()).toBe(false);
      expect(llmBudgetDegradationReason()).toBeNull();
    });
  });
});

describe("configuredLlmBudgetMs", () => {
  it("por defecto 600000 ms", () => {
    expect(configuredLlmBudgetMs({} as NodeJS.ProcessEnv)).toBe(600_000);
  });

  it("respeta AUTONOMOUS_SKU_BUDGET_MS", () => {
    expect(configuredLlmBudgetMs({ AUTONOMOUS_SKU_BUDGET_MS: "90000" } as NodeJS.ProcessEnv)).toBe(
      90_000,
    );
  });

  it("valores no válidos o <=0 desactivan el presupuesto", () => {
    expect(configuredLlmBudgetMs({ AUTONOMOUS_SKU_BUDGET_MS: "0" } as NodeJS.ProcessEnv)).toBe(0);
    expect(configuredLlmBudgetMs({ AUTONOMOUS_SKU_BUDGET_MS: "-5" } as NodeJS.ProcessEnv)).toBe(0);
    expect(configuredLlmBudgetMs({ AUTONOMOUS_SKU_BUDGET_MS: "abc" } as NodeJS.ProcessEnv)).toBe(0);
  });
});

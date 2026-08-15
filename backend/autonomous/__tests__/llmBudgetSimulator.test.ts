import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Presupuesto agregado a nivel de ejecución de SKU.
 *
 * Lo que se protege:
 *   - dentro de presupuesto, el número de intentos es el histórico;
 *   - agotado el presupuesto, los reintentos se cortan ANTES de empezar, de modo
 *     que no se repiten los side effects del intento anterior;
 *   - la degradación queda explícita en `agent_log` y en el proyecto, nunca
 *     disfrazada de éxito LLM normal.
 */

// `vi.mock` se eleva al inicio del fichero: los dobles deben crearse con
// `vi.hoisted` para existir cuando se evalúan las factorías.
const { executeMock, recordPostQaOutcomeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  recordPostQaOutcomeMock: vi.fn(async () => undefined),
}));

vi.mock("../pipelines/runPipelinePhaseC", async () => {
  const actual = await vi.importActual<typeof import("../pipelines/runPipelinePhaseC")>(
    "../pipelines/runPipelinePhaseC",
  );
  return { ...actual, executePipelinePhaseC: executeMock };
});

vi.mock("../templates/recordPostQaOutcome", () => ({
  recordPostQaOutcome: recordPostQaOutcomeMock,
}));

vi.mock("../templates/pipelineTemplateSelector", async () => {
  const actual = await vi.importActual<
    typeof import("../templates/pipelineTemplateSelector")
  >("../templates/pipelineTemplateSelector");
  return {
    ...actual,
    pickPipelineTemplate: vi.fn(async () => ({
      template_id: "tpl-1",
      final_template_score: 90,
      source: "test",
      skipped_low_score: false,
    })),
  };
});

import { simulatePhaseC } from "../simulatorPhaseC";
import { LLM_BUDGET_DEGRADED_MODEL } from "../llm/llmBudget";

/** QA que nunca pasa: fuerza el bucle de reintentos hasta max_retries. */
function failingQa() {
  return {
    score: 40,
    passed: false,
    checks: [],
    failed_agents: ["agent-pm-chatbot"],
    retry_recommendation: { target_agent: "agent-pm-chatbot", reason: "low" },
  };
}

function passingQa() {
  return { score: 95, passed: true, checks: [], failed_agents: [] };
}

const OPTS = {
  sku: "NELVYON-CHATBOT" as const,
  tier: "professional" as const,
  brief: { sector: "general", business_name: "ACME" },
};

describe("simulatePhaseC — presupuesto agregado", () => {
  beforeEach(() => {
    executeMock.mockReset();
    recordPostQaOutcomeMock.mockClear();
    process.env.AUTONOMOUS_LLM_MODE = "mock";
    delete process.env.AUTONOMOUS_SKU_BUDGET_MS;
  });

  afterEach(() => {
    delete process.env.AUTONOMOUS_SKU_BUDGET_MS;
    delete process.env.AUTONOMOUS_LLM_MODE;
    vi.useRealTimers();
  });

  it("caso normal dentro de presupuesto: agota los reintentos como antes", async () => {
    process.env.AUTONOMOUS_SKU_BUDGET_MS = "600000";
    executeMock.mockImplementation(async () => failingQa());

    const res = await simulatePhaseC(OPTS);

    // 1 intento inicial + max_retries(3) = 4
    expect(executeMock).toHaveBeenCalledTimes(4);
    expect(res.project.retry_count).toBe(3);
    expect(res.project.llm_budget_degraded).toBeUndefined();
    expect(res.project.agent_log.some((e) => e.agent === "llm_budget_guard")).toBe(false);
  });

  it("éxito al primer intento: no reintenta ni degrada", async () => {
    process.env.AUTONOMOUS_SKU_BUDGET_MS = "600000";
    executeMock.mockImplementation(async () => passingQa());

    const res = await simulatePhaseC(OPTS);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(res.project.llm_budget_degraded).toBeUndefined();
    expect(res.project.qa?.passed).toBe(true);
  });

  it("presupuesto agotado: corta reintentos y NO repite side effects", async () => {
    process.env.AUTONOMOUS_SKU_BUDGET_MS = "10000";
    vi.useFakeTimers();
    // Cada intento consume 9s: tras el primero no cabe otro completo.
    executeMock.mockImplementation(async () => {
      vi.advanceTimersByTime(9_000);
      return failingQa();
    });

    const res = await simulatePhaseC(OPTS);

    // Solo el intento inicial: el reintento se corta ANTES de arrancar.
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(res.project.retry_count).toBe(0);
    // Side effect por intento ejecutado exactamente una vez, sin duplicar.
    expect(recordPostQaOutcomeMock).toHaveBeenCalledTimes(1);
  });

  it("degradación marcada explícitamente en proyecto y agent_log", async () => {
    process.env.AUTONOMOUS_SKU_BUDGET_MS = "10000";
    vi.useFakeTimers();
    executeMock.mockImplementation(async () => {
      vi.advanceTimersByTime(9_000);
      return failingQa();
    });

    const res = await simulatePhaseC(OPTS);

    expect(res.project.llm_budget_degraded).toBe(true);
    expect(res.project.llm_budget_reason).toContain("reintento");

    const guard = res.project.agent_log.find((e) => e.agent === "llm_budget_guard");
    expect(guard).toBeDefined();
    // Registrada como FALLO, no como éxito LLM normal.
    expect(guard!.status).toBe("failed");
    expect(guard!.model).toBe(LLM_BUDGET_DEGRADED_MODEL);
    expect(guard!.output_artifact).toContain("budget_degraded:");
  });

  it("estado final coherente: sin QA aprobada escala a operador", async () => {
    process.env.AUTONOMOUS_SKU_BUDGET_MS = "10000";
    vi.useFakeTimers();
    executeMock.mockImplementation(async () => {
      vi.advanceTimersByTime(9_000);
      return failingQa();
    });

    const res = await simulatePhaseC(OPTS);

    expect(res.escalated).toBe(true);
    expect(res.project.status).toBe("ESCALATE_OPERATOR");
    // El bundle conserva trazabilidad completa del intento realizado.
    expect(res.output_bundle.retryHistory).toHaveLength(1);
    expect(res.project.qa).not.toBeNull();
  });

  it("presupuesto desactivado (0): comportamiento histórico sin tope", async () => {
    process.env.AUTONOMOUS_SKU_BUDGET_MS = "0";
    vi.useFakeTimers();
    executeMock.mockImplementation(async () => {
      vi.advanceTimersByTime(3_600_000); // una hora por intento
      return failingQa();
    });

    const res = await simulatePhaseC(OPTS);

    expect(executeMock).toHaveBeenCalledTimes(4);
    expect(res.project.llm_budget_degraded).toBeUndefined();
  });
});

/**
 * Fallos deterministas de contrato de entrada: no se reintentan.
 *
 * Un `BRIEF-*` bloqueante depende solo del brief, que es idéntico en todos los
 * intentos, así que reintentar solo gasta llamadas LLM. Los fallos transitorios
 * (calidad, JSON, artefacto ausente) conservan su política de reintento.
 */
describe("simulatePhaseC — reintentos y determinismo", () => {
  beforeEach(() => {
    executeMock.mockReset();
    recordPostQaOutcomeMock.mockClear();
    process.env.AUTONOMOUS_LLM_MODE = "mock";
    process.env.AUTONOMOUS_SKU_BUDGET_MS = "600000";
  });

  function qaCon(checks: Array<{ id: string; passed: boolean; blocking: boolean }>) {
    return { score: 20, passed: false, checks, failed_agents: [] };
  }

  it("BRIEF-* bloqueante: termina de inmediato, sin gastar 3 llamadas más", async () => {
    executeMock.mockImplementation(async () =>
      qaCon([{ id: "BRIEF-bot_name", passed: false, blocking: true }]),
    );

    const res = await simulatePhaseC(OPTS);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(res.project.retry_count).toBe(0);
    expect(res.project.status).toBe("ESCALATE_OPERATOR");
  });

  it("conserva el diagnóstico del fallo determinista", async () => {
    executeMock.mockImplementation(async () =>
      qaCon([{ id: "BRIEF-openai_cost", passed: false, blocking: true }]),
    );

    const res = await simulatePhaseC(OPTS);

    expect(res.output_bundle.retryHistory).toHaveLength(1);
    expect(res.project.qa?.checks?.some((c) => c.id === "BRIEF-openai_cost")).toBe(true);
  });

  it("fallo TRANSITORIO (no BRIEF-*): sigue reintentando los 4 intentos", async () => {
    executeMock.mockImplementation(async () =>
      qaCon([{ id: "STRUCT-knowledge_base", passed: false, blocking: true }]),
    );

    const res = await simulatePhaseC(OPTS);

    expect(executeMock).toHaveBeenCalledTimes(4);
    expect(res.project.retry_count).toBe(3);
  });

  it("BRIEF-* NO bloqueante no corta los reintentos", async () => {
    executeMock.mockImplementation(async () =>
      qaCon([{ id: "BRIEF-tone", passed: false, blocking: false }]),
    );

    const res = await simulatePhaseC(OPTS);

    expect(executeMock).toHaveBeenCalledTimes(4);
  });

  it("mezcla BRIEF-* bloqueante + transitorio: corta, porque el brief no cambiará", async () => {
    executeMock.mockImplementation(async () =>
      qaCon([
        { id: "BRIEF-bot_name", passed: false, blocking: true },
        { id: "STRUCT-config", passed: false, blocking: true },
      ]),
    );

    const res = await simulatePhaseC(OPTS);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(res.project.retry_count).toBe(0);
  });
});

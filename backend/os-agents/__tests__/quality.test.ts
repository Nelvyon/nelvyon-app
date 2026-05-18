import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const completeMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: completeMock }),
  },
}));

import { QualityEvaluatorService } from "../quality/QualityEvaluatorService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

describe("QualityEvaluatorService", () => {
  beforeEach(() => {
    queryMock.mockReset();
    completeMock.mockReset();
  });

  it("evaluate parsea JSON y guarda score", async () => {
    completeMock.mockResolvedValueOnce(
      JSON.stringify({
        score: 99,
        breakdown: {
          especificidad: 20,
          calidad_profesional: 20,
          accionabilidad: 19,
          originalidad: 20,
          impacto_comercial: 20,
        },
        feedback: "ok",
        passed: true,
      }),
    );
    queryMock.mockResolvedValueOnce([]);
    const svc = new QualityEvaluatorService();
    const out = await svc.evaluate(USER_ID, "agent-x", "retail", { a: 1 }, { result: "x" }, 1);
    expect(out.score).toBe(99);
    expect(out.passed).toBe(true);
    expect(String(queryMock.mock.calls[0][0])).toContain("INSERT INTO quality_scores");
  });

  it("evaluateAndImprove pasa en intento 1 si score >= 99", async () => {
    completeMock.mockResolvedValueOnce(
      JSON.stringify({
        score: 100,
        breakdown: { especificidad: 20, calidad_profesional: 20, accionabilidad: 20, originalidad: 20, impacto_comercial: 20 },
        feedback: "perfecto",
        passed: true,
      }),
    );
    queryMock.mockResolvedValue([]);
    const svc = new QualityEvaluatorService();
    const result = await svc.evaluateAndImprove(USER_ID, "agent-a", "tourism", { x: 1 }, { result: "y" }, async () => ({ result: "z" }), 3);
    expect(result.attempts).toBe(1);
    expect(result.score).toBe(100);
  });

  it("evaluateAndImprove reintenta si score < 99", async () => {
    completeMock
      .mockResolvedValueOnce(
        JSON.stringify({
          score: 80,
          breakdown: { especificidad: 16, calidad_profesional: 16, accionabilidad: 16, originalidad: 16, impacto_comercial: 16 },
          feedback: "mejorar especificidad",
          passed: false,
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          score: 99,
          breakdown: { especificidad: 20, calidad_profesional: 20, accionabilidad: 19, originalidad: 20, impacto_comercial: 20 },
          feedback: "ok",
          passed: true,
        }),
      );
    queryMock.mockResolvedValue([]);
    const runFn = vi.fn().mockResolvedValue({ result: "improved" });
    const svc = new QualityEvaluatorService();
    const result = await svc.evaluateAndImprove(USER_ID, "agent-b", "fashion", { i: 1 }, { result: "bad" }, runFn, 3);
    expect(result.attempts).toBe(2);
    expect(runFn).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(99);
  });

  it("evaluateAndImprove devuelve mejor tras 3 intentos", async () => {
    completeMock
      .mockResolvedValueOnce(
        JSON.stringify({
          score: 70,
          breakdown: { especificidad: 14, calidad_profesional: 14, accionabilidad: 14, originalidad: 14, impacto_comercial: 14 },
          feedback: "v1",
          passed: false,
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          score: 85,
          breakdown: { especificidad: 17, calidad_profesional: 17, accionabilidad: 17, originalidad: 17, impacto_comercial: 17 },
          feedback: "v2",
          passed: false,
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          score: 90,
          breakdown: { especificidad: 18, calidad_profesional: 18, accionabilidad: 18, originalidad: 18, impacto_comercial: 18 },
          feedback: "v3",
          passed: false,
        }),
      );
    queryMock.mockResolvedValue([]);
    const runFn = vi
      .fn()
      .mockResolvedValueOnce({ result: "out-2" })
      .mockResolvedValueOnce({ result: "out-3" });
    const svc = new QualityEvaluatorService();
    const result = await svc.evaluateAndImprove(USER_ID, "agent-c", "legal", { i: 1 }, { result: "out-1" }, runFn, 3);
    expect(result.attempts).toBe(3);
    expect(result.score).toBe(90);
    expect(result.output).toEqual({ result: "out-3" });
  });
});

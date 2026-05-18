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

import { LearningService } from "../learning/LearningService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

function makeOutcome(i: number, type: string): Record<string, unknown> {
  return {
    id: `o${i}`,
    user_id: USER_ID,
    agent_id: "agent-x",
    sector: "retail",
    input: { i },
    output: { r: i },
    quality_score: null,
    outcome_type: type,
    outcome_value: "1",
    feedback: null,
    created_at: `2026-01-${String(i).padStart(2, "0")}T00:00:00.000Z`,
  };
}

describe("LearningService", () => {
  beforeEach(() => {
    queryMock.mockReset();
    completeMock.mockReset();
  });

  it("recordOutcome guarda correctamente", async () => {
    queryMock.mockResolvedValueOnce([]);
    const svc = new LearningService();
    await svc.recordOutcome(USER_ID, "agent-x", "retail", { a: 1 }, { b: 2 }, "generated");
    expect(String(queryMock.mock.calls[0][0])).toContain("INSERT INTO agent_outcomes");
  });

  it("analyzePatternsForAgent requiere >= 10 outcomes", async () => {
    queryMock.mockResolvedValueOnce([makeOutcome(1, "generated"), makeOutcome(2, "reply")]);
    const svc = new LearningService();
    await expect(svc.analyzePatternsForAgent("agent-x", "retail")).rejects.toThrow("mínimo 10");
  });

  it("analyzePatternsForAgent devuelve learnings", async () => {
    queryMock
      .mockResolvedValueOnce(Array.from({ length: 10 }).map((_, i) => makeOutcome(i + 1, i % 2 ? "reply" : "ignored")))
      .mockResolvedValueOnce([
        {
          id: "l1",
          agent_id: "agent-x",
          sector: "retail",
          pattern: "p1",
          confidence: "0.8",
          sample_size: "10",
          prompt_improvement: "p1",
          applied: false,
          created_at: "2026-01-11T00:00:00.000Z",
        },
      ]);
    completeMock.mockResolvedValueOnce(JSON.stringify({ patterns: ["p1"], improvements: ["p1"], confidence: 0.8 }));
    const svc = new LearningService();
    const out = await svc.analyzePatternsForAgent("agent-x", "retail");
    expect(out).toHaveLength(1);
    expect(out[0].confidence).toBeCloseTo(0.8);
  });

  it("applyLearnings aplica solo confidence > 0.7", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: "l1",
          agent_id: "agent-x",
          sector: "retail",
          pattern: "a",
          confidence: "0.9",
          sample_size: "12",
          prompt_improvement: "do x",
          applied: false,
          created_at: "2026-01-11T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([]);
    const svc = new LearningService();
    await svc.applyLearnings("agent-x", "retail");
    expect(String(queryMock.mock.calls[1][0])).toContain("UPDATE agent_learnings");
    expect(String(queryMock.mock.calls[1][1][1])).toContain("APRENDIZAJE REAL");
  });

  it("autoLearnCycle procesa agentes con >= 10 outcomes", async () => {
    queryMock
      .mockResolvedValueOnce([{ agent_id: "agent-x", sector: "retail", c: "10" }]) // groups
      .mockResolvedValueOnce(Array.from({ length: 10 }).map((_, i) => makeOutcome(i + 1, "reply"))) // analyze select outcomes
      .mockResolvedValueOnce([
        {
          id: "l1",
          agent_id: "agent-x",
          sector: "retail",
          pattern: "p",
          confidence: "0.8",
          sample_size: "10",
          prompt_improvement: "p",
          applied: false,
          created_at: "2026-01-11T00:00:00.000Z",
        },
      ]) // insert learning
      .mockResolvedValueOnce([
        {
          id: "l1",
          agent_id: "agent-x",
          sector: "retail",
          pattern: "p",
          confidence: "0.8",
          sample_size: "10",
          prompt_improvement: "p",
          applied: false,
          created_at: "2026-01-11T00:00:00.000Z",
        },
      ]) // apply select
      .mockResolvedValueOnce([]); // apply update
    completeMock.mockResolvedValueOnce(JSON.stringify({ patterns: ["p"], improvements: ["p"], confidence: 0.8 }));

    const svc = new LearningService();
    await svc.autoLearnCycle();
    expect(queryMock).toHaveBeenCalled();
  });
});

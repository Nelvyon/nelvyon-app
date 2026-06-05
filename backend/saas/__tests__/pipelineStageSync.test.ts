import { describe, expect, it } from "vitest";

import { pickPrimaryPipelineStage } from "../pipelineStageSync";

describe("pickPrimaryPipelineStage", () => {
  it("elige deal abierto con mayor value", () => {
    const stage = pickPrimaryPipelineStage([
      { stage: "new", value: 1000, updatedAt: "2026-06-01T10:00:00Z" },
      { stage: "proposal", value: 5000, updatedAt: "2026-06-01T09:00:00Z" },
    ]);
    expect(stage).toBe("proposal");
  });

  it("con empate en value usa updated_at más reciente entre abiertos", () => {
    const stage = pickPrimaryPipelineStage([
      { stage: "qualified", value: 3000, updatedAt: "2026-06-01T08:00:00Z" },
      { stage: "contacted", value: 3000, updatedAt: "2026-06-04T08:00:00Z" },
    ]);
    expect(stage).toBe("contacted");
  });

  it("sin abiertos usa won/lost más reciente", () => {
    const stage = pickPrimaryPipelineStage([
      { stage: "won", value: 100, updatedAt: "2026-05-01T10:00:00Z" },
      { stage: "lost", value: 200, updatedAt: "2026-06-02T10:00:00Z" },
    ]);
    expect(stage).toBe("lost");
  });

  it("devuelve null sin deals", () => {
    expect(pickPrimaryPipelineStage([])).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import {
  AntiGenericCalibrationAgent,
  AntiGenericDataAgent,
  AntiGenericDetectorAgent,
  AntiGenericFeedbackAgent,
  AntiGenericRewriterAgent,
  AntiGenericScoreAgent,
  AntiGenericSectorAgent,
  AntiGenericToneAgent,
  resetAllAntiGenericAgentsForTests,
} from "../sectors/antigeneric";

const AG_JSON = JSON.stringify({
  content:
    "AntiGeneric: banned clichés, score <70 rewrite, >90 Elite Quality, sector+KPI+action+outcome required.",
  score: 91,
  highlights: ["Elite Quality", "Sector terms", "Numeric KPI"],
  metrics: ["Specificity score"],
});

const antiGenericInput = {
  userId: "00000000-0000-0000-0000-00000000ag01",
  sector: "clinica",
  brand: "Clínica Norte",
  draftBrief: "Potencia tu negocio con solución integral innovadora.",
  metricsBrief: "Gate 70/90",
};

type AntiGenericOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("AntiGeneric agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AG_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllAntiGenericAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as AntiGenericOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("AntiGenericDetectorAgent", async () => {
    await assertOutput("antigeneric-detector", () => AntiGenericDetectorAgent.instance.run(antiGenericInput));
  });

  it("AntiGenericRewriterAgent", async () => {
    await assertOutput("antigeneric-rewriter", () => AntiGenericRewriterAgent.instance.run(antiGenericInput));
  });

  it("AntiGenericSectorAgent", async () => {
    await assertOutput("antigeneric-sector", () => AntiGenericSectorAgent.instance.run(antiGenericInput));
  });

  it("AntiGenericDataAgent", async () => {
    await assertOutput("antigeneric-data", () => AntiGenericDataAgent.instance.run(antiGenericInput));
  });

  it("AntiGenericToneAgent", async () => {
    await assertOutput("antigeneric-tone", () => AntiGenericToneAgent.instance.run(antiGenericInput));
  });

  it("AntiGenericScoreAgent", async () => {
    await assertOutput("antigeneric-score", () => AntiGenericScoreAgent.instance.run(antiGenericInput));
  });

  it("AntiGenericFeedbackAgent", async () => {
    await assertOutput("antigeneric-feedback", () => AntiGenericFeedbackAgent.instance.run(antiGenericInput));
  });

  it("AntiGenericCalibrationAgent", async () => {
    await assertOutput("antigeneric-calibration", () => AntiGenericCalibrationAgent.instance.run(antiGenericInput));
  });
});

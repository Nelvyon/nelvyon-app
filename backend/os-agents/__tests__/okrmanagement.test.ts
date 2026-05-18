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
  OKRAlignmentAgent,
  OKRCreationAgent,
  OKRTrackingAgent,
  ProjectPlanningAgent,
  ReportingPMAgent,
  ResourceAgent,
  SprintAgent,
  TaskAutomationAgent,
  resetAllOkrManagementAgentsForTests,
} from "../sectors/okrmanagement";

const OM_JSON = JSON.stringify({
  content:
    "OKR PM: OKRs <5 min, tracking 24 h, desvío <1 h, forecast >88%, 0 reuniones, velocity +20%.",
  score: 94,
  highlights: ["OKRs <5 min", "Forecast >88%", "0 reuniones"],
  metrics: ["OKR creation time"],
});

const okrManagementInput = {
  userId: "00000000-0000-0000-0000-00000000om01",
  sector: "saas",
  brand: "SaaS demo",
  okrManagementBrief: "OKR + project management",
  metricsBrief: "OKRs · forecast · velocity",
};

type OkrManagementOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("OkrManagement agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(OM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllOkrManagementAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as OkrManagementOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("OKRCreationAgent", async () => {
    await assertOutput("okrmanagement-okrcreation", () => OKRCreationAgent.instance.run(okrManagementInput));
  });

  it("OKRTrackingAgent", async () => {
    await assertOutput("okrmanagement-okrtracking", () => OKRTrackingAgent.instance.run(okrManagementInput));
  });

  it("OKRAlignmentAgent", async () => {
    await assertOutput("okrmanagement-okralignment", () => OKRAlignmentAgent.instance.run(okrManagementInput));
  });

  it("ProjectPlanningAgent", async () => {
    await assertOutput("okrmanagement-projectplanning", () => ProjectPlanningAgent.instance.run(okrManagementInput));
  });

  it("TaskAutomationAgent", async () => {
    await assertOutput("okrmanagement-taskautomation", () => TaskAutomationAgent.instance.run(okrManagementInput));
  });

  it("SprintAgent", async () => {
    await assertOutput("okrmanagement-sprint", () => SprintAgent.instance.run(okrManagementInput));
  });

  it("ResourceAgent", async () => {
    await assertOutput("okrmanagement-resource", () => ResourceAgent.instance.run(okrManagementInput));
  });

  it("ReportingPMAgent", async () => {
    await assertOutput("okrmanagement-reportingpm", () => ReportingPMAgent.instance.run(okrManagementInput));
  });
});

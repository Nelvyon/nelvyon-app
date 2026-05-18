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
  WorkflowAnalyticsAgent,
  WorkflowBuilderAgent,
  WorkflowConditionAgent,
  WorkflowErrorAgent,
  WorkflowExecutorAgent,
  WorkflowTemplateAgent,
  WorkflowTriggerAgent,
  WorkflowVersionAgent,
  resetAllWorkflowAgentsForTests,
} from "../sectors/workflow";

const WF_JSON = JSON.stringify({
  content:
    "Workflow: multi-step state, templates onboarding8 B2B12 churn5 upsell4, max 50 steps, 3 retries backoff.",
  score: 91,
  highlights: ["Persistent executor", "Template library", "Retry x3"],
  metrics: ["Completion rate"],
});

const workflowInput = {
  userId: "00000000-0000-0000-0000-00000000wf01",
  sector: "b2b_saas",
  brand: "NELVYON OS",
  workflowBrief: "Onboarding 8 pasos",
  metricsBrief: "Completado >70%",
};

type WorkflowOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Workflow agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(WF_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllWorkflowAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as WorkflowOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("WorkflowBuilderAgent", async () => {
    await assertOutput("workflow-builder", () => WorkflowBuilderAgent.instance.run(workflowInput));
  });

  it("WorkflowExecutorAgent", async () => {
    await assertOutput("workflow-executor", () => WorkflowExecutorAgent.instance.run(workflowInput));
  });

  it("WorkflowConditionAgent", async () => {
    await assertOutput("workflow-condition", () => WorkflowConditionAgent.instance.run(workflowInput));
  });

  it("WorkflowTriggerAgent", async () => {
    await assertOutput("workflow-trigger", () => WorkflowTriggerAgent.instance.run(workflowInput));
  });

  it("WorkflowErrorAgent", async () => {
    await assertOutput("workflow-error", () => WorkflowErrorAgent.instance.run(workflowInput));
  });

  it("WorkflowTemplateAgent", async () => {
    await assertOutput("workflow-template", () => WorkflowTemplateAgent.instance.run(workflowInput));
  });

  it("WorkflowAnalyticsAgent", async () => {
    await assertOutput("workflow-analytics", () => WorkflowAnalyticsAgent.instance.run(workflowInput));
  });

  it("WorkflowVersionAgent", async () => {
    await assertOutput("workflow-version", () => WorkflowVersionAgent.instance.run(workflowInput));
  });
});

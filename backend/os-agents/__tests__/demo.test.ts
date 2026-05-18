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
  DemoAnalyticsInsightAgent,
  DemoConversionNudgeAgent,
  DemoFollowUpSequenceAgent,
  DemoObjectionHandlerAgent,
  DemoPersonalizationAgent,
  DemoSandboxDataAgent,
  DemoScriptGeneratorAgent,
  DemoValuePropositionAgent,
  resetAllDemoAgentsForTests,
} from "../sectors/demo";

const DEMO_JSON = JSON.stringify({
  content: "SHOW: Scenario, Hook, Outcome, Win aplicado.",
  score: 88,
  demoSteps: ["Hero sin registro", "Sandbox precargado", "Aha en paso 3", "CTA suave"],
  ctaMessages: ["Ver en 2 min", "Probar datos demo", "Hablar con ventas"],
});

const demoInput = {
  userId: "00000000-0000-0000-0000-0000000099cc",
  sector: "saas",
  visitorType: "founder",
  useCase: "automatizar informes",
  companySize: "10-50",
  painPoint: "Excel manual",
};

describe("Demo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(DEMO_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllDemoAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertDemoOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      demoSteps: string[];
      ctaMessages: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.demoSteps.length).toBeGreaterThanOrEqual(1);
    expect(out.ctaMessages.length).toBeGreaterThanOrEqual(1);
  }

  it("DemoPersonalizationAgent", async () => {
    await assertDemoOutput("demo-personalization", () => DemoPersonalizationAgent.instance.run(demoInput));
  });

  it("DemoScriptGeneratorAgent", async () => {
    await assertDemoOutput("demo-script-generator", () => DemoScriptGeneratorAgent.instance.run(demoInput));
  });

  it("DemoValuePropositionAgent", async () => {
    await assertDemoOutput("demo-value-proposition", () => DemoValuePropositionAgent.instance.run(demoInput));
  });

  it("DemoObjectionHandlerAgent", async () => {
    await assertDemoOutput("demo-objection-handler", () => DemoObjectionHandlerAgent.instance.run(demoInput));
  });

  it("DemoSandboxDataAgent", async () => {
    await assertDemoOutput("demo-sandbox-data", () => DemoSandboxDataAgent.instance.run(demoInput));
  });

  it("DemoConversionNudgeAgent", async () => {
    await assertDemoOutput("demo-conversion-nudge", () => DemoConversionNudgeAgent.instance.run(demoInput));
  });

  it("DemoFollowUpSequenceAgent", async () => {
    await assertDemoOutput("demo-follow-up-sequence", () => DemoFollowUpSequenceAgent.instance.run(demoInput));
  });

  it("DemoAnalyticsInsightAgent", async () => {
    await assertDemoOutput("demo-analytics-insight", () => DemoAnalyticsInsightAgent.instance.run(demoInput));
  });
});

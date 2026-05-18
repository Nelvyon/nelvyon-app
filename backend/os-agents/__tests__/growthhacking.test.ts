// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  GrowthHackingAdquisicionAgent,
  GrowthHackingCanalesAgent,
  GrowthHackingExpansionAgent,
  GrowthHackingExperimentosAgent,
  GrowthHackingOnboardingAgent,
  GrowthHackingPlaybookAgent,
  GrowthHackingRetencionAgent,
  GrowthHackingViralAgent,
  resetAllGrowthHackingAgentsForTests,
} from "../sectors/growthhacking";

const GROWTH_HACKING_JSON = JSON.stringify({
  result: "Growth hacking OS: experimentos 2w, canales ROI y playbook sectorial con compliance.",
  score: 88,
  recommendations: ["Kill metric clara", "Evitar dark patterns", "Legal claims"],
});

const growthHackingInput = {
  userId: "00000000-0000-0000-0000-00000000gh01",
  businessName: "Negocio demo",
  services: ["Amplitude", "Meta Ads"],
  targets: ["PLG", "EU"],
  metadata: { program: "growthhacking_v1" },
};

describe("GrowthHacking agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(GROWTH_HACKING_JSON);
    resetAllGrowthHackingAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("GrowthHackingCanalesAgent", async () => {
    await assertOutput("growthhacking-canales", () => GrowthHackingCanalesAgent.instance().run(growthHackingInput));
  });
  it("GrowthHackingExperimentosAgent", async () => {
    await assertOutput("growthhacking-experimentos", () => GrowthHackingExperimentosAgent.instance().run(growthHackingInput));
  });
  it("GrowthHackingViralAgent", async () => {
    await assertOutput("growthhacking-viral", () => GrowthHackingViralAgent.instance().run(growthHackingInput));
  });
  it("GrowthHackingOnboardingAgent", async () => {
    await assertOutput("growthhacking-onboarding", () => GrowthHackingOnboardingAgent.instance().run(growthHackingInput));
  });
  it("GrowthHackingRetencionAgent", async () => {
    await assertOutput("growthhacking-retencion", () => GrowthHackingRetencionAgent.instance().run(growthHackingInput));
  });
  it("GrowthHackingExpansionAgent", async () => {
    await assertOutput("growthhacking-expansion", () => GrowthHackingExpansionAgent.instance().run(growthHackingInput));
  });
  it("GrowthHackingAdquisicionAgent", async () => {
    await assertOutput("growthhacking-adquisicion", () => GrowthHackingAdquisicionAgent.instance().run(growthHackingInput));
  });
  it("GrowthHackingPlaybookAgent", async () => {
    await assertOutput("growthhacking-playbook", () => GrowthHackingPlaybookAgent.instance().run(growthHackingInput));
  });
});

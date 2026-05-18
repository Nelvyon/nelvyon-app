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
  CopywritingAdsAgent,
  CopywritingEmailsAgent,
  CopywritingGuionesAgent,
  CopywritingHeadlinesAgent,
  CopywritingLandingAgent,
  CopywritingSeoAgent,
  CopywritingStorytellingAgent,
  CopywritingVentasAgent,
  resetAllCopywritingAgentsForTests,
} from "../sectors/copywriting";

const COPYWRITING_JSON = JSON.stringify({
  result: "Copywriting elite OS: ventas, headlines, emails, LP, ads, guiones, SEO y storytelling.",
  score: 91,
  recommendations: ["Un CTA por sección", "Preview text en emails", "Hook 3s en reels"],
});

const copywritingInput = {
  userId: "00000000-0000-0000-0000-00000000cp01",
  businessName: "Marca demo",
  services: ["Email", "Meta"],
  targets: ["B2B", "ES"],
  metadata: { program: "copywriting_v1" },
};

describe("Copywriting agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(COPYWRITING_JSON);
    resetAllCopywritingAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("CopywritingVentasAgent", async () => {
    await assertOutput("copywriting-ventas", () => CopywritingVentasAgent.instance().run(copywritingInput));
  });
  it("CopywritingHeadlinesAgent", async () => {
    await assertOutput("copywriting-headlines", () => CopywritingHeadlinesAgent.instance().run(copywritingInput));
  });
  it("CopywritingEmailsAgent", async () => {
    await assertOutput("copywriting-emails", () => CopywritingEmailsAgent.instance().run(copywritingInput));
  });
  it("CopywritingLandingAgent", async () => {
    await assertOutput("copywriting-landing", () => CopywritingLandingAgent.instance().run(copywritingInput));
  });
  it("CopywritingAdsAgent", async () => {
    await assertOutput("copywriting-ads", () => CopywritingAdsAgent.instance().run(copywritingInput));
  });
  it("CopywritingGuionesAgent", async () => {
    await assertOutput("copywriting-guiones", () => CopywritingGuionesAgent.instance().run(copywritingInput));
  });
  it("CopywritingSeoAgent", async () => {
    await assertOutput("copywriting-seo", () => CopywritingSeoAgent.instance().run(copywritingInput));
  });
  it("CopywritingStorytellingAgent", async () => {
    await assertOutput("copywriting-storytelling", () => CopywritingStorytellingAgent.instance().run(copywritingInput));
  });
});

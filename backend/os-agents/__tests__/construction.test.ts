// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getBuildAdsAgent,
  getBuildBudgetConversionAgent,
  getBuildCompanyProfileAgent,
  getBuildContentMarketingAgent,
  getBuildLeadGenerationAgent,
  getBuildProjectDescriptionAgent,
  getBuildReferralNetworkAgent,
  getBuildReviewSystemAgent,
  getBuildSEOLocalAgent,
  resetBuildAdsAgentForTests,
  resetBuildBudgetConversionAgentForTests,
  resetBuildCompanyProfileAgentForTests,
  resetBuildContentMarketingAgentForTests,
  resetBuildLeadGenerationAgentForTests,
  resetBuildProjectDescriptionAgentForTests,
  resetBuildReferralNetworkAgentForTests,
  resetBuildReviewSystemAgentForTests,
  resetBuildSEOLocalAgentForTests,
} from "../sectors/construction";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Construction Build agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetBuildCompanyProfileAgentForTests();
    resetBuildProjectDescriptionAgentForTests();
    resetBuildLeadGenerationAgentForTests();
    resetBuildContentMarketingAgentForTests();
    resetBuildBudgetConversionAgentForTests();
    resetBuildSEOLocalAgentForTests();
    resetBuildAdsAgentForTests();
    resetBuildReviewSystemAgentForTests();
    resetBuildReferralNetworkAgentForTests();
  });

  const input = { businessName: "Estructuras Norte", serviceType: "constructora", targetClient: "promotores", tone: "profesional", location: "Bilbao" };

  it("BuildCompanyProfileAgent", async () => {
    const r = await getBuildCompanyProfileAgent().run("u", input);
    expect(r.agentId).toBe("build-company-profile");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildProjectDescriptionAgent", async () => {
    const r = await getBuildProjectDescriptionAgent().run("u", input);
    expect(r.agentId).toBe("build-project-description");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildLeadGenerationAgent", async () => {
    const r = await getBuildLeadGenerationAgent().run("u", input);
    expect(r.agentId).toBe("build-lead-generation");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildContentMarketingAgent", async () => {
    const r = await getBuildContentMarketingAgent().run("u", input);
    expect(r.agentId).toBe("build-content-marketing");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildBudgetConversionAgent", async () => {
    const r = await getBuildBudgetConversionAgent().run("u", input);
    expect(r.agentId).toBe("build-budget-conversion");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildSEOLocalAgent", async () => {
    const r = await getBuildSEOLocalAgent().run("u", input);
    expect(r.agentId).toBe("build-seo-local");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildAdsAgent", async () => {
    const r = await getBuildAdsAgent().run("u", input);
    expect(r.agentId).toBe("build-ads");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildReviewSystemAgent", async () => {
    const r = await getBuildReviewSystemAgent().run("u", input);
    expect(r.agentId).toBe("build-review-system");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("BuildReferralNetworkAgent", async () => {
    const r = await getBuildReferralNetworkAgent().run("u", input);
    expect(r.agentId).toBe("build-referral-network");
    expect(r.result.length).toBeGreaterThan(0);
  });
});

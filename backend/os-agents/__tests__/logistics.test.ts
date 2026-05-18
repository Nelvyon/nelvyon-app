// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getLogisticsAdsAgent,
  getLogisticsB2BLeadGenAgent,
  getLogisticsCompanyProfileAgent,
  getLogisticsContentMarketingAgent,
  getLogisticsEcommerceAgent,
  getLogisticsRetentionAgent,
  getLogisticsReviewSystemAgent,
  getLogisticsSEOAgent,
  resetLogisticsAdsAgentForTests,
  resetLogisticsB2BLeadGenAgentForTests,
  resetLogisticsCompanyProfileAgentForTests,
  resetLogisticsContentMarketingAgentForTests,
  resetLogisticsEcommerceAgentForTests,
  resetLogisticsRetentionAgentForTests,
  resetLogisticsReviewSystemAgentForTests,
  resetLogisticsSEOAgentForTests,
} from "../sectors/logistics";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Logistics agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetLogisticsCompanyProfileAgentForTests();
    resetLogisticsB2BLeadGenAgentForTests();
    resetLogisticsEcommerceAgentForTests();
    resetLogisticsContentMarketingAgentForTests();
    resetLogisticsSEOAgentForTests();
    resetLogisticsRetentionAgentForTests();
    resetLogisticsAdsAgentForTests();
    resetLogisticsReviewSystemAgentForTests();
  });

  const input = { businessName: "EuroRuta SL", serviceType: "fulfillment", targetClient: "ecommerce mediano", tone: "profesional", coverage: "nacional" };

  it("LogisticsCompanyProfileAgent", async () => {
    const r = await getLogisticsCompanyProfileAgent().run("u", input);
    expect(r.agentId).toBe("logistics-company-profile");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LogisticsB2BLeadGenAgent", async () => {
    const r = await getLogisticsB2BLeadGenAgent().run("u", input);
    expect(r.agentId).toBe("logistics-b2b-lead-gen");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LogisticsEcommerceAgent", async () => {
    const r = await getLogisticsEcommerceAgent().run("u", input);
    expect(r.agentId).toBe("logistics-ecommerce");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LogisticsContentMarketingAgent", async () => {
    const r = await getLogisticsContentMarketingAgent().run("u", input);
    expect(r.agentId).toBe("logistics-content-marketing");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LogisticsSEOAgent", async () => {
    const r = await getLogisticsSEOAgent().run("u", input);
    expect(r.agentId).toBe("logistics-seo");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LogisticsRetentionAgent", async () => {
    const r = await getLogisticsRetentionAgent().run("u", input);
    expect(r.agentId).toBe("logistics-retention");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LogisticsAdsAgent", async () => {
    const r = await getLogisticsAdsAgent().run("u", input);
    expect(r.agentId).toBe("logistics-ads");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LogisticsReviewSystemAgent", async () => {
    const r = await getLogisticsReviewSystemAgent().run("u", input);
    expect(r.agentId).toBe("logistics-review-system");
    expect(r.result.length).toBeGreaterThan(0);
  });
});

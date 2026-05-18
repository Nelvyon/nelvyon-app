// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getFinanceCompanyProfileAgent,
  getFinanceContentMarketingAgent,
  getFinanceEmailNurturingAgent,
  getFinanceLeadGenerationAgent,
  getFinanceReferralAgent,
  getFinanceRegulatoryContentAgent,
  getFinanceRetentionAgent,
  getFinanceSEOAgent,
  getFinanceThoughtLeadershipAgent,
  getFinanceTrustBuildingAgent,
  resetFinanceCompanyProfileAgentForTests,
  resetFinanceContentMarketingAgentForTests,
  resetFinanceEmailNurturingAgentForTests,
  resetFinanceLeadGenerationAgentForTests,
  resetFinanceReferralAgentForTests,
  resetFinanceRegulatoryContentAgentForTests,
  resetFinanceRetentionAgentForTests,
  resetFinanceSEOAgentForTests,
  resetFinanceThoughtLeadershipAgentForTests,
  resetFinanceTrustBuildingAgentForTests,
} from "../sectors/finance";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Finance agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetFinanceCompanyProfileAgentForTests();
    resetFinanceContentMarketingAgentForTests();
    resetFinanceSEOAgentForTests();
    resetFinanceLeadGenerationAgentForTests();
    resetFinanceEmailNurturingAgentForTests();
    resetFinanceTrustBuildingAgentForTests();
    resetFinanceRegulatoryContentAgentForTests();
    resetFinanceReferralAgentForTests();
    resetFinanceRetentionAgentForTests();
    resetFinanceThoughtLeadershipAgentForTests();
  });

  const input = { companyName: "FinSur", serviceType: "seguros", targetClient: "autónomos", tone: "profesional", regulation: "DGS" };
  it("FinanceCompanyProfileAgent", async () => { const r = await getFinanceCompanyProfileAgent().run("u", input); expect(r.agentId).toBe("finance-company-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceContentMarketingAgent", async () => { const r = await getFinanceContentMarketingAgent().run("u", input); expect(r.agentId).toBe("finance-content-marketing"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceSEOAgent", async () => { const r = await getFinanceSEOAgent().run("u", input); expect(r.agentId).toBe("finance-seo"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceLeadGenerationAgent", async () => { const r = await getFinanceLeadGenerationAgent().run("u", input); expect(r.agentId).toBe("finance-lead-generation"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceEmailNurturingAgent", async () => { const r = await getFinanceEmailNurturingAgent().run("u", input); expect(r.agentId).toBe("finance-email-nurturing"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceTrustBuildingAgent", async () => { const r = await getFinanceTrustBuildingAgent().run("u", input); expect(r.agentId).toBe("finance-trust-building"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceRegulatoryContentAgent", async () => { const r = await getFinanceRegulatoryContentAgent().run("u", input); expect(r.agentId).toBe("finance-regulatory-content"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceReferralAgent", async () => { const r = await getFinanceReferralAgent().run("u", input); expect(r.agentId).toBe("finance-referral"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceRetentionAgent", async () => { const r = await getFinanceRetentionAgent().run("u", input); expect(r.agentId).toBe("finance-retention"); expect(r.result.length).toBeGreaterThan(0); });
  it("FinanceThoughtLeadershipAgent", async () => { const r = await getFinanceThoughtLeadershipAgent().run("u", input); expect(r.agentId).toBe("finance-thought-leadership"); expect(r.result.length).toBeGreaterThan(0); });
});

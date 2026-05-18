// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getAgroB2BOutreachAgent,
  getAgroBrandStoryAgent,
  getAgroDigitalMarketingAgent,
  getAgroExportAgent,
  getAgroProductDescriptionAgent,
  getAgroRetailPresenceAgent,
  getAgroSeasonalCampaignAgent,
  getAgroSustainabilityContentAgent,
  resetAgroB2BOutreachAgentForTests,
  resetAgroBrandStoryAgentForTests,
  resetAgroDigitalMarketingAgentForTests,
  resetAgroExportAgentForTests,
  resetAgroProductDescriptionAgentForTests,
  resetAgroRetailPresenceAgentForTests,
  resetAgroSeasonalCampaignAgentForTests,
  resetAgroSustainabilityContentAgentForTests,
} from "../sectors/agrofood";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Agrofood agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetAgroProductDescriptionAgentForTests();
    resetAgroBrandStoryAgentForTests();
    resetAgroB2BOutreachAgentForTests();
    resetAgroDigitalMarketingAgentForTests();
    resetAgroExportAgentForTests();
    resetAgroSustainabilityContentAgentForTests();
    resetAgroSeasonalCampaignAgentForTests();
    resetAgroRetailPresenceAgentForTests();
  });

  const input = { businessName: "Viñedo del Valle", productType: "vino", targetMarket: "gourmet", tone: "premium", origin: "DOCa Rioja" };

  it("AgroProductDescriptionAgent", async () => {
    const r = await getAgroProductDescriptionAgent().run("u", input);
    expect(r.agentId).toBe("agro-product-description");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("AgroBrandStoryAgent", async () => {
    const r = await getAgroBrandStoryAgent().run("u", input);
    expect(r.agentId).toBe("agro-brand-story");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("AgroB2BOutreachAgent", async () => {
    const r = await getAgroB2BOutreachAgent().run("u", input);
    expect(r.agentId).toBe("agro-b2b-outreach");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("AgroDigitalMarketingAgent", async () => {
    const r = await getAgroDigitalMarketingAgent().run("u", input);
    expect(r.agentId).toBe("agro-digital-marketing");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("AgroExportAgent", async () => {
    const r = await getAgroExportAgent().run("u", input);
    expect(r.agentId).toBe("agro-export");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("AgroSustainabilityContentAgent", async () => {
    const r = await getAgroSustainabilityContentAgent().run("u", input);
    expect(r.agentId).toBe("agro-sustainability-content");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("AgroSeasonalCampaignAgent", async () => {
    const r = await getAgroSeasonalCampaignAgent().run("u", input);
    expect(r.agentId).toBe("agro-seasonal-campaign");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("AgroRetailPresenceAgent", async () => {
    const r = await getAgroRetailPresenceAgent().run("u", input);
    expect(r.agentId).toBe("agro-retail-presence");
    expect(r.result.length).toBeGreaterThan(0);
  });
});

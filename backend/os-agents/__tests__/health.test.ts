// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getHealthAdsAgent,
  getHealthAppointmentNurturingAgent,
  getHealthClinicProfileAgent,
  getHealthContentMarketingAgent,
  getHealthCrisisCommsAgent,
  getHealthPatientEmailAgent,
  getHealthPatientRetentionAgent,
  getHealthReferralAgent,
  getHealthReviewStrategyAgent,
  getHealthSEOLocalAgent,
  resetHealthAdsAgentForTests,
  resetHealthAppointmentNurturingAgentForTests,
  resetHealthClinicProfileAgentForTests,
  resetHealthContentMarketingAgentForTests,
  resetHealthCrisisCommsAgentForTests,
  resetHealthPatientEmailAgentForTests,
  resetHealthPatientRetentionAgentForTests,
  resetHealthReferralAgentForTests,
  resetHealthReviewStrategyAgentForTests,
  resetHealthSEOLocalAgentForTests,
} from "../sectors/health";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Health agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetHealthClinicProfileAgentForTests();
    resetHealthPatientEmailAgentForTests();
    resetHealthContentMarketingAgentForTests();
    resetHealthSEOLocalAgentForTests();
    resetHealthAdsAgentForTests();
    resetHealthReviewStrategyAgentForTests();
    resetHealthReferralAgentForTests();
    resetHealthCrisisCommsAgentForTests();
    resetHealthAppointmentNurturingAgentForTests();
    resetHealthPatientRetentionAgentForTests();
  });

  const input = { clinicName: "Clinica Norte", specialty: "odontología", targetPatient: "adultos", tone: "profesional", location: "Madrid" };
  it("HealthClinicProfileAgent", async () => { const r = await getHealthClinicProfileAgent().run("u", input); expect(r.agentId).toBe("health-clinic-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthPatientEmailAgent", async () => { const r = await getHealthPatientEmailAgent().run("u", input); expect(r.agentId).toBe("health-patient-email"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthContentMarketingAgent", async () => { const r = await getHealthContentMarketingAgent().run("u", input); expect(r.agentId).toBe("health-content-marketing"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthSEOLocalAgent", async () => { const r = await getHealthSEOLocalAgent().run("u", input); expect(r.agentId).toBe("health-seo-local"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthAdsAgent", async () => { const r = await getHealthAdsAgent().run("u", input); expect(r.agentId).toBe("health-ads"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthReviewStrategyAgent", async () => { const r = await getHealthReviewStrategyAgent().run("u", input); expect(r.agentId).toBe("health-review-strategy"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthReferralAgent", async () => { const r = await getHealthReferralAgent().run("u", input); expect(r.agentId).toBe("health-referral"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthCrisisCommsAgent", async () => { const r = await getHealthCrisisCommsAgent().run("u", input); expect(r.agentId).toBe("health-crisis-comms"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthAppointmentNurturingAgent", async () => { const r = await getHealthAppointmentNurturingAgent().run("u", input); expect(r.agentId).toBe("health-appointment-nurturing"); expect(r.result.length).toBeGreaterThan(0); });
  it("HealthPatientRetentionAgent", async () => { const r = await getHealthPatientRetentionAgent().run("u", input); expect(r.agentId).toBe("health-patient-retention"); expect(r.result.length).toBeGreaterThan(0); });
});


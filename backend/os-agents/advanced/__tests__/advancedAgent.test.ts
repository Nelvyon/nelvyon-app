// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

vi.mock("../../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: vi.fn().mockResolvedValue("mocked output with professional value for professional sector and actionable plan."),
    }),
  },
}));

import { OsAgentError } from "../../OsAgentError";
import type { ValidationResult } from "../../AgentQualityService";
import { AdvancedAgentService, type AdvancedAgentSlug } from "../AdvancedAgentService";

const USER_ID = "user-advanced-1";

function makeDeps() {
  const query = vi.fn().mockResolvedValue([{ id: "result-1" }]);
  const quality = {
    buildEnhancedPrompt: vi.fn(async (base: string) => `${base}\nENHANCED`),
    validateOutput: vi.fn<(...args: unknown[]) => Promise<ValidationResult>>(
      async () => ({ valid: true, score: 96, issues: [] }),
    ),
  };
  return { query, quality };
}

describe("AdvancedAgentService", () => {
  it("ecommerce", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.ecommerce(USER_ID, { niche: "beauty" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "ecommerce"]));
  });
  it("chatbot", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.chatbot(USER_ID, { tone: "friendly" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "chatbot"]));
  });
  it("presentation", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.presentation(USER_ID, { audience: "investors" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "presentation"]));
  });
  it("businessPlan", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.businessPlan(USER_ID, { market: "SaaS" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "business-plan"]));
  });
  it("podcast", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.podcast(USER_ID, { format: "interview" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "podcast"]));
  });
  it("appLanding", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.appLanding(USER_ID, { app: "fintech" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "app-landing"]));
  });
  it("recruiting", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.recruiting(USER_ID, { role: "PM" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "recruiting"]));
  });
  it("translation", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.translation(USER_ID, { source: "es", target: "en" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "translation"]));
  });
  it("competitiveAnalysis", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.competitiveAnalysis(USER_ID, { competitors: 5 });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "competitive-analysis"]));
  });
  it("googleMyBusiness", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.googleMyBusiness(USER_ID, { location: "Madrid" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "google-my-business"]));
  });
  it("leadGeneration", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.leadGeneration(USER_ID, { icp: "B2B" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "lead-generation"]));
  });
  it("commercialProposal", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.commercialProposal(USER_ID, { budget: 1000 });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "commercial-proposal"]));
  });
  it("pressKit", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.pressKit(USER_ID, { brand: "Nelvyon" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "press-kit"]));
  });
  it("naming", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    const r = await service.naming(USER_ID, { style: "modern" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "naming"]));
  });

  it("agente inválido", async () => {
    const { query, quality } = makeDeps();
    const service = new AdvancedAgentService({ db: { query }, quality });
    await expect(service.executeBySlug("invalid-agent" as AdvancedAgentSlug, USER_ID, {})).rejects.toBeInstanceOf(OsAgentError);
  });
});

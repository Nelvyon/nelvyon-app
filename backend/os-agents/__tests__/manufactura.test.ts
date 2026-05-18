// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  ManufacturaAnalyticsAgent,
  ManufacturaEmailAgent,
  ManufacturaExportacionAgent,
  ManufacturaLeadGenAgent,
  ManufacturaPreciosAgent,
  ManufacturaReviewsAgent,
  ManufacturaSEOAgent,
  ManufacturaSocialAgent,
  resetAllManufacturaAgentsForTests,
} from "../sectors/manufactura";

const MF_JSON = JSON.stringify({
  result: "Manufactura: B2B industrial, export y pipeline.",
  score: 93,
  recommendations: ["ABM vertical", "Roadmap export", "Embudo feria"],
});

const manufacturaInput = {
  userId: "00000000-0000-0000-0000-00000000mf01",
  businessName: "Manufactura demo",
  services: ["OEM", "mecanizado"],
  targets: ["B2B Europa"],
};

describe("Manufactura agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MF_JSON);
    resetAllManufacturaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("ManufacturaLeadGenAgent", async () => {
    await assertOutput("manufactura-lead-gen", () => ManufacturaLeadGenAgent.instance().run(manufacturaInput));
  });

  it("ManufacturaExportacionAgent", async () => {
    await assertOutput("manufactura-exportacion", () => ManufacturaExportacionAgent.instance().run(manufacturaInput));
  });

  it("ManufacturaPreciosAgent", async () => {
    await assertOutput("manufactura-precios", () => ManufacturaPreciosAgent.instance().run(manufacturaInput));
  });

  it("ManufacturaSEOAgent", async () => {
    await assertOutput("manufactura-seo", () => ManufacturaSEOAgent.instance().run(manufacturaInput));
  });

  it("ManufacturaSocialAgent", async () => {
    await assertOutput("manufactura-social", () => ManufacturaSocialAgent.instance().run(manufacturaInput));
  });

  it("ManufacturaEmailAgent", async () => {
    await assertOutput("manufactura-email", () => ManufacturaEmailAgent.instance().run(manufacturaInput));
  });

  it("ManufacturaReviewsAgent", async () => {
    await assertOutput("manufactura-reviews", () => ManufacturaReviewsAgent.instance().run(manufacturaInput));
  });

  it("ManufacturaAnalyticsAgent", async () => {
    await assertOutput("manufactura-analytics", () => ManufacturaAnalyticsAgent.instance().run(manufacturaInput));
  });
});

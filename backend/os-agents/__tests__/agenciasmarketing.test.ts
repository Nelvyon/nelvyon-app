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
  AgencyBillingAgent,
  AgencyContentAgent,
  AgencySEOAgent,
  CampaignManagementAgent,
  ClientReportingAgent,
  ProspectingAgencyAgent,
  TeamProductivityAgent,
  WhiteLabelDashboardAgent,
  resetAllAgenciasMarketingAgentsForTests,
} from "../sectors/agenciasmarketing";

const AM_JSON = JSON.stringify({
  content:
    "Agencias marketing: reporte <2 min, WL <5 min, propuesta <3 min, 500 clientes, billing 100%, retención >90%.",
  score: 95,
  highlights: ["<2 min reporte", "<5 min WL", ">90% retención"],
  metrics: ["Report turnaround"],
});

const agenciasMarketingInput = {
  userId: "00000000-0000-0000-0000-00000000am01",
  sector: "agencia",
  brand: "Agencia demo",
  agenciasMarketingBrief: "Agencias marketing · reporting",
  metricsBrief: "Reportes · facturación · retención",
};

type AgenciasMarketingOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("AgenciasMarketing agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllAgenciasMarketingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as AgenciasMarketingOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ClientReportingAgent", async () => {
    await assertOutput("agenciasmarketing-clientreporting", () =>
      ClientReportingAgent.instance.run(agenciasMarketingInput),
    );
  });

  it("CampaignManagementAgent", async () => {
    await assertOutput("agenciasmarketing-campaignmanagement", () =>
      CampaignManagementAgent.instance.run(agenciasMarketingInput),
    );
  });

  it("ProspectingAgencyAgent", async () => {
    await assertOutput("agenciasmarketing-prospectingagency", () =>
      ProspectingAgencyAgent.instance.run(agenciasMarketingInput),
    );
  });

  it("WhiteLabelDashboardAgent", async () => {
    await assertOutput("agenciasmarketing-whitelabeldashboard", () =>
      WhiteLabelDashboardAgent.instance.run(agenciasMarketingInput),
    );
  });

  it("AgencyBillingAgent", async () => {
    await assertOutput("agenciasmarketing-agencybilling", () =>
      AgencyBillingAgent.instance.run(agenciasMarketingInput),
    );
  });

  it("TeamProductivityAgent", async () => {
    await assertOutput("agenciasmarketing-teamproductivity", () =>
      TeamProductivityAgent.instance.run(agenciasMarketingInput),
    );
  });

  it("AgencySEOAgent", async () => {
    await assertOutput("agenciasmarketing-agencyseo", () => AgencySEOAgent.instance.run(agenciasMarketingInput));
  });

  it("AgencyContentAgent", async () => {
    await assertOutput("agenciasmarketing-agencycontent", () =>
      AgencyContentAgent.instance.run(agenciasMarketingInput),
    );
  });
});

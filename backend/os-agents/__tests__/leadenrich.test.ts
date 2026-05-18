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
  LeadEnrichCompanyAgent,
  LeadEnrichContactAgent,
  LeadEnrichIntentAgent,
  LeadEnrichProfileAgent,
  LeadEnrichReportAgent,
  LeadEnrichScoreAgent,
  LeadEnrichSegmentAgent,
  LeadEnrichSyncAgent,
  resetAllLeadEnrichAgentsForTests,
} from "../sectors/leadenrich";

const LE_JSON = JSON.stringify({
  content:
    "LeadEnrich: ICP 1-200 FTE, Fit+Intent+Timing score, SQL>75 MQL 50-75, verified contacts, CRM sync <5s.",
  score: 91,
  highlights: ["SQL 78", "ICP match", "CRM sync"],
  metrics: ["Lead Score"],
});

const leadEnrichInput = {
  userId: "00000000-0000-0000-0000-00000000le01",
  sector: "saas",
  brand: "Pipeline Demo",
  leadBrief: "CTO SaaS 120 empleados",
  metricsBrief: "Score medio pipeline",
};

type LeadEnrichOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("LeadEnrich agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(LE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllLeadEnrichAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as LeadEnrichOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("LeadEnrichProfileAgent", async () => {
    await assertOutput("leadenrich-profile", () => LeadEnrichProfileAgent.instance.run(leadEnrichInput));
  });

  it("LeadEnrichCompanyAgent", async () => {
    await assertOutput("leadenrich-company", () => LeadEnrichCompanyAgent.instance.run(leadEnrichInput));
  });

  it("LeadEnrichIntentAgent", async () => {
    await assertOutput("leadenrich-intent", () => LeadEnrichIntentAgent.instance.run(leadEnrichInput));
  });

  it("LeadEnrichScoreAgent", async () => {
    await assertOutput("leadenrich-score", () => LeadEnrichScoreAgent.instance.run(leadEnrichInput));
  });

  it("LeadEnrichSegmentAgent", async () => {
    await assertOutput("leadenrich-segment", () => LeadEnrichSegmentAgent.instance.run(leadEnrichInput));
  });

  it("LeadEnrichContactAgent", async () => {
    await assertOutput("leadenrich-contact", () => LeadEnrichContactAgent.instance.run(leadEnrichInput));
  });

  it("LeadEnrichSyncAgent", async () => {
    await assertOutput("leadenrich-sync", () => LeadEnrichSyncAgent.instance.run(leadEnrichInput));
  });

  it("LeadEnrichReportAgent", async () => {
    await assertOutput("leadenrich-report", () => LeadEnrichReportAgent.instance.run(leadEnrichInput));
  });
});

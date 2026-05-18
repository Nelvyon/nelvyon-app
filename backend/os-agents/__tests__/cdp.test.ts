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
  AudienceSyncAgent,
  ConsentManagementAgent,
  DataEnrichmentCDPAgent,
  DataIngestionAgent,
  IdentityResolutionAgent,
  PredictiveAudienceAgent,
  ProfileUnificationAgent,
  SegmentBuilderAgent,
  resetAllCdpAgentsForTests,
} from "../sectors/cdp";

const CDP_JSON = JSON.stringify({
  content:
    "CDP: identity >95%, perfil <2 s, segmentos <1 min, sync ads <5 min, GDPR 100%, lookalikes <10 min.",
  score: 95,
  highlights: [">95% identity", "<2 s profile", "GDPR auto"],
  metrics: ["Identity match rate"],
});

const cdpInput = {
  userId: "00000000-0000-0000-0000-00000000cdp1",
  sector: "saas",
  brand: "SaaS demo",
  cdpBrief: "CDP · identidad · audiencias",
  metricsBrief: "Identity · segmentos · consent",
};

type CdpOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("CDP agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CDP_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllCdpAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as CdpOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("IdentityResolutionAgent", async () => {
    await assertOutput("cdp-identityresolution", () => IdentityResolutionAgent.instance.run(cdpInput));
  });

  it("ProfileUnificationAgent", async () => {
    await assertOutput("cdp-profileunification", () => ProfileUnificationAgent.instance.run(cdpInput));
  });

  it("SegmentBuilderAgent", async () => {
    await assertOutput("cdp-segmentbuilder", () => SegmentBuilderAgent.instance.run(cdpInput));
  });

  it("DataIngestionAgent", async () => {
    await assertOutput("cdp-dataingestion", () => DataIngestionAgent.instance.run(cdpInput));
  });

  it("AudienceSyncAgent", async () => {
    await assertOutput("cdp-audiencesync", () => AudienceSyncAgent.instance.run(cdpInput));
  });

  it("ConsentManagementAgent", async () => {
    await assertOutput("cdp-consentmanagement", () => ConsentManagementAgent.instance.run(cdpInput));
  });

  it("DataEnrichmentCDPAgent", async () => {
    await assertOutput("cdp-dataenrichmentcdp", () => DataEnrichmentCDPAgent.instance.run(cdpInput));
  });

  it("PredictiveAudienceAgent", async () => {
    await assertOutput("cdp-predictiveaudience", () => PredictiveAudienceAgent.instance.run(cdpInput));
  });
});

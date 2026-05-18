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
  ApolloAnalyticsAgent,
  ApolloAuthAgent,
  ApolloEmailAgent,
  ApolloEnrichAgent,
  ApolloIntentAgent,
  ApolloProspectAgent,
  ApolloSequenceAgent,
  ApolloSyncAgent,
  resetAllApolloAgentsForTests,
} from "../sectors/apollo";

const AP_JSON = JSON.stringify({
  content:
    "Apollo: API key, prospect ICP filters, enrich email/LinkedIn, sequence D1/D3/D5/D8/D12, reply>8% meetings>2%, intent 0-100, CRM sync.",
  score: 91,
  highlights: ["5-step sequence", "Buyer intent", "CRM sync"],
  metrics: ["Reply rate"],
});

const apolloInput = {
  userId: "00000000-0000-0000-0000-00000000ap01",
  sector: "b2b_saas",
  brand: "Apollo Demo",
  verticalBrief: "VP Sales ICP",
  metricsBrief: "Reply rate >8%",
};

type ApolloOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Apollo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AP_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllApolloAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ApolloOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ApolloAuthAgent", async () => {
    await assertOutput("apollo-auth", () => ApolloAuthAgent.instance.run(apolloInput));
  });

  it("ApolloProspectAgent", async () => {
    await assertOutput("apollo-prospect", () => ApolloProspectAgent.instance.run(apolloInput));
  });

  it("ApolloEnrichAgent", async () => {
    await assertOutput("apollo-enrich", () => ApolloEnrichAgent.instance.run(apolloInput));
  });

  it("ApolloSequenceAgent", async () => {
    await assertOutput("apollo-sequence", () => ApolloSequenceAgent.instance.run(apolloInput));
  });

  it("ApolloEmailAgent", async () => {
    await assertOutput("apollo-email", () => ApolloEmailAgent.instance.run(apolloInput));
  });

  it("ApolloIntentAgent", async () => {
    await assertOutput("apollo-intent", () => ApolloIntentAgent.instance.run(apolloInput));
  });

  it("ApolloAnalyticsAgent", async () => {
    await assertOutput("apollo-analytics", () => ApolloAnalyticsAgent.instance.run(apolloInput));
  });

  it("ApolloSyncAgent", async () => {
    await assertOutput("apollo-sync", () => ApolloSyncAgent.instance.run(apolloInput));
  });
});

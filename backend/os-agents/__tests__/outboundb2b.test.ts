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
  OutboundB2BAnalyticsAgent,
  OutboundB2BCopywriterAgent,
  OutboundB2BFollowUpAgent,
  OutboundB2BMeetingAgent,
  OutboundB2BProspectorAgent,
  OutboundB2BQualifierAgent,
  OutboundB2BResearchAgent,
  OutboundB2BSequenceAgent,
  resetAllOutboundB2BAgentsForTests,
} from "../sectors/outboundb2b";

const OB_JSON = JSON.stringify({
  content:
    "OutboundB2B: ICP prospect, trigger research, personalized D1-D12, >12% reply, >3% meetings, 50/day cap.",
  score: 91,
  highlights: ["D1-D12 sequence", ">12% reply", "Trigger cited"],
  metrics: ["Meeting rate"],
});

const outboundB2BInput = {
  userId: "00000000-0000-0000-0000-00000000ob01",
  sector: "saas",
  brand: "NELVYON outbound",
  outboundBrief: "ICP 1-200 FTE · VP Marketing",
  metricsBrief: "Reply y meeting rate",
};

type OutboundB2BOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("OutboundB2B agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(OB_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllOutboundB2BAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as OutboundB2BOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("OutboundB2BProspectorAgent", async () => {
    await assertOutput("outboundb2b-prospector", () => OutboundB2BProspectorAgent.instance.run(outboundB2BInput));
  });

  it("OutboundB2BResearchAgent", async () => {
    await assertOutput("outboundb2b-research", () => OutboundB2BResearchAgent.instance.run(outboundB2BInput));
  });

  it("OutboundB2BCopywriterAgent", async () => {
    await assertOutput("outboundb2b-copywriter", () => OutboundB2BCopywriterAgent.instance.run(outboundB2BInput));
  });

  it("OutboundB2BSequenceAgent", async () => {
    await assertOutput("outboundb2b-sequence", () => OutboundB2BSequenceAgent.instance.run(outboundB2BInput));
  });

  it("OutboundB2BFollowUpAgent", async () => {
    await assertOutput("outboundb2b-followup", () => OutboundB2BFollowUpAgent.instance.run(outboundB2BInput));
  });

  it("OutboundB2BQualifierAgent", async () => {
    await assertOutput("outboundb2b-qualifier", () => OutboundB2BQualifierAgent.instance.run(outboundB2BInput));
  });

  it("OutboundB2BMeetingAgent", async () => {
    await assertOutput("outboundb2b-meeting", () => OutboundB2BMeetingAgent.instance.run(outboundB2BInput));
  });

  it("OutboundB2BAnalyticsAgent", async () => {
    await assertOutput("outboundb2b-analytics", () => OutboundB2BAnalyticsAgent.instance.run(outboundB2BInput));
  });
});

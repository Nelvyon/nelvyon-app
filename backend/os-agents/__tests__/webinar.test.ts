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
  WebinarAnalyticsAgent,
  WebinarCreationAgent,
  WebinarEngagementAgent,
  WebinarFollowUpAgent,
  WebinarMonetizationAgent,
  WebinarPromotionAgent,
  WebinarRecordingAgent,
  WebinarVideoHostingAgent,
  resetAllWebinarAgentsForTests,
} from "../sectors/webinar";

const WB_JSON = JSON.stringify({
  content:
    "Webinar: asistencia >60%, engagement >70%, conversión >15%, replay >3×, >2.000€/webinar, setup <10 min.",
  score: 94,
  highlights: [">60% asistencia", ">70% engagement", ">15% conversión"],
  metrics: ["Attendance rate"],
});

const webinarInput = {
  userId: "00000000-0000-0000-0000-00000000wb01",
  sector: "saas",
  brand: "SaaS demo",
  webinarBrief: "Webinar + video hosting",
  metricsBrief: "Asistencia · engagement",
};

type WebinarOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Webinar agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(WB_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllWebinarAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as WebinarOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("WebinarCreationAgent", async () => {
    await assertOutput("webinar-creation", () => WebinarCreationAgent.instance.run(webinarInput));
  });

  it("WebinarPromotionAgent", async () => {
    await assertOutput("webinar-promotion", () => WebinarPromotionAgent.instance.run(webinarInput));
  });

  it("WebinarEngagementAgent", async () => {
    await assertOutput("webinar-engagement", () => WebinarEngagementAgent.instance.run(webinarInput));
  });

  it("WebinarRecordingAgent", async () => {
    await assertOutput("webinar-recording", () => WebinarRecordingAgent.instance.run(webinarInput));
  });

  it("WebinarMonetizationAgent", async () => {
    await assertOutput("webinar-monetization", () => WebinarMonetizationAgent.instance.run(webinarInput));
  });

  it("WebinarAnalyticsAgent", async () => {
    await assertOutput("webinar-analytics", () => WebinarAnalyticsAgent.instance.run(webinarInput));
  });

  it("WebinarFollowUpAgent", async () => {
    await assertOutput("webinar-followup", () => WebinarFollowUpAgent.instance.run(webinarInput));
  });

  it("WebinarVideoHostingAgent", async () => {
    await assertOutput("webinar-videohosting", () => WebinarVideoHostingAgent.instance.run(webinarInput));
  });
});

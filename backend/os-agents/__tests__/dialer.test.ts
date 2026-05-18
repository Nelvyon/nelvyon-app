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
  DialerAnalyticsAgent,
  DialerAutoAgent,
  DialerCoachingAgent,
  DialerFollowUpAgent,
  DialerRecordingAgent,
  DialerScriptAgent,
  DialerTranscriptionAgent,
  DialerVoicemailAgent,
  resetAllDialerAgentsForTests,
} from "../sectors/dialer";

const DL_JSON = JSON.stringify({
  content:
    "Dialer: >35% connect, script <3 s, transcripción <1 s, CRM <30 s, compliance 195 países, 0 manual post-call.",
  score: 94,
  highlights: [">35% connect", "<3 s script", "CRM <30 s"],
  metrics: ["Connect rate"],
});

const dialerInput = {
  userId: "00000000-0000-0000-0000-00000000dl01",
  sector: "saas",
  brand: "SaaS demo",
  dialerBrief: "Dialer nativo sales",
  metricsBrief: "Connect · transcripción",
};

type DialerOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Dialer agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(DL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllDialerAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as DialerOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("DialerAutoAgent", async () => {
    await assertOutput("dialer-auto", () => DialerAutoAgent.instance.run(dialerInput));
  });

  it("DialerScriptAgent", async () => {
    await assertOutput("dialer-script", () => DialerScriptAgent.instance.run(dialerInput));
  });

  it("DialerTranscriptionAgent", async () => {
    await assertOutput("dialer-transcription", () => DialerTranscriptionAgent.instance.run(dialerInput));
  });

  it("DialerCoachingAgent", async () => {
    await assertOutput("dialer-coaching", () => DialerCoachingAgent.instance.run(dialerInput));
  });

  it("DialerRecordingAgent", async () => {
    await assertOutput("dialer-recording", () => DialerRecordingAgent.instance.run(dialerInput));
  });

  it("DialerAnalyticsAgent", async () => {
    await assertOutput("dialer-analytics", () => DialerAnalyticsAgent.instance.run(dialerInput));
  });

  it("DialerFollowUpAgent", async () => {
    await assertOutput("dialer-followup", () => DialerFollowUpAgent.instance.run(dialerInput));
  });

  it("DialerVoicemailAgent", async () => {
    await assertOutput("dialer-voicemail", () => DialerVoicemailAgent.instance.run(dialerInput));
  });
});

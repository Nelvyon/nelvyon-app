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
  VoiceAgentAnalyticsAgent,
  VoiceAgentCallerAgent,
  VoiceAgentComplianceAgent,
  VoiceAgentFollowUpAgent,
  VoiceAgentQualifierAgent,
  VoiceAgentScriptAgent,
  VoiceAgentSummaryAgent,
  VoiceAgentTranscriberAgent,
  resetAllVoiceAgentsForTests,
} from "../sectors/voiceagent";

const VA_JSON = JSON.stringify({
  content:
    "VoiceAgent: 3-7m calls, live sentiment, objection handlers, GDPR consent, 09-20 local, transcript + CRM follow-up.",
  score: 91,
  highlights: ["GDPR consent", "3-7 min", "Live sentiment"],
  metrics: ["Call duration"],
});

const voiceAgentInput = {
  userId: "00000000-0000-0000-0000-00000000va01",
  sector: "saas",
  brand: "NELVYON voice",
  voiceBrief: "Outbound qualificación B2B",
  metricsBrief: "Conv y sentiment",
};

type VoiceAgentOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("VoiceAgent agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(VA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllVoiceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as VoiceAgentOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceAgentCallerAgent", async () => {
    await assertOutput("voiceagent-caller", () => VoiceAgentCallerAgent.instance.run(voiceAgentInput));
  });

  it("VoiceAgentTranscriberAgent", async () => {
    await assertOutput("voiceagent-transcriber", () => VoiceAgentTranscriberAgent.instance.run(voiceAgentInput));
  });

  it("VoiceAgentSummaryAgent", async () => {
    await assertOutput("voiceagent-summary", () => VoiceAgentSummaryAgent.instance.run(voiceAgentInput));
  });

  it("VoiceAgentQualifierAgent", async () => {
    await assertOutput("voiceagent-qualifier", () => VoiceAgentQualifierAgent.instance.run(voiceAgentInput));
  });

  it("VoiceAgentFollowUpAgent", async () => {
    await assertOutput("voiceagent-followup", () => VoiceAgentFollowUpAgent.instance.run(voiceAgentInput));
  });

  it("VoiceAgentScriptAgent", async () => {
    await assertOutput("voiceagent-script", () => VoiceAgentScriptAgent.instance.run(voiceAgentInput));
  });

  it("VoiceAgentAnalyticsAgent", async () => {
    await assertOutput("voiceagent-analytics", () => VoiceAgentAnalyticsAgent.instance.run(voiceAgentInput));
  });

  it("VoiceAgentComplianceAgent", async () => {
    await assertOutput("voiceagent-compliance", () => VoiceAgentComplianceAgent.instance.run(voiceAgentInput));
  });
});

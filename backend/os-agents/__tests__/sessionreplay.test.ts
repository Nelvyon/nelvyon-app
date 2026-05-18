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
  ABReplayAgent,
  FunnelReplayAgent,
  HeatmapAgent,
  InsightAgent,
  PrivacyMaskingAgent,
  RageClickAgent,
  SegmentReplayAgent,
  SessionRecordingAgent,
  resetAllSessionReplayAgentsForTests,
} from "../sectors/sessionreplay";

const SR_JSON = JSON.stringify({
  content:
    "Session replay: <1% CPU, heatmap <60 s, rage <30 s, GDPR 100%, insights <5 min, masking 100%.",
  score: 94,
  highlights: ["<1% CPU", "<60 s heatmap", "GDPR 100%"],
  metrics: ["Recording CPU impact"],
});

const sessionReplayInput = {
  userId: "00000000-0000-0000-0000-00000000sr01",
  sector: "saas",
  brand: "SaaS demo",
  sessionReplayBrief: "Session replay · heatmaps",
  metricsBrief: "CPU · heatmap · GDPR",
};

type SessionReplayOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SessionReplay agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SR_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSessionReplayAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SessionReplayOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SessionRecordingAgent", async () => {
    await assertOutput("sessionreplay-sessionrecording", () =>
      SessionRecordingAgent.instance.run(sessionReplayInput),
    );
  });

  it("HeatmapAgent", async () => {
    await assertOutput("sessionreplay-heatmap", () => HeatmapAgent.instance.run(sessionReplayInput));
  });

  it("RageClickAgent", async () => {
    await assertOutput("sessionreplay-rageclick", () => RageClickAgent.instance.run(sessionReplayInput));
  });

  it("FunnelReplayAgent", async () => {
    await assertOutput("sessionreplay-funnelreplay", () => FunnelReplayAgent.instance.run(sessionReplayInput));
  });

  it("SegmentReplayAgent", async () => {
    await assertOutput("sessionreplay-segmentreplay", () => SegmentReplayAgent.instance.run(sessionReplayInput));
  });

  it("InsightAgent", async () => {
    await assertOutput("sessionreplay-insight", () => InsightAgent.instance.run(sessionReplayInput));
  });

  it("ABReplayAgent", async () => {
    await assertOutput("sessionreplay-abreplay", () => ABReplayAgent.instance.run(sessionReplayInput));
  });

  it("PrivacyMaskingAgent", async () => {
    await assertOutput("sessionreplay-privacymasking", () => PrivacyMaskingAgent.instance.run(sessionReplayInput));
  });
});

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
  GCalZoomAnalyticsAgent,
  GCalZoomAuthAgent,
  GCalZoomFollowUpAgent,
  GCalZoomRecorderAgent,
  GCalZoomReminderAgent,
  GCalZoomSchedulerAgent,
  GCalZoomSyncAgent,
  GCalZoomTemplateAgent,
  resetAllGCalZoomAgentsForTests,
} from "../sectors/gcalzoom";

const GZ_JSON = JSON.stringify({
  content:
    "Google Calendar + Zoom: OAuth dual, follow-up 30 min, no-show 5 min email, recording summary <2 min.",
  score: 91,
  highlights: ["Zoom join", "IA summary", "Action items"],
  metrics: ["no-show %"],
});

const gcalZoomInput = {
  userId: "00000000-0000-0000-0000-00000000gz01",
  sector: "saas",
  brand: "CS Team",
  meetingType: "review_mensual" as const,
  meetingBrief: "QBR cliente Enterprise",
  metricsBrief: "Grabar y resumir",
};

type GCalZoomOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("GCalZoom agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(GZ_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllGCalZoomAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as GCalZoomOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("GCalZoomAuthAgent", async () => {
    await assertOutput("gcalzoom-auth", () => GCalZoomAuthAgent.instance.run(gcalZoomInput));
  });

  it("GCalZoomSchedulerAgent", async () => {
    await assertOutput("gcalzoom-scheduler", () => GCalZoomSchedulerAgent.instance.run(gcalZoomInput));
  });

  it("GCalZoomReminderAgent", async () => {
    await assertOutput("gcalzoom-reminder", () => GCalZoomReminderAgent.instance.run(gcalZoomInput));
  });

  it("GCalZoomRecorderAgent", async () => {
    await assertOutput("gcalzoom-recorder", () => GCalZoomRecorderAgent.instance.run(gcalZoomInput));
  });

  it("GCalZoomSyncAgent", async () => {
    await assertOutput("gcalzoom-sync", () => GCalZoomSyncAgent.instance.run(gcalZoomInput));
  });

  it("GCalZoomFollowUpAgent", async () => {
    await assertOutput("gcalzoom-followup", () => GCalZoomFollowUpAgent.instance.run(gcalZoomInput));
  });

  it("GCalZoomAnalyticsAgent", async () => {
    await assertOutput("gcalzoom-analytics", () => GCalZoomAnalyticsAgent.instance.run(gcalZoomInput));
  });

  it("GCalZoomTemplateAgent", async () => {
    await assertOutput("gcalzoom-template", () => GCalZoomTemplateAgent.instance.run(gcalZoomInput));
  });
});

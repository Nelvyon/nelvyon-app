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
  SlackAlertAgent,
  SlackAnalyticsAgent,
  SlackAuthAgent,
  SlackCommandAgent,
  SlackDigestAgent,
  SlackNotifierAgent,
  SlackReportAgent,
  SlackSyncAgent,
  resetAllSlackAgentsForTests,
} from "../sectors/slack";

const SL_JSON = JSON.stringify({
  content:
    "Slack: OAuth2 app, auto notify churn/billing/SLA, /nelvyon commands, 09:00 digest, Block Kit, CRM sync.",
  score: 91,
  highlights: ["/nelvyon status", "Block Kit", "Digest 09:00"],
  metrics: ["Engagement"],
});

const slackInput = {
  userId: "00000000-0000-0000-0000-00000000sl01",
  sector: "saas",
  brand: "Slack Workspace",
  workspaceBrief: "#alerts #metrics",
  metricsBrief: "Digest diario activo",
};

type SlackOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Slack agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSlackAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SlackOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SlackAuthAgent", async () => {
    await assertOutput("slack-auth", () => SlackAuthAgent.instance.run(slackInput));
  });

  it("SlackNotifierAgent", async () => {
    await assertOutput("slack-notifier", () => SlackNotifierAgent.instance.run(slackInput));
  });

  it("SlackReportAgent", async () => {
    await assertOutput("slack-report", () => SlackReportAgent.instance.run(slackInput));
  });

  it("SlackAlertAgent", async () => {
    await assertOutput("slack-alert", () => SlackAlertAgent.instance.run(slackInput));
  });

  it("SlackCommandAgent", async () => {
    await assertOutput("slack-command", () => SlackCommandAgent.instance.run(slackInput));
  });

  it("SlackDigestAgent", async () => {
    await assertOutput("slack-digest", () => SlackDigestAgent.instance.run(slackInput));
  });

  it("SlackSyncAgent", async () => {
    await assertOutput("slack-sync", () => SlackSyncAgent.instance.run(slackInput));
  });

  it("SlackAnalyticsAgent", async () => {
    await assertOutput("slack-analytics", () => SlackAnalyticsAgent.instance.run(slackInput));
  });
});

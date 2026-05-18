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
  ChatWidgetAnalyticsAgent,
  ChatWidgetConversationAgent,
  ChatWidgetIntegrationAgent,
  ChatWidgetLeadCaptureAgent,
  ChatWidgetPersonalizationAgent,
  ChatWidgetProactiveAgent,
  ChatWidgetSupportAgent,
  ChatWidgetTrainingAgent,
  resetAllChatWidgetAgentsForTests,
} from "../sectors/chatwidget";

const CW_JSON = JSON.stringify({
  content:
    "ChatWidget: respuesta <2s, lead capture >25%, resolución >80%, personalización 1ª visita, 24/7, CSAT >4.5.",
  score: 94,
  highlights: ["<2s", ">25% leads", ">80% auto"],
  metrics: ["Chat CSAT"],
});

const chatWidgetInput = {
  userId: "00000000-0000-0000-0000-00000000cw01",
  sector: "saas",
  brand: "SaaS demo",
  chatBrief: "Widget 24/7 · leads · soporte",
  metricsBrief: "Lead capture · CSAT",
};

type ChatWidgetOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("ChatWidget agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CW_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllChatWidgetAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ChatWidgetOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ChatWidgetConversationAgent", async () => {
    await assertOutput("chatwidget-conversation", () => ChatWidgetConversationAgent.instance.run(chatWidgetInput));
  });

  it("ChatWidgetLeadCaptureAgent", async () => {
    await assertOutput("chatwidget-leadcapture", () => ChatWidgetLeadCaptureAgent.instance.run(chatWidgetInput));
  });

  it("ChatWidgetSupportAgent", async () => {
    await assertOutput("chatwidget-support", () => ChatWidgetSupportAgent.instance.run(chatWidgetInput));
  });

  it("ChatWidgetPersonalizationAgent", async () => {
    await assertOutput("chatwidget-personalization", () =>
      ChatWidgetPersonalizationAgent.instance.run(chatWidgetInput),
    );
  });

  it("ChatWidgetProactiveAgent", async () => {
    await assertOutput("chatwidget-proactive", () => ChatWidgetProactiveAgent.instance.run(chatWidgetInput));
  });

  it("ChatWidgetAnalyticsAgent", async () => {
    await assertOutput("chatwidget-analytics", () => ChatWidgetAnalyticsAgent.instance.run(chatWidgetInput));
  });

  it("ChatWidgetIntegrationAgent", async () => {
    await assertOutput("chatwidget-integration", () => ChatWidgetIntegrationAgent.instance.run(chatWidgetInput));
  });

  it("ChatWidgetTrainingAgent", async () => {
    await assertOutput("chatwidget-training", () => ChatWidgetTrainingAgent.instance.run(chatWidgetInput));
  });
});

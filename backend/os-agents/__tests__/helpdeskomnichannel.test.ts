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
  HelpDeskOmnichannelAnalyticsAgent,
  HelpDeskOmnichannelChatAgent,
  HelpDeskOmnichannelEmailAgent,
  HelpDeskOmnichannelEscalationAgent,
  HelpDeskOmnichannelKnowledgeAgent,
  HelpDeskOmnichannelTicketAgent,
  HelpDeskOmnichannelVoiceAgent,
  HelpDeskOmnichannelWhatsAppAgent,
  resetAllHelpDeskOmnichannelAgentsForTests,
} from "../sectors/helpdeskomnichannel";

const HDO_JSON = JSON.stringify({
  content:
    "HelpDeskOmnichannel: FRT <2 min, >75% auto, CSAT >4.7, omnicanal, SLA realtime, 0% tickets perdidos.",
  score: 94,
  highlights: ["<2 min FRT", ">75% auto", "CSAT >4.7"],
  metrics: ["CSAT"],
});

const helpDeskOmnichannelInput = {
  userId: "00000000-0000-0000-0000-00000000hd01",
  sector: "saas",
  brand: "SaaS demo",
  helpdeskBrief: "Omnicanal · SLA · CSAT",
  metricsBrief: "FRT · CSAT",
};

type HelpDeskOmnichannelOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("HelpDeskOmnichannel agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(HDO_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllHelpDeskOmnichannelAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as HelpDeskOmnichannelOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("HelpDeskOmnichannelTicketAgent", async () => {
    await assertOutput("helpdeskomnichannel-ticket", () => HelpDeskOmnichannelTicketAgent.instance.run(helpDeskOmnichannelInput));
  });

  it("HelpDeskOmnichannelEmailAgent", async () => {
    await assertOutput("helpdeskomnichannel-email", () => HelpDeskOmnichannelEmailAgent.instance.run(helpDeskOmnichannelInput));
  });

  it("HelpDeskOmnichannelChatAgent", async () => {
    await assertOutput("helpdeskomnichannel-chat", () => HelpDeskOmnichannelChatAgent.instance.run(helpDeskOmnichannelInput));
  });

  it("HelpDeskOmnichannelWhatsAppAgent", async () => {
    await assertOutput("helpdeskomnichannel-whatsapp", () =>
      HelpDeskOmnichannelWhatsAppAgent.instance.run(helpDeskOmnichannelInput),
    );
  });

  it("HelpDeskOmnichannelVoiceAgent", async () => {
    await assertOutput("helpdeskomnichannel-voice", () => HelpDeskOmnichannelVoiceAgent.instance.run(helpDeskOmnichannelInput));
  });

  it("HelpDeskOmnichannelAnalyticsAgent", async () => {
    await assertOutput("helpdeskomnichannel-analytics", () =>
      HelpDeskOmnichannelAnalyticsAgent.instance.run(helpDeskOmnichannelInput),
    );
  });

  it("HelpDeskOmnichannelEscalationAgent", async () => {
    await assertOutput("helpdeskomnichannel-escalation", () =>
      HelpDeskOmnichannelEscalationAgent.instance.run(helpDeskOmnichannelInput),
    );
  });

  it("HelpDeskOmnichannelKnowledgeAgent", async () => {
    await assertOutput("helpdeskomnichannel-knowledge", () =>
      HelpDeskOmnichannelKnowledgeAgent.instance.run(helpDeskOmnichannelInput),
    );
  });
});

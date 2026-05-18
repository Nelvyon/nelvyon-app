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
  ZapierActionAgent,
  ZapierAnalyticsAgent,
  ZapierAuthAgent,
  ZapierErrorAgent,
  ZapierMappingAgent,
  ZapierTemplateAgent,
  ZapierTriggerAgent,
  ZapierWebhookAgent,
  resetAllZapierAgentsForTests,
} from "../sectors/zapier";

const ZP_JSON = JSON.stringify({
  content:
    "Zapier/Make: triggers NAT billing.paid, acción run_agent, plantillas churn→email, webhooks estándar.",
  score: 91,
  highlights: ["zapier + make", "OAuth2", "Templates"],
  metrics: ["exec/día"],
});

const zapierInput = {
  userId: "00000000-0000-0000-0000-00000000zp01",
  sector: "integrations",
  brand: "IntegrationDemo",
  platform: "both" as const,
  triggerEvent: "churn.detected" as const,
  actionType: "trigger_campaign" as const,
  workflowBrief: "Churn → Email rescate",
  metricsBrief: "QA escenarios Make",
};

type ZapierOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Zapier agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(ZP_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllZapierAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ZapierOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ZapierTriggerAgent", async () => {
    await assertOutput("zapier-trigger", () => ZapierTriggerAgent.instance.run(zapierInput));
  });

  it("ZapierActionAgent", async () => {
    await assertOutput("zapier-action", () => ZapierActionAgent.instance.run(zapierInput));
  });

  it("ZapierAuthAgent", async () => {
    await assertOutput("zapier-auth", () => ZapierAuthAgent.instance.run(zapierInput));
  });

  it("ZapierWebhookAgent", async () => {
    await assertOutput("zapier-webhook", () => ZapierWebhookAgent.instance.run(zapierInput));
  });

  it("ZapierMappingAgent", async () => {
    await assertOutput("zapier-mapping", () => ZapierMappingAgent.instance.run(zapierInput));
  });

  it("ZapierErrorAgent", async () => {
    await assertOutput("zapier-error", () => ZapierErrorAgent.instance.run(zapierInput));
  });

  it("ZapierAnalyticsAgent", async () => {
    await assertOutput("zapier-analytics", () => ZapierAnalyticsAgent.instance.run(zapierInput));
  });

  it("ZapierTemplateAgent", async () => {
    await assertOutput("zapier-template", () => ZapierTemplateAgent.instance.run(zapierInput));
  });
});

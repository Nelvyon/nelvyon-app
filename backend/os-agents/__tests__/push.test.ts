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
  PushAbandonmentNotifAgent,
  PushEngagementNotifAgent,
  PushMilestoneNotifAgent,
  PushOptimizationAgent,
  PushPersonalizationAgent,
  PushPromotionalNotifAgent,
  PushTransactionalNotifAgent,
  PushWelcomeNotifAgent,
  resetAllPushAgentsForTests,
} from "../sectors/push";

const PUSH_JSON = JSON.stringify({
  content:
    "NOTIFY: Need claro; Opportunity timing; Target segmento; Instant cadencia; Focus copy único; Yield acción en app.",
  score: 88,
  notifications: ["Tu pedido está listo — abre para ver el detalle", "Recordatorio: oferta válida 24h"],
  deepLinks: ["myapp://orders/99", "myapp://promo/summer"],
});

const pushInput = {
  userId: "00000000-0000-0000-0000-000000005505",
  sector: "retail",
  brand: "NovaShop",
  triggerEvent: "cart_abandoned",
  userSegment: "returning_buyers",
  platform: "both" as const,
};

describe("Push agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PUSH_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllPushAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertPushOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      notifications: string[];
      deepLinks: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.notifications.length).toBeGreaterThanOrEqual(1);
    expect(out.deepLinks.length).toBeGreaterThanOrEqual(1);
  }

  it("PushWelcomeNotifAgent", async () => {
    await assertPushOutput("push-welcome-notif", () => PushWelcomeNotifAgent.instance.run(pushInput));
  });

  it("PushEngagementNotifAgent", async () => {
    await assertPushOutput("push-engagement-notif", () => PushEngagementNotifAgent.instance.run(pushInput));
  });

  it("PushTransactionalNotifAgent", async () => {
    await assertPushOutput("push-transactional-notif", () => PushTransactionalNotifAgent.instance.run(pushInput));
  });

  it("PushPromotionalNotifAgent", async () => {
    await assertPushOutput("push-promotional-notif", () => PushPromotionalNotifAgent.instance.run(pushInput));
  });

  it("PushAbandonmentNotifAgent", async () => {
    await assertPushOutput("push-abandonment-notif", () => PushAbandonmentNotifAgent.instance.run(pushInput));
  });

  it("PushMilestoneNotifAgent", async () => {
    await assertPushOutput("push-milestone-notif", () => PushMilestoneNotifAgent.instance.run(pushInput));
  });

  it("PushPersonalizationAgent", async () => {
    await assertPushOutput("push-personalization", () => PushPersonalizationAgent.instance.run(pushInput));
  });

  it("PushOptimizationAgent", async () => {
    await assertPushOutput("push-optimization", () => PushOptimizationAgent.instance.run(pushInput));
  });
});

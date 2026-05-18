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
  WidgetAnalyticsTrackerAgent,
  WidgetCustomizationAgent,
  WidgetLeaderboardEmbedAgent,
  WidgetLiveCounterAgent,
  WidgetResultsDisplayAgent,
  WidgetROICalculatorAgent,
  WidgetSocialProofBadgeAgent,
  WidgetTestimonialCarouselAgent,
  resetAllWidgetAgentsForTests,
} from "../sectors/widget";

const WIDGET_JSON = JSON.stringify({
  content: "EMBED: Engage, Message, Brandize, Evidence, Drive aplicado.",
  score: 85,
  embedCode: '<div id="nelvyon-widget" data-brand="demo">...</div>\n<script>/* embed */</script>',
  previewData: ["Leads +32% vs mes anterior", "500+ equipos activos"],
});

const widgetInput = {
  userId: "00000000-0000-0000-0000-00000000dd11",
  sector: "marketing",
  brand: "NovaAds",
  metrics: { leads_mes: "+32%", clientes: "512" },
  widgetType: "inline",
  embedTarget: "landing",
};

describe("Widget agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(WIDGET_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllWidgetAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertWidgetOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      embedCode: string;
      previewData: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(typeof out.embedCode).toBe("string");
    expect(out.embedCode.length).toBeGreaterThan(0);
    expect(out.previewData.length).toBeGreaterThanOrEqual(1);
  }

  it("WidgetResultsDisplayAgent", async () => {
    await assertWidgetOutput("widget-results-display", () => WidgetResultsDisplayAgent.instance.run(widgetInput));
  });

  it("WidgetSocialProofBadgeAgent", async () => {
    await assertWidgetOutput("widget-social-proof-badge", () => WidgetSocialProofBadgeAgent.instance.run(widgetInput));
  });

  it("WidgetLiveCounterAgent", async () => {
    await assertWidgetOutput("widget-live-counter", () => WidgetLiveCounterAgent.instance.run(widgetInput));
  });

  it("WidgetTestimonialCarouselAgent", async () => {
    await assertWidgetOutput("widget-testimonial-carousel", () => WidgetTestimonialCarouselAgent.instance.run(widgetInput));
  });

  it("WidgetROICalculatorAgent", async () => {
    await assertWidgetOutput("widget-roi-calculator", () => WidgetROICalculatorAgent.instance.run(widgetInput));
  });

  it("WidgetLeaderboardEmbedAgent", async () => {
    await assertWidgetOutput("widget-leaderboard-embed", () => WidgetLeaderboardEmbedAgent.instance.run(widgetInput));
  });

  it("WidgetCustomizationAgent", async () => {
    await assertWidgetOutput("widget-customization", () => WidgetCustomizationAgent.instance.run(widgetInput));
  });

  it("WidgetAnalyticsTrackerAgent", async () => {
    await assertWidgetOutput("widget-analytics-tracker", () => WidgetAnalyticsTrackerAgent.instance.run(widgetInput));
  });
});

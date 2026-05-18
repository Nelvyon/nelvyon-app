// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  PodcastsAnalyticsAgent,
  PodcastsAudienciaAgent,
  PodcastsEmailAgent,
  PodcastsMonetizacionAgent,
  PodcastsPreciosAgent,
  PodcastsReviewsAgent,
  PodcastsSEOAgent,
  PodcastsSocialAgent,
  resetAllPodcastsAgentsForTests,
} from "../sectors/podcasts";

const PC_JSON = JSON.stringify({
  result: "Podcasts: audiencia, monetización y métricas de audio.",
  score: 93,
  recommendations: ["Clip strategy", "Sponsor deck", "Completion rate"],
});

const podcastsInput = {
  userId: "00000000-0000-0000-0000-00000000pc01",
  businessName: "Show demo",
  services: ["Spotify", "RSS"],
  targets: ["oyentes"],
};

describe("Podcasts agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PC_JSON);
    resetAllPodcastsAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("PodcastsAudienciaAgent", async () => {
    await assertOutput("podcasts-audiencia", () => PodcastsAudienciaAgent.instance().run(podcastsInput));
  });

  it("PodcastsMonetizacionAgent", async () => {
    await assertOutput("podcasts-monetizacion", () => PodcastsMonetizacionAgent.instance().run(podcastsInput));
  });

  it("PodcastsPreciosAgent", async () => {
    await assertOutput("podcasts-precios", () => PodcastsPreciosAgent.instance().run(podcastsInput));
  });

  it("PodcastsSEOAgent", async () => {
    await assertOutput("podcasts-seo", () => PodcastsSEOAgent.instance().run(podcastsInput));
  });

  it("PodcastsSocialAgent", async () => {
    await assertOutput("podcasts-social", () => PodcastsSocialAgent.instance().run(podcastsInput));
  });

  it("PodcastsEmailAgent", async () => {
    await assertOutput("podcasts-email", () => PodcastsEmailAgent.instance().run(podcastsInput));
  });

  it("PodcastsReviewsAgent", async () => {
    await assertOutput("podcasts-reviews", () => PodcastsReviewsAgent.instance().run(podcastsInput));
  });

  it("PodcastsAnalyticsAgent", async () => {
    await assertOutput("podcasts-analytics", () => PodcastsAnalyticsAgent.instance().run(podcastsInput));
  });
});
